const mongoose = require("mongoose");
const {
  DominoQuestion,
  ArrowQuestion,
  MultipleChoiceQuestion,
  Question,
} = require("../models/question.model");
const { QuestionTemplate } = require("../models/questionTemplate.model");
const Test = require("../models/test.model");
const { AppError } = require("../middleware/errorHandler");
const { StatusCodes } = require("http-status-codes");
const logger = require("../utils/logger");

class QuestionService {
  /**
   * Validate test exists
   */
  async validateTestExists(testId) {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError(
        `Test with ID ${testId} not found`,
        StatusCodes.NOT_FOUND
      );
    }
    return test;
  }

  /**
   * Validate question ID format
   */
  validateQuestionId(questionId) {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
    }
    return mongoose.Types.ObjectId(questionId);
  }

  /**
   * Validate domino question data
   */
  validateDominoQuestionData(questionData) {
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
  }

  /**
   * Validate arrow question data
   */
  validateArrowQuestionData(questionData) {
    // First validate domino data
    this.validateDominoQuestionData(questionData);

    // Then validate arrows if present
    if (
      questionData.arrows &&
      Array.isArray(questionData.arrows) &&
      questionData.arrows.length > 0
    ) {
      const missingArrowCoordinates = questionData.arrows.some(
        (arrow) =>
          arrow.exactX === undefined ||
          arrow.exactY === undefined ||
          arrow.angle === undefined
      );
      if (missingArrowCoordinates) {
        throw new AppError(
          "All arrows must have exactX, exactY, and angle properties",
          StatusCodes.BAD_REQUEST
        );
      }
    }
  }

  /**
   * Validate multiple choice question data
   */
  validateMultipleChoiceQuestionData(questionData) {
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
  }

  /**
   * Create a new question
   */
  async createQuestion(testId, questionData) {
    const test = await this.validateTestExists(testId);
    const questionCount = await Question.countDocuments({ testId });

    const completeQuestionData = {
      ...questionData,
      testId,
      questionNumber: questionCount + 1,
    };

    let question;
    try {
      if (questionData.questionType === "DominoQuestion") {
        this.validateDominoQuestionData(completeQuestionData);
        question = await DominoQuestion.create(completeQuestionData);
        logger.info(`DominoQuestion created successfully: ${question._id}`);
      } else if (questionData.questionType === "ArrowQuestion") {
        this.validateArrowQuestionData(completeQuestionData);
        question = await ArrowQuestion.create(completeQuestionData);
        logger.info(`ArrowQuestion created successfully: ${question._id}`);
      } else if (questionData.questionType === "MultipleChoiceQuestion") {
        this.validateMultipleChoiceQuestionData(completeQuestionData);
        question = await MultipleChoiceQuestion.create(completeQuestionData);
        logger.info(
          `MultipleChoiceQuestion created successfully: ${question._id}`
        );
      } else {
        throw new AppError(
          "Invalid question type specified",
          StatusCodes.BAD_REQUEST
        );
      }
    } catch (creationError) {
      if (creationError.name === "ValidationError") {
        const messages = Object.values(creationError.errors).map(
          (e) => e.message
        );
        throw new AppError(
          `Validation failed during creation: ${messages.join(", ")}`,
          StatusCodes.BAD_REQUEST
        );
      }
      throw new AppError(
        `Failed to create question in database: ${creationError.message}`,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Update test question count
    try {
      test.totalQuestions = questionCount + 1;
      await test.save();
      logger.info(
        `Updated totalQuestions for test ${testId} to ${test.totalQuestions}`
      );
    } catch (testSaveError) {
      logger.error(
        `Error updating totalQuestions for test ${testId}: ${testSaveError.message}`
      );
    }

    logger.info(
      `New question ${question._id} fully processed for test ${testId}`
    );
    return question.toObject();
  }

  /**
   * Get questions by test ID with filters and pagination
   */
  async getQuestionsByTestId(testId, options = {}) {
    const {
      active,
      difficulty,
      sort = "questionNumber",
      limit = 100,
      page = 1,
    } = options;

    const filter = { testId };

    if (active !== undefined) {
      filter.isActive = active === "true";
    }

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const sortOptions = {};
    sortOptions[sort] = 1;

    const totalCount = await Question.countDocuments(filter);
    const questions = await Question.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    return {
      questions: questions.map((q) => q.toObject()),
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
      },
    };
  }

  /**
   * Get a single question by ID
   */
  async getQuestionById(questionId) {
    const objectId = this.validateQuestionId(questionId);
    const question = await Question.findById(objectId);

    if (!question) {
      throw new AppError(
        `Question with ID ${questionId} not found`,
        StatusCodes.NOT_FOUND
      );
    }

    return question.toObject();
  }

  /**
   * Update a question
   */
  async updateQuestion(questionId, updates) {
    const objectId = this.validateQuestionId(questionId);

    // Sanitize updates
    delete updates.questionType;
    delete updates.testId;
    delete updates.questionNumber;

    const existingQuestion = await Question.findById(objectId);

    if (!existingQuestion) {
      throw new AppError(
        `Question with ID ${questionId} not found`,
        StatusCodes.NOT_FOUND
      );
    }

    logger.info(
      `Updating question ${questionId} of type ${existingQuestion.questionType}`
    ); // Validate updates based on question type
    if (existingQuestion.questionType === "MultipleChoiceQuestion") {
      if (updates.propositions) {
        this.validateMultipleChoiceQuestionData({
          propositions: updates.propositions,
        });
      }
      // Remove invalid fields
      delete updates.options;
      delete updates.correctOptionIndex;
      delete updates.allowMultipleCorrect;
      delete updates.randomizeOptions;
    } else if (
      existingQuestion.questionType === "DominoQuestion" ||
      existingQuestion.questionType === "ArrowQuestion"
    ) {
      // Remove invalid fields
      delete updates.propositions;
    }

    let updatedQuestion;
    try {
      // Use the appropriate discriminator model instead of the base Question model
      // This ensures that discriminator-specific fields like correctAnswer are properly updated
      if (existingQuestion.questionType === "DominoQuestion") {
        updatedQuestion = await DominoQuestion.findByIdAndUpdate(
          questionId,
          updates,
          {
            new: true,
            runValidators: true,
            context: "query",
          }
        );
      } else if (existingQuestion.questionType === "ArrowQuestion") {
        updatedQuestion = await ArrowQuestion.findByIdAndUpdate(
          questionId,
          updates,
          {
            new: true,
            runValidators: true,
            context: "query",
          }
        );
      } else if (existingQuestion.questionType === "MultipleChoiceQuestion") {
        updatedQuestion = await MultipleChoiceQuestion.findByIdAndUpdate(
          questionId,
          updates,
          {
            new: true,
            runValidators: true,
            context: "query",
          }
        );
      } else {
        throw new AppError(
          `Unknown question type: ${existingQuestion.questionType}`,
          StatusCodes.BAD_REQUEST
        );
      }
    } catch (error) {
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((e) => e.message);
        throw new AppError(
          `Validation failed: ${messages.join(", ")}`,
          StatusCodes.BAD_REQUEST
        );
      }
      throw new AppError(
        `Error updating question: ${error.message}`,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    if (!updatedQuestion) {
      throw new AppError(
        `Question with ID ${questionId} not found during update`,
        StatusCodes.NOT_FOUND
      );
    }

    logger.info(`Question updated successfully: ${questionId}`);
    return updatedQuestion.toObject();
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId) {
    const objectId = this.validateQuestionId(questionId);
    const existingQuestion = await Question.findById(objectId);

    if (!existingQuestion) {
      throw new AppError(
        `Question with ID ${questionId} not found`,
        StatusCodes.NOT_FOUND
      );
    }

    const { testId, questionNumber } = existingQuestion;

    const deletedQuestion = await Question.findByIdAndDelete(questionId);

    if (!deletedQuestion) {
      throw new AppError(
        `Question with ID ${questionId} not found during deletion`,
        StatusCodes.NOT_FOUND
      );
    }

    // Update question numbers for subsequent questions
    await Question.updateMany(
      { testId, questionNumber: { $gt: questionNumber } },
      { $inc: { questionNumber: -1 } }
    );

    // Update test question count
    const questionCount = await Question.countDocuments({ testId });
    await Test.findByIdAndUpdate(testId, { totalQuestions: questionCount });

    logger.info(`Question deleted: ${questionId}`);
    return { deleted: true };
  }

  /**
   * Validate domino question structure
   */
  async validateDominoQuestionStructure(questionData) {
    const { dominos, correctAnswer, arrows } = questionData;
    const errors = [];

    if (!Array.isArray(dominos)) {
      errors.push("Dominos must be an array");
    } else {
      if (dominos.length < 2) errors.push("At least 2 dominos are required");

      const editableDominos = dominos.filter((d) => d.isEditable === true);
      if (editableDominos.length === 0) {
        errors.push("At least one editable domino is required");
      } else if (editableDominos.length > 1) {
        errors.push("Only one editable domino is allowed");
      }

      for (let i = 0; i < dominos.length; i++) {
        const domino = dominos[i];
        if (domino.exactX === undefined || domino.exactX === null) {
          errors.push(`Domino at index ${i} is missing exactX coordinate`);
        }
        if (domino.exactY === undefined || domino.exactY === null) {
          errors.push(`Domino at index ${i} is missing exactY coordinate`);
        }
      }

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
        if (arrow.exactX === undefined || arrow.exactX === null) {
          errors.push(`Arrow at index ${i} is missing exactX coordinate`);
        }
        if (arrow.exactY === undefined || arrow.exactY === null) {
          errors.push(`Arrow at index ${i} is missing exactY coordinate`);
        }
      }
    }

    if (!correctAnswer) {
      errors.push("correctAnswer is required");
    } else {
      if (correctAnswer.dominoId === undefined) {
        errors.push("correctAnswer must have dominoId");
      }
      if (
        correctAnswer.topValue === undefined ||
        correctAnswer.bottomValue === undefined
      ) {
        errors.push("correctAnswer must have topValue and bottomValue");
      }

      const topValueValid =
        correctAnswer.topValue === null ||
        (correctAnswer.topValue >= 0 && correctAnswer.topValue <= 6);
      const bottomValueValid =
        correctAnswer.bottomValue === null ||
        (correctAnswer.bottomValue >= 0 && correctAnswer.bottomValue <= 6);

      if (!topValueValid) {
        errors.push("correctAnswer.topValue must be null or between 0 and 6");
      }
      if (!bottomValueValid) {
        errors.push(
          "correctAnswer.bottomValue must be null or between 0 and 6"
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Move question position
   */
  async moveQuestionPosition(questionId, newPosition) {
    const targetPosition = parseInt(newPosition);
    if (isNaN(targetPosition) || targetPosition < 1) {
      throw new AppError(
        "newPosition must be a positive integer",
        StatusCodes.BAD_REQUEST
      );
    }

    const objectId = this.validateQuestionId(questionId);
    const question = await Question.findById(objectId);

    if (!question) {
      throw new AppError(
        `Question with ID ${questionId} not found`,
        StatusCodes.NOT_FOUND
      );
    }

    const { testId, questionNumber: currentPosition } = question;
    const totalQuestions = await Question.countDocuments({ testId });

    if (targetPosition > totalQuestions) {
      throw new AppError(
        `Position ${targetPosition} exceeds total questions (${totalQuestions})`,
        StatusCodes.BAD_REQUEST
      );
    }

    if (currentPosition === targetPosition) {
      return {
        message: "Question position unchanged",
        question: question.toObject(),
      };
    }

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

      question.questionNumber = targetPosition;
      await question.save({ session });

      await session.commitTransaction();
      logger.info(
        `Question ${questionId} moved from position ${currentPosition} to ${targetPosition}`
      );

      return {
        message: `Question moved from position ${currentPosition} to ${targetPosition}`,
        question: question.toObject(),
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Error moving question ${questionId}: ${error.message}`);
      throw new AppError(
        "Failed to move question position",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    } finally {
      session.endSession();
    }
  }

  /**
   * Duplicate a question
   */
  async duplicateQuestion(questionId) {
    const objectId = this.validateQuestionId(questionId);
    const originalQuestion = await Question.findById(objectId);

    if (!originalQuestion) {
      throw new AppError(
        `Question with ID ${questionId} not found`,
        StatusCodes.NOT_FOUND
      );
    }

    const questionData = originalQuestion.toObject();
    const { testId, questionType } = questionData;

    // Remove unique fields
    delete questionData._id;
    delete questionData.createdAt;
    delete questionData.updatedAt;
    delete questionData.__v;

    const questionCount = await Question.countDocuments({ testId });
    questionData.questionNumber = questionCount + 1;

    // Add copy suffix to title
    if (questionData.title) {
      questionData.title = `${questionData.title} (copy)`;
    } else {
      questionData.title = `Question ${questionData.questionNumber} (copy)`;
    }

    // Reset analytics
    questionData.analytics = undefined;
    let newQuestion;
    try {
      if (questionType === "DominoQuestion") {
        // Generate unique IDs for dominos/arrows
        if (questionData.dominos) {
          questionData.dominos.forEach((d) => {
            if (d.uniqueId) {
              d.uniqueId = `${d.uniqueId}_copy_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 7)}`;
            }
          });
        }
        if (questionData.arrows) {
          questionData.arrows.forEach((a) => {
            if (a.uniqueId) {
              a.uniqueId = `${a.uniqueId}_copy_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 7)}`;
            }
          });
        }
        newQuestion = await DominoQuestion.create(questionData);
      } else if (questionType === "ArrowQuestion") {
        // Generate unique IDs for dominos/arrows
        if (questionData.dominos) {
          questionData.dominos.forEach((d) => {
            if (d.uniqueId) {
              d.uniqueId = `${d.uniqueId}_copy_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 7)}`;
            }
          });
        }
        if (questionData.arrows) {
          questionData.arrows.forEach((a) => {
            if (a.uniqueId) {
              a.uniqueId = `${a.uniqueId}_copy_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 7)}`;
            }
          });
        }
        newQuestion = await ArrowQuestion.create(questionData);
      } else if (questionType === "MultipleChoiceQuestion") {
        newQuestion = await MultipleChoiceQuestion.create(questionData);
      } else {
        throw new AppError(
          `Cannot duplicate unknown question type: ${questionType}`,
          StatusCodes.BAD_REQUEST
        );
      }
    } catch (error) {
      throw new AppError(
        `Failed to create duplicate question: ${error.message}`,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Update test question count
    const test = await Test.findById(testId);
    if (test) {
      test.totalQuestions = questionCount + 1;
      await test.save();
    }

    logger.info(`Question duplicated from ${questionId} to ${newQuestion._id}`);
    return newQuestion.toObject();
  }
}

module.exports = new QuestionService();
