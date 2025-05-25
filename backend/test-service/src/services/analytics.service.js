const mongoose = require("mongoose");
const {
  AnalyticsSnapshot,
  Test,
  TestAttempt,
  QuestionResponse,
} = require("../models");
const { AppError } = require("../middleware/errorHandler");
const { StatusCodes } = require("http-status-codes");
const logger = require("../utils/logger");

class AnalyticsService {
  /**
   * Generate analytics snapshot
   */
  async generateAnalyticsSnapshot() {
    try {
      await AnalyticsSnapshot.generateDailySnapshot();
      logger.info("Analytics snapshot generated successfully");
      return { success: true, message: "Analytics snapshot generated successfully" };
    } catch (error) {
      logger.error(`Error generating analytics snapshot: ${error.message}`);
      throw new AppError(
        "Failed to generate analytics snapshot",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(category = "all") {
    // Get the most recent snapshot
    let snapshot = await AnalyticsSnapshot.findOne({
      category,
      snapshotType: "daily",
    }).sort({ snapshotDate: -1 });

    if (!snapshot) {
      // Generate snapshot if none exists
      await AnalyticsSnapshot.generateDailySnapshot();
      
      snapshot = await AnalyticsSnapshot.findOne({
        category,
        snapshotType: "daily",
      }).sort({ snapshotDate: -1 });

      if (!snapshot) {
        return {
          metrics: {
            totalTests: 0,
            totalAttempts: 0,
            averageScore: 0,
            completionRate: 0,
            percentagesPerDifficulty: {
              easy: 0,
              medium: 0,
              hard: 0,
              expert: 0,
            },
          },
          testMetrics: [],
        };
      }
    }

    return snapshot.toObject();
  }

  /**
   * Get analytics history for a date range
   */
  async getAnalyticsHistory(filters = {}) {
    const { startDate, endDate, category = "all", snapshotType = "daily" } = filters;

    if (!startDate || !endDate) {
      throw new AppError(
        "Start date and end date are required",
        StatusCodes.BAD_REQUEST
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError(
        "Invalid date format. Use YYYY-MM-DD",
        StatusCodes.BAD_REQUEST
      );
    }

    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    const snapshots = await AnalyticsSnapshot.find({
      snapshotDate: { $gte: start, $lte: end },
      category,
      snapshotType,
    }).sort({ snapshotDate: 1 });

    return {
      snapshots: snapshots.map(s => s.toObject()),
      count: snapshots.length,
    };
  }

  /**
   * Get analytics for a specific test
   */
  async getTestAnalytics(testId, filters = {}) {
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      throw new AppError("Invalid test ID format", StatusCodes.BAD_REQUEST);
    }

    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError(
        `Test with ID ${testId} not found`,
        StatusCodes.NOT_FOUND
      );
    }

    const { startDate, endDate } = filters;

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        dateFilter.$gte = start;
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
    }

    // Query conditions
    const attemptQuery = { testId };
    if (Object.keys(dateFilter).length > 0) {
      attemptQuery.startTime = dateFilter;
    }

    // Get attempts and categorize them
    const attempts = await TestAttempt.find(attemptQuery);
    const completedAttempts = attempts.filter(a => a.status === "completed");
    const inProgressAttempts = attempts.filter(a => a.status === "in-progress");
    const timedOutAttempts = attempts.filter(a => a.status === "timed-out");
    const abandonedAttempts = attempts.filter(a => a.status === "abandoned");

    // Calculate basic metrics
    const totalAttempts = attempts.length;
    const completionRate = totalAttempts > 0 ? (completedAttempts.length / totalAttempts) * 100 : 0;
    const averageScore = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => sum + a.percentageScore, 0) / completedAttempts.length
      : 0;
    const averageTimeSpent = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / completedAttempts.length
      : 0;

    // Get question performance data
    const attemptIds = completedAttempts.map(a => a._id);
    const responses = await QuestionResponse.find({
      attemptId: { $in: attemptIds },
    }).populate("questionId", "questionNumber difficulty questionType");

    // Calculate question performance
    const questionPerformance = this.calculateQuestionPerformance(responses);

    return {
      testId,
      testName: test.name,
      testType: test.type,
      difficulty: test.difficulty,
      metrics: {
        totalAttempts,
        completedAttempts: completedAttempts.length,
        inProgressAttempts: inProgressAttempts.length,
        timedOutAttempts: timedOutAttempts.length,
        abandonedAttempts: abandonedAttempts.length,
        completionRate,
        averageScore,
        averageTimeSpent,
      },
      questionPerformance: Object.values(questionPerformance).sort(
        (a, b) => a.questionNumber - b.questionNumber
      ),
    };
  }

