const express = require("express");
const router = express.Router();
const {
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
  updateTimeSpent,
} = require("../controllers/attempt.controller");
const { verifyToken, authorize } = require("../middleware/auth.middleware");
const {
  validateStartAttempt,
  validateSubmitAnswer,
  validateCompleteAttempt,
} = require("../utils/attemptValidator.util");

// Public routes (if any)

// Protected candidate routes
router.post(
  "/tests/:testId/start",
  verifyToken,
  validateStartAttempt, // Add validator here
  startTestAttempt
);
router.get("/:id", verifyToken, getAttemptById);
router.get("/:id/questions", verifyToken, getAttemptQuestions);
router.post(
  "/:attemptId/questions/:questionId/answer",
  verifyToken,
  validateSubmitAnswer, // Add validator here
  submitAnswer
);
router.post(
  "/:attemptId/questions/:questionId/flag",
  verifyToken,
  toggleQuestionFlag
);
router.post(
  "/:attemptId/questions/:questionId/visit",
  verifyToken,
  visitQuestion
);
router.post(
  "/:attemptId/questions/:questionId/time",
  verifyToken,
  updateTimeSpent
);
router.post(
  "/:attemptId/questions/:questionId/skip",
  verifyToken,
  skipQuestion
);
router.post(
  "/:id/complete",
  verifyToken,
  validateCompleteAttempt, // Add validator here
  completeAttempt
);
router.get("/candidates/:candidateId", verifyToken, getCandidateAttempts);

// Admin/Recruiter routes
router.get(
  "/tests/:testId",
  verifyToken,
  authorize("admin", "recruiter", "psychologist"),
  getTestAttempts
);
router.get("/:id/results", verifyToken, getAttemptResults);

module.exports = router;
