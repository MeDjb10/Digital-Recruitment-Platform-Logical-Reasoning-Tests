const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");
const {
  TestAttempt,
  QuestionResponse,
  Test,
  Question,
  DominoQuestion,
  MultipleChoiceQuestion,
} = require("../models"); // Ensure Question is imported
const { AppError } = require("../middleware/errorHandler");
const logger = require("../utils/logger");
// Removed DominoQuestion, MultipleChoiceQuestion import as Question base model is used more often

/**
 * Start a new test attempt
 */
const startTestAttempt = async (req, res) => {
  const { testId } = req.params;
  const { candidateId } = req.body;

  try {
    // Check if test exists and is active
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError(
        `Test with ID ${testId} not found`,
        StatusCodes.NOT_FOUND
      );
    }
    if (!test.isActive) {
      throw new AppError(
        `Test with ID ${testId} is not active`,
        StatusCodes.FORBIDDEN
      );
    }

    // Check if candidate has an in-progress attempt for this test
    const existingAttempt = await TestAttempt.findOne({
      testId,
      candidateId,
      status: "in-progress",
    });

    if (existingAttempt) {
      logger.info(
        `Resuming existing test attempt ${existingAttempt._id} for candidate ${candidateId} on test ${testId}`
      );
      // Update last activity time on resume
      existingAttempt.lastActivityAt = new Date();
      await existingAttempt.save();

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Resuming existing test attempt",
        data: existingAttempt,
      });
    }

    // Check if candidate has already completed this test
    const completedAttempt = await TestAttempt.findOne({
      testId,
      candidateId,
      status: "completed",
    });
    if (completedAttempt) {
      throw new AppError(
        `Candidate ${candidateId} has already completed test ${testId}`,
        StatusCodes.CONFLICT
      );
    }

    // Get client information
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",").shift() ||
      req.socket?.remoteAddress ||
      "Unknown";

    // Create new test attempt
    logger.info(
      `Creating new test attempt for candidate ${candidateId} on test ${testId}`
    );

    const attempt = await TestAttempt.create({
      testId,
      candidateId,
      device: getUserDevice(userAgent),
      browser: getUserBrowser(userAgent),
      ipAddress,
      startTime: new Date(),
      lastActivityAt: new Date(),
    });

    logger.info(`Test attempt ${attempt._id} created successfully`);

    // Initialize question responses for all questions in the test
    const questions = await getQuestionsForTest(testId);

    if (questions.length === 0) {
      logger.warn(
        `Test ${testId} has no questions. Attempt ${attempt._id} created but may be problematic.`
      );
      // You might want to prevent attempt start or handle this differently
    }

    logger.info(`Initializing ${questions.length} question responses`);

    // Create responses in smaller batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const responsePromises = batch.map((question) =>
        QuestionResponse.create({
          attemptId: attempt._id,
          questionId: question._id,
          candidateId,
        }).catch((error) => {
          logger.error(
            `Failed to create response for question ${question._id}:`,
            error
          );
          throw error;
        })
      );

      try {
        await Promise.all(responsePromises);
        logger.info(
          `Created responses for batch ${
            Math.floor(i / batchSize) + 1
          }/${Math.ceil(questions.length / batchSize)}`
        );
      } catch (error) {
        logger.error(`Failed to create response batch:`, error);
        throw error;
      }
    }

    logger.info(
      `New test attempt ${attempt._id} created successfully for candidate ${candidateId} on test ${testId}`
    );

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    logger.error(`Error in startTestAttempt:`, error);
    throw error; // Let the error handler middleware handle it
  }
};

/**
 * Get a specific test attempt by ID
 */
const getAttemptById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
  }

  const attempt = await TestAttempt.findById(id).populate({
    path: "testId",
    select: "name description duration difficulty category type", // Populate relevant test details
  });

  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: attempt,
  });
};

/**
 * Get all questions for a test attempt with responses
 */