  /**
   * Calculate question performance metrics
   */
  calculateQuestionPerformance(responses) {
    const questionPerformance = {};

    for (const response of responses) {
      if (response.questionId) {
        const questionId = response.questionId._id.toString();

        if (!questionPerformance[questionId]) {
          questionPerformance[questionId] = {
            questionId,
            questionNumber: response.questionId.questionNumber,
            difficulty: response.questionId.difficulty,
            questionType: response.questionId.questionType,
            totalAttempts: 0,
            correctCount: 0,
            incorrectCount: 0,
            skippedCount: 0,
            averageTimeSpent: 0,
            totalTimeSpent: 0,
          };
        }

        questionPerformance[questionId].totalAttempts++;

        if (response.isCorrect) {
          questionPerformance[questionId].correctCount++;
        } else if (response.isSkipped) {
          questionPerformance[questionId].skippedCount++;
        } else {
          questionPerformance[questionId].incorrectCount++;
        }

        questionPerformance[questionId].totalTimeSpent += response.timeSpent || 0;
      }
    }

    // Calculate averages
    for (const question in questionPerformance) {
      questionPerformance[question].averageTimeSpent =
        questionPerformance[question].totalAttempts > 0
          ? questionPerformance[question].totalTimeSpent / questionPerformance[question].totalAttempts
          : 0;
    }

    return questionPerformance;
  }

  /**
   * Get candidate performance analytics
   */
  async getCandidateAnalytics(candidateId) {
    const attempts = await TestAttempt.find({ candidateId }).populate(
      "testId",
      "name type difficulty duration"
    );

    const testTypePerformance = {};
    const testPerformance = {};

    // Process attempts
    for (const attempt of attempts) {
      if (attempt.testId) {
        const testType = attempt.testId.type;
        const testId = attempt.testId._id.toString();

        // Initialize test type data
        if (!testTypePerformance[testType]) {
          testTypePerformance[testType] = {
            type: testType,
            totalAttempts: 0,
            completedAttempts: 0,
            averageScore: 0,
            totalScore: 0,
          };
        }

        // Initialize individual test data
        if (!testPerformance[testId]) {
          testPerformance[testId] = {
            testId,
            testName: attempt.testId.name,
            testType: attempt.testId.type,
            difficulty: attempt.testId.difficulty,
            attempts: [],
          };
        }

        // Add attempt data
        testPerformance[testId].attempts.push({
          attemptId: attempt._id,
          status: attempt.status,
          score: attempt.percentageScore,
          startTime: attempt.startTime,
          endTime: attempt.endTime,
          timeSpent: attempt.timeSpent,
        });

        // Update test type metrics
        testTypePerformance[testType].totalAttempts++;

        if (attempt.status === "completed") {
          testTypePerformance[testType].completedAttempts++;
          testTypePerformance[testType].totalScore += attempt.percentageScore;
        }
      }
    }

    // Calculate averages for test types
    for (const type in testTypePerformance) {
      testTypePerformance[type].averageScore =
        testTypePerformance[type].completedAttempts > 0
          ? testTypePerformance[type].totalScore / testTypePerformance[type].completedAttempts
          : 0;
      delete testTypePerformance[type].totalScore;
    }

    // Get most recent attempt
    const mostRecentAttempt = attempts.length > 0
      ? attempts.sort((a, b) => b.startTime - a.startTime)[0]
      : null;

    // Calculate overall metrics
    const completedAttempts = attempts.filter(a => a.status === "completed");
    const averageOverallScore = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => sum + a.percentageScore, 0) / completedAttempts.length
      : 0;

    return {
      candidateId,
      totalAttempts: attempts.length,
      completedAttempts: completedAttempts.length,
      averageScore: averageOverallScore,
      mostRecentActivity: mostRecentAttempt ? mostRecentAttempt.startTime : null,
      testTypePerformance: Object.values(testTypePerformance),
      testPerformance: Object.values(testPerformance),
    };
  }
}

module.exports = new AnalyticsService();