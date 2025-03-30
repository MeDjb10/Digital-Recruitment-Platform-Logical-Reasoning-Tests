const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");
const { TestAttempt, QuestionResponse, Test } = require("../models");
const { AppError } = require("../middleware/errorHandler");
const logger = require("../utils/logger");
const { DominoQuestion, MultipleChoiceQuestion } = require("../models");

/**
 * Start a new test attempt
 */
const startTestAttempt = async (req, res) => {
  const { testId } = req.params;
  const { candidateId } = req.body;

  // Check if test exists
  const test = await Test.findById(testId);
  if (!test) {
    throw new AppError(
      `Test with ID ${testId} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if candidate has an in-progress attempt
  const existingAttempt = await TestAttempt.findOne({
    testId,
    candidateId,
    status: "in-progress",
  });

  if (existingAttempt) {
    logger.info(
      `Resuming existing test attempt for candidate ${candidateId} on test ${testId}`
    );
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Resuming existing test attempt",
      data: existingAttempt,
    });
  }

  // Get client information
  const userAgent = req.headers["user-agent"];
  const ipAddress =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  // Create new test attempt
  const attempt = await TestAttempt.create({
    testId,
    candidateId,
    device: getUserDevice(userAgent),
    browser: getUserBrowser(userAgent),
    ipAddress,
  });

  // Initialize question responses
  const questions = await getQuestionsForTest(testId);

  // Create a question response for each question
  for (const question of questions) {
    await QuestionResponse.create({
      attemptId: attempt._id,
      questionId: question._id,
      candidateId,
    });
  }

  logger.info(
    `New test attempt created for candidate ${candidateId} on test ${testId}`
  );
  res.status(StatusCodes.CREATED).json({
    success: true,
    data: attempt,
  });
};

/**
 * Get a specific test attempt by ID
 */
const getAttemptById = async (req, res) => {
  const { id } = req.params;
  const attempt = await TestAttempt.findById(id);

  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: attempt,
  });
};

/**
 * Get all questions for a test attempt with responses
 */
const getAttemptQuestions = async (req, res) => {
  const { id } = req.params;

  // Verify the attempt exists
  const attempt = await TestAttempt.findById(id);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Get all questions for the test
  const questions = await getQuestionsForTest(attempt.testId);

  // Get all responses for this attempt
  const responses = await QuestionResponse.find({ attemptId: id });

  // Merge questions with their responses
  const questionsWithResponses = questions.map((question) => {
    const response =
      responses.find(
        (r) => r.questionId.toString() === question._id.toString()
      ) || null;

    // Don't return the correct answer for in-progress attempts
    const questionData = question.toObject();
    if (attempt.status === "in-progress") {
      delete questionData.correctAnswer;
    }

    return {
      ...questionData,
      response: response
        ? {
            id: response._id,
            dominoAnswer: response.dominoAnswer,
            selectedOptions: response.selectedOptions,
            isCorrect: response.isCorrect,
            isSkipped: response.isSkipped,
            isFlagged: response.isFlagged,
            visitCount: response.visitCount,
            lastVisitAt: response.lastVisitAt,
          }
        : null,
    };
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      attempt,
      questions: questionsWithResponses,
    },
  });
};

/**
 * Submit an answer for a specific question in a test attempt
 */
const submitAnswer = async (req, res) => {
  const { attemptId, questionId } = req.params;
  const answerData = req.body;
  const { candidateId } = req.body;

  // Find the test attempt
  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${attemptId} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if test is still in progress
  if (attempt.status !== "in-progress") {
    throw new AppError(
      "Cannot submit answer for a completed test",
      StatusCodes.BAD_REQUEST
    );
  }

  // Verify the candidateId matches the attempt
  if (attempt.candidateId !== candidateId) {
    throw new AppError("Unauthorized attempt access", StatusCodes.FORBIDDEN);
  }

  // Find the question response or create one if it doesn't exist
  let response = await QuestionResponse.findOne({
    attemptId,
    questionId,
    candidateId,
  });

  if (!response) {
    response = await QuestionResponse.create({
      attemptId,
      questionId,
      candidateId,
    });
  }

  // Record the answer
  await response.recordAnswer(answerData.answer);

  // Update the timestamp for the last activity
  attempt.lastActivityAt = new Date();
  await attempt.save();

  logger.info(
    `Answer submitted for question ${questionId} in attempt ${attemptId}`
  );
  res.status(StatusCodes.OK).json({
    success: true,
    data: response,
  });
};

/**
 * Toggle the flagged status of a question
 */
const toggleQuestionFlag = async (req, res) => {
  const { attemptId, questionId } = req.params;
  const { candidateId } = req.body;

  // Find the test attempt
  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${attemptId} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if test is still in progress
  if (attempt.status !== "in-progress") {
    throw new AppError(
      "Cannot flag questions in a completed test",
      StatusCodes.BAD_REQUEST
    );
  }

  // Verify the candidateId matches the attempt
  if (attempt.candidateId !== candidateId) {
    throw new AppError("Unauthorized attempt access", StatusCodes.FORBIDDEN);
  }

  // Find the question response
  let response = await QuestionResponse.findOne({
    attemptId,
    questionId,
    candidateId,
  });

  if (!response) {
    response = await QuestionResponse.create({
      attemptId,
      questionId,
      candidateId,
    });
  }

  // Toggle the flag
  await response.toggleFlag();

  logger.info(
    `Flag toggled for question ${questionId} in attempt ${attemptId}`
  );
  res.status(StatusCodes.OK).json({
    success: true,
    data: response,
  });
};

/**
 * Mark a question as visited
 */
const visitQuestion = async (req, res) => {
  const { attemptId, questionId } = req.params;
  const { candidateId, timeSpent } = req.body;

  // Find the test attempt
  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${attemptId} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if test is still in progress
  if (attempt.status !== "in-progress") {
    throw new AppError(
      "Cannot record visits in a completed test",
      StatusCodes.BAD_REQUEST
    );
  }

  // Verify the candidateId matches the attempt
  if (attempt.candidateId !== candidateId) {
    throw new AppError("Unauthorized attempt access", StatusCodes.FORBIDDEN);
  }

  // Find the question response
  let response = await QuestionResponse.findOne({
    attemptId,
    questionId,
    candidateId,
  });

  if (!response) {
    response = await QuestionResponse.create({
      attemptId,
      questionId,
      candidateId,
    });
  }

  // Record the visit
  await response.recordVisit();

  // Update time spent if provided
  if (timeSpent) {
    response.timeSpent += timeSpent;
    await response.save();
  }

  // Update visit counts in metrics
  if (!attempt.metrics.visitCounts) {
    attempt.metrics.visitCounts = new Map();
  }
  attempt.metrics.visitCounts.set(questionId.toString(), response.visitCount);

  // Update time per question if provided
  if (timeSpent && !attempt.metrics.timePerQuestion) {
    attempt.metrics.timePerQuestion = new Map();
  }
  if (timeSpent) {
    const currentTime =
      attempt.metrics.timePerQuestion.get(questionId.toString()) || 0;
    attempt.metrics.timePerQuestion.set(
      questionId.toString(),
      currentTime + timeSpent
    );
  }

  await attempt.save();

  logger.info(
    `Visit recorded for question ${questionId} in attempt ${attemptId}`
  );
  res.status(StatusCodes.OK).json({
    success: true,
    data: response,
  });
};

/**
 * Skip a question
 */
const skipQuestion = async (req, res) => {
  const { attemptId, questionId } = req.params;
  const { candidateId } = req.body;

  // Find the test attempt
  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${attemptId} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if test is still in progress
  if (attempt.status !== "in-progress") {
    throw new AppError(
      "Cannot skip questions in a completed test",
      StatusCodes.BAD_REQUEST
    );
  }

  // Verify the candidateId matches the attempt
  if (attempt.candidateId !== candidateId) {
    throw new AppError("Unauthorized attempt access", StatusCodes.FORBIDDEN);
  }

  // Find the question response
  let response = await QuestionResponse.findOne({
    attemptId,
    questionId,
    candidateId,
  });

  if (!response) {
    response = await QuestionResponse.create({
      attemptId,
      questionId,
      candidateId,
    });
  }

  // Mark as skipped
  await response.skipQuestion();

  // Update metrics
  attempt.metrics.questionsSkipped =
    (attempt.metrics.questionsSkipped || 0) + 1;
  await attempt.save();

  logger.info(`Question ${questionId} skipped in attempt ${attemptId}`);
  res.status(StatusCodes.OK).json({
    success: true,
    data: response,
  });
};

/**
 * Complete a test attempt
 */
const completeAttempt = async (req, res) => {
  const { id } = req.params;
  const { candidateId } = req.body;

  // Find the test attempt
  const attempt = await TestAttempt.findById(id);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if test is still in progress
  if (attempt.status !== "in-progress") {
    throw new AppError(
      "Test attempt is already completed",
      StatusCodes.BAD_REQUEST
    );
  }

  // Verify the candidateId matches the attempt
  if (attempt.candidateId !== candidateId) {
    throw new AppError("Unauthorized attempt access", StatusCodes.FORBIDDEN);
  }

  // Mark the test as completed
  await attempt.finishAttempt("completed");

  // Calculate the score
  await attempt.calculateScore();

  logger.info(`Test attempt ${id} completed by candidate ${candidateId}`);
  res.status(StatusCodes.OK).json({
    success: true,
    data: attempt,
  });
};

/**
 * Get all attempts for a candidate
 */
const getCandidateAttempts = async (req, res) => {
  const { candidateId } = req.params;
  const { status } = req.query;

  // Build query
  const query = { candidateId };

  if (status) {
    query.status = status;
  }

  const attempts = await TestAttempt.find(query)
    .sort({ startTime: -1 })
    .populate({
      path: "testId",
      select: "name description duration difficulty type",
    });

  res.status(StatusCodes.OK).json({
    success: true,
    count: attempts.length,
    data: attempts,
  });
};

/**
 * Get all attempts for a test
 */
const getTestAttempts = async (req, res) => {
  const { testId } = req.params;
  const { status, page = 1, limit = 20 } = req.query;

  // Build query
  const query = { testId };

  if (status) {
    query.status = status;
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get total count
  const totalCount = await TestAttempt.countDocuments(query);

  // Get paginated attempts
  const attempts = await TestAttempt.find(query)
    .sort({ startTime: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(StatusCodes.OK).json({
    success: true,
    count: attempts.length,
    totalCount,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
    },
    data: attempts,
  });
};

/**
 * Get result details for a completed attempt
 */
const getAttemptResults = async (req, res) => {
  const { id } = req.params;

  // Find the attempt
  const attempt = await TestAttempt.findById(id);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if the attempt is completed
  if (attempt.status !== "completed") {
    throw new AppError(
      "Results are only available for completed tests",
      StatusCodes.BAD_REQUEST
    );
  }

  // Get the test
  const test = await Test.findById(attempt.testId);
  if (!test) {
    throw new AppError(`Test not found`, StatusCodes.NOT_FOUND);
  }

  // Get all questions and responses
  const questions = await getQuestionsForTest(attempt.testId);
  const responses = await QuestionResponse.find({ attemptId: id });

  // Organize results by question
  const questionResults = questions.map((question) => {
    const response = responses.find(
      (r) => r.questionId.toString() === question._id.toString()
    );

    return {
      question: {
        id: question._id,
        title: question.title,
        instruction: question.instruction,
        questionNumber: question.questionNumber,
        questionType: question.questionType,
        difficulty: question.difficulty,
      },
      response: response
        ? {
            dominoAnswer: response.dominoAnswer,
            selectedOptions: response.selectedOptions,
            isCorrect: response.isCorrect,
            isHalfCorrect: response.isHalfCorrect,
            isReversed: response.isReversed,
            isSkipped: response.isSkipped,
            timeSpent: response.timeSpent,
            visitCount: response.visitCount,
          }
        : null,
      correctAnswer:
        question.questionType === "DominoQuestion"
          ? question.correctAnswer
          : { correctOptionIndex: question.correctOptionIndex },
    };
  });

  // Calculate performance metrics
  const correctCount = responses.filter((r) => r.isCorrect).length;
  const halfCorrectCount = responses.filter((r) => r.isHalfCorrect).length;
  const reversedCount = responses.filter((r) => r.isReversed).length;
  const skippedCount = responses.filter((r) => r.isSkipped).length;
  const averageTimePerQuestion =
    responses.length > 0
      ? responses.reduce((sum, r) => sum + r.timeSpent, 0) / responses.length
      : 0;

  const results = {
    attemptId: attempt._id,
    testId: test._id,
    testName: test.name,
    candidateId: attempt.candidateId,
    startTime: attempt.startTime,
    endTime: attempt.endTime,
    timeSpent: attempt.timeSpent,
    score: attempt.score,
    percentageScore: attempt.percentageScore,
    metrics: {
      totalQuestions: questions.length,
      correctCount,
      halfCorrectCount,
      reversedCount,
      skippedCount,
      averageTimePerQuestion,
      ...attempt.metrics,
    },
    questions: questionResults,
  };

  res.status(StatusCodes.OK).json({
    success: true,
    data: results,
  });
};

// Helper function to get questions for a test
const getQuestionsForTest = async (testId) => {
  // Get all domino questions
  const dominoQuestions = await DominoQuestion.find({ testId }).sort(
    "questionNumber"
  );

  // Get all multiple choice questions
  const mcQuestions = await MultipleChoiceQuestion.find({ testId }).sort(
    "questionNumber"
  );

  // Combine and sort all questions
  return [...dominoQuestions, ...mcQuestions].sort(
    (a, b) => a.questionNumber - b.questionNumber
  );
};

// Helper functions for user device/browser detection
const getUserDevice = (userAgent = "") => {
  if (!userAgent) return "Unknown";

  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/windows phone/i.test(userAgent)) return "Windows Phone";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/macintosh|mac os/i.test(userAgent)) return "Mac";
  if (/linux/i.test(userAgent)) return "Linux";

  return "Unknown";
};

const getUserBrowser = (userAgent = "") => {
  if (!userAgent) return "Unknown";

  if (/chrome/i.test(userAgent)) return "Chrome";
  if (/firefox/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent)) return "Safari";
  if (/msie|trident/i.test(userAgent)) return "Internet Explorer";
  if (/edge/i.test(userAgent)) return "Edge";
  if (/opera|opr/i.test(userAgent)) return "Opera";

  return "Unknown";
};

module.exports = {
  startTestAttempt,
  getAttemptById,
  getAttemptQuestions,
  submitAnswer,
  toggleQuestionFlag,
  visitQuestion,
  skipQuestion,
  completeAttempt,
  getCandidateAttempts,
  getTestAttempts,
  getAttemptResults,

  getUserDevice,
  getUserBrowser,
  getQuestionsForTest,
};