const getAttemptQuestions = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
  }

  // Verify the attempt exists
  const attempt = await TestAttempt.findById(id);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Get all questions for the test (using the base model)
  const questions = await getQuestionsForTest(attempt.testId);

  // Get all responses for this attempt
  const responses = await QuestionResponse.find({ attemptId: id });

  // Merge questions with their responses
  const questionsWithResponses = questions.map((question) => {
    const response = responses.find(
      (r) => r.questionId.toString() === question._id.toString()
    );

    // Don't return the correct answer details for in-progress attempts
    const questionData = question.toObject(); // Use toObject to work with plain JS object
    if (attempt.status === "in-progress") {
      delete questionData.correctAnswer; // For Domino
      if (questionData.propositions) {
        // For MCQ V/F/?
        questionData.propositions = questionData.propositions.map(
          ({ text }) => ({ text })
        ); // Only send text
      }
    }

    // Structure the response data cleanly
    let responseData = null;
    if (response) {
      responseData = {
        _id: response._id, // Use _id for consistency
        dominoAnswer: response.dominoAnswer,
        propositionResponses: response.propositionResponses, // Include new field
        // selectedOptions: response.selectedOptions, // Remove old field
        isCorrect: response.isCorrect, // Overall correctness
        isSkipped: response.isSkipped,
        isFlagged: response.isFlagged,
        visitCount: response.visitCount,
        lastVisitAt: response.lastVisitAt,
        answeredAt: response.answeredAt,
        timeSpent: response.timeSpent,
      };
    }

    return {
      ...questionData, // Spread the potentially modified question data
      response: responseData,
    };
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      attempt: attempt.toObject(), // Send attempt details as well
      questions: questionsWithResponses,
    },
  });
};

/**
 * Submit an answer for a specific question in a test attempt
 */
const submitAnswer = async (req, res) => {
  const { attemptId, questionId } = req.params;
  const { candidateId, answer } = req.body; // Destructure answer from body

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
  }
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
  }
  if (!candidateId) {
    throw new AppError(
      "Candidate ID is required in the request body",
      StatusCodes.BAD_REQUEST
    );
  }
  if (answer === undefined) {
    throw new AppError(
      "Answer data is required in the request body",
      StatusCodes.BAD_REQUEST
    );
  }

  // Find the test attempt
  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${attemptId} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if test is still in progress
  if (attempt.status !== "in-progress") {
    throw new AppError(
      `Cannot submit answer for a test attempt with status: ${attempt.status}`,
      StatusCodes.BAD_REQUEST
    );
  }

  // Verify the candidateId matches the attempt
  if (attempt.candidateId !== candidateId) {
    throw new AppError(
      "Unauthorized: Candidate ID does not match the attempt",
      StatusCodes.FORBIDDEN
    );
  }

  // Find the question response
  let response = await QuestionResponse.findOne({
    attemptId,
    questionId,
    // candidateId, // Candidate ID is already verified against the attempt
  });

  if (!response) {
    // This shouldn't happen if startTestAttempt initializes responses correctly
    logger.error(
      `QuestionResponse not found for attempt ${attemptId}, question ${questionId}. Creating.`
    );
    response = await QuestionResponse.create({
      attemptId,
      questionId,
      candidateId: attempt.candidateId, // Use ID from attempt
    });
  }

  // Record the answer using the method on the response document
  // The 'answer' variable holds the data structure (e.g., {dominoId...} or [{propositionIndex...}])
  await response.recordAnswer(answer);

  // Update the timestamp for the last activity on the attempt
  attempt.lastActivityAt = new Date();
  await attempt.save();

  logger.info(
    `Answer submitted for question ${questionId} in attempt ${attemptId}`
  );
  res.status(StatusCodes.OK).json({
    success: true,
    data: response.toObject(), // Return the updated response
  });
};

/**
 * Toggle the flagged status of a question
 */
const toggleQuestionFlag = async (req, res) => {
  const { attemptId, questionId } = req.params;
  const { candidateId } = req.body; // Ensure candidateId is passed for verification

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
  }
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
  }
  if (!candidateId) {
    throw new AppError(
      "Candidate ID is required in the request body",
      StatusCodes.BAD_REQUEST
    );
  }

  // Find the test attempt
  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${attemptId} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if test is still in progress
  if (attempt.status !== "in-progress") {
    throw new AppError(
      `Cannot flag questions in a test attempt with status: ${attempt.status}`,
      StatusCodes.BAD_REQUEST
    );
  }

  // Verify the candidateId matches the attempt
  if (attempt.candidateId !== candidateId) {
    throw new AppError(
      "Unauthorized: Candidate ID does not match the attempt",
      StatusCodes.FORBIDDEN
    );
  }

  // Find the question response
  let response = await QuestionResponse.findOne({
    attemptId,
    questionId,
    // candidateId, // Already verified
  });

  if (!response) {
    logger.error(
      `QuestionResponse not found for attempt ${attemptId}, question ${questionId} during flag toggle. Creating.`
    );
    response = await QuestionResponse.create({
      attemptId,
      questionId,
      candidateId: attempt.candidateId,
    });
  }

  // Toggle the flag using the method
  await response.toggleFlag();

  // Update the timestamp for the last activity on the attempt
  attempt.lastActivityAt = new Date();
  await attempt.save();

  logger.info(
    `Flag toggled for question ${questionId} in attempt ${attemptId}. New status: ${response.isFlagged}`
  );
  res.status(StatusCodes.OK).json({
    success: true,
    data: response.toObject(),
  });
};

