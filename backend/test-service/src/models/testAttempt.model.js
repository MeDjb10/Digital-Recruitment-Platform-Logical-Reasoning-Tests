const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Update the metrics schema to include all the new fields
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
      default: null,
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
      default: 0,
      comment: "Time spent in milliseconds",
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    metrics: {
      questionsAnswered: { type: Number, default: 0 },
      questionsSkipped: { type: Number, default: 0 },
      questionsTotal: { type: Number, default: 0 },
      answerChanges: { type: Number, default: 0 },
      flaggedQuestions: { type: Number, default: 0 },
      correctAnswers: { type: Number, default: 0 },
      halfCorrectAnswers: { type: Number, default: 0 },
      reversedAnswers: { type: Number, default: 0 },
      totalPropositionsCorrect: { type: Number, default: 0 },
      totalPropositionsAttempted: { type: Number, default: 0 },
      propositionAccuracy: { type: Number, default: 0 },
      visitCounts: { type: Map, of: Number, default: new Map() },
      timePerQuestion: { type: Map, of: Number, default: new Map() },
      completionRate: { type: Number, default: 0 },
      averageTimePerQuestion: { type: Number, default: 0 },
      totalTimeSpent: { type: Number, default: 0 },
      averageVisitsPerQuestion: { type: Number, default: 0 },
    },
    device: { type: String, default: '' },
    browser: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    aiClassification: {
      prediction: {
        type: String,
        default: null,
      },
      confidence: {
        type: Number,
        default: null,
      },
      classifiedAt: {
        type: Date,
        default: null,
      },
    },
    manualClassification: { 
      classification: { type: String, default: null },
      classifiedBy: { type: String, default: null },
      classifiedAt: { type: Date, default: null },
    }
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

