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
      StatusCodes.FORBIDDEN // Or BAD_REQUEST
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
      StatusCodes.CONFLICT // 409 Conflict
    );
  }

  // Get client information
  const userAgent = req.headers["user-agent"] || "";
  const ipAddress =
    req.headers["x-forwarded-for"]?.split(",").shift() ||
    req.socket?.remoteAddress ||
    "Unknown";

  // Create new test attempt
  const attempt = await TestAttempt.create({
    testId,
    candidateId,
    device: getUserDevice(userAgent),
    browser: getUserBrowser(userAgent),
    ipAddress,
    startTime: new Date(), // Explicitly set start time
    lastActivityAt: new Date(), // Initialize last activity
  });

  // Initialize question responses for all questions in the test
  const questions = await getQuestionsForTest(testId);

  if (questions.length === 0) {
    logger.warn(
      `Test ${testId} has no questions. Attempt ${attempt._id} created but may be problematic.`
    );
    // Optionally, handle this case differently, maybe prevent attempt start
  }

  const responsePromises = questions.map((question) =>
    QuestionResponse.create({
      attemptId: attempt._id,
      questionId: question._id,
      candidateId,
    })
  );
  await Promise.all(responsePromises);

  logger.info(
    `New test attempt ${attempt._id} created for candidate ${candidateId} on test ${testId}`
  );
  res.status(StatusCodes.CREATED).json({
    success: true,
    data: attempt,
  });
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
  // timeSpentOnPrevious is optional: time spent on the *previous* question before navigating to this one
  const { candidateId, timeSpentOnPrevious } = req.body;

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
  const timeToAdd = Number(timeSpentOnPrevious);
  if (
    timeSpentOnPrevious !== undefined &&
    (isNaN(timeToAdd) || timeToAdd < 0)
  ) {
    throw new AppError(
      "Invalid timeSpentOnPrevious value",
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

  // Find the question response for the *current* question being visited
  let response = await QuestionResponse.findOne({
    attemptId,
    questionId,
    // candidateId, // Verified
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

  // Record the visit on the current question's response
  await response.recordVisit();

  // --- Update Time Spent Metrics ---
  // This logic assumes the frontend sends the time spent on the *previous* question
  // when the user navigates *to* the current question.

  // Initialize maps if they don't exist
  if (!attempt.metrics.visitCounts) attempt.metrics.visitCounts = new Map();
  if (!attempt.metrics.timePerQuestion)
    attempt.metrics.timePerQuestion = new Map();

  // Update visit count metric for the current question
  attempt.metrics.visitCounts.set(questionId.toString(), response.visitCount);

  // If timeSpentOnPrevious was provided, update the time metric for *that* previous question
  // This requires knowing the ID of the previous question, which is complex to manage here.
  // A better approach might be for the frontend to send { questionId, timeDelta } periodically or on blur.

  // Alternative: Update timeSpent on the response object directly (simpler if FE sends time for *current* question visit)
  // if (timeToAdd > 0) {
  //    response.timeSpent = (response.timeSpent || 0) + timeToAdd;
  //    await response.save();
  //    attempt.metrics.timePerQuestion.set(questionId.toString(), response.timeSpent);
  // }

  // Update the timestamp for the last activity on the attempt
  attempt.lastActivityAt = new Date();
  // Mark modified if updating sub-documents/maps directly
  attempt.markModified("metrics");
  await attempt.save();

  logger.info(
    `Visit recorded for question ${questionId} in attempt ${attemptId}. Visit count: ${response.visitCount}`
  );
  res.status(StatusCodes.OK).json({
    success: true,
    data: response.toObject(),
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
  const { candidateId } = req.body; // Ensure candidateId is passed for verification

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
    // If already completed, just return the existing attempt data
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
    // Handle other statuses like 'timed-out' or 'abandoned' if needed
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

  // Mark the test as completed and set endTime/timeSpent
  await attempt.finishAttempt("completed");

  // Calculate the final score and update metrics
  await attempt.calculateScore();

  logger.info(
    `Test attempt ${id} completed by candidate ${candidateId}. Score: ${attempt.score}`
  );
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Test attempt completed successfully",
    data: attempt.toObject(), // Return the final attempt data with score
  });
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
 * Get result details for a completed attempt
 */
const getAttemptResults = async (req, res) => {
  const { id } = req.params; // Attempt ID

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

  // Check if the attempt is completed or timed-out (results might be available for timed-out too)
  if (!["completed", "timed-out"].includes(attempt.status)) {
    throw new AppError(
      `Results are only available for completed or timed-out tests. Current status: ${attempt.status}`,
      StatusCodes.BAD_REQUEST
    );
  }

  // Get the test (already populated)
  const test = attempt.testId;
  if (!test) {
    // Should not happen if population worked, but good practice to check
    throw new AppError(
      `Test associated with attempt ${id} not found`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  // Get all questions for the test
  const questions = await getQuestionsForTest(attempt.testId);
  // Get all responses for this attempt
  const responses = await QuestionResponse.find({ attemptId: id });

  // Organize results by question
  const questionResults = questions.map((question) => {
    const response = responses.find(
      (r) => r.questionId.toString() === question._id.toString()
    );

    // Prepare correct answer structure based on question type
    let correctAnswerDetails = null;
    if (question.questionType === "DominoQuestion") {
      correctAnswerDetails = question.correctAnswer;
    } else if (question.questionType === "MultipleChoiceQuestion") {
      // Return the propositions with their correct evaluations
      correctAnswerDetails = {
        propositions:
          question.propositions?.map((p) => ({
            text: p.text,
            correctEvaluation: p.correctEvaluation,
          })) || [],
      };
    }

    return {
      question: {
        // Basic question info
        _id: question._id,
        title: question.title,
        instruction: question.instruction,
        questionNumber: question.questionNumber,
        questionType: question.questionType,
        difficulty: question.difficulty,
      },
      response: response // Include the full response document (or selected fields)
        ? {
            _id: response._id,
            dominoAnswer: response.dominoAnswer,
            propositionResponses: response.propositionResponses, // Include new field
            isCorrect: response.isCorrect, // Overall correctness for the question
            isSkipped: response.isSkipped,
            isFlagged: response.isFlagged,
            timeSpent: response.timeSpent,
            visitCount: response.visitCount,
            answeredAt: response.answeredAt,
            answerChanges: response.answerChanges,
          }
        : null, // Handle case where response might be missing
      correctAnswer: correctAnswerDetails, // Include the structured correct answer
    };
  });

  // Consolidate final results object
  const results = {
    attempt: {
      // Include relevant attempt details
      _id: attempt._id,
      testId: attempt.testId._id, // Use populated testId object
      testName: test.name,
      candidateId: attempt.candidateId,
      startTime: attempt.startTime,
      endTime: attempt.endTime,
      timeSpent: attempt.timeSpent,
      status: attempt.status,
      score: attempt.score,
      percentageScore: attempt.percentageScore,
      metrics: attempt.metrics, // Include metrics like visits, time per question etc.
      device: attempt.device,
      browser: attempt.browser,
      ipAddress: attempt.ipAddress,
    },
    questions: questionResults, // Array of question results
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
  userAgent = userAgent.toLowerCase(); // Normalize to lower case

  if (userAgent.includes("android")) return "Android";
  if (
    userAgent.includes("iphone") ||
    userAgent.includes("ipad") ||
    userAgent.includes("ipod")
  )
    return "iOS";
  if (userAgent.includes("windows phone")) return "Windows Phone";
  // Check for windows platforms more carefully
  if (userAgent.includes("win")) return "Windows"; // Could be improved (e.g., distinguish win64/32)
  if (userAgent.includes("macintosh") || userAgent.includes("mac os"))
    return "Mac";
  if (userAgent.includes("linux")) return "Linux"; // Could be improved (e.g., exclude android)
  if (userAgent.includes("cros")) return "Chrome OS";

  return "Unknown";
};

const getUserBrowser = (userAgent = "") => {
  if (!userAgent) return "Unknown";
  userAgent = userAgent.toLowerCase();

  // Order matters: Edge often includes Chrome/Safari strings
  if (userAgent.includes("edg")) return "Edge"; // Modern Edge (Chromium based)
  if (userAgent.includes("opr") || userAgent.includes("opera")) return "Opera";
  if (userAgent.includes("chrome") && !userAgent.includes("chromium"))
    return "Chrome";
  if (userAgent.includes("firefox")) return "Firefox";
  // Safari should be checked after Chrome/Edge
  if (
    userAgent.includes("safari") &&
    !userAgent.includes("chrome") &&
    !userAgent.includes("edg")
  )
    return "Safari";
  if (userAgent.includes("msie") || userAgent.includes("trident"))
    return "Internet Explorer"; // Older IE

  return "Unknown";
};

module.exports = {
  startTestAttempt,
  getAttemptById,
  getAttemptQuestions,
  submitAnswer,
  toggleQuestionFlag,
  visitQuestion,
  skipQuestion,
  completeAttempt,
  getCandidateAttempts,
  getTestAttempts,
  getAttemptResults,
  // Export helpers only if needed externally, otherwise keep them internal
  // getUserDevice,
  // getUserBrowser,
  // getQuestionsForTest,
};
