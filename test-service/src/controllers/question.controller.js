const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");
const {
  DominoQuestion,
  MultipleChoiceQuestion,
  Question, // Import base Question model if needed for counts/updates
} = require("../models/question.model");
const Test = require("../models/test.model");
const { AppError } = require("../middleware/errorHandler");
const logger = require("../utils/logger");

/**
 * Create a new question
 * Supports creating DominoQuestion and MultipleChoiceQuestion types
 */
const createQuestion = async (req, res) => {
  const { testId } = req.params;
  logger.info(`Attempting to create question for test ${testId}`);
  logger.debug(`Request body: ${JSON.stringify(req.body)}`);

  // Validate test exists
  const test = await Test.findById(testId);
  if (!test) {
    logger.error(`Test not found: ${testId}`);
    throw new AppError(
      `Test with ID ${testId} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Determine the next question number for this test
  // Use the base Question model to count all types
  const questionCount = await Question.countDocuments({ testId });
  logger.debug(`Current question count for test ${testId}: ${questionCount}`);

  const questionData = {
    ...req.body,
    testId,
    questionNumber: questionCount + 1,
  };
  logger.debug(`Prepared question data: ${JSON.stringify(questionData)}`);

  // Create the correct question type
  let question;
  try {
    if (req.body.questionType === "DominoQuestion") {
      // ... existing Domino validation ...
      logger.info(`Creating DominoQuestion for test ${testId}`);
      if (!questionData.dominos || !questionData.correctAnswer) {
        throw new AppError(
          "Domino questions require dominos and correctAnswer fields",
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !Array.isArray(questionData.dominos) ||
        questionData.dominos.length < 2
      ) {
        throw new AppError(
          "Domino questions require at least 2 dominos",
          StatusCodes.BAD_REQUEST
        );
      }
      const editableDominos = questionData.dominos.filter(
        (d) => d.isEditable === true
      );
      if (editableDominos.length !== 1) {
        throw new AppError(
          "Domino questions require exactly one editable domino",
          StatusCodes.BAD_REQUEST
        );
      }
      const missingCoordinates = questionData.dominos.some(
        (domino) => domino.exactX === undefined || domino.exactY === undefined
      );
      if (missingCoordinates) {
        throw new AppError(
          "All dominos must have exactX and exactY coordinates",
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        questionData.arrows &&
        Array.isArray(questionData.arrows) &&
        questionData.arrows.length > 0
      ) {
        const missingArrowCoordinates = questionData.arrows.some(
          (arrow) => arrow.exactX === undefined || arrow.exactY === undefined
        );
        if (missingArrowCoordinates) {
          throw new AppError(
            "All arrows must have exactX and exactY coordinates",
            StatusCodes.BAD_REQUEST
          );
        }
      }
      // Create the domino question
      question = await DominoQuestion.create(questionData);
      logger.info(`DominoQuestion created successfully: ${question._id}`);
    } else if (req.body.questionType === "MultipleChoiceQuestion") {
      // Validate V/F/?/X structure
      logger.info(`Creating MultipleChoiceQuestion for test ${testId}`);
      if (
        !questionData.propositions ||
        !Array.isArray(questionData.propositions) ||
        questionData.propositions.length === 0
      ) {
        throw new AppError(
          "Multiple choice questions (V/F/? type) require at least one proposition",
          StatusCodes.BAD_REQUEST
        );
      }
      // Validate each proposition
      for (const prop of questionData.propositions) {
        if (
          !prop.text ||
          typeof prop.text !== "string" ||
          prop.text.trim() === ""
        ) {
          throw new AppError(
            "Each proposition must have non-empty text",
            StatusCodes.BAD_REQUEST
          );
        }
        if (
          !prop.correctEvaluation ||
          !["V", "F", "?"].includes(prop.correctEvaluation)
        ) {
          throw new AppError(
            `Each proposition must have a correctEvaluation of 'V', 'F', or '?'`,
            StatusCodes.BAD_REQUEST
          );
        }
      }

      // Create the multiple choice question
      question = await MultipleChoiceQuestion.create(questionData);
      logger.info(
        `MultipleChoiceQuestion created successfully: ${question._id}`
      );
    } else {
      logger.error(`Invalid question type specified: ${req.body.questionType}`);
      throw new AppError(
        "Invalid question type specified",
        StatusCodes.BAD_REQUEST
      );
    }
  } catch (creationError) {
    logger.error(
      `Error during question creation: ${creationError.message}`,
      creationError
    );
    // Check for Mongoose validation errors specifically
    if (creationError.name === "ValidationError") {
      const messages = Object.values(creationError.errors).map(
        (e) => e.message
      );
      throw new AppError(
        `Validation failed during creation: ${messages.join(", ")}`,
        StatusCodes.BAD_REQUEST
      );
    }
    // Rethrow other errors as internal server errors
    throw new AppError(
      `Failed to create question in database: ${creationError.message}`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  // Update the total question count in test
  try {
    test.totalQuestions = questionCount + 1;
    await test.save();
    logger.info(
      `Updated totalQuestions for test ${testId} to ${test.totalQuestions}`
    );
  } catch (testSaveError) {
    logger.error(
      `Error updating totalQuestions for test ${testId}: ${testSaveError.message}`,
      testSaveError
    );
    // Decide how critical this is. Maybe just log and continue, or throw an error.
    // For now, just log it. The question was created.
  }

  logger.info(
    `New question ${question._id} fully processed for test ${testId}`
  );
  res.status(StatusCodes.CREATED).json({
    success: true,
    data: question,
  });
};

/**
 * Get all questions for a test
 */
const getQuestionsByTestId = async (req, res) => {
  const { testId } = req.params;
  const {
    active,
    difficulty,
    sort = "questionNumber",
    limit = 100,
    page = 1,
  } = req.query;

  // Build query filter
  const filter = { testId };

  if (active !== undefined) {
    filter.isActive = active === "true";
  }

  if (difficulty) {
    filter.difficulty = difficulty;
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  // Prepare sort options
  const sortOptions = {};
  sortOptions[sort] = 1; // Default ascending

  // Use the base Question model for querying and counting
  const totalCount = await Question.countDocuments(filter);

  const questions = await Question.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  res.status(StatusCodes.OK).json({
    success: true,
    count: questions.length,
    totalCount,
    pagination: {
      page: parseInt(page),
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    },
    data: questions,
  });
};

/**
 * Get a single question by ID
 */
const getQuestionById = async (req, res) => {
  const { id } = req.params;

  // Create an ObjectId from the id parameter
  let objectId;
  try {
    objectId = mongoose.Types.ObjectId(id);
  } catch (error) {
    throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
  }

  // Use the base Question model to find by ID
  const question = await Question.findById(objectId);

  if (!question) {
    throw new AppError(
      `Question with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: question,
  });
};

