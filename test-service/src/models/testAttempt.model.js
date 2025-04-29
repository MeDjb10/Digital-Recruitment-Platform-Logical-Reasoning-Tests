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
      // Represents the total points earned
      type: Number,
      default: 0,
    },
    percentageScore: {
      // Percentage based on maximum possible score
      type: Number,
      default: 0,
    },
    timeSpent: {
      type: Number, // Milliseconds
      comment: "Time spent in milliseconds",
    },
    lastActivityAt: {
      // Track last interaction time
      type: Date,
      default: Date.now,
    },
    metrics: {
      questionsAnswered: { type: Number, default: 0 },
      questionsSkipped: { type: Number, default: 0 },
      answerChanges: { type: Number, default: 0 },
      flaggedQuestions: { type: Number, default: 0 },
      visitCounts: { type: Map, of: Number }, // questionId -> count
      timePerQuestion: { type: Map, of: Number }, // questionId -> milliseconds
    },
    device: String,
    browser: String,
    ipAddress: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for question responses
TestAttemptSchema.virtual("responses", {
  ref: "QuestionResponse",
  localField: "_id",
  foreignField: "attemptId",
  justOne: false,
});

// Methods to calculate score (Updated)
TestAttemptSchema.methods.calculateScore = async function () {
  const QuestionResponse = mongoose.model("QuestionResponse");
  const Question = mongoose.model("Question"); // Base Question model

  const responses = await QuestionResponse.find({
    attemptId: this._id,
  }).populate("questionId"); // Populate question details
  const questions = await Question.find({ testId: this.testId }); // Get all questions for the test

  let calculatedScore = 0;
  let maxPossibleScore = 0;

  for (const question of questions) {
    const response = responses.find((r) =>
      r.questionId._id.equals(question._id)
    );

    if (question.questionType === "DominoQuestion") {
      maxPossibleScore += 1; // Assuming 1 point per domino question
      if (response && response.isCorrect) {
        calculatedScore += 1;
      }
    } else if (question.questionType === "MultipleChoiceQuestion") {
      // For V/F/?/X, score is based on correctly evaluated propositions
      const mcqQuestion = question; // Already fetched with type
      if (mcqQuestion.propositions && mcqQuestion.propositions.length > 0) {
        maxPossibleScore += mcqQuestion.propositions.length; // 1 point per proposition
        if (response && response.propositionResponses) {
          response.propositionResponses.forEach((propResponse) => {
            // Check if the proposition index is valid and if it was marked correct during evaluation
            if (
              propResponse.propositionIndex < mcqQuestion.propositions.length &&
              propResponse.isCorrect
            ) {
              calculatedScore += 1;
            }
          });
        }
      }
    }
    // Add logic for other question types if necessary
  }

  this.score = calculatedScore;
  this.percentageScore =
    maxPossibleScore > 0 ? (calculatedScore / maxPossibleScore) * 100 : 0;

  // Update metrics based on responses
  const answeredResponses = responses.filter(
    (r) =>
      !r.isSkipped &&
      (r.dominoAnswer ||
        (r.propositionResponses && r.propositionResponses.length > 0))
  );
  const skippedResponses = responses.filter((r) => r.isSkipped);

  this.metrics.questionsAnswered = answeredResponses.length;
  this.metrics.questionsSkipped = skippedResponses.length;
  this.metrics.answerChanges = responses.reduce(
    (sum, r) => sum + (r.answerChanges || 0),
    0
  );
  this.metrics.flaggedQuestions = responses.filter((r) => r.isFlagged).length;

  // Note: visitCounts and timePerQuestion are updated during the 'visitQuestion' action

  return this.save();
};

// Method to finish test attempt
TestAttemptSchema.methods.finishAttempt = function (status = "completed") {
  if (this.status === "in-progress") {
    // Only update if currently in progress
    this.status = status;
    this.endTime = new Date();
    // Ensure startTime exists before calculating timeSpent
    this.timeSpent = this.startTime
      ? this.endTime.getTime() - this.startTime.getTime()
      : 0;
  }
  return this.save();
};

// Post-save hook to update test analytics
TestAttemptSchema.post("save", async function (doc, next) {
  // Use post hook with doc and next
  try {
    // Check if the status was modified to 'completed' in this save operation
    const statusChangedToCompleted =
      doc.isModified("status") && doc.status === "completed";

    if (statusChangedToCompleted) {
      const Test = mongoose.model("Test");
      const test = await Test.findById(doc.testId);
      if (test) {
        await test.updateAnalytics(); // Ensure this method exists and works correctly
      }
    }
  } catch (error) {
    console.error(
      `Error in TestAttempt post-save hook for attempt ${doc._id}:`,
      error
    );
    // Decide if the error should prevent further actions, currently just logs
  }
  next(); // Call next() in post hooks
});

module.exports = mongoose.model("TestAttempt", TestAttemptSchema);
