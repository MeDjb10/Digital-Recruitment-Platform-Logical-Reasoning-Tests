const { body, param, check } = require("express-validator");
const validateRequest = require("../middleware/validateRequest.middleware");

// Validate starting a test attempt
const validateStartAttempt = [
  param("testId").isMongoId().withMessage("Invalid test ID format"),
  body("candidateId")
    .isString()
    .withMessage("Candidate ID must be a string")
    .notEmpty()
    .withMessage("Candidate ID is required"),
  validateRequest,
];

// Validate submitting an answer
const validateSubmitAnswer = [
  param("attemptId").isMongoId().withMessage("Invalid attempt ID format"),
  param("questionId").isMongoId().withMessage("Invalid question ID format"),
  body("candidateId")
    .isString()
    .withMessage("Candidate ID must be a string")
    .notEmpty()
    .withMessage("Candidate ID is required"),

  // Validate the 'answer' field based on expected structures
  body("answer")
    .exists()
    .withMessage("Answer data is required")
    .custom((value, { req }) => {
      // Check for Domino Answer structure
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        value.dominoId !== undefined
      ) {
        if (
          value.topValue !== undefined &&
          (value.topValue < 0 ||
            value.topValue > 6 ||
            !Number.isInteger(value.topValue))
        ) {
          if (value.topValue !== null)
            throw new Error(
              "Domino topValue must be null or an integer between 0 and 6"
            );
        }
        if (
          value.bottomValue !== undefined &&
          (value.bottomValue < 0 ||
            value.bottomValue > 6 ||
            !Number.isInteger(value.bottomValue))
        ) {
          if (value.bottomValue !== null)
            throw new Error(
              "Domino bottomValue must be null or an integer between 0 and 6"
            );
        }
        if (typeof value.dominoId !== "number") {
          throw new Error("Domino dominoId must be a number");
        }
        return true; // Valid Domino answer structure
      }
      // Check for Proposition Response structure (V/F/?/X)
      else if (Array.isArray(value)) {
        if (value.length === 0) {
          // Allow empty array submission? Or require at least one? Depends on logic.
          // If allowing empty, it might mean no answer selected.
          return true; // Assuming empty array is valid for now (e.g., clearing previous answer)
        }
        // Check each item in the array
        for (const item of value) {
          if (typeof item !== "object" || item === null) {
            throw new Error(
              "Each item in the proposition response array must be an object"
            );
          }
          if (
            typeof item.propositionIndex !== "number" ||
            item.propositionIndex < 0 ||
            !Number.isInteger(item.propositionIndex)
          ) {
            throw new Error(
              "Each proposition response must have a non-negative integer propositionIndex"
            );
          }
          if (
            !item.candidateEvaluation ||
            !["V", "F", "?", "X"].includes(item.candidateEvaluation)
          ) {
            throw new Error(
              "Each proposition response must have a candidateEvaluation of 'V', 'F', '?', or 'X'"
            );
          }
        }
        return true; // Valid Proposition Response array structure
      }
      // If neither structure matches
      throw new Error(
        "Invalid answer format. Expected Domino answer object or Proposition response array."
      );
    }),

  validateRequest,
];

// Validate completing an attempt
const validateCompleteAttempt = [
  param("id").isMongoId().withMessage("Invalid attempt ID format"),
  body("candidateId") // Still require candidateId for verification in the controller
    .isString()
    .withMessage("Candidate ID must be a string")
    .notEmpty()
    .withMessage("Candidate ID is required"),
  validateRequest,
];

// Validate toggling flag or visiting (similar structure)
const validateInteraction = [
  param("attemptId").isMongoId().withMessage("Invalid attempt ID format"),
  param("questionId").isMongoId().withMessage("Invalid question ID format"),
  body("candidateId")
    .isString()
    .withMessage("Candidate ID must be a string")
    .notEmpty()
    .withMessage("Candidate ID is required"),
  // Optional: Validate timeSpent if applicable for visit
  body("timeSpentOnPrevious")
    .optional()
    .isNumeric()
    .withMessage("timeSpentOnPrevious must be a number (milliseconds)")
    .isInt({ min: 0 })
    .withMessage("timeSpentOnPrevious cannot be negative"),
  validateRequest,
];

module.exports = {
  validateStartAttempt,
  validateSubmitAnswer,
  validateCompleteAttempt,
  validateInteraction, // Use for flag, visit, skip
};