// Methods to calculate score (Updated with better error handling)
TestAttemptSchema.methods.calculateScore = async function () {
  try {
    console.log(`🔄 Starting calculateScore for attempt ${this._id}`);

    // IMPORTANT: Ensure we're working with the latest data
    await this.populate("testId"); // Make sure testId is populated

    const QuestionResponse = mongoose.model("QuestionResponse");
    const Question = mongoose.model("Question");

    const responses = await QuestionResponse.find({
      attemptId: this._id,
    }).populate("questionId");

    const questions = await Question.find({ testId: this.testId });

    console.log(
      `📊 Found ${responses.length} responses and ${questions.length} questions`
    );

    // Validate we have the required data
    if (questions.length === 0) {
      console.error(`❌ No questions found for test ${this.testId}`);
      throw new Error(`No questions found for test ${this.testId}`);
    }

    let calculatedScore = 0;
    let maxPossibleScore = 0;

    // Enhanced metrics
    let correctAnswers = 0;
    let halfCorrectAnswers = 0;
    let reversedAnswers = 0;
    let totalPropositionsCorrect = 0;
    let totalPropositionsAttempted = 0;

    console.log(`=== SCORE CALCULATION DEBUG ===`);
    console.log(`Total questions in test: ${questions.length}`);
    console.log(`Total responses found: ${responses.length}`);

    for (const question of questions) {
      const response = responses.find(
        (r) => r.questionId && r.questionId._id.equals(question._id)
      );

      console.log(
        `\n--- Question ${question.questionNumber} (${question._id}) ---`
      );
      console.log(`Question type: ${question.questionType}`);
      console.log(`Response found: ${!!response}`);

      if (question.questionType === "DominoQuestion") {
        maxPossibleScore += 1;
        console.log(`Max possible score increased to: ${maxPossibleScore}`);

        if (response && !response.isSkipped) {
          console.log(`Response details:`, {
            isCorrect: response.isCorrect,
            isHalfCorrect: response.isHalfCorrect,
            isReversed: response.isReversed,
            isSkipped: response.isSkipped,
            dominoAnswer: response.dominoAnswer,
          });

          if (response.isCorrect) {
            calculatedScore += 1;
            correctAnswers += 1;
            console.log(
              `✓ Correct answer: +1 point. Total score: ${calculatedScore}`
            );
          } else if (response.isHalfCorrect) {
            halfCorrectAnswers += 1;
            console.log(
              `◐ Half correct: +0 points (wrong answer). Total score: ${calculatedScore}`
            );
          } else if (response.isReversed) {
            reversedAnswers += 1;
            console.log(
              `↻ Reversed answer: +0 points (wrong answer). Total score: ${calculatedScore}`
            );
          } else {
            console.log(
              `✗ Incorrect answer: +0 points. Total score: ${calculatedScore}`
            );
          }
        } else {
          console.log(`No valid response for this question`);
        }
      } else if (question.questionType === "MultipleChoiceQuestion") {
        const mcqQuestion = question;
        if (mcqQuestion.propositions && mcqQuestion.propositions.length > 0) {
          maxPossibleScore += mcqQuestion.propositions.length;
          console.log(
            `MCQ: Max possible score increased by ${mcqQuestion.propositions.length} to: ${maxPossibleScore}`
          );

          if (
            response &&
            response.propositionResponses &&
            !response.isSkipped
          ) {
            response.propositionResponses.forEach((propResponse) => {
              totalPropositionsAttempted += 1;
              if (
                propResponse.propositionIndex <
                  mcqQuestion.propositions.length &&
                propResponse.isCorrect
              ) {
                calculatedScore += 1;
                totalPropositionsCorrect += 1;
                console.log(
                  `✓ Correct proposition: +1 point. Total score: ${calculatedScore}`
                );
              }
            });
          }
        }
      }
    }

    console.log(`\n=== FINAL CALCULATION ===`);
    console.log(`Final calculated score: ${calculatedScore}`);
    console.log(`Max possible score: ${maxPossibleScore}`);
    console.log(
      `Percentage: ${
        maxPossibleScore > 0 ? (calculatedScore / maxPossibleScore) * 100 : 0
      }%`
    );

    // Update the document properties
    this.score = calculatedScore;
    this.percentageScore =
      maxPossibleScore > 0 ? (calculatedScore / maxPossibleScore) * 100 : 0;

    // FIXED: Enhanced metrics - Count only ACTUALLY answered responses
    const answeredResponses = responses.filter((r) => {
      if (r.isSkipped) return false;

      // For domino questions: check if dominoAnswer has actual values
      if (r.dominoAnswer && typeof r.dominoAnswer === "object") {
        return (
          r.dominoAnswer.dominoId !== undefined &&
          r.dominoAnswer.topValue !== undefined &&
          r.dominoAnswer.bottomValue !== undefined &&
          r.dominoAnswer.dominoId !== null
        );
      }

      // For MCQ questions: check if propositionResponses exist and have content
      if (r.propositionResponses && Array.isArray(r.propositionResponses)) {
        return r.propositionResponses.length > 0;
      }

      return false;
    });

    const skippedResponses = responses.filter((r) => r.isSkipped);
    const flaggedResponses = responses.filter((r) => r.isFlagged);

    console.log(`\n=== METRICS CALCULATION ===`);
    console.log(`Answered responses: ${answeredResponses.length}`);
    console.log(`Skipped responses: ${skippedResponses.length}`);
    console.log(`Total questions: ${questions.length}`);
    console.log(`Correct answers: ${correctAnswers}`);
    console.log(`Half correct answers: ${halfCorrectAnswers}`);
    console.log(`Reversed answers: ${reversedAnswers}`);

    // FIXED: Completely replace the metrics object and mark as modified
    const currentVisitCounts = this.metrics?.visitCounts || {};
    const currentTimePerQuestion = this.metrics?.timePerQuestion || {};

    // FIXED: Ensure ALL questions are included in timePerQuestion
    const timePerQuestionMap = new Map();

    // First, get the current timePerQuestion data
    const currentTimePerQuestionObj =
      this.metrics?.timePerQuestion instanceof Map
        ? Object.fromEntries(this.metrics.timePerQuestion)
        : this.metrics?.timePerQuestion || {};

    // Then, sync with actual response times for ALL responses
    responses.forEach((response) => {
      if (response.questionId) {
        const questionIdStr = response.questionId._id.toString();

        // Use the response's actual timeSpent as the source of truth
        timePerQuestionMap.set(questionIdStr, response.timeSpent || 0);

        console.log(
          `⏱️ Question ${questionIdStr}: ${response.timeSpent || 0}ms`
        );
      }
    });

    console.log(`📊 TimePerQuestion map entries: ${timePerQuestionMap.size}`);
    console.log(
      `📊 TimePerQuestion data:`,
      Object.fromEntries(timePerQuestionMap)
    );

    // Create a completely new metrics object
    const newMetrics = {
      questionsAnswered: answeredResponses.length,
      questionsSkipped: skippedResponses.length,
      questionsTotal: questions.length,
      answerChanges: responses.reduce(
        (sum, r) => sum + (r.answerChanges || 0),
        0
      ),
      flaggedQuestions: flaggedResponses.length,

      // Domino-specific metrics
      correctAnswers,
      halfCorrectAnswers,
      reversedAnswers,

      // MCQ-specific metrics
      totalPropositionsCorrect,
      totalPropositionsAttempted,
      propositionAccuracy:
        totalPropositionsAttempted > 0
          ? (totalPropositionsCorrect / totalPropositionsAttempted) * 100
          : 0,

      // FIXED: Use the synced time data
      visitCounts: currentVisitCounts,
      timePerQuestion: timePerQuestionMap, // Use the synced map

      // Additional calculated metrics
      completionRate:
        questions.length > 0
          ? (answeredResponses.length / questions.length) * 100
          : 0,
      averageTimePerQuestion:
        answeredResponses.length > 0
          ? responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) /
            answeredResponses.length
          : 0,
      totalTimeSpent: responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0),
      averageVisitsPerQuestion:
        responses.length > 0
          ? responses.reduce((sum, r) => sum + (r.visitCount || 0), 0) /
            responses.length
          : 0,
    };

    console.log(`📊 New metrics object:`, JSON.stringify(newMetrics, null, 2));

    // CRITICAL FIX: Use unset first, then set the new object
    this.set("metrics", undefined);
    this.set("metrics", newMetrics);

    // Alternative approach - force Mongoose to recognize the change
    this.metrics = newMetrics;
    this.markModified("metrics");
    this.markModified("score");
    this.markModified("percentageScore");

    // FIXED: Save and return the saved document
    console.log(`💾 Saving attempt...`);
    const savedAttempt = await this.save();
    console.log(`✅ Attempt saved successfully`);
    console.log(
      `📊 Saved metrics:`,
      JSON.stringify(savedAttempt.metrics, null, 2)
    );

    return savedAttempt;
  } catch (error) {
    console.error(`❌ Error in calculateScore for attempt ${this._id}:`, error);
    console.error(`❌ Stack trace:`, error.stack);
    throw error; // Re-throw to handle in calling code
  }
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

