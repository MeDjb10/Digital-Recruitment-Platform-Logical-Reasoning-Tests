const express = require("express");
const router = express.Router();
const attemptService = require("../services/attempt.service");
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

// Add AI classification route with authorization
router.post("/:id/ai-classification", 
  verifyToken, 
  authorize("admin", "psychologist"), // Only allow admin and psychologist roles
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { prediction, confidence, timestamp } = req.body;
      console.log("Received AI classification:", { id, prediction, confidence, timestamp });

      const updatedAttempt = await attemptService.updateAiClassification(id, {
        prediction,
        confidence,
        timestamp: timestamp || new Date(),
      });

      res.json({
        success: true,
        data: updatedAttempt,
        message: "AI classification updated successfully"
      });

    } catch (error) {
      console.error("Error in AI classification update:", error);
      next(error);
    }
  }
);

// Add manual classification route with authorization
router.post("/:id/manual-classification", 
  verifyToken, 
  authorize("admin", "psychologist"), // Only allow admin and psychologist roles
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { classification } = req.body;
      const classifiedBy = req.user.id; // Assuming user info is in req.user

      console.log("Received manual classification:", { id, classification, classifiedBy });

      const updatedAttempt = await attemptService.updateManualClassification(id, {
        classification,
        classifiedBy
      });

      res.json({
        success: true,
        data: updatedAttempt,
        message: "Manual classification updated successfully"
      });

    } catch (error) {
      console.error("Error in manual classification update:", error);
      next(error);
    }
  }
);

module.exports = router;