/**
 * Mark a question as visited and update time spent
 */
const visitQuestion = async (req, res) => {
  const { attemptId, questionId } = req.params;
  const { candidateId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
  }
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
  }
  if (!candidateId) {
    throw new AppError(
      "Candidate ID is required in the request body",
      StatusCodes.BAD_REQUEST
    );
  }

  // Find the test attempt
  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${attemptId} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if test is still in progress
  if (attempt.status !== "in-progress") {
    throw new AppError(
      `Cannot record visits in a test attempt with status: ${attempt.status}`,
      StatusCodes.BAD_REQUEST
    );
  }

  // Verify the candidateId matches the attempt
  if (attempt.candidateId !== candidateId) {
    throw new AppError(
      "Unauthorized: Candidate ID does not match the attempt",
      StatusCodes.FORBIDDEN
    );
  }

  // Find the question response
  let response = await QuestionResponse.findOne({
    attemptId,
    questionId,
  });

  if (!response) {
    logger.error(
      `QuestionResponse not found for attempt ${attemptId}, question ${questionId} during visit. Creating.`
    );
    response = await QuestionResponse.create({
      attemptId,
      questionId,
      candidateId: attempt.candidateId,
    });
  }

  // Record the visit
  await response.recordVisit();

  // Update visit count metrics
  if (!attempt.metrics.visitCounts) {
    attempt.metrics.visitCounts = new Map();
  }
  attempt.metrics.visitCounts.set(questionId.toString(), response.visitCount);

  // Update last activity time
  attempt.lastActivityAt = new Date();
  attempt.markModified("metrics");
  await attempt.save();

  logger.info(
    `Visit recorded for question ${questionId} in attempt ${attemptId}. Visit count: ${response.visitCount}`
  );

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      questionId,
      visitCount: response.visitCount,
      message: "Visit recorded successfully",
    },
  });
};

/**
 * Update time spent on a specific question
 * This should be called periodically or when leaving a question
 */
const updateTimeSpent = async (req, res) => {
  const { attemptId, questionId } = req.params;
  const { candidateId, timeSpent } = req.body; // timeSpent in milliseconds

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
  }
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
  }
  if (!candidateId) {
    throw new AppError(
      "Candidate ID is required in the request body",
      StatusCodes.BAD_REQUEST
    );
  }
  if (typeof timeSpent !== "number" || timeSpent < 0) {
    throw new AppError(
      "Valid timeSpent (in milliseconds) is required",
      StatusCodes.BAD_REQUEST
    );
  }

  // Find the test attempt
  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${attemptId} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if test is still in progress
  if (attempt.status !== "in-progress") {
    throw new AppError(
      `Cannot update time for a test attempt with status: ${attempt.status}`,
      StatusCodes.BAD_REQUEST
    );
  }

  // Verify the candidateId matches the attempt
  if (attempt.candidateId !== candidateId) {
    throw new AppError(
      "Unauthorized: Candidate ID does not match the attempt",
      StatusCodes.FORBIDDEN
    );
  }

  // Find the question response
  let response = await QuestionResponse.findOne({
    attemptId,
    questionId,
  });

  if (!response) {
    logger.error(
      `QuestionResponse not found for attempt ${attemptId}, question ${questionId} during time update. Creating.`
    );
    response = await QuestionResponse.create({
      attemptId,
      questionId,
      candidateId: attempt.candidateId,
    });
  }

  // Add time spent to the existing time
  response.timeSpent = (response.timeSpent || 0) + timeSpent;
  await response.save();

  // Update attempt metrics
  if (!attempt.metrics.timePerQuestion) {
    attempt.metrics.timePerQuestion = new Map();
  }

  const currentTime =
    attempt.metrics.timePerQuestion.get(questionId.toString()) || 0;
  attempt.metrics.timePerQuestion.set(
    questionId.toString(),
    currentTime + timeSpent
  );

  // Update last activity time
  attempt.lastActivityAt = new Date();
  attempt.markModified("metrics");
  await attempt.save();

  logger.info(
    `Time updated for question ${questionId} in attempt ${attemptId}. Added: ${timeSpent}ms, Total: ${response.timeSpent}ms`
  );

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      questionId,
      timeAdded: timeSpent,
      totalTimeSpent: response.timeSpent,
      message: "Time spent updated successfully",
    },
  });
};

