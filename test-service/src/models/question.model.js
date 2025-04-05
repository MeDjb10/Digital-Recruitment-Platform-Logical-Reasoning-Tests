const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Base schema for all question types
const QuestionSchema = new Schema(
  {
    testId: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: [true, "Test ID is required"],
      index: true,
    },
    title: {
      type: String,
      trim: true,
    },
    instruction: {
      type: String,
      required: [true, "Question instruction is required"],
      trim: true,
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
    },
    questionNumber: {
      type: Number,
      required: [true, "Question number is required"],
    },
    analytics: {
      correctAnswerRate: { type: Number, default: 0 },
      halfCorrectRate: { type: Number, default: 0 },
      reversedAnswerRate: { type: Number, default: 0 },
      averageTimeSpent: { type: Number, default: 0 },
      visitCountAverage: { type: Number, default: 0 },
    },
  },
  {
    discriminatorKey: "questionType",
    timestamps: true,
  }
);

// Update analytics method
QuestionSchema.methods.updateAnalytics = async function () {
  const QuestionResponse = mongoose.model("QuestionResponse");

  const responses = await QuestionResponse.find({ questionId: this._id });
  if (!responses.length) return this;

  const correctCount = responses.filter((r) => r.isCorrect).length;
  const halfCorrectCount = responses.filter((r) => r.isHalfCorrect).length;
  const reversedCount = responses.filter((r) => r.isReversed).length;

  this.analytics = {
    correctAnswerRate: (correctCount / responses.length) * 100,
    halfCorrectRate: (halfCorrectCount / responses.length) * 100,
    reversedAnswerRate: (reversedCount / responses.length) * 100,
    averageTimeSpent:
      responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) /
      responses.length,
    visitCountAverage:
      responses.reduce((sum, r) => sum + (r.visitCount || 0), 0) /
      responses.length,
  };

  return this.save();
};

// Create base model
const Question = mongoose.model("Question", QuestionSchema);

// Domino Question Schema - uses discriminator pattern
const DominoQuestionSchema = new Schema({
  pattern: {
    type: String,
    trim: true,
  },
  layoutType: {
    type: String,
    enum: ["row", "grid", "rhombus", "custom", "rhombus-large", "spiral"],
    default: "grid",
  },
  dominos: [
    {
      id: Number,
      row: Number,
      col: Number,
      topValue: Number,
      bottomValue: Number,
      isEditable: Boolean,
      isVertical: { type: Boolean, default: false },
      exactX: Number,
      exactY: Number,
      angle: { type: Number, default: 0 },
      scale: { type: Number, default: 1 },
      uniqueId: String,
    },
  ],
  arrows: [
    {
      id: Number,
      row: Number,
      col: Number,
      exactX: Number,
      exactY: Number,
      angle: Number,
      uniqueId: String,
      scale: { type: Number, default: 1 },
      length: Number,
      arrowColor: String,
      headSize: Number,
      curved: Boolean,
      curvature: Number,
    },
  ],
  gridLayout: {
    rows: Number,
    cols: Number,
    width: Number,
    height: Number,
  },
  correctAnswer: {
    dominoId: Number,
    topValue: Number,
    bottomValue: Number,
  },
});

// Multiple Choice Question Schema
const MultipleChoiceQuestionSchema = new Schema({
  options: [
    {
      text: {
        type: String,
        required: [true, "Option text is required"],
      },
      isCorrect: Boolean,
    },
  ],
  correctOptionIndex: Number,
  allowMultipleCorrect: { type: Boolean, default: false },
  randomizeOptions: { type: Boolean, default: false },
});

// Register discriminators
const DominoQuestion = Question.discriminator(
  "DominoQuestion",
  DominoQuestionSchema
);
const MultipleChoiceQuestion = Question.discriminator(
  "MultipleChoiceQuestion",
  MultipleChoiceQuestionSchema
);

module.exports = {
  Question,
  DominoQuestion,
  MultipleChoiceQuestion,
};
