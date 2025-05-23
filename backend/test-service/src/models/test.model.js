const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TestSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Test name is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["personality", "logical", "cognitive", "verbal"],
      required: [true, "Test category is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["domino", "multiple-choice", "verbal"],
      required: [true, "Test type is required"],
    },
    duration: {
      type: Number,
      required: [true, "Test duration is required"],
      min: [1, "Duration must be at least 1 minute"],
      comment: "Duration in minutes",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "expert"],
      required: true,
      default: "medium",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
    tags: [String],
    version: {
      type: Number,
      default: 1,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      required: [true, "Creator ID is required"],
    },
    analytics: {
      attempts: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      averageTimeSpent: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for questions (not stored, but accessible via API)
TestSchema.virtual("questions", {
  ref: "Question",
  localField: "_id",
  foreignField: "testId",
  justOne: false,
});

// Update test analytics whenever test attempts are saved/updated
TestSchema.methods.updateAnalytics = async function () {
  const TestAttempt = mongoose.model("TestAttempt");

  const attempts = await TestAttempt.find({ testId: this._id });
  const completedAttempts = attempts.filter((a) => a.status === "completed");

  this.analytics = {
    attempts: attempts.length,
    completionRate:
      attempts.length > 0
        ? (completedAttempts.length / attempts.length) * 100
        : 0,
    averageScore:
      completedAttempts.length > 0
        ? completedAttempts.reduce(
            (sum, attempt) => sum + attempt.percentageScore,
            0
          ) / completedAttempts.length
        : 0,
    averageTimeSpent:
      completedAttempts.length > 0
        ? completedAttempts.reduce(
            (sum, attempt) => sum + (attempt.timeSpent || 0),
            0
          ) / completedAttempts.length
        : 0,
  };

  return this.save();
};

// Update total questions count
TestSchema.methods.updateQuestionCount = async function () {
  const count = await mongoose
    .model("Question")
    .countDocuments({ testId: this._id });
  this.totalQuestions = count;
  return this.save();
};

// Pre-save hook to update the updatedAt field
TestSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Test", TestSchema);