/**
 * Skip a question
 */
const skipQuestion = async (req, res) => {
  const { attemptId, questionId } = req.params;
  const { candidateId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
  }
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    throw new AppError("Invalid question ID format", StatusCodes.BAD_REQUEST);
  }
  if (!candidateId) {
    throw new AppError(
      "Candidate ID is required in the request body",
      StatusCodes.BAD_REQUEST
    );
  }

  // Find the test attempt
  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${attemptId} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if test is still in progress
  if (attempt.status !== "in-progress") {
    throw new AppError(
      `Cannot skip questions in a test attempt with status: ${attempt.status}`,
      StatusCodes.BAD_REQUEST
    );
  }

  // Verify the candidateId matches the attempt
  if (attempt.candidateId !== candidateId) {
    throw new AppError(
      "Unauthorized: Candidate ID does not match the attempt",
      StatusCodes.FORBIDDEN
    );
  }

  // Find the question response
  let response = await QuestionResponse.findOne({
    attemptId,
    questionId,
    // candidateId, // Verified
  });

  if (!response) {
    logger.error(
      `QuestionResponse not found for attempt ${attemptId}, question ${questionId} during skip. Creating.`
    );
    response = await QuestionResponse.create({
      attemptId,
      questionId,
      candidateId: attempt.candidateId,
    });
  }

  // Mark as skipped using the method (this also clears answers)
  await response.skipQuestion();

  // Update metrics (questionsSkipped is now calculated in calculateScore, but we can keep this for potential real-time updates if needed)
  // attempt.metrics.questionsSkipped = (attempt.metrics.questionsSkipped || 0) + 1; // Re-evaluate if needed here

  // Update the timestamp for the last activity on the attempt
  attempt.lastActivityAt = new Date();
  await attempt.save();

  logger.info(`Question ${questionId} skipped in attempt ${attemptId}`);
  res.status(StatusCodes.OK).json({
    success: true,
    data: response.toObject(),
  });
};

/**
 * Complete a test attempt
 */
