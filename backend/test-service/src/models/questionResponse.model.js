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
    // For V/F/?/X questions
    propositionResponses: [
      {
        propositionIndex: {
          // Index corresponding to the proposition in the question model
          type: Number,
          required: true,
        },
        candidateEvaluation: {
          // Candidate's choice: V, F, ?, or X
          type: String,
          enum: ["V", "F", "?", "X"],
        },
        // Optional: Store if this specific proposition was evaluated correctly
        isCorrect: {
          type: Boolean,
        },
      },
    ],
    // Common fields
    isCorrect: {
      // Represents if the *entire* question was answered correctly (all propositions match, none are 'X')
      type: Boolean,
      default: false,
    },
    // isReversed and isHalfCorrect might not apply to this type
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

// Method to record an answer (Updated)
QuestionResponseSchema.methods.recordAnswer = function (answer) {
  const now = new Date();

  // Clear previous answer fields based on the type of answer coming in
  if (answer.dominoId !== undefined) {
    this.propositionResponses = undefined;
    this.dominoAnswer = answer;
  } else if (Array.isArray(answer)) {
    this.dominoAnswer = undefined;
    // Basic validation for proposition response format
    if (
      answer.every(
        (resp) =>
          resp.propositionIndex !== undefined &&
          ["V", "F", "?", "X"].includes(resp.candidateEvaluation)
      )
    ) {
      this.propositionResponses = answer;
    } else {
      console.error("Invalid proposition response format received:", answer);
      // Decide how to handle invalid format - maybe clear the field or throw error
      this.propositionResponses = []; // Clear it to avoid saving bad data
    }
  } else {
    // Handle unexpected answer format if necessary
    console.error("Unexpected answer format:", answer);
    return this; // Or throw an error
  }

  this.answeredAt = now;
  this.isSkipped = false; // Answering unsips the question
  this.answerChanges += 1;

  this.events.push({
    eventType: this.answerChanges > 1 ? "change" : "answer", // Check if it's the first answer or a change
    timestamp: now,
    data: answer, // Log the raw answer data
  });

  // Trigger evaluation logic (which also needs update)
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
  // Clear answers when skipping
  this.dominoAnswer = undefined;
  this.propositionResponses = undefined;
  this.isCorrect = false;
  this.isReversed = false;
  this.isHalfCorrect = false;

  this.events.push({
    eventType: "skip",
    timestamp: new Date(),
  });

  return this.save();
};

// Method to evaluate answer (Updated)
QuestionResponseSchema.methods.evaluateAnswer = async function () {
  try {
    const Question = mongoose.model("Question");
    // Ensure population if needed, or fetch with propositions if not already populated
    const question = await Question.findById(this.questionId);

    if (!question) {
      console.error(`Question not found for evaluation: ${this.questionId}`);
      return this;
    }
    if (question.questionType === "DominoQuestion") {
      return this.evaluateDominoAnswer(question);
    } else if (question.questionType === "ArrowQuestion") {
      return this.evaluateDominoAnswer(question); // ArrowQuestion uses same evaluation logic as DominoQuestion
    } else if (question.questionType === "MultipleChoiceQuestion") {
      return this.evaluateMultipleChoiceAnswer(question);
    }

    // Handle other question types if they exist
    return this;
  } catch (error) {
    console.error("Error evaluating answer:", error);
    return this;
  }
};

// Method to evaluate domino answer
QuestionResponseSchema.methods.evaluateDominoAnswer = function (question) {
  // Clear proposition-specific fields
  this.propositionResponses =
    this.propositionResponses?.map((pr) => ({ ...pr, isCorrect: undefined })) ||
    undefined;

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

// Method to evaluate multiple choice answer (Rewritten for V/F/?/X)
QuestionResponseSchema.methods.evaluateMultipleChoiceAnswer = function (
  question
) {
  // Clear domino-specific fields
  this.dominoAnswer = undefined;
  this.isReversed = false;
  this.isHalfCorrect = false;

  // Check if the question has propositions and the response has propositionResponses
  if (!question.propositions || !this.propositionResponses) {
    this.isCorrect = false;
    if (this.propositionResponses) {
      this.propositionResponses = this.propositionResponses.map((pr) => ({
        ...pr,
        isCorrect: false,
      }));
    }
    return this.save();
  }

  let allPropositionsCorrect = true;
  const evaluatedPropositionResponses = [];

  // Ensure propositionResponses length matches question propositions length for full evaluation
  if (this.propositionResponses.length !== question.propositions.length) {
    allPropositionsCorrect = false; // Mark as incorrect if not all propositions were answered
  }

  for (let i = 0; i < question.propositions.length; i++) {
    const correctEval = question.propositions[i].correctEvaluation;
    const candidateResponse = this.propositionResponses.find(
      (r) => r.propositionIndex === i
    );
    let propositionIsCorrect = false;

    if (!candidateResponse || candidateResponse.candidateEvaluation === "X") {
      // If candidate didn't answer this proposition or chose 'X', it's not correct, and the whole question isn't correct.
      allPropositionsCorrect = false;
      propositionIsCorrect = false;
    } else if (candidateResponse.candidateEvaluation === correctEval) {
      // Candidate's evaluation matches the correct one for this proposition.
      propositionIsCorrect = true;
    } else {
      // Candidate's evaluation does not match.
      allPropositionsCorrect = false;
      propositionIsCorrect = false;
    }

    // Store the evaluation result for this specific proposition
    if (candidateResponse) {
      evaluatedPropositionResponses.push({
        ...candidateResponse.toObject(), // Use toObject() if it's a Mongoose subdocument
        isCorrect: propositionIsCorrect,
      });
    } else {
      // Handle case where response for this index is missing, maybe add a placeholder
      evaluatedPropositionResponses.push({
        propositionIndex: i,
        candidateEvaluation: undefined, // Or null
        isCorrect: false,
      });
    }
  }

  this.isCorrect = allPropositionsCorrect; // Overall question correctness
  this.propositionResponses = evaluatedPropositionResponses; // Update with individual correctness

  return this.save();
};

// Post-save hook to update question analytics
QuestionResponseSchema.post("save", async function () {
  try {
    // Ensure the model is registered before trying to use it
    const Question = mongoose.model("Question");
    const question = await Question.findById(this.questionId);
    if (question) {
      await question.updateAnalytics();
    }
  } catch (error) {
    console.error(
      `Error updating question analytics for question ${this.questionId}:`,
      error
    );
  }
});

module.exports = mongoose.model("QuestionResponse", QuestionResponseSchema);
