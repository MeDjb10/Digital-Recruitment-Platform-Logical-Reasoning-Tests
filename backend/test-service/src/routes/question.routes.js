const express = require("express");
const router = express.Router();
const {
  createQuestion,
  getQuestionsByTestId,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  validateDominoQuestion: validateDominoHandler, // Rename import from controller
  moveQuestionPosition,
  duplicateQuestion,
} = require("../controllers/question.controller");
const { verifyToken, authorize } = require("../middleware/auth.middleware");
const {
  validateQuestionTypeSpecificFields, // Correct import name
  validateQuestionIdParam, // Correct import name
  validatePositionMove, // Keep this one
} = require("../utils/questionValidator.util");

// Public validation endpoint (no auth required)
// This endpoint uses the CONTROLLER function directly
router.post("/validate-domino", validateDominoHandler); // Use the renamed import

// Create a new question for a test
router.post(
  "/tests/:testId/questions",
  verifyToken,
  authorize("admin", "psychologist"),
  validateQuestionTypeSpecificFields, // Use the correct validator middleware
  createQuestion
);

// Get all questions for a test
router.get("/tests/:testId/questions", verifyToken, getQuestionsByTestId);

// Get a question by ID
router.get("/:id", verifyToken, validateQuestionIdParam, getQuestionById); // Add ID validation

// Update a question
router.put(
  "/:id",
  verifyToken,
  authorize("admin", "psychologist"),
  validateQuestionIdParam, // Use the correct ID validator
  validateQuestionTypeSpecificFields, // Use the correct general validator (will apply optional checks)
  updateQuestion
);

// Delete a question
router.delete(
  "/:id",
  verifyToken,
  authorize("admin", "psychologist"),
  validateQuestionIdParam, // Add ID validation
  deleteQuestion
);

// Move a question's position in the test
router.patch(
  "/:id/position",
  verifyToken,
  authorize("admin", "psychologist"),
  validateQuestionIdParam, // Add ID validation
  validatePositionMove, // Use the specific position move validator
  moveQuestionPosition
);

// Duplicate a question
router.post(
  "/:id/duplicate",
  verifyToken,
  authorize("admin", "psychologist"),
  validateQuestionIdParam, // Add ID validation
  duplicateQuestion
);

module.exports = router;
