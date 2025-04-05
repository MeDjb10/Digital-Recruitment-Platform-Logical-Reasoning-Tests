const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TestAttemptSchema = new Schema(
  {
    testId: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: [true, "Test ID is required"],
      index: true,
    },
    candidateId: {
      type: String,
      required: [true, "Candidate ID is required"],
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["in-progress", "completed", "timed-out", "abandoned"],
      default: "in-progress",
      index: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    percentageScore: {
      type: Number,
      default: 0,
    },
    timeSpent: {
      type: Number,
      comment: "Time spent in milliseconds",
    },
    metrics: {
      questionsAnswered: { type: Number, default: 0 },
      questionsSkipped: { type: Number, default: 0 },
      answerChanges: { type: Number, default: 0 },
      flaggedQuestions: { type: Number, default: 0 },
      visitCounts: { type: Map, of: Number },
      timePerQuestion: { type: Map, of: Number },
    },
    device: String,
    browser: String,
    ipAddress: String,
  },
  {
    timestamps: true,
  }
);

// Virtual for question responses
TestAttemptSchema.virtual("responses", {
  ref: "QuestionResponse",
  localField: "_id",
  foreignField: "attemptId",
  justOne: false,
});

// Methods to calculate score
TestAttemptSchema.methods.calculateScore = async function () {
  const QuestionResponse = mongoose.model("QuestionResponse");
  const Question = mongoose.model("Question");

  const responses = await QuestionResponse.find({ attemptId: this._id });
  const totalQuestions = await Question.countDocuments({ testId: this.testId });

  // Calculate score based on correct answers
  const correctAnswers = responses.filter((r) => r.isCorrect).length;

  this.score = correctAnswers;
  this.percentageScore =
    totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  // Update metrics
  this.metrics = {
    questionsAnswered: responses.filter((r) => !r.isSkipped).length,
    questionsSkipped: responses.filter((r) => r.isSkipped).length,
    answerChanges: responses.reduce(
      (sum, r) => sum + (r.answerChanges || 0),
      0
    ),
    flaggedQuestions: responses.filter((r) => r.isFlagged).length,
  };

  return this.save();
};

// Method to finish test attempt
TestAttemptSchema.methods.finishAttempt = function (status = "completed") {
  this.status = status;
  this.endTime = new Date();
  this.timeSpent = this.endTime - this.startTime;
  return this.save();
};

// Post-save hook to update test analytics
TestAttemptSchema.post("save", async function () {
  try {
    if (this.status === "completed") {
      const Test = mongoose.model("Test");
      const test = await Test.findById(this.testId);
      if (test) {
        await test.updateAnalytics();
      }
    }
  } catch (error) {
    console.error("Error updating test analytics:", error);
  }
});

module.exports = mongoose.model("TestAttempt", TestAttemptSchema);
