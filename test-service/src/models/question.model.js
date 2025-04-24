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
      correctAnswerRate: { type: Number, default: 0 }, // May need adjustment based on proposition scoring
      // halfCorrectRate might not apply directly
      // reversedAnswerRate might not apply directly
      averageTimeSpent: { type: Number, default: 0 },
      visitCountAverage: { type: Number, default: 0 },
      // Add metric for 'X' answers if needed
      dontUnderstandRate: { type: Number, default: 0 },
    },
  },
  {
    discriminatorKey: "questionType",
    timestamps: true,
  }
);

// Update analytics method - Needs adjustment for proposition scoring
QuestionSchema.methods.updateAnalytics = async function () {
  const QuestionResponse = mongoose.model("QuestionResponse");
  const responses = await QuestionResponse.find({ questionId: this._id });
  if (!responses.length) return this;

  let totalPropositionsAttempted = 0;
  let totalCorrectEvaluations = 0;
  let totalDontUnderstand = 0;

  responses.forEach((response) => {
    if (
      response.propositionResponses &&
      response.propositionResponses.length > 0
    ) {
      response.propositionResponses.forEach((propResponse, index) => {
        if (this.propositions && index < this.propositions.length) {
          totalPropositionsAttempted++;
          if (propResponse.candidateEvaluation === "X") {
            totalDontUnderstand++;
          } else if (
            propResponse.candidateEvaluation ===
            this.propositions[index].correctEvaluation
          ) {
            totalCorrectEvaluations++;
          }
        }
      });
    }
  });

  this.analytics = {
    // Correct rate could be defined as average correct propositions per response
    correctAnswerRate:
      totalPropositionsAttempted > 0
        ? (totalCorrectEvaluations / totalPropositionsAttempted) * 100
        : 0,
    dontUnderstandRate:
      totalPropositionsAttempted > 0
        ? (totalDontUnderstand / totalPropositionsAttempted) * 100
        : 0,
    averageTimeSpent:
      responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) /
      responses.length,
    visitCountAverage:
      responses.reduce((sum, r) => sum + (r.visitCount || 0), 0) /
      responses.length,
  };

  // Reset potentially irrelevant fields if needed
  this.analytics.halfCorrectRate = 0;
  this.analytics.reversedAnswerRate = 0;

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

// Multiple Choice Question Schema (Updated for V/F/?/X)
const MultipleChoiceQuestionSchema = new Schema({
  propositions: [
    {
      text: {
        type: String,
        required: [true, "Proposition text is required"],
        trim: true,
      },
      correctEvaluation: {
        type: String,
        enum: ["V", "F", "?"], // Vrai, Faux, Cannot Know
        required: [true, "Correct evaluation (V, F, ?) is required"],
      },
    },
  ],
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
