const mongoose = require("mongoose");
const { TestAttempt, QuestionResponse, Test, Question } = require("../models");
const { AppError } = require("../middleware/errorHandler");
const logger = require("../utils/logger");

class AttemptService {
  /**
   * Get questions for a test using base model
   */
  async getQuestionsForTest(testId) {
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      throw new Error("Invalid test ID format provided to getQuestionsForTest");
    }
    return await Question.find({ testId }).sort("questionNumber");
  }

  /**
   * Get user device from user agent
   */
  getUserDevice(userAgent = "") {
    if (!userAgent) return "Unknown";

    const ua = userAgent.toLowerCase();

    if (ua.includes("android")) return "Android";
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod"))
      return "iOS";
    if (ua.includes("windows phone")) return "Windows Phone";
    if (ua.includes("win")) return "Windows";
    if (ua.includes("macintosh") || ua.includes("mac os")) return "Mac";
    if (ua.includes("linux") && !ua.includes("android")) return "Linux";
    if (ua.includes("cros")) return "Chrome OS";

    return "Unknown";
  }

  /**
   * Get user browser from user agent
   */
  getUserBrowser(userAgent = "") {
    if (!userAgent) return "Unknown";

    const ua = userAgent.toLowerCase();

    if (ua.includes("edg")) return "Edge";
    if (ua.includes("opr") || ua.includes("opera")) return "Opera";
    if (ua.includes("chrome") && !ua.includes("chromium")) return "Chrome";
    if (ua.includes("firefox")) return "Firefox";
    if (ua.includes("safari") && !ua.includes("chrome") && !ua.includes("edg"))
      return "Safari";
    if (ua.includes("msie") || ua.includes("trident"))
      return "Internet Explorer";

    return "Unknown";
  }

  /**
   * Validate test and check if it's active
   */
  async validateTestExists(testId) {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError(
        `Test with ID ${testId} not found`,
        StatusCodes.NOT_FOUND
      );
    }
    if (!test.isActive) {
      throw new AppError(
        `Test with ID ${testId} is not active`,
        StatusCodes.FORBIDDEN
      );
    }
    return test;
  }

  /**
   * Check for existing attempts
   */
  async checkExistingAttempts(testId, candidateId) {
    const existingAttempt = await TestAttempt.findOne({
      testId,
      candidateId,
      status: "in-progress",
    });

    const completedAttempt = await TestAttempt.findOne({
      testId,
      candidateId,
      status: "completed",
    });

    return { existingAttempt, completedAttempt };
  }

  /**
   * Create question responses in batches
   */
  async createQuestionResponses(attemptId, candidateId, questions) {
    const batchSize = 10;

    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const responsePromises = batch.map((question) =>
        QuestionResponse.create({
          attemptId,
          questionId: question._id,
          candidateId,
        }).catch((error) => {
          logger.error(
            `Failed to create response for question ${question._id}:`,
            error
          );
          throw error;
        })
      );

      try {
        await Promise.all(responsePromises);
        logger.info(
          `Created responses for batch ${
            Math.floor(i / batchSize) + 1
          }/${Math.ceil(questions.length / batchSize)}`
        );
      } catch (error) {
        logger.error(`Failed to create response batch:`, error);
        throw error;
      }
    }
  }

  /**
   * Start a new test attempt
   */
  async startTestAttempt(testId, candidateId, userAgent, ipAddress) {
    const test = await this.validateTestExists(testId);
    const { existingAttempt, completedAttempt } =
      await this.checkExistingAttempts(testId, candidateId);

    if (existingAttempt) {
      logger.info(
        `Resuming existing test attempt ${existingAttempt._id} for candidate ${candidateId} on test ${testId}`
      );
      existingAttempt.lastActivityAt = new Date();
      await existingAttempt.save();
      return { attempt: existingAttempt, isResume: true };
    }

    if (completedAttempt) {
      throw new AppError(
        `Candidate ${candidateId} has already completed test ${testId}`,
        StatusCodes.CONFLICT
      );
    }

    logger.info(
      `Creating new test attempt for candidate ${candidateId} on test ${testId}`
    );

    const attempt = await TestAttempt.create({
      testId,
      candidateId,
      device: this.getUserDevice(userAgent),
      browser: this.getUserBrowser(userAgent),
      ipAddress,
      startTime: new Date(),
      lastActivityAt: new Date(),
    });

    logger.info(`Test attempt ${attempt._id} created successfully`);

    const questions = await this.getQuestionsForTest(testId);

    if (questions.length === 0) {
      logger.warn(
        `Test ${testId} has no questions. Attempt ${attempt._id} created but may be problematic.`
      );
    }

    logger.info(`Initializing ${questions.length} question responses`);
    await this.createQuestionResponses(attempt._id, candidateId, questions);

    logger.info(
      `New test attempt ${attempt._id} created successfully for candidate ${candidateId} on test ${testId}`
    );

    return { attempt, isResume: false };
  }

  /**
   * Get attempt by ID with optional population
   */
  async getAttemptById(id, populate = null) {
    const query = TestAttempt.findById(id);

    if (populate) {
      query.populate(populate);
    }

    const attempt = await query;
    if (!attempt) {
      throw new AppError(
        `Attempt with ID ${id} not found`,
        StatusCodes.NOT_FOUND
      );
    }

    return attempt;
  }

  /**
   * Get questions with responses for an attempt
   */
  async getAttemptQuestions(attemptId) {
    const attempt = await this.getAttemptById(attemptId);
    const questions = await this.getQuestionsForTest(attempt.testId);
    const responses = await QuestionResponse.find({ attemptId });

    const questionsWithResponses = questions.map((question) => {
      const response = responses.find(
        (r) => r.questionId.toString() === question._id.toString()
      );

      const questionData = question.toObject();
      if (attempt.status === "in-progress") {
        delete questionData.correctAnswer;
        if (questionData.propositions) {
          questionData.propositions = questionData.propositions.map(
            ({ text }) => ({ text })
          );
        }
      }

      let responseData = null;
      if (response) {
        responseData = {
          _id: response._id,
          dominoAnswer: response.dominoAnswer,
          propositionResponses: response.propositionResponses,
          isCorrect: response.isCorrect,
          isSkipped: response.isSkipped,
          isFlagged: response.isFlagged,
          visitCount: response.visitCount,
          lastVisitAt: response.lastVisitAt,
          answeredAt: response.answeredAt,
          timeSpent: response.timeSpent,
        };
      }

      return {
        ...questionData,
        response: responseData,
      };
    });

    return {
      attempt: attempt.toObject(),
      questions: questionsWithResponses,
    };
  }

  /**
   * Find or create question response
   */
  async findOrCreateQuestionResponse(attemptId, questionId, candidateId) {
    let response = await QuestionResponse.findOne({
      attemptId,
      questionId,
    });

    if (!response) {
      logger.error(
        `QuestionResponse not found for attempt ${attemptId}, question ${questionId}. Creating.`
      );
      response = await QuestionResponse.create({
        attemptId,
        questionId,
        candidateId,
      });
    }

    return response;
  }

  /**
   * Validate attempt access
   */
  async validateAttemptAccess(
    attemptId,
    candidateId,
    allowedStatuses = ["in-progress"]
  ) {
    const attempt = await this.getAttemptById(attemptId);

    if (!allowedStatuses.includes(attempt.status)) {
      throw new AppError(
        `Cannot perform this action on a test attempt with status: ${attempt.status}`,
        StatusCodes.BAD_REQUEST
      );
    }

    if (attempt.candidateId !== candidateId) {
      throw new AppError(
        "Unauthorized: Candidate ID does not match the attempt",
        StatusCodes.FORBIDDEN
      );
    }

    return attempt;
  }

  /**
   * Submit an answer for a question
   */
  async submitAnswer(attemptId, questionId, candidateId, answer) {
    const attempt = await this.validateAttemptAccess(attemptId, candidateId);
    const response = await this.findOrCreateQuestionResponse(
      attemptId,
      questionId,
      attempt.candidateId
    );

    await response.recordAnswer(answer);

    attempt.lastActivityAt = new Date();
    await attempt.save();

    logger.info(
      `Answer submitted for question ${questionId} in attempt ${attemptId}`
    );

    return response.toObject();
  }

  /**
   * Toggle question flag
   */
  async toggleQuestionFlag(attemptId, questionId, candidateId) {
    const attempt = await this.validateAttemptAccess(attemptId, candidateId);
    const response = await this.findOrCreateQuestionResponse(
      attemptId,
      questionId,
      attempt.candidateId
    );

    await response.toggleFlag();

    attempt.lastActivityAt = new Date();
    await attempt.save();

    logger.info(
      `Flag toggled for question ${questionId} in attempt ${attemptId}. New status: ${response.isFlagged}`
    );

    return response.toObject();
  }

  /**
   * Record question visit
   */
  async visitQuestion(attemptId, questionId, candidateId) {
    const attempt = await this.validateAttemptAccess(attemptId, candidateId);
    const response = await this.findOrCreateQuestionResponse(
      attemptId,
      questionId,
      attempt.candidateId
    );

    await response.recordVisit();

    if (!attempt.metrics.visitCounts) {
      attempt.metrics.visitCounts = new Map();
    }
    attempt.metrics.visitCounts.set(questionId.toString(), response.visitCount);

    attempt.lastActivityAt = new Date();
    attempt.markModified("metrics");
    await attempt.save();

    logger.info(
      `Visit recorded for question ${questionId} in attempt ${attemptId}. Visit count: ${response.visitCount}`
    );

    return {
      questionId,
      visitCount: response.visitCount,
      message: "Visit recorded successfully",
    };
  }

  /**
   * Update time spent on a question
   */
  async updateTimeSpent(attemptId, questionId, candidateId, timeSpent) {
    const attempt = await this.validateAttemptAccess(attemptId, candidateId);
    const response = await this.findOrCreateQuestionResponse(
      attemptId,
      questionId,
      attempt.candidateId
    );

    // Update the response time
    response.timeSpent = (response.timeSpent || 0) + timeSpent;
    await response.save();

    // Initialize metrics if needed
    if (!attempt.metrics.timePerQuestion) {
      attempt.metrics.timePerQuestion = new Map();
    }

    // FIXED: Always sync with the response's total time
    attempt.metrics.timePerQuestion.set(
      questionId.toString(),
      response.timeSpent
    );

    attempt.lastActivityAt = new Date();
    attempt.markModified("metrics");
    await attempt.save();

    logger.info(
      `Time updated for question ${questionId} in attempt ${attemptId}. Added: ${timeSpent}ms, Total: ${response.timeSpent}ms`
    );

    return {
      questionId,
      timeAdded: timeSpent,
      totalTimeSpent: response.timeSpent,
      message: "Time spent updated successfully",
    };
  }

  /**
   * Skip a question
   */
  async skipQuestion(attemptId, questionId, candidateId) {
    const attempt = await this.validateAttemptAccess(attemptId, candidateId);
    const response = await this.findOrCreateQuestionResponse(
      attemptId,
      questionId,
      attempt.candidateId
    );

    await response.skipQuestion();

    attempt.lastActivityAt = new Date();
    await attempt.save();

    logger.info(`Question ${questionId} skipped in attempt ${attemptId}`);
    return response.toObject();
  }

  /**
   * Complete an attempt with force update fallback
   */
  async completeAttempt(attemptId, candidateId) {
    const attempt = await this.getAttemptById(attemptId);

    if (attempt.status === "completed") {
      logger.info(
        `Attempt ${attemptId} was already completed. Returning existing data.`
      );
      return { attempt: attempt.toObject(), wasAlreadyCompleted: true };
    }

    if (attempt.status !== "in-progress") {
      throw new AppError(
        `Test attempt status is already ${attempt.status}`,
        StatusCodes.BAD_REQUEST
      );
    }

    if (attempt.candidateId !== candidateId) {
      throw new AppError(
        "Unauthorized: Candidate ID does not match the attempt",
        StatusCodes.FORBIDDEN
      );
    }

    try {
      // ADDED: Ensure all question times are synced before completion
      await this.syncAllQuestionTimes(attemptId);

      await attempt.finishAttempt("completed");
      const updatedAttempt = await attempt.calculateScore();

      // Force update using findByIdAndUpdate as backup
      await TestAttempt.findByIdAndUpdate(
        attemptId,
        {
          $set: {
            "metrics.questionsAnswered":
              updatedAttempt.metrics.questionsAnswered,
            "metrics.questionsSkipped": updatedAttempt.metrics.questionsSkipped,
            "metrics.questionsTotal": updatedAttempt.metrics.questionsTotal,
            "metrics.answerChanges": updatedAttempt.metrics.answerChanges,
            "metrics.flaggedQuestions": updatedAttempt.metrics.flaggedQuestions,
            "metrics.correctAnswers": updatedAttempt.metrics.correctAnswers,
            "metrics.halfCorrectAnswers":
              updatedAttempt.metrics.halfCorrectAnswers,
            "metrics.reversedAnswers": updatedAttempt.metrics.reversedAnswers,
            "metrics.totalPropositionsCorrect":
              updatedAttempt.metrics.totalPropositionsCorrect,
            "metrics.totalPropositionsAttempted":
              updatedAttempt.metrics.totalPropositionsAttempted,
            "metrics.propositionAccuracy":
              updatedAttempt.metrics.propositionAccuracy,
            "metrics.completionRate": updatedAttempt.metrics.completionRate,
            "metrics.averageTimePerQuestion":
              updatedAttempt.metrics.averageTimePerQuestion,
            "metrics.totalTimeSpent": updatedAttempt.metrics.totalTimeSpent,
            "metrics.averageVisitsPerQuestion":
              updatedAttempt.metrics.averageVisitsPerQuestion,
            score: updatedAttempt.score,
            percentageScore: updatedAttempt.percentageScore,
          },
        },
        { new: true }
      );

      const finalAttempt = await TestAttempt.findById(attemptId);

      logger.info(
        `Test attempt ${attemptId} completed by candidate ${candidateId}. Score: ${finalAttempt.score}/${finalAttempt.percentageScore}%`
      );

      return {
        attempt: finalAttempt.toObject(),
        wasAlreadyCompleted: false,
        success: true,
      };
    } catch (error) {
      logger.error(`Error completing attempt ${attemptId}:`, error);

      if (attempt.status === "in-progress") {
        await attempt.finishAttempt("completed");
      }

      const finalAttempt = await TestAttempt.findById(attemptId);

      return {
        attempt: finalAttempt.toObject(),
        wasAlreadyCompleted: false,
        success: false,
        error: error.message,
        warning: "Metrics may not be accurate due to calculation error",
      };
    }
  }

  /**
   * NEW METHOD: Sync time data for all questions before completion
   */
  async syncAllQuestionTimes(attemptId) {
    try {
      const responses = await QuestionResponse.find({ attemptId });
      const attempt = await TestAttempt.findById(attemptId);

      if (!attempt.metrics.timePerQuestion) {
        attempt.metrics.timePerQuestion = new Map();
      }

      // Sync ALL question times from responses
      responses.forEach((response) => {
        if (response.questionId && response.timeSpent >= 0) {
          attempt.metrics.timePerQuestion.set(
            response.questionId.toString(),
            response.timeSpent
          );
        }
      });

      attempt.markModified("metrics");
      await attempt.save();

      logger.info(
        `Synced time data for ${responses.length} questions in attempt ${attemptId}`
      );
    } catch (error) {
      logger.error(
        `Error syncing question times for attempt ${attemptId}:`,
        error
      );
      // Don't throw - this is not critical enough to fail the completion
    }
  }

  /**
   * Get candidate attempts with filters
   */
  async getCandidateAttempts(candidateId, filters = {}) {
    const query = { candidateId };

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.testId) {
      query.testId = filters.testId;
    }

    const attempts = await TestAttempt.find(query)
      .sort({ startTime: -1 })
      .populate({
        path: "testId",
        select: "name description duration difficulty type category",
      });

    return attempts.map((a) => a.toObject());
  }

  /**
   * Get test attempts with pagination and filters
   */
  async getTestAttempts(testId, options = {}) {
    const {
      status,
      candidateId,
      page = 1,
      limit = 20,
      sort = "startTime",
      order = "desc",
    } = options;

    const query = { testId };

    if (status) {
      query.status = status;
    }
    if (candidateId) {
      query.candidateId = candidateId;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    const validSortFields = [
      "startTime",
      "endTime",
      "score",
      "percentageScore",
      "status",
      "candidateId",
    ];

    if (validSortFields.includes(sort)) {
      sortOptions[sort] = order === "asc" ? 1 : -1;
    } else {
      sortOptions["startTime"] = -1;
    }

    const totalCount = await TestAttempt.countDocuments(query);
    const attempts = await TestAttempt.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    return {
      attempts: attempts.map((a) => a.toObject()),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
      },
    };
  }

  /**
   * Get comprehensive attempt results
   */
  async getAttemptResults(attemptId) {
    const attempt = await TestAttempt.findById(attemptId).populate("testId");

    if (!attempt) {
      throw new AppError(
        `Attempt with ID ${attemptId} not found`,
        StatusCodes.NOT_FOUND
      );
    }

    if (!["completed", "timed-out"].includes(attempt.status)) {
      throw new AppError(
        `Results are only available for completed or timed-out tests. Current status: ${attempt.status}`,
        StatusCodes.BAD_REQUEST
      );
    }

    const test = attempt.testId;
    if (!test) {
      throw new AppError(
        `Test associated with attempt ${attemptId} not found`,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const questions = await this.getQuestionsForTest(attempt.testId.id);
    const responses = await QuestionResponse.find({ attemptId });

    // Build comprehensive results
    const questionResults = this.buildQuestionResults(questions, responses);
    const performanceAnalytics = this.calculatePerformanceAnalytics(
      questions,
      responses
    );
    const attemptData = this.buildAttemptData(attempt, test);

    const results = {
      attempt: attemptData,
      questions: questionResults,
      analytics: performanceAnalytics,
      summary: this.calculateSummaryMetrics(performanceAnalytics),
    };

    return results;
  }

  /**
   * Build question results with response data
   */
  buildQuestionResults(questions, responses) {
    return questions.map((question) => {
      const response = responses.find(
        (r) => r.questionId.toString() === question._id.toString()
      );

      let correctAnswerDetails = null;
      if (question.questionType === "DominoQuestion") {
        correctAnswerDetails = question.correctAnswer;
      } else if (question.questionType === "MultipleChoiceQuestion") {
        correctAnswerDetails = {
          propositions:
            question.propositions?.map((p) => ({
              text: p.text,
              correctEvaluation: p.correctEvaluation,
            })) || [],
        };
      }

      const questionData = {
        _id: question._id,
        title: question.title,
        instruction: question.instruction,
        questionNumber: question.questionNumber,
        questionType: question.questionType,
        difficulty: question.difficulty,
        layoutType: question.layoutType,
        pattern: question.pattern,
      };

      const responseData = response
        ? this.buildResponseData(response, question)
        : null;

      return {
        question: questionData,
        response: responseData,
        correctAnswer: correctAnswerDetails,
      };
    });
  }

  /**
   * Build detailed response data
   */
  buildResponseData(response, question) {
    const baseResponseData = {
      _id: response._id,
      dominoAnswer: response.dominoAnswer,
      propositionResponses: response.propositionResponses,
      isCorrect: response.isCorrect,
      isHalfCorrect: response.isHalfCorrect,
      isReversed: response.isReversed,
      isSkipped: response.isSkipped,
      isFlagged: response.isFlagged,
      timeSpent: response.timeSpent,
      visitCount: response.visitCount,
      answerChanges: response.answerChanges,
      firstVisitAt: response.firstVisitAt,
      lastVisitAt: response.lastVisitAt,
      answeredAt: response.answeredAt,
      events: response.events,
      averageTimePerVisit:
        response.visitCount > 0 ? response.timeSpent / response.visitCount : 0,
      wasAnswered:
        !response.isSkipped &&
        (response.dominoAnswer ||
          (response.propositionResponses &&
            response.propositionResponses.length > 0)),
    };

    // Add question-specific analysis
    if (question.questionType === "DominoQuestion" && response.dominoAnswer) {
      baseResponseData.dominoAnalysis = {
        providedTopValue: response.dominoAnswer.topValue,
        providedBottomValue: response.dominoAnswer.bottomValue,
        correctTopValue: question.correctAnswer?.topValue,
        correctBottomValue: question.correctAnswer?.bottomValue,
        isExactMatch: response.isCorrect,
        isReversedMatch: response.isReversed,
        isPartialMatch: response.isHalfCorrect,
      };
    }

    if (
      question.questionType === "MultipleChoiceQuestion" &&
      response.propositionResponses
    ) {
      baseResponseData.propositionAnalysis = {
        totalPropositions: question.propositions?.length || 0,
        answeredPropositions: response.propositionResponses.length,
        correctPropositions: response.propositionResponses.filter(
          (p) => p.isCorrect
        ).length,
        skippedPropositions: response.propositionResponses.filter(
          (p) => p.candidateEvaluation === "X"
        ).length,
        accuracyRate:
          response.propositionResponses.length > 0
            ? (response.propositionResponses.filter((p) => p.isCorrect).length /
                response.propositionResponses.length) *
              100
            : 0,
      };
    }

    return baseResponseData;
  }

  /**
   * Calculate comprehensive performance analytics
   */
  calculatePerformanceAnalytics(questions, responses) {
    const answeredResponses = responses.filter((r) => {
      if (r.isSkipped) return false;

      if (r.dominoAnswer && typeof r.dominoAnswer === "object") {
        return (
          r.dominoAnswer.dominoId !== undefined &&
          r.dominoAnswer.topValue !== undefined &&
          r.dominoAnswer.bottomValue !== undefined &&
          r.dominoAnswer.dominoId !== null
        );
      }

      if (r.propositionResponses && Array.isArray(r.propositionResponses)) {
        return r.propositionResponses.length > 0;
      }

      return false;
    });

    const incorrectAnswers = responses.filter((r) => {
      if (r.isSkipped || r.isCorrect) return false;

      if (r.dominoAnswer && typeof r.dominoAnswer === "object") {
        return (
          r.dominoAnswer.dominoId !== undefined &&
          r.dominoAnswer.topValue !== undefined &&
          r.dominoAnswer.bottomValue !== undefined &&
          r.dominoAnswer.dominoId !== null
        );
      }

      if (r.propositionResponses && Array.isArray(r.propositionResponses)) {
        return r.propositionResponses.length > 0;
      }

      return false;
    });

    return {
      totalQuestions: questions.length,
      questionsAnswered: answeredResponses.length,
      questionsSkipped: responses.filter((r) => r.isSkipped).length,
      questionsFlagged: responses.filter((r) => r.isFlagged).length,
      correctAnswers: responses.filter((r) => r.isCorrect).length,
      halfCorrectAnswers: responses.filter((r) => r.isHalfCorrect).length,
      reversedAnswers: responses.filter((r) => r.isReversed).length,
      incorrectAnswers: incorrectAnswers.length,
      totalTimeSpent: responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0),
      averageTimePerQuestion:
        responses.length > 0
          ? responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) /
            responses.length
          : 0,
      fastestQuestion:
        responses.length > 0
          ? Math.min(...responses.map((r) => r.timeSpent || 0))
          : 0,
      slowestQuestion:
        responses.length > 0
          ? Math.max(...responses.map((r) => r.timeSpent || 0))
          : 0,
      totalVisits: responses.reduce((sum, r) => sum + (r.visitCount || 0), 0),
      averageVisitsPerQuestion:
        responses.length > 0
          ? responses.reduce((sum, r) => sum + (r.visitCount || 0), 0) /
            responses.length
          : 0,
      totalAnswerChanges: responses.reduce(
        (sum, r) => sum + (r.answerChanges || 0),
        0
      ),
      dominoQuestionStats: this.calculateDominoStats(questions, responses),
      mcqQuestionStats: this.calculateMcqStats(questions, responses),
      difficultyPerformance: this.calculateDifficultyPerformance(
        questions,
        responses
      ),
    };
  }

  /**
   * Calculate domino question statistics
   */
  calculateDominoStats(questions, responses) {
    return {
      total: questions.filter((q) => q.questionType === "DominoQuestion")
        .length,
      correct: responses.filter((r) => {
        const q = questions.find(
          (question) => question._id.toString() === r.questionId.toString()
        );
        return q?.questionType === "DominoQuestion" && r.isCorrect;
      }).length,
      halfCorrect: responses.filter((r) => {
        const q = questions.find(
          (question) => question._id.toString() === r.questionId.toString()
        );
        return q?.questionType === "DominoQuestion" && r.isHalfCorrect;
      }).length,
      reversed: responses.filter((r) => {
        const q = questions.find(
          (question) => question._id.toString() === r.questionId.toString()
        );
        return q?.questionType === "DominoQuestion" && r.isReversed;
      }).length,
    };
  }

  /**
   * Calculate MCQ question statistics
   */
  calculateMcqStats(questions, responses) {
    return {
      total: questions.filter(
        (q) => q.questionType === "MultipleChoiceQuestion"
      ).length,
      totalPropositions: questions
        .filter((q) => q.questionType === "MultipleChoiceQuestion")
        .reduce((sum, q) => sum + (q.propositions?.length || 0), 0),
      correctPropositions: responses
        .filter((r) => r.propositionResponses)
        .reduce(
          (sum, r) =>
            sum +
            (r.propositionResponses?.filter((p) => p.isCorrect).length || 0),
          0
        ),
    };
  }

  /**
   * Calculate difficulty-based performance
   */
  calculateDifficultyPerformance(questions, responses) {
    const difficulties = ["easy", "medium", "hard"];
    const performance = {};

    difficulties.forEach((difficulty) => {
      performance[difficulty] = {
        total: questions.filter((q) => q.difficulty === difficulty).length,
        correct: responses.filter((r) => {
          const q = questions.find(
            (question) => question._id.toString() === r.questionId.toString()
          );
          return q?.difficulty === difficulty && r.isCorrect;
        }).length,
      };
    });

    return performance;
  }

  /**
   * Build enhanced attempt data
   */
  buildAttemptData(attempt, test) {
    return {
      _id: attempt._id,
      testId: attempt.testId._id,
      testName: test.name,
      testDescription: test.description,
      testDuration: test.duration,
      testDifficulty: test.difficulty,
      testType: test.type,
      testCategory: test.category,
      candidateId: attempt.candidateId,
      startTime: attempt.startTime,
      endTime: attempt.endTime,
      timeSpent: attempt.timeSpent,
      status: attempt.status,
      score: attempt.score,
      percentageScore: attempt.percentageScore,
      metrics: {
        ...attempt.metrics,
        visitCounts:
          attempt.metrics.visitCounts instanceof Map
            ? Object.fromEntries(attempt.metrics.visitCounts)
            : attempt.metrics.visitCounts || {},
        timePerQuestion:
          attempt.metrics.timePerQuestion instanceof Map
            ? Object.fromEntries(attempt.metrics.timePerQuestion)
            : attempt.metrics.timePerQuestion || {},
      },
      device: attempt.device,
      browser: attempt.browser,
      ipAddress: attempt.ipAddress,
      createdAt: attempt.createdAt,
      updatedAt: attempt.updatedAt,
    };
  }

  /**
   * Calculate summary metrics
   */
  calculateSummaryMetrics(analytics) {
    return {
      completionRate:
        (analytics.questionsAnswered / analytics.totalQuestions) * 100,
      accuracyRate:
        analytics.questionsAnswered > 0
          ? (analytics.correctAnswers / analytics.questionsAnswered) * 100
          : 0,
      efficiencyScore:
        analytics.averageTimePerQuestion > 0
          ? (analytics.correctAnswers * 1000) / analytics.averageTimePerQuestion
          : 0,
      engagementScore: analytics.totalVisits + analytics.questionsFlagged,
    };
  }

  /**
   * Update attempt AI classification
   */
  async updateAiClassification(attemptId, classification) {
    try {
      const attempt = await TestAttempt.findById(attemptId);
      if (!attempt) {
        throw new Error(`Attempt ${attemptId} not found`);
      }

      attempt.aiClassification = {
        prediction: classification.prediction,
        confidence: classification.confidence,
        classifiedAt: new Date(classification.timestamp || Date.now()),
      };

      await attempt.save();
      logger.info(`Updated AI classification for attempt ${attemptId}`);
      
      return attempt;
    } catch (error) {
      logger.error(`Error updating AI classification for attempt ${attemptId}:`, error);
      throw error;
    }
  }

  /**
   * Update manual classification for an attempt
   */
  async updateManualClassification(attemptId, { classification, classifiedBy }) {
    try {
      const attempt = await TestAttempt.findById(attemptId);
      if (!attempt) {
        throw new Error(`Attempt ${attemptId} not found`);
      }

      attempt.manualClassification = {
        classification,
        classifiedBy,
        classifiedAt: new Date(),
      };

      await attempt.save();
      logger.info(`Updated manual classification for attempt ${attemptId}`);
      
      return attempt;
    } catch (error) {
      logger.error(`Error updating manual classification for attempt ${attemptId}:`, error);
      throw error;
    }
  }
  async updateAiComment(attemptId, aiComment) {
    try {
      const attempt = await TestAttempt.findById(attemptId);
      if (!attempt) {
        throw new Error(`Attempt ${attemptId} not found`);
      }

      attempt.aiComment = {
        comment: aiComment,
        commentedAt: new Date(),
      };

      attempt.markModified('aiComment'); // Explicitly mark as modified
      await attempt.save();
      logger.info(`Updated ai comment for attempt ${attemptId}`);
      
      return attempt;
    } catch (error) {
      logger.error(`Error updating ai comment for attempt ${attemptId}:`, error);
      throw error;
    }
  }
  async updatePsychologistComment(attemptId, { comment, commentedBy }) {
    try {
      const attempt = await TestAttempt.findById(attemptId);
      if (!attempt) {
        throw new Error(`Attempt ${attemptId} not found`);
      }

      attempt.psychologistComment = {
        comment,
        commentedBy,
       commentedAt: new Date(),
      };

      await attempt.save();
      logger.info(`Updated psychologist comment for attempt ${attemptId}`);
      
      return attempt;
    } catch (error) {
      logger.error(`Error updating psychologist comment for attempt ${attemptId}:`, error);
      throw error;
    }
  }
}

module.exports = new AttemptService();
