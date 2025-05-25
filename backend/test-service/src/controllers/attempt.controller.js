const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");
const { AppError } = require("../middleware/errorHandler");
const attemptService = require("../services/attempt.service");

class AttemptController {
  /**
   * Start a new test attempt
   */
  async startTestAttempt(req, res) {
    const { testId } = req.params;
    const { candidateId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      throw new AppError("Invalid test ID format", StatusCodes.BAD_REQUEST);
    }

    if (!candidateId) {
      throw new AppError(
        "Candidate ID is required in the request body",
        StatusCodes.BAD_REQUEST
      );
    }

    const userAgent = req.headers["user-agent"] || "";
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",").shift() ||
      req.socket?.remoteAddress ||
      "Unknown";

    const result = await attemptService.startTestAttempt(
      testId,
      candidateId,
      userAgent,
      ipAddress
    );

    const statusCode = result.isResume ? StatusCodes.OK : StatusCodes.CREATED;
    const message = result.isResume
      ? "Resuming existing test attempt"
      : "Test attempt started successfully";

    res.status(statusCode).json({
      success: true,
      message,
      data: result.attempt,
    });
  }

  /**
   * Get a specific test attempt by ID
   */
  async getAttemptById(req, res) {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
    }

    const attempt = await attemptService.getAttemptById(id, {
      path: "testId",
      select: "name description duration difficulty category type",
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: attempt,
    });
  }

  /**
   * Get all questions for a test attempt with responses
   */
  async getAttemptQuestions(req, res) {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
    }

    const data = await attemptService.getAttemptQuestions(id);

    res.status(StatusCodes.OK).json({
      success: true,
      data,
    });
  }

  /**
   * Submit an answer for a specific question in a test attempt
   */
  async submitAnswer(req, res) {
    const { attemptId, questionId } = req.params;
    const { candidateId, answer } = req.body;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
    }
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
    }
    if (!candidateId) {
      throw new AppError(
        "Candidate ID is required in the request body",
        StatusCodes.BAD_REQUEST
      );
    }
    if (answer === undefined) {
      throw new AppError(
        "Answer data is required in the request body",
        StatusCodes.BAD_REQUEST
      );
    }

    const responseData = await attemptService.submitAnswer(
      attemptId,
      questionId,
      candidateId,
      answer
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: responseData,
    });
  }

  /**
   * Toggle the flagged status of a question
   */
  async toggleQuestionFlag(req, res) {
    const { attemptId, questionId } = req.params;
    const { candidateId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
    }
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
    }
    if (!candidateId) {
      throw new AppError(
        "Candidate ID is required in the request body",
        StatusCodes.BAD_REQUEST
      );
    }

    const responseData = await attemptService.toggleQuestionFlag(
      attemptId,
      questionId,
      candidateId
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: responseData,
    });
  }

  /**
   * Mark a question as visited and update time spent
   */
  async visitQuestion(req, res) {
    const { attemptId, questionId } = req.params;
    const { candidateId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
    }
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
    }
    if (!candidateId) {
      throw new AppError(
        "Candidate ID is required in the request body",
        StatusCodes.BAD_REQUEST
      );
    }

    const data = await attemptService.visitQuestion(
      attemptId,
      questionId,
      candidateId
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data,
    });
  }

  /**
   * Update time spent on a specific question
   */
  async updateTimeSpent(req, res) {
    const { attemptId, questionId } = req.params;
    const { candidateId, timeSpent } = req.body;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
    }
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
    }
    if (!candidateId) {
      throw new AppError(
        "Candidate ID is required in the request body",
        StatusCodes.BAD_REQUEST
      );
    }
    if (typeof timeSpent !== "number" || timeSpent < 0) {
      throw new AppError(
        "Valid timeSpent (in milliseconds) is required",
        StatusCodes.BAD_REQUEST
      );
    }

    const data = await attemptService.updateTimeSpent(
      attemptId,
      questionId,
      candidateId,
      timeSpent
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data,
    });
  }

  /**
   * Skip a question
   */
  async skipQuestion(req, res) {
    const { attemptId, questionId } = req.params;
    const { candidateId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
    }
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
    }
    if (!candidateId) {
      throw new AppError(
        "Candidate ID is required in the request body",
        StatusCodes.BAD_REQUEST
      );
    }

    const responseData = await attemptService.skipQuestion(
      attemptId,
      questionId,
      candidateId
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: responseData,
    });
  }

  /**
   * Complete a test attempt
   */
  async completeAttempt(req, res) {
    const { id } = req.params;
    const { candidateId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
    }
    if (!candidateId) {
      throw new AppError(
        "Candidate ID is required in the request body",
        StatusCodes.BAD_REQUEST
      );
    }

    const result = await attemptService.completeAttempt(id, candidateId);

    let message = "Test attempt completed successfully";
    if (result.wasAlreadyCompleted) {
      message = "Attempt already completed";
    } else if (!result.success) {
      message = "Test attempt completed but score calculation failed";
    }

    const response = {
      success: true,
      message,
      data: result.attempt,
    };

    if (result.warning) {
      response.warning = result.warning;
    }
    if (result.error) {
      response.error = result.error;
    }

    res.status(StatusCodes.OK).json(response);
  }

  /**
   * Get all attempts for a candidate
   */
  async getCandidateAttempts(req, res) {
    const { candidateId } = req.params;
    const { status, testId } = req.query;

    // Validate filters
    if (
      status &&
      !["in-progress", "completed", "timed-out", "abandoned"].includes(status)
    ) {
      throw new AppError(
        "Invalid status filter value",
        StatusCodes.BAD_REQUEST
      );
    }
    if (testId && !mongoose.Types.ObjectId.isValid(testId)) {
      throw new AppError(
        "Invalid test ID format for filter",
        StatusCodes.BAD_REQUEST
      );
    }

    const filters = {};
    if (status) filters.status = status;
    if (testId) filters.testId = testId;

    const attempts = await attemptService.getCandidateAttempts(
      candidateId,
      filters
    );

    res.status(StatusCodes.OK).json({
      success: true,
      count: attempts.length,
      data: attempts,
    });
  }

  /**
   * Get all attempts for a test
   */
  async getTestAttempts(req, res) {
    const { testId } = req.params;
    const options = req.query;

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      throw new AppError("Invalid test ID format", StatusCodes.BAD_REQUEST);
    }

    // Validate status filter
    if (
      options.status &&
      !["in-progress", "completed", "timed-out", "abandoned"].includes(
        options.status
      )
    ) {
      throw new AppError(
        "Invalid status filter value",
        StatusCodes.BAD_REQUEST
      );
    }

    const result = await attemptService.getTestAttempts(testId, options);

    res.status(StatusCodes.OK).json({
      success: true,
      count: result.attempts.length,
      totalCount: result.pagination.totalCount,
      pagination: result.pagination,
      data: result.attempts,
    });
  }

  /**
   * Get comprehensive result details for a completed attempt
   */
  async getAttemptResults(req, res) {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
    }

    const results = await attemptService.getAttemptResults(id);

    res.status(StatusCodes.OK).json({
      success: true,
      data: results,
    });
  }
}

const attemptController = new AttemptController();

module.exports = {
  startTestAttempt: attemptController.startTestAttempt.bind(attemptController),
  getAttemptById: attemptController.getAttemptById.bind(attemptController),
  getAttemptQuestions:
    attemptController.getAttemptQuestions.bind(attemptController),
  submitAnswer: attemptController.submitAnswer.bind(attemptController),
  toggleQuestionFlag:
    attemptController.toggleQuestionFlag.bind(attemptController),
  visitQuestion: attemptController.visitQuestion.bind(attemptController),
  updateTimeSpent: attemptController.updateTimeSpent.bind(attemptController),
  skipQuestion: attemptController.skipQuestion.bind(attemptController),
  completeAttempt: attemptController.completeAttempt.bind(attemptController),
  getCandidateAttempts:
    attemptController.getCandidateAttempts.bind(attemptController),
  getTestAttempts: attemptController.getTestAttempts.bind(attemptController),
  getAttemptResults:
    attemptController.getAttemptResults.bind(attemptController),
};