const completeAttempt = async (req, res) => {
  const { id } = req.params;
  const { candidateId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
  }
  if (!candidateId) {
    throw new AppError(
      "Candidate ID is required in the request body",
      StatusCodes.BAD_REQUEST
    );
  }

  // Find the test attempt
  const attempt = await TestAttempt.findById(id);
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if test is still in progress
  if (attempt.status !== "in-progress") {
    if (attempt.status === "completed") {
      logger.info(
        `Attempt ${id} was already completed. Returning existing data.`
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Attempt already completed",
        data: attempt.toObject(),
      });
    }
    throw new AppError(
      `Test attempt status is already ${attempt.status}`,
      StatusCodes.BAD_REQUEST
    );
  }

  // Verify the candidateId matches the attempt
  if (attempt.candidateId !== candidateId) {
    throw new AppError(
      "Unauthorized: Candidate ID does not match the attempt",
      StatusCodes.FORBIDDEN
    );
  }

  try {
    // STEP 1: Mark as completed first
    console.log(`🔄 Step 1: Marking attempt ${id} as completed...`);
    await attempt.finishAttempt("completed");
    console.log(`✅ Step 1 completed: Attempt marked as completed`);indbyidandupdate:

    // STEP 2: Calculate score and update metrics using direct database update
    console.log(`🔄 Step 2: Starting score calculation for attempt ${id}...`);

    // Calculate metrics (keep the existing calculation logic)
    const updatedAttempt = await attempt.calculateScore();

    // STEP 2.5: Force update using findByIdAndUpdate as backup
    console.log(`🔄 Step 2.5: Force updating metrics directly in database...`);

    const forceUpdate = await TestAttempt.findByIdAndUpdate(
      id,
      {
        $set: {
          "metrics.questionsAnswered": updatedAttempt.metrics.questionsAnswered,
          "metrics.questionsSkipped": updatedAttempt.metrics.questionsSkipped,
          "metrics.questionsTotal": updatedAttempt.metrics.questionsTotal,
          "metrics.answerChanges": updatedAttempt.metrics.answerChanges,
          "metrics.flaggedQuestions": updatedAttempt.metrics.flaggedQuestions,
          "metrics.correctAnswers": updatedAttempt.metrics.correctAnswers,
          "metrics.halfCorrectAnswers":
            updatedAttempt.metrics.halfCorrectAnswers,
          "metrics.reversedAnswers": updatedAttempt.metrics.reversedAnswers,
          "metrics.totalPropositionsCorrect":
            updatedAttempt.metrics.totalPropositionsCorrect,
          "metrics.totalPropositionsAttempted":
            updatedAttempt.metrics.totalPropositionsAttempted,
          "metrics.propositionAccuracy":
            updatedAttempt.metrics.propositionAccuracy,
          "metrics.completionRate": updatedAttempt.metrics.completionRate,
          "metrics.averageTimePerQuestion":
            updatedAttempt.metrics.averageTimePerQuestion,
          "metrics.totalTimeSpent": updatedAttempt.metrics.totalTimeSpent,
          "metrics.averageVisitsPerQuestion":
            updatedAttempt.metrics.averageVisitsPerQuestion,
          score: updatedAttempt.score,
          percentageScore: updatedAttempt.percentageScore,
        },
      },
      { new: true }
    );

    console.log(`✅ Step 2.5 completed: Force update successful`);

    // STEP 3: Force reload from database to verify save
    console.log(`🔄 Step 3: Reloading attempt from database...`);
    const finalAttempt = await TestAttempt.findById(id);
    console.log(
      `📊 Final metrics from DB:`,
      JSON.stringify(finalAttempt.metrics, null, 2)
    );
    console.log(`✅ Step 3 completed: Reloaded from database`);

    logger.info(
      `Test attempt ${id} completed by candidate ${candidateId}. Score: ${finalAttempt.score}/${finalAttempt.percentageScore}%`
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Test attempt completed successfully",
      data: finalAttempt.toObject(),
    });
  } catch (error) {
    console.error(`❌ ERROR in completeAttempt for ${id}:`, error);
    console.error(`❌ Error stack:`, error.stack);

    logger.error(`Error completing attempt ${id}:`, error);

    // FIXED: Ensure the attempt is marked as completed even if score calculation fails
    if (attempt.status === "in-progress") {
      await attempt.finishAttempt("completed");
    }

    // FIXED: Get the final attempt data from database
    const finalAttempt = await TestAttempt.findById(id);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Test attempt completed but score calculation failed",
      data: finalAttempt.toObject(), // ← Return the database version
      warning: "Metrics may not be accurate due to calculation error",
      error: error.message, // Include error for debugging
    });
  }
};

/**
 * Get all attempts for a candidate
 */
const getCandidateAttempts = async (req, res) => {
  const { candidateId } = req.params;
  const { status, testId } = req.query; // Allow filtering by testId too

  // Build query
  const query = { candidateId };

  if (status) {
    if (
      !["in-progress", "completed", "timed-out", "abandoned"].includes(status)
    ) {
      throw new AppError(
        "Invalid status filter value",
        StatusCodes.BAD_REQUEST
      );
    }
    query.status = status;
  }
  if (testId) {
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      throw new AppError(
        "Invalid test ID format for filter",
        StatusCodes.BAD_REQUEST
      );
    }
    query.testId = testId;
  }

  const attempts = await TestAttempt.find(query)
    .sort({ startTime: -1 }) // Most recent first
    .populate({
      path: "testId",
      select: "name description duration difficulty type category", // Select fields from Test model
    });

  res.status(StatusCodes.OK).json({
    success: true,
    count: attempts.length,
    data: attempts.map((a) => a.toObject()), // Convert to plain objects
  });
};

/**
 * Get all attempts for a test
 */
const getTestAttempts = async (req, res) => {
  const { testId } = req.params;
  const {
    status,
    candidateId,
    page = 1,
    limit = 20,
    sort = "startTime",
    order = "desc",
  } = req.query;

  if (!mongoose.Types.ObjectId.isValid(testId)) {
    throw new AppError("Invalid test ID format", StatusCodes.BAD_REQUEST);
  }

  // Build query
  const query = { testId };

  if (status) {
    if (
      !["in-progress", "completed", "timed-out", "abandoned"].includes(status)
    ) {
      throw new AppError(
        "Invalid status filter value",
        StatusCodes.BAD_REQUEST
      );
    }
    query.status = status;
  }
  if (candidateId) {
    // Add validation if candidateId format is known (e.g., isString, isMongoId if applicable)
    query.candidateId = candidateId;
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Sorting
  const sortOptions = {};
  const validSortFields = [
    "startTime",
    "endTime",
    "score",
    "percentageScore",
    "status",
    "candidateId",
  ];
  if (validSortFields.includes(sort)) {
    sortOptions[sort] = order === "asc" ? 1 : -1;
  } else {
    sortOptions["startTime"] = -1; // Default sort
  }

  // Get total count matching the query
  const totalCount = await TestAttempt.countDocuments(query);

  // Get paginated attempts
  const attempts = await TestAttempt.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);
  // Optionally populate candidate details if needed, e.g., .populate('candidateId', 'firstName lastName email') if candidateId refers to a User model

  res.status(StatusCodes.OK).json({
    success: true,
    count: attempts.length,
    totalCount,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    },
    data: attempts.map((a) => a.toObject()),
  });
};

