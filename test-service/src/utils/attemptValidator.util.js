const { body, param } = require("express-validator");
const validateRequest = require("../middleware/validateRequest.middleware");

// Validate starting a test attempt
const validateStartAttempt = [
  param("testId").isMongoId().withMessage("Invalid test ID format"),
  body("candidateId")
    .isString()
    .withMessage("Candidate ID is required")
    .notEmpty()
    .withMessage("Candidate ID cannot be empty"),
  validateRequest,
];

// Validate submitting an answer
const validateSubmitAnswer = [
  param("attemptId").isMongoId().withMessage("Invalid attempt ID format"),
  param("questionId").isMongoId().withMessage("Invalid question ID format"),
  body("candidateId")
    .isString()
    .withMessage("Candidate ID is required")
    .notEmpty()
    .withMessage("Candidate ID cannot be empty"),
  // For domino questions
  body("answer.dominoId")
    .optional()
    .isNumeric()
    .withMessage("Domino ID must be a number"),
  body("answer.topValue")
    .optional()
    .isInt({ min: 1, max: 6 })
    .withMessage("Top value must be between 1 and 6"),
  body("answer.bottomValue")
    .optional()
    .isInt({ min: 1, max: 6 })
    .withMessage("Bottom value must be between 1 and 6"),
  // For multiple choice questions
  body("answer")
    .optional()
    .isArray()
    .withMessage("Multiple choice answers must be an array"),
  validateRequest,
];

// Validate completing an attempt
const validateCompleteAttempt = [
  param("id").isMongoId().withMessage("Invalid attempt ID format"),
  body("candidateId")
    .isString()
    .withMessage("Candidate ID is required")
    .notEmpty()
    .withMessage("Candidate ID cannot be empty"),
  validateRequest,
];

module.exports = {
  validateStartAttempt,
  validateSubmitAnswer,
  validateCompleteAttempt,
};
