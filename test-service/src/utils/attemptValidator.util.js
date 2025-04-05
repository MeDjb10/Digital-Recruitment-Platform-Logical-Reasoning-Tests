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
  // For questions
  body("answer").custom((value, { req }) => {
    // For domino questions with top/bottom properties
    if (
      value &&
      typeof value === "object" &&
      (value.top !== undefined || value.bottom !== undefined)
    ) {
      if (value.top !== undefined && (value.top < 1 || value.top > 6)) {
        throw new Error("Top value must be between 1 and 6");
      }
      if (
        value.bottom !== undefined &&
        (value.bottom < 1 || value.bottom > 6)
      ) {
        throw new Error("Bottom value must be between 1 and 6");
      }
      return true;
    }

    // For multiple choice questions
    if (Array.isArray(value)) {
      return true;
    }

    // For domino questions with dominoId/topValue/bottomValue
    if (
      value &&
      typeof value === "object" &&
      (value.dominoId !== undefined ||
        value.topValue !== undefined ||
        value.bottomValue !== undefined)
    ) {
      if (
        value.topValue !== undefined &&
        (value.topValue < 1 || value.topValue > 6)
      ) {
        throw new Error("Top value must be between 1 and 6");
      }
      if (
        value.bottomValue !== undefined &&
        (value.bottomValue < 1 || value.bottomValue > 6)
      ) {
        throw new Error("Bottom value must be between 1 and 6");
      }
      return true;
    }

    throw new Error("Invalid answer format");
  }),
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