/**
 * Get comprehensive result details for a completed attempt
 */
const getAttemptResults = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid attempt ID format", StatusCodes.BAD_REQUEST);
  }

  // Find the attempt and populate test details
  const attempt = await TestAttempt.findById(id).populate("testId");
  if (!attempt) {
    throw new AppError(
      `Attempt with ID ${id} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  // Check if the attempt is completed or timed-out
  if (!["completed", "timed-out"].includes(attempt.status)) {
    throw new AppError(
      `Results are only available for completed or timed-out tests. Current status: ${attempt.status}`,
      StatusCodes.BAD_REQUEST
    );
  }

  const test = attempt.testId;
  if (!test) {
    throw new AppError(
      `Test associated with attempt ${id} not found`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  // Get all questions and responses
  const questions = await getQuestionsForTest(attempt.testId.id);
  const responses = await QuestionResponse.find({ attemptId: id });

  // Organize results by question with comprehensive data
  const questionResults = questions.map((question) => {
    const response = responses.find(
      (r) => r.questionId.toString() === question._id.toString()
    );

    // Prepare correct answer structure based on question type
    let correctAnswerDetails = null;
    if (question.questionType === "DominoQuestion") {
      correctAnswerDetails = question.correctAnswer;
    } else if (question.questionType === "MultipleChoiceQuestion") {
      correctAnswerDetails = {
        propositions:
          question.propositions?.map((p) => ({
            text: p.text,
            correctEvaluation: p.correctEvaluation,
          })) || [],
      };
    }

    // Enhanced question data
    const questionData = {
      _id: question._id,
      title: question.title,
      instruction: question.instruction,
      questionNumber: question.questionNumber,
      questionType: question.questionType,
      difficulty: question.difficulty,
      layoutType: question.layoutType, // For domino questions
      pattern: question.pattern, // For domino questions
    };

    // Enhanced response data with ALL fields
    const responseData = response
      ? {
          _id: response._id,

          // Answer data
          dominoAnswer: response.dominoAnswer,
          propositionResponses: response.propositionResponses,

          // Correctness indicators
          isCorrect: response.isCorrect,
          isHalfCorrect: response.isHalfCorrect, // Added this
          isReversed: response.isReversed, // Added this
          isSkipped: response.isSkipped,
          isFlagged: response.isFlagged,

          // Timing and interaction data
          timeSpent: response.timeSpent,
          visitCount: response.visitCount,
          answerChanges: response.answerChanges,

          // Timestamps
          firstVisitAt: response.firstVisitAt,
          lastVisitAt: response.lastVisitAt,
          answeredAt: response.answeredAt,

          // Events log (full interaction history)
          events: response.events,

          // Calculated fields for analysis
          averageTimePerVisit:
            response.visitCount > 0
              ? response.timeSpent / response.visitCount
              : 0,
          wasAnswered:
            !response.isSkipped &&
            (response.dominoAnswer ||
              (response.propositionResponses &&
                response.propositionResponses.length > 0)),

          // Question-specific analysis
          ...(question.questionType === "DominoQuestion" &&
          response.dominoAnswer
            ? {
                dominoAnalysis: {
                  providedTopValue: response.dominoAnswer.topValue,
                  providedBottomValue: response.dominoAnswer.bottomValue,
                  correctTopValue: question.correctAnswer?.topValue,
                  correctBottomValue: question.correctAnswer?.bottomValue,
                  isExactMatch: response.isCorrect,
                  isReversedMatch: response.isReversed,
                  isPartialMatch: response.isHalfCorrect,
                },
              }
            : {}),

          ...(question.questionType === "MultipleChoiceQuestion" &&
          response.propositionResponses
            ? {
                propositionAnalysis: {
                  totalPropositions: question.propositions?.length || 0,
                  answeredPropositions: response.propositionResponses.length,
                  correctPropositions: response.propositionResponses.filter(
                    (p) => p.isCorrect
                  ).length,
                  skippedPropositions: response.propositionResponses.filter(
                    (p) => p.candidateEvaluation === "X"
                  ).length,
                  accuracyRate:
                    response.propositionResponses.length > 0
                      ? (response.propositionResponses.filter(
                          (p) => p.isCorrect
                        ).length /
                          response.propositionResponses.length) *
                        100
                      : 0,
                },
              }
            : {}),
        }
      : null;

    return {
      question: questionData,
      response: responseData,
      correctAnswer: correctAnswerDetails,
    };
  });

  // Calculate comprehensive performance analytics
  const performanceAnalytics = {
    // Basic stats
    totalQuestions: questions.length,
    questionsAnswered: responses.filter((r) => {
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
    }).length,
    questionsSkipped: responses.filter((r) => r.isSkipped).length,
    questionsFlagged: responses.filter((r) => r.isFlagged).length,

    // Correctness breakdown
    correctAnswers: responses.filter((r) => r.isCorrect).length,
    halfCorrectAnswers: responses.filter((r) => r.isHalfCorrect).length,
    reversedAnswers: responses.filter((r) => r.isReversed).length,
    incorrectAnswers: responses.filter((r) => {
      // Count as incorrect if: not skipped, not correct, but has an actual answer
      if (r.isSkipped || r.isCorrect) return false;

      // Has domino answer
      if (r.dominoAnswer && typeof r.dominoAnswer === "object") {
        return (
          r.dominoAnswer.dominoId !== undefined &&
          r.dominoAnswer.topValue !== undefined &&
          r.dominoAnswer.bottomValue !== undefined &&
          r.dominoAnswer.dominoId !== null
        );
      }

      // Has MCQ answer
      if (r.propositionResponses && Array.isArray(r.propositionResponses)) {
        return r.propositionResponses.length > 0;
      }

      return false;
    }).length,

    // Timing analytics
    totalTimeSpent: responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0),
    averageTimePerQuestion:
      responses.length > 0
        ? responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) /
          responses.length
        : 0,
    fastestQuestion:
      responses.length > 0
        ? Math.min(...responses.map((r) => r.timeSpent || 0))
        : 0,
    slowestQuestion:
      responses.length > 0
        ? Math.max(...responses.map((r) => r.timeSpent || 0))
        : 0,

    // Interaction analytics
    totalVisits: responses.reduce((sum, r) => sum + (r.visitCount || 0), 0),
    averageVisitsPerQuestion:
      responses.length > 0
        ? responses.reduce((sum, r) => sum + (r.visitCount || 0), 0) /
          responses.length
        : 0,
    totalAnswerChanges: responses.reduce(
      (sum, r) => sum + (r.answerChanges || 0),
      0
    ),

    // Question type specific analytics
    dominoQuestionStats: {
      total: questions.filter((q) => q.questionType === "DominoQuestion")
        .length,
      correct: responses.filter((r) => {
        const q = questions.find(
          (question) => question._id.toString() === r.questionId.toString()
        );
        return q?.questionType === "DominoQuestion" && r.isCorrect;
      }).length,
      halfCorrect: responses.filter((r) => {
        const q = questions.find(
          (question) => question._id.toString() === r.questionId.toString()
        );
        return q?.questionType === "DominoQuestion" && r.isHalfCorrect;
      }).length,
      reversed: responses.filter((r) => {
        const q = questions.find(
          (question) => question._id.toString() === r.questionId.toString()
        );
        return q?.questionType === "DominoQuestion" && r.isReversed;
      }).length,
    },

    mcqQuestionStats: {
      total: questions.filter(
        (q) => q.questionType === "MultipleChoiceQuestion"
      ).length,
      totalPropositions: questions
        .filter((q) => q.questionType === "MultipleChoiceQuestion")
        .reduce((sum, q) => sum + (q.propositions?.length || 0), 0),
      correctPropositions: responses
        .filter((r) => r.propositionResponses)
        .reduce(
          (sum, r) =>
            sum +
            (r.propositionResponses?.filter((p) => p.isCorrect).length || 0),
          0
        ),
    },

    // Difficulty performance
    difficultyPerformance: {
      easy: {
        total: questions.filter((q) => q.difficulty === "easy").length,
        correct: responses.filter((r) => {
          const q = questions.find(
            (question) => question._id.toString() === r.questionId.toString()
          );
          return q?.difficulty === "easy" && r.isCorrect;
        }).length,
      },
      medium: {
        total: questions.filter((q) => q.difficulty === "medium").length,
        correct: responses.filter((r) => {
          const q = questions.find(
            (question) => question._id.toString() === r.questionId.toString()
          );
          return q?.difficulty === "medium" && r.isCorrect;
        }).length,
      },
      hard: {
        total: questions.filter((q) => q.difficulty === "hard").length,
        correct: responses.filter((r) => {
          const q = questions.find(
            (question) => question._id.toString() === r.questionId.toString()
          );
          return q?.difficulty === "hard" && r.isCorrect;
        }).length,
      },
    },
  };

  // Enhanced attempt data with properly serialized metrics
  const attemptData = {
    _id: attempt._id,
    testId: attempt.testId._id,
    testName: test.name,
    testDescription: test.description,
    testDuration: test.duration,
    testDifficulty: test.difficulty,
    testType: test.type,
    testCategory: test.category,

    candidateId: attempt.candidateId,

    // Timing
    startTime: attempt.startTime,
    endTime: attempt.endTime,
    timeSpent: attempt.timeSpent,

    // Status and scoring
    status: attempt.status,
    score: attempt.score,
    percentageScore: attempt.percentageScore,

    // Enhanced metrics with proper Map conversion
    metrics: {
      ...attempt.metrics,
      // Convert Maps to Objects for proper JSON serialization
      visitCounts:
        attempt.metrics.visitCounts instanceof Map
          ? Object.fromEntries(attempt.metrics.visitCounts)
          : attempt.metrics.visitCounts || {},
      timePerQuestion:
        attempt.metrics.timePerQuestion instanceof Map
          ? Object.fromEntries(attempt.metrics.timePerQuestion)
          : attempt.metrics.timePerQuestion || {},
    },

    // Technical details
    device: attempt.device,
    browser: attempt.browser,
    ipAddress: attempt.ipAddress,

    // Additional metadata
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
  };

  // Final comprehensive results object
  const results = {
    attempt: attemptData,
    questions: questionResults,
    analytics: performanceAnalytics,
    summary: {
      completionRate:
        (performanceAnalytics.questionsAnswered /
          performanceAnalytics.totalQuestions) *
        100,
      accuracyRate:
        performanceAnalytics.questionsAnswered > 0
          ? (performanceAnalytics.correctAnswers /
              performanceAnalytics.questionsAnswered) *
            100
          : 0,
      efficiencyScore:
        performanceAnalytics.averageTimePerQuestion > 0
          ? (performanceAnalytics.correctAnswers * 1000) /
            performanceAnalytics.averageTimePerQuestion
          : 0,
      engagementScore:
        performanceAnalytics.totalVisits +
        performanceAnalytics.questionsFlagged,
    },
  };

  res.status(StatusCodes.OK).json({
    success: true,
    data: results,
  });
};

// Helper function to get questions for a test (using base model)
const getQuestionsForTest = async (testId) => {
  if (!mongoose.Types.ObjectId.isValid(testId)) {
    throw new Error("Invalid test ID format provided to getQuestionsForTest");
  }
  // Use the base Question model and sort
  return await Question.find({ testId }).sort("questionNumber");
};

// Helper functions for user device/browser detection
const getUserDevice = (userAgent = "") => {
  if (!userAgent) return "Unknown";

  const ua = userAgent.toLowerCase();

  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod"))
    return "iOS";
  if (ua.includes("windows phone")) return "Windows Phone";
  if (ua.includes("win")) return "Windows";
  if (ua.includes("macintosh") || ua.includes("mac os")) return "Mac";
  if (ua.includes("linux") && !ua.includes("android")) return "Linux";
  if (ua.includes("cros")) return "Chrome OS";

  return "Unknown";
};

const getUserBrowser = (userAgent = "") => {
  if (!userAgent) return "Unknown";

  const ua = userAgent.toLowerCase();

  // Order matters for accurate detection
  if (ua.includes("edg")) return "Edge";
  if (ua.includes("opr") || ua.includes("opera")) return "Opera";
  if (ua.includes("chrome") && !ua.includes("chromium")) return "Chrome";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("safari") && !ua.includes("chrome") && !ua.includes("edg"))
    return "Safari";
  if (ua.includes("msie") || ua.includes("trident")) return "Internet Explorer";

  return "Unknown";
};

module.exports = {
  startTestAttempt,
  getAttemptById,
  getAttemptQuestions,
  submitAnswer,
  toggleQuestionFlag,
  visitQuestion,
  updateTimeSpent, // Add this new method
  skipQuestion,
  completeAttempt,
  getCandidateAttempts,
  getTestAttempts,
  getAttemptResults,
};