// Add method to update AI classification
TestAttemptSchema.methods.updateAiClassification = function (prediction, confidence) {
  this.aiClassification = {
    prediction,
    confidence,
    classifiedAt: new Date(),
  };
  return this.save();
};

// Add method to update manual classification
TestAttemptSchema.methods.updateManualClassification = function (classification, classifiedBy) {
  this.manualClassification = {
    classification,
    classifiedBy,
    classifiedAt: new Date(),
  };
  this.markModified('manualClassification');
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

// Use transform functions instead of overriding methods
TestAttemptSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    // Convert Maps to plain objects for JSON serialization
    if (ret.metrics) {
      if (ret.metrics.visitCounts instanceof Map) {
        ret.metrics.visitCounts = Object.fromEntries(ret.metrics.visitCounts);
      }
      if (ret.metrics.timePerQuestion instanceof Map) {
        ret.metrics.timePerQuestion = Object.fromEntries(
          ret.metrics.timePerQuestion
        );
      }
    }
    return ret;
  },
});

TestAttemptSchema.set("toObject", {
  transform: function (doc, ret, options) {
    // Convert Maps to plain objects
    if (ret.metrics) {
      if (ret.metrics.visitCounts instanceof Map) {
        ret.metrics.visitCounts = Object.fromEntries(ret.metrics.visitCounts);
      }
      if (ret.metrics.timePerQuestion instanceof Map) {
        ret.metrics.timePerQuestion = Object.fromEntries(
          ret.metrics.timePerQuestion
        );
      }
    }
    return ret;
  },
});

// Update or add the pre-save middleware to initialize both AI and manual classifications
TestAttemptSchema.pre("save", function (next) {
  if (!this.aiClassification) {
    this.aiClassification = {
      prediction: null,
      confidence: null,
      classifiedAt: null,
    };
  }
  
  // Initialize manualClassification if it doesn't exist
  if (!this.manualClassification) {
    this.manualClassification = {
      classification: null,
      classifiedBy: null,
      classifiedAt: null,
    };
  }
  
  // Mark both fields as modified to ensure they're saved
  this.markModified('aiClassification');
  this.markModified('manualClassification');
  
  next();
});

module.exports = mongoose.model("TestAttempt", TestAttemptSchema);
