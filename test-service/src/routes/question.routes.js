const express = require("express");
const router = express.Router();
const {
  createQuestion,
  getQuestionsByTestId,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  validateDominoQuestion,
  moveQuestionPosition,
  duplicateQuestion,
} = require("../controllers/question.controller");
const { verifyToken, authorize } = require("../middleware/auth.middleware");
const {
  validateQuestion,
  validateQuestionId,
  validatePositionMove,
} = require("../utils/questionValidator.util");



// Public validation endpoint (no auth required)
router.post("/validate-domino", validateDominoQuestion);

// Create a new question for a test
router.post(
  "/tests/:testId/questions",
  verifyToken,
  authorize("admin", "psychologist"),
  validateQuestion,
  createQuestion
);

// Get all questions for a test
router.get("/tests/:testId/questions", verifyToken, getQuestionsByTestId);

// Get a question by ID
router.get("/:id", verifyToken, getQuestionById);

// Update a question
router.put(
  "/:id",
  verifyToken,
  authorize("admin", "psychologist"),
  validateQuestionId, // Add this validator
  validateQuestion, // Add this validator
  updateQuestion
);

// Delete a question
router.delete(
  "/:id",
  verifyToken,
  authorize("admin", "psychologist"),
  deleteQuestion
);

// Move a question's position in the test
router.patch(
  "/:id/position",
  verifyToken,
  authorize("admin", "psychologist"),
  moveQuestionPosition
);

// Duplicate a question
router.post(
  "/:id/duplicate",
  verifyToken,
  authorize("admin", "psychologist"),
  duplicateQuestion
);

module.exports = router;
