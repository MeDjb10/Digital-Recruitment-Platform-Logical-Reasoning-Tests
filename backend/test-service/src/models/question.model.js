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
    // Reference to template used (optional)
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "QuestionTemplate",
    },
    // Common analytics (specific analytics moved to type-specific methods)
    analytics: {
      averageTimeSpent: { type: Number, default: 0 },
      visitCountAverage: { type: Number, default: 0 },
    },
  },
  {
    discriminatorKey: "questionType",
    timestamps: true,
  }
);

// Base analytics method - delegated to specific question types
QuestionSchema.methods.updateAnalytics = async function () {
  // Delegate to specific question type method
  if (this.updateSpecificAnalytics) {
    return await this.updateSpecificAnalytics();
  }

  // Default implementation for common analytics
  const QuestionResponse = mongoose.model("QuestionResponse");
  const responses = await QuestionResponse.find({ questionId: this._id });
  if (!responses.length) return this;

  this.analytics = {
    averageTimeSpent:
      responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) /
      responses.length,
    visitCountAverage:
      responses.reduce((sum, r) => sum + (r.visitCount || 0), 0) /
      responses.length,
  };

  return this.save();
};

// Method to save current question as template
QuestionSchema.methods.saveAsTemplate = async function (templateData) {
  const QuestionTemplate = mongoose.model("QuestionTemplate");

  // Determine template type based on question type
  let templateType;
  let extractedData = {};

  if (this.questionType === "DominoQuestion") {
    templateType = "DominoTemplate";
    extractedData = {
      layoutType: this.layoutType,
      gridLayout: this.gridLayout,
      dominoPositions: this.dominos.map((d) => ({
        id: d.id,
        row: d.row,
        col: d.col,
        isEditable: d.isEditable,
        isVertical: d.isVertical,
        exactX: d.exactX,
        exactY: d.exactY,
        angle: d.angle,
        scale: d.scale,
        uniqueId: d.uniqueId,
      })),
    };
  } else if (this.questionType === "ArrowQuestion") {
    templateType = "ArrowTemplate";
    extractedData = {
      layoutType: this.layoutType,
      gridLayout: this.gridLayout,
      dominoPositions: this.dominos.map((d) => ({
        id: d.id,
        row: d.row,
        col: d.col,
        isEditable: d.isEditable,
        isVertical: d.isVertical,
        exactX: d.exactX,
        exactY: d.exactY,
        angle: d.angle,
        scale: d.scale,
        uniqueId: d.uniqueId,
      })),
      arrowPositions: this.arrows.map((a) => ({
        id: a.id,
        row: a.row,
        col: a.col,
        exactX: a.exactX,
        exactY: a.exactY,
        angle: a.angle,
        uniqueId: a.uniqueId,
        scale: a.scale,
        length: a.length,
        arrowColor: a.arrowColor,
        headSize: a.headSize,
        curved: a.curved,
        curvature: a.curvature,
      })),
    };
  } else if (this.questionType === "MultipleChoiceQuestion") {
    templateType = "MultipleChoiceTemplate";
    extractedData = {
      propositionCount: this.propositions.length,
      propositionStructure: this.propositions.map((p, index) => ({
        placeholder: `Proposition ${index + 1}`,
        expectedEvaluation: p.correctEvaluation,
      })),
    };
  }

  const template = new QuestionTemplate({
    ...templateData,
    templateType,
    category: this.questionType.toLowerCase().replace("question", ""),
    templateData: extractedData,
  });

  return await template.save();
};

// Create base model
const Question = mongoose.model("Question", QuestionSchema);

// Domino Question Schema - base for domino-based questions (without arrows)
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

// Domino-specific analytics method
DominoQuestionSchema.methods.updateSpecificAnalytics = async function () {
  const QuestionResponse = mongoose.model("QuestionResponse");
  const responses = await QuestionResponse.find({ questionId: this._id });
  if (!responses.length) return this;

  const correctAnswers = responses.filter((r) => r.isCorrect).length;
  const halfCorrectAnswers = responses.filter((r) => r.isHalfCorrect).length;
  const reversedAnswers = responses.filter((r) => r.isReversed).length;

  this.analytics = {
    correctAnswerRate: (correctAnswers / responses.length) * 100,
    halfCorrectRate: (halfCorrectAnswers / responses.length) * 100,
    reversedAnswerRate: (reversedAnswers / responses.length) * 100,
    averageTimeSpent:
      responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) /
      responses.length,
    visitCountAverage:
      responses.reduce((sum, r) => sum + (r.visitCount || 0), 0) /
      responses.length,
  };

  return this.save();
};

// Arrow Question Schema - extends DominoQuestion with additional arrow functionality
const ArrowQuestionSchema = new Schema({
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

// Arrow-specific analytics method (reuses domino analytics logic)
ArrowQuestionSchema.methods.updateSpecificAnalytics = async function () {
  const QuestionResponse = mongoose.model("QuestionResponse");
  const responses = await QuestionResponse.find({ questionId: this._id });
  if (!responses.length) return this;

  const correctAnswers = responses.filter((r) => r.isCorrect).length;
  const halfCorrectAnswers = responses.filter((r) => r.isHalfCorrect).length;
  const reversedAnswers = responses.filter((r) => r.isReversed).length;

  this.analytics = {
    correctAnswerRate: (correctAnswers / responses.length) * 100,
    halfCorrectRate: (halfCorrectAnswers / responses.length) * 100,
    reversedAnswerRate: (reversedAnswers / responses.length) * 100,
    averageTimeSpent:
      responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) /
      responses.length,
    visitCountAverage:
      responses.reduce((sum, r) => sum + (r.visitCount || 0), 0) /
      responses.length,
    // Arrow-specific metrics can be added here if needed
    arrowInteractionCount:
      responses.reduce((sum, r) => sum + (r.arrowInteractions || 0), 0) /
      responses.length,
  };

  return this.save();
};

// Multiple Choice Question Schema
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

// Multiple choice specific analytics method
MultipleChoiceQuestionSchema.methods.updateSpecificAnalytics =
  async function () {
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

    return this.save();
  };

// Register discriminators
const DominoQuestion = Question.discriminator(
  "DominoQuestion",
  DominoQuestionSchema
);
const ArrowQuestion = Question.discriminator(
  "ArrowQuestion",
  ArrowQuestionSchema
);
const MultipleChoiceQuestion = Question.discriminator(
  "MultipleChoiceQuestion",
  MultipleChoiceQuestionSchema
);

module.exports = {
  Question,
  DominoQuestion,
  ArrowQuestion,
  MultipleChoiceQuestion,
};
