const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");
const {
  DominoQuestion,
  MultipleChoiceQuestion,
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

  // Validate test exists
  const test = await Test.findById(testId);
  if (!test) {
    throw new AppError(
      `Test with ID ${testId} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Determine the next question number for this test
  const questionCount =
    (await DominoQuestion.countDocuments({ testId })) +
    (await MultipleChoiceQuestion.countDocuments({ testId }));

  const questionData = {
    ...req.body,
    testId,
    questionNumber: questionCount + 1,
  };

  // Create the correct question type
  let question;
  if (req.body.questionType === "DominoQuestion") {
    // Validate that we have required domino question fields
    if (!questionData.dominos || !questionData.correctAnswer) {
      throw new AppError(
        "Domino questions require dominos and correctAnswer fields",
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate minimum number of dominos
    if (
      !Array.isArray(questionData.dominos) ||
      questionData.dominos.length < 2
    ) {
      throw new AppError(
        "Domino questions require at least 2 dominos",
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate exactly one editable domino
    const editableDominos = questionData.dominos.filter(
      (d) => d.isEditable === true
    );
    if (editableDominos.length !== 1) {
      throw new AppError(
        "Domino questions require exactly one editable domino",
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate exactX and exactY for all dominos
    const missingCoordinates = questionData.dominos.some(
      (domino) => domino.exactX === undefined || domino.exactY === undefined
    );
    if (missingCoordinates) {
      throw new AppError(
        "All dominos must have exactX and exactY coordinates",
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate arrows if they exist
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
  } else if (req.body.questionType === "MultipleChoiceQuestion") {
    // Validate that we have required multiple choice question fields
    if (!questionData.options || !questionData.options.length) {
      throw new AppError(
        "Multiple choice questions require options",
        StatusCodes.BAD_REQUEST
      );
    }

    // Create the multiple choice question
    question = await MultipleChoiceQuestion.create(questionData);
  } else {
    throw new AppError("Invalid question type", StatusCodes.BAD_REQUEST);
  }

  // Update the total question count in test
  test.totalQuestions = questionCount + 1;
  await test.save();

  logger.info(`New question created for test ${testId}: ${question._id}`);
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

  // Prepare sort options
  const sortOptions = {};
  sortOptions[sort] = 1; // Default ascending

  // First get count of all matching documents
  const totalCount =
    (await DominoQuestion.countDocuments(filter)) +
    (await MultipleChoiceQuestion.countDocuments(filter));

  // Then perform the query for the requested page
  const dominoQuestions = await DominoQuestion.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit));

  const mcQuestions = await MultipleChoiceQuestion.find(filter)
    .sort(sortOptions)
    .skip(Math.max(0, skip - (await DominoQuestion.countDocuments(filter))))
    .limit(parseInt(limit) - dominoQuestions.length);

  // Combine questions and sort again
  const questions = [...dominoQuestions, ...mcQuestions].sort((a, b) => {
    return a.questionNumber - b.questionNumber;
  });

  res.status(StatusCodes.OK).json({
    success: true,
    count: questions.length,
    totalCount,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
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
    throw new AppError("Invalid question ID", StatusCodes.BAD_REQUEST);
  }

  // Try to find as either DominoQuestion or MultipleChoiceQuestion
  const question =
    (await DominoQuestion.findById(objectId)) ||
    (await MultipleChoiceQuestion.findById(objectId));

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

  // Don't allow changing the question type
  if (updates.questionType) {
    throw new AppError("Cannot change question type", StatusCodes.BAD_REQUEST);
  }

  // Create an ObjectId from the id parameter
  let objectId;
  try {
    objectId = mongoose.Types.ObjectId(id);
  } catch (error) {
    throw new AppError("Invalid question ID", StatusCodes.BAD_REQUEST);
  }

  // Find the question to get its type
  const existingQuestion =
    (await DominoQuestion.findById(objectId)) ||
    (await MultipleChoiceQuestion.findById(objectId));

  if (!existingQuestion) {
    throw new AppError(
      `Question with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Update in the correct collection based on the discriminator value
  let updatedQuestion;
  if (existingQuestion.questionType === "DominoQuestion") {
    updatedQuestion = await DominoQuestion.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
  } else {
    updatedQuestion = await MultipleChoiceQuestion.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );
  }

  if (!updatedQuestion) {
    throw new AppError(
      `Question with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  logger.info(`Question updated: ${id}`);
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
    throw new AppError("Invalid question ID", StatusCodes.BAD_REQUEST);
  }

  // Find the question to get its type and testId
  const existingQuestion =
    (await DominoQuestion.findById(objectId)) ||
    (await MultipleChoiceQuestion.findById(objectId));

  if (!existingQuestion) {
    throw new AppError(
      `Question with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  const { testId, questionNumber } = existingQuestion;

  // Delete the question
  if (existingQuestion.questionType === "DominoQuestion") {
    await DominoQuestion.findByIdAndDelete(id);
  } else {
    await MultipleChoiceQuestion.findByIdAndDelete(id);
  }

  // Update the question numbers for all questions after this one
  await DominoQuestion.updateMany(
    { testId, questionNumber: { $gt: questionNumber } },
    { $inc: { questionNumber: -1 } }
  );

  await MultipleChoiceQuestion.updateMany(
    { testId, questionNumber: { $gt: questionNumber } },
    { $inc: { questionNumber: -1 } }
  );

  // Update the test's total question count
  const questionCount =
    (await DominoQuestion.countDocuments({ testId })) +
    (await MultipleChoiceQuestion.countDocuments({ testId }));

  await Test.findByIdAndUpdate(testId, { totalQuestions: questionCount });

  logger.info(`Question deleted: ${id}`);
  res.status(StatusCodes.OK).json({
    success: true,
    data: {},
  });
};

/**
 * Validate the structure of a domino question
 */
const validateDominoQuestion = async (req, res) => {
  const { dominos, correctAnswer, arrows } = req.body;

  const errors = [];

  // Check if dominos is an array with at least 2 items
  if (!Array.isArray(dominos)) {
    errors.push("Dominos must be an array");
  } else {
    // Check minimum number of dominos
    if (dominos.length < 2) {
      errors.push("At least 2 dominos are required");
    }

    // Check if there's exactly one editable domino
    const editableDominos = dominos.filter(d => d.isEditable === true);
    if (editableDominos.length === 0) {
      errors.push("At least one editable domino is required");
    } else if (editableDominos.length > 1) {
      errors.push("Only one editable domino is allowed");
    }
    
    // Check if all dominos have exactX and exactY
    for (let i = 0; i < dominos.length; i++) {
      const domino = dominos[i];
      if (domino.exactX === undefined || domino.exactX === null) {
        errors.push(`Domino at index ${i} is missing exactX coordinate`);
      }
      if (domino.exactY === undefined || domino.exactY === null) {
        errors.push(`Domino at index ${i} is missing exactY coordinate`);
      }
    }
  }
  
  // Check arrows if they exist
  if (arrows && Array.isArray(arrows) && arrows.length > 0) {
    for (let i = 0; i < arrows.length; i++) {
      const arrow = arrows[i];
      if (arrow.exactX === undefined || arrow.exactX === null) {
        errors.push(`Arrow at index ${i} is missing exactX coordinate`);
      }
      if (arrow.exactY === undefined || arrow.exactY === null) {
        errors.push(`Arrow at index ${i} is missing exactY coordinate`);
      }
    }
  }

  // Validate correctAnswer
  if (!correctAnswer) {
    errors.push("correctAnswer is required");
  } else {
    // Check if correctAnswer references an editable domino
    if (Array.isArray(dominos) && dominos.length > 0) {
      const editableDomino = dominos.find(d => d.isEditable === true);
      
      if (editableDomino && correctAnswer.dominoId !== editableDomino.id) {
        errors.push("correctAnswer must reference the editable domino");
      }
    }
    
    // Check if correctAnswer has valid values
    if (correctAnswer.topValue === undefined || correctAnswer.bottomValue === undefined) {
      errors.push("correctAnswer must have topValue and bottomValue");
    }
    
    // Check if values are in valid range (1-6)
    const topValueValid = correctAnswer.topValue === null || 
                         (correctAnswer.topValue >= 1 && correctAnswer.topValue <= 6);
    const bottomValueValid = correctAnswer.bottomValue === null || 
                            (correctAnswer.bottomValue >= 1 && correctAnswer.bottomValue <= 6);
    
    if (!topValueValid) {
      errors.push("correctAnswer.topValue must be null or between 1 and 6");
    }
    
    if (!bottomValueValid) {
      errors.push("correctAnswer.bottomValue must be null or between 1 and 6");
    }
  }
  
  // Return validation result
  res.status(StatusCodes.OK).json({
    valid: errors.length === 0,
    errors
  });
};

/**
 * Move a question's position in the test (change question number)
 */
const moveQuestionPosition = async (req, res) => {
  const { id } = req.params;
  const { newPosition } = req.body;

  if (
    newPosition === undefined ||
    isNaN(parseInt(newPosition)) ||
    parseInt(newPosition) < 1
  ) {
    throw new AppError(
      "Valid newPosition is required",
      StatusCodes.BAD_REQUEST
    );
  }

  // Create an ObjectId from the id parameter
  let objectId;
  try {
    objectId = mongoose.Types.ObjectId(id);
  } catch (error) {
    throw new AppError("Invalid question ID", StatusCodes.BAD_REQUEST);
  }

  // Find the question to get its current position and test ID
  const question =
    (await DominoQuestion.findById(objectId)) ||
    (await MultipleChoiceQuestion.findById(objectId));

  if (!question) {
    throw new AppError(
      `Question with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  const { testId, questionNumber: currentPosition } = question;
  const targetPosition = parseInt(newPosition);

  // Count total questions to validate the target position
  const totalQuestions =
    (await DominoQuestion.countDocuments({ testId })) +
    (await MultipleChoiceQuestion.countDocuments({ testId }));

  if (targetPosition > totalQuestions) {
    throw new AppError(
      `Position ${targetPosition} exceeds total questions (${totalQuestions})`,
      StatusCodes.BAD_REQUEST
    );
  }

  // No need to update if position doesn't change
  if (currentPosition === targetPosition) {
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Question position unchanged",
      data: question,
    });
  }

  // Moving up (smaller number) or down (larger number)
  if (targetPosition < currentPosition) {
    // Moving up: Increment positions for questions in between
    await DominoQuestion.updateMany(
      {
        testId,
        questionNumber: { $gte: targetPosition, $lt: currentPosition },
      },
      { $inc: { questionNumber: 1 } }
    );

    await MultipleChoiceQuestion.updateMany(
      {
        testId,
        questionNumber: { $gte: targetPosition, $lt: currentPosition },
      },
      { $inc: { questionNumber: 1 } }
    );
  } else {
    // Moving down: Decrement positions for questions in between
    await DominoQuestion.updateMany(
      {
        testId,
        questionNumber: { $gt: currentPosition, $lte: targetPosition },
      },
      { $inc: { questionNumber: -1 } }
    );

    await MultipleChoiceQuestion.updateMany(
      {
        testId,
        questionNumber: { $gt: currentPosition, $lte: targetPosition },
      },
      { $inc: { questionNumber: -1 } }
    );
  }

  // Update the question's position
  if (question.questionType === "DominoQuestion") {
    question.questionNumber = targetPosition;
    await question.save();
  } else {
    question.questionNumber = targetPosition;
    await question.save();
  }

  logger.info(
    `Question ${id} moved from position ${currentPosition} to ${targetPosition}`
  );
  res.status(StatusCodes.OK).json({
    success: true,
    message: `Question moved from position ${currentPosition} to ${targetPosition}`,
    data: question,
  });
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
    throw new AppError("Invalid question ID", StatusCodes.BAD_REQUEST);
  }

  // Find the original question
  const originalQuestion =
    (await DominoQuestion.findById(objectId)) ||
    (await MultipleChoiceQuestion.findById(objectId));

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
  delete questionData.id;
  delete questionData.createdAt;
  delete questionData.updatedAt;
  delete questionData.__v;

  // Determine the next question number for this test
  const questionCount =
    (await DominoQuestion.countDocuments({ testId })) +
    (await MultipleChoiceQuestion.countDocuments({ testId }));

  // Set the new question number to be at the end
  questionData.questionNumber = questionCount + 1;

  // Add "copy" to the title if it exists
  if (questionData.title) {
    questionData.title = `${questionData.title} (copy)`;
  }

  // Create a new question of the same type
  let newQuestion;
  if (questionType === "DominoQuestion") {
    // For domino questions, ensure unique IDs for dominos
    if (questionData.dominos && questionData.dominos.length > 0) {
      let maxId = 0;
      questionData.dominos.forEach((domino) => {
        maxId = Math.max(maxId, domino.id);

        // Ensure each domino has a unique ID in case uniqueId is used
        if (domino.uniqueId) {
          domino.uniqueId = `${domino.uniqueId}_copy_${Date.now()}`;
        }
      });

      // Same for arrows
      if (questionData.arrows && questionData.arrows.length > 0) {
        questionData.arrows.forEach((arrow) => {
          if (arrow.uniqueId) {
            arrow.uniqueId = `${arrow.uniqueId}_copy_${Date.now()}`;
          }
        });
      }
    }

    newQuestion = await DominoQuestion.create(questionData);
  } else {
    newQuestion = await MultipleChoiceQuestion.create(questionData);
  }

  // Update the test's total question count
  const test = await Test.findById(testId);
  if (test) {
    test.totalQuestions = questionCount + 1;
    await test.save();
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
  deleteQuestion,
  validateDominoQuestion,
  moveQuestionPosition,
  duplicateQuestion,
};
