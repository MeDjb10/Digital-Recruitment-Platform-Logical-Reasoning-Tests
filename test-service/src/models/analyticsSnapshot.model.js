const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AnalyticsSnapshotSchema = new Schema(
  {
    snapshotDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    snapshotType: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    category: {
      type: String,
      enum: ["personality", "logical", "cognitive", "verbal", "all"],
      required: true,
      index: true,
    },
    metrics: {
      totalTests: Number,
      totalAttempts: Number,
      averageScore: Number,
      completionRate: Number,
      percentagesPerDifficulty: {
        easy: Number,
        medium: Number,
        hard: Number,
        expert: Number,
      },
    },
    testMetrics: [
      {
        testId: {
          type: Schema.Types.ObjectId,
          ref: "Test",
        },
        testName: String,
        attempts: Number,
        completionRate: Number,
        averageScore: Number,
        averageTimeSpent: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Static method to generate daily analytics snapshot
AnalyticsSnapshotSchema.statics.generateDailySnapshot = async function () {
  const Test = mongoose.model("Test");
  const TestAttempt = mongoose.model("TestAttempt");

  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate snapshots for each category and one for all
  const categories = ["personality", "logical", "cognitive", "verbal", "all"];

  for (const category of categories) {
    // Find tests in this category (or all tests)
    const query = category === "all" ? {} : { category };
    const tests = await Test.find(query);

    if (tests.length === 0) continue;

    // Aggregate test attempts data
    const testIds = tests.map((test) => test._id);
    const attempts = await TestAttempt.find({
      testId: { $in: testIds },
      startTime: { $gte: new Date(today.getTime() - 24 * 60 * 60 * 1000) },
    });

    // Calculate overall metrics
    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter((a) => a.status === "completed");
    const completionRate =
      totalAttempts > 0 ? (completedAttempts.length / totalAttempts) * 100 : 0;
    const averageScore =
      completedAttempts.length > 0
        ? completedAttempts.reduce((sum, a) => sum + a.percentageScore, 0) /
          completedAttempts.length
        : 0;

    // Calculate difficulty percentages
    const difficultyCount = {
      easy: tests.filter((t) => t.difficulty === "easy").length,
      medium: tests.filter((t) => t.difficulty === "medium").length,
      hard: tests.filter((t) => t.difficulty === "hard").length,
      expert: tests.filter((t) => t.difficulty === "expert").length,
    };

    const totalTests = tests.length;
    const percentagesPerDifficulty = {
      easy: totalTests > 0 ? (difficultyCount.easy / totalTests) * 100 : 0,
      medium: totalTests > 0 ? (difficultyCount.medium / totalTests) * 100 : 0,
      hard: totalTests > 0 ? (difficultyCount.hard / totalTests) * 100 : 0,
      expert: totalTests > 0 ? (difficultyCount.expert / totalTests) * 100 : 0,
    };

    // Create test-specific metrics
    const testMetrics = [];

    for (const test of tests) {
      const testAttempts = attempts.filter(
        (a) => a.testId.toString() === test._id.toString()
      );
      const testCompletedAttempts = testAttempts.filter(
        (a) => a.status === "completed"
      );

      testMetrics.push({
        testId: test._id,
        testName: test.name,
        attempts: testAttempts.length,
        completionRate:
          testAttempts.length > 0
            ? (testCompletedAttempts.length / testAttempts.length) * 100
            : 0,
        averageScore:
          testCompletedAttempts.length > 0
            ? testCompletedAttempts.reduce(
                (sum, a) => sum + a.percentageScore,
                0
              ) / testCompletedAttempts.length
            : 0,
        averageTimeSpent:
          testCompletedAttempts.length > 0
            ? testCompletedAttempts.reduce(
                (sum, a) => sum + (a.timeSpent || 0),
                0
              ) / testCompletedAttempts.length
            : 0,
      });
    }

    // Create or update snapshot
    await this.findOneAndUpdate(
      {
        snapshotType: "daily",
        category: category,
        snapshotDate: { $gte: today },
      },
      {
        snapshotDate: new Date(),
        snapshotType: "daily",
        category: category,
        metrics: {
          totalTests,
          totalAttempts,
          averageScore,
          completionRate,
          percentagesPerDifficulty,
        },
        testMetrics,
      },
      { upsert: true, new: true }
    );
  }

  return true;
};

module.exports = mongoose.model("AnalyticsSnapshot", AnalyticsSnapshotSchema);