/**
 * Update a question by ID
 */
const updateQuestion = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Don't allow changing the question type or testId via update
  delete updates.questionType;
  delete updates.testId;
  // Also prevent changing questionNumber directly, use move endpoint
  delete updates.questionNumber;

  // Create an ObjectId from the id parameter
  let objectId;
  try {
    objectId = mongoose.Types.ObjectId(id);
  } catch (error) {
    throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
  }

  // Find the question using the base model
  const existingQuestion = await Question.findById(objectId);

  if (!existingQuestion) {
    throw new AppError(
      `Question with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Add logging to debug update issues
  logger.info(
    `Updating question ${id} of type ${existingQuestion.questionType}`
  );
  logger.info(`Update payload: ${JSON.stringify(updates, null, 2)}`);

  // Validate updates specific to the question type
  if (existingQuestion.questionType === "MultipleChoiceQuestion") {
    if (updates.propositions) {
      if (
        !Array.isArray(updates.propositions) ||
        updates.propositions.length === 0
      ) {
        throw new AppError(
          "Propositions must be a non-empty array",
          StatusCodes.BAD_REQUEST
        );
      }
      for (const prop of updates.propositions) {
        if (
          !prop.text ||
          typeof prop.text !== "string" ||
          prop.text.trim() === ""
        ) {
          throw new AppError(
            "Each proposition must have non-empty text",
            StatusCodes.BAD_REQUEST
          );
        }
        if (
          !prop.correctEvaluation ||
          !["V", "F", "?"].includes(prop.correctEvaluation)
        ) {
          throw new AppError(
            `Each proposition must have a correctEvaluation of 'V', 'F', or '?'`,
            StatusCodes.BAD_REQUEST
          );
        }
      }
    }
    // Prevent accidental update with old fields
    delete updates.options;
    delete updates.correctOptionIndex;
    delete updates.allowMultipleCorrect;
    delete updates.randomizeOptions;
  } else if (existingQuestion.questionType === "DominoQuestion") {
    // Add validation for domino updates if necessary
    // Prevent accidental update with MCQ fields
    delete updates.propositions;
  }

  // Perform the update using findByIdAndUpdate on the base model
  // Mongoose handles applying updates correctly based on the discriminator key
  let updatedQuestion;
  try {
    updatedQuestion = await Question.findByIdAndUpdate(
      id,
      updates, // Apply validated updates
      {
        new: true, // Return the updated document
        runValidators: true, // Run schema validators on update
        context: "query", // Necessary for some validators on update
      }
    );
  } catch (error) {
    logger.error(`Error updating question ${id}: ${error.message}`);
    // Check for validation errors
    if (error.name === "ValidationError") {
      // Extract specific validation messages
      const messages = Object.values(error.errors).map((e) => e.message);
      throw new AppError(
        `Validation failed: ${messages.join(", ")}`,
        StatusCodes.BAD_REQUEST
      );
    }
    throw new AppError(
      `Error updating question: ${error.message}`,
      StatusCodes.INTERNAL_SERVER_ERROR // Or BAD_REQUEST depending on error type
    );
  }

  if (!updatedQuestion) {
    // This case might happen if the ID was valid format but not found during update
    throw new AppError(
      `Question with ID ${id} not found during update`,
      StatusCodes.NOT_FOUND
    );
  }

  logger.info(`Question updated successfully: ${id}`);
  res.status(StatusCodes.OK).json({
    success: true,
    data: updatedQuestion,
  });
};

/**
 * Delete a question by ID
 */
const deleteQuestion = async (req, res) => {
  const { id } = req.params;

  // Create an ObjectId from the id parameter
  let objectId;
  try {
    objectId = mongoose.Types.ObjectId(id);
  } catch (error) {
    throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
  }

  // Find the question using the base model to get its testId and questionNumber
  const existingQuestion = await Question.findById(objectId);

  if (!existingQuestion) {
    throw new AppError(
      `Question with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  const { testId, questionNumber } = existingQuestion;

  // Delete the question using the base model
  const deletedQuestion = await Question.findByIdAndDelete(id); // Use findByIdAndDelete to ensure it existed

  if (!deletedQuestion) {
    // This case handles if the question was deleted between the find and delete operations (unlikely but possible)
    throw new AppError(
      `Question with ID ${id} not found during deletion`,
      StatusCodes.NOT_FOUND
    );
  }

  // Update the question numbers for all subsequent questions in the same test
  // Use the base Question model for updates
  await Question.updateMany(
    { testId, questionNumber: { $gt: questionNumber } },
    { $inc: { questionNumber: -1 } }
  );

  // Update the test's total question count
  const questionCount = await Question.countDocuments({ testId });
  await Test.findByIdAndUpdate(testId, { totalQuestions: questionCount });

  logger.info(`Question deleted: ${id}`);
  // Send 200 OK with success body instead of 204 No Content
  res.status(StatusCodes.OK).json({ success: true });
};

/**
 * Validate the structure of a domino question (Controller Function)
 * This is the actual controller function used by the route.
 */
const validateDominoQuestionController = async (req, res) => {
  const { dominos, correctAnswer, arrows } = req.body;
  const errors = [];

  if (!Array.isArray(dominos)) {
    errors.push("Dominos must be an array");
  } else {
    if (dominos.length < 2) errors.push("At least 2 dominos are required");
    const editableDominos = dominos.filter((d) => d.isEditable === true);
    if (editableDominos.length === 0)
      errors.push("At least one editable domino is required");
    else if (editableDominos.length > 1)
      errors.push("Only one editable domino is allowed");

    for (let i = 0; i < dominos.length; i++) {
      const domino = dominos[i];
      if (domino.exactX === undefined || domino.exactX === null)
        errors.push(`Domino at index ${i} is missing exactX coordinate`);
      if (domino.exactY === undefined || domino.exactY === null)
        errors.push(`Domino at index ${i} is missing exactY coordinate`);
    }
    // Check correctAnswer reference
    if (
      correctAnswer &&
      editableDominos.length === 1 &&
      correctAnswer.dominoId !== editableDominos[0].id
    ) {
      errors.push("correctAnswer must reference the editable domino's id");
    }
  }
  if (arrows && Array.isArray(arrows) && arrows.length > 0) {
    for (let i = 0; i < arrows.length; i++) {
      const arrow = arrows[i];
      if (arrow.exactX === undefined || arrow.exactX === null)
        errors.push(`Arrow at index ${i} is missing exactX coordinate`);
      if (arrow.exactY === undefined || arrow.exactY === null)
        errors.push(`Arrow at index ${i} is missing exactY coordinate`);
    }
  }
  if (!correctAnswer) {
    errors.push("correctAnswer is required");
  } else {
    if (correctAnswer.dominoId === undefined)
      errors.push("correctAnswer must have dominoId");
    if (
      correctAnswer.topValue === undefined ||
      correctAnswer.bottomValue === undefined
    )
      errors.push("correctAnswer must have topValue and bottomValue");
    const topValueValid =
      correctAnswer.topValue === null ||
      (correctAnswer.topValue >= 0 && correctAnswer.topValue <= 6); // Allow 0 if needed, else 1-6
    const bottomValueValid =
      correctAnswer.bottomValue === null ||
      (correctAnswer.bottomValue >= 0 && correctAnswer.bottomValue <= 6); // Allow 0 if needed, else 1-6
    if (!topValueValid)
      errors.push("correctAnswer.topValue must be null or between 0 and 6");
    if (!bottomValueValid)
      errors.push("correctAnswer.bottomValue must be null or between 0 and 6");
  }

  res.status(StatusCodes.OK).json({
    valid: errors.length === 0,
    errors,
  });
};

/**
 * Move a question's position in the test (change question number)
 */
const moveQuestionPosition = async (req, res) => {
  const { id } = req.params;
  const { newPosition } = req.body;

  const targetPosition = parseInt(newPosition);
  if (isNaN(targetPosition) || targetPosition < 1) {
    throw new AppError(
      "newPosition must be a positive integer",
      StatusCodes.BAD_REQUEST
    );
  }

  // Create an ObjectId from the id parameter
  let objectId;
  try {
    objectId = mongoose.Types.ObjectId(id);
  } catch (error) {
    throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
  }

  // Find the question using the base model
  const question = await Question.findById(objectId);

  if (!question) {
    throw new AppError(
      `Question with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  const { testId, questionNumber: currentPosition } = question;

  // Use base model for count
  const totalQuestions = await Question.countDocuments({ testId });

  if (targetPosition > totalQuestions) {
    throw new AppError(
      `Position ${targetPosition} exceeds total questions (${totalQuestions})`,
      StatusCodes.BAD_REQUEST
    );
  }

  if (currentPosition === targetPosition) {
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Question position unchanged",
      data: question,
    });
  }

  // Use base model for updates
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (targetPosition < currentPosition) {
      // Moving up: Increment positions for questions in between
      await Question.updateMany(
        {
          testId,
          questionNumber: { $gte: targetPosition, $lt: currentPosition },
        },
        { $inc: { questionNumber: 1 } },
        { session }
      );
    } else {
      // Moving down: Decrement positions for questions in between
      await Question.updateMany(
        {
          testId,
          questionNumber: { $gt: currentPosition, $lte: targetPosition },
        },
        { $inc: { questionNumber: -1 } },
        { session }
      );
    }

    // Update the question's position
    question.questionNumber = targetPosition;
    await question.save({ session });

    await session.commitTransaction();
    logger.info(
      `Question ${id} moved from position ${currentPosition} to ${targetPosition}`
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: `Question moved from position ${currentPosition} to ${targetPosition}`,
      data: question,
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Error moving question ${id}: ${error.message}`);
    throw new AppError(
      "Failed to move question position",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  } finally {
    session.endSession();
  }
};

/**
 * Duplicate a question
 */
const duplicateQuestion = async (req, res) => {
  const { id } = req.params;

  // Create an ObjectId from the id parameter
  let objectId;
  try {
    objectId = mongoose.Types.ObjectId(id);
  } catch (error) {
    throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
  }

  // Find the original question using the base model
  const originalQuestion = await Question.findById(objectId);

  if (!originalQuestion) {
    throw new AppError(
      `Question with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Convert to plain object and prepare for duplication
  const questionData = originalQuestion.toObject();
  const { testId, questionType } = questionData;

  // Remove fields that should be unique or auto-generated
  delete questionData._id;
  // delete questionData.id; // Mongoose virtual, no need to delete if using toObject()
  delete questionData.createdAt;
  delete questionData.updatedAt;
  delete questionData.__v; // Version key

  // Determine the next question number for this test using the base model
  const questionCount = await Question.countDocuments({ testId });
  questionData.questionNumber = questionCount + 1;

  // Add "copy" to the title if it exists
  if (questionData.title) {
    questionData.title = `${questionData.title} (copy)`;
  } else {
    questionData.title = `Question ${questionData.questionNumber} (copy)`; // Add a default title if none exists
  }

  // Reset analytics
  questionData.analytics = undefined; // Or set to default values

  // Create a new question using the appropriate model constructor
  let newQuestion;
  try {
    if (questionType === "DominoQuestion") {
      // Ensure unique IDs for dominos/arrows if they have uniqueId field
      if (questionData.dominos) {
        questionData.dominos.forEach((d) => {
          if (d.uniqueId)
            d.uniqueId = `${d.uniqueId}_copy_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 7)}`;
        });
      }
      if (questionData.arrows) {
        questionData.arrows.forEach((a) => {
          if (a.uniqueId)
            a.uniqueId = `${a.uniqueId}_copy_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 7)}`;
        });
      }
      newQuestion = await DominoQuestion.create(questionData);
    } else if (questionType === "MultipleChoiceQuestion") {
      newQuestion = await MultipleChoiceQuestion.create(questionData);
    } else {
      throw new AppError(
        `Cannot duplicate unknown question type: ${questionType}`,
        StatusCodes.BAD_REQUEST
      );
    }
  } catch (error) {
    logger.error(
      `Error creating duplicated question from ${id}: ${error.message}`
    );
    throw new AppError(
      `Failed to create duplicate question: ${error.message}`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  // Update the test's total question count
  const test = await Test.findById(testId);
  if (test) {
    test.totalQuestions = questionCount + 1;
    await test.save();
  } else {
    logger.warn(
      `Test ${testId} not found when updating count after duplicating question ${id}`
    );
  }

  logger.info(`Question duplicated from ${id} to ${newQuestion._id}`);
  res.status(StatusCodes.CREATED).json({
    success: true,
    data: newQuestion,
  });
};

module.exports = {
  createQuestion,
  getQuestionsByTestId,
  getQuestionById,
  updateQuestion,
  deleteQuestion, // Ensure this is correctly exported
  validateDominoQuestion: validateDominoQuestionController, // Export the controller function under the expected name
  moveQuestionPosition,
  duplicateQuestion,
};
