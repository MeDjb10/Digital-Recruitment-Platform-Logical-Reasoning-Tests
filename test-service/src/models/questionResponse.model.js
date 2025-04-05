const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const QuestionResponseSchema = new Schema(
  {
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: "TestAttempt",
      required: [true, "Test attempt ID is required"],
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: [true, "Question ID is required"],
    },
    candidateId: {
      type: String,
      required: [true, "Candidate ID is required"],
    },
    // For domino questions
    dominoAnswer: {
      dominoId: Number,
      topValue: Number,
      bottomValue: Number,
    },
    // For multiple choice questions
    selectedOptions: [Number],
    // Common fields
    isCorrect: {
      type: Boolean,
      default: false,
    },
    isReversed: {
      type: Boolean,
      default: false,
    },
    isHalfCorrect: {
      type: Boolean,
      default: false,
    },
    timeSpent: {
      type: Number,
      default: 0,
      comment: "Time spent in milliseconds",
    },
    visitCount: {
      type: Number,
      default: 0,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    isSkipped: {
      type: Boolean,
      default: false,
    },
    answerChanges: {
      type: Number,
      default: 0,
    },
    firstVisitAt: Date,
    lastVisitAt: Date,
    answeredAt: Date,
    events: [
      {
        eventType: {
          type: String,
          enum: ["visit", "answer", "change", "flag", "unflag", "skip"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        data: Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to record a visit to the question
QuestionResponseSchema.methods.recordVisit = function () {
  if (!this.firstVisitAt) {
    this.firstVisitAt = new Date();
  }

  this.lastVisitAt = new Date();
  this.visitCount += 1;

  this.events.push({
    eventType: "visit",
    timestamp: this.lastVisitAt,
  });

  return this.save();
};

// Method to record an answer
QuestionResponseSchema.methods.recordAnswer = function (answer) {
  const now = new Date();

  if (answer.dominoId !== undefined) {
    this.dominoAnswer = answer;
  } else if (Array.isArray(answer)) {
    this.selectedOptions = answer;
  }

  this.answeredAt = now;
  this.isSkipped = false;
  this.answerChanges += 1;

  this.events.push({
    eventType: this.answeredAt ? "change" : "answer",
    timestamp: now,
    data: answer,
  });

  return this.evaluateAnswer();
};

// Method to flag a question
QuestionResponseSchema.methods.toggleFlag = function () {
  this.isFlagged = !this.isFlagged;

  this.events.push({
    eventType: this.isFlagged ? "flag" : "unflag",
    timestamp: new Date(),
  });

  return this.save();
};

// Method to skip a question
QuestionResponseSchema.methods.skipQuestion = function () {
  this.isSkipped = true;

  this.events.push({
    eventType: "skip",
    timestamp: new Date(),
  });

  return this.save();
};

// Method to evaluate domino answer against correct answer
QuestionResponseSchema.methods.evaluateAnswer = async function () {
  try {
    const Question = mongoose.model("Question");
    const question = await Question.findById(this.questionId);

    if (!question) return this;

    if (question.questionType === "DominoQuestion") {
      return this.evaluateDominoAnswer(question);
    } else if (question.questionType === "MultipleChoiceQuestion") {
      return this.evaluateMultipleChoiceAnswer(question);
    }

    return this;
  } catch (error) {
    console.error("Error evaluating answer:", error);
    return this;
  }
};

// Method to evaluate domino answer
QuestionResponseSchema.methods.evaluateDominoAnswer = function (question) {
  if (!question.correctAnswer || !this.dominoAnswer) {
    this.isCorrect = false;
    this.isReversed = false;
    this.isHalfCorrect = false;
    return this.save();
  }

  const userAnswer = this.dominoAnswer;
  const correctAnswer = question.correctAnswer;

  // Exact match
  const exactMatch =
    userAnswer.topValue === correctAnswer.topValue &&
    userAnswer.bottomValue === correctAnswer.bottomValue;

  // Reversed match
  const reversedMatch =
    userAnswer.topValue === correctAnswer.bottomValue &&
    userAnswer.bottomValue === correctAnswer.topValue;

  // Half match (one value correct)
  const halfMatch =
    userAnswer.topValue === correctAnswer.topValue ||
    userAnswer.bottomValue === correctAnswer.bottomValue ||
    userAnswer.topValue === correctAnswer.bottomValue ||
    userAnswer.bottomValue === correctAnswer.topValue;

  this.isCorrect = exactMatch;
  this.isReversed = reversedMatch && !exactMatch;
  this.isHalfCorrect = !exactMatch && !reversedMatch && halfMatch;

  return this.save();
};

// Method to evaluate multiple choice answer
QuestionResponseSchema.methods.evaluateMultipleChoiceAnswer = function (
  question
) {
  if (!question.options || !this.selectedOptions) {
    this.isCorrect = false;
    return this.save();
  }

  if (question.allowMultipleCorrect) {
    // For multiple correct options
    const correctOptionIndices = question.options
      .map((option, index) => (option.isCorrect ? index : -1))
      .filter((index) => index !== -1);

    // Check if selected options match correct options exactly
    const correctSelections = this.selectedOptions.every((index) =>
      correctOptionIndices.includes(index)
    );

    const allCorrectSelected = correctOptionIndices.every((index) =>
      this.selectedOptions.includes(index)
    );

    this.isCorrect = correctSelections && allCorrectSelected;
  } else {
    // For single correct option
    this.isCorrect =
      question.correctOptionIndex !== undefined &&
      this.selectedOptions.length === 1 &&
      this.selectedOptions[0] === question.correctOptionIndex;
  }

  return this.save();
};

// Post-save hook to update question analytics
QuestionResponseSchema.post("save", async function () {
  try {
    const Question = mongoose.model("Question");
    const question = await Question.findById(this.questionId);
    if (question) {
      await question.updateAnalytics();
    }
  } catch (error) {
    console.error("Error updating question analytics:", error);
  }
});

module.exports = mongoose.model("QuestionResponse", QuestionResponseSchema);
