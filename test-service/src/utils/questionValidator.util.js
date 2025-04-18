const { body, param } = require("express-validator");
const { StatusCodes } = require("http-status-codes");
const { AppError } = require("../middleware/errorHandler");
const validateRequest = require("../middleware/validateRequest.middleware");

// Validate creating or updating a domino question
const validateDominoQuestion = [
  // Check basic fields
  body("instruction")
    .isString()
    .withMessage("Instruction is required")
    .notEmpty()
    .withMessage("Instruction cannot be empty"),

  body("difficulty")
    .isIn(["easy", "medium", "hard", "expert"])
    .withMessage("Difficulty must be one of: easy, medium, hard, expert"),

  body("questionType")
    .equals("DominoQuestion")
    .withMessage("Question type must be 'DominoQuestion'"),

  // Check dominos array
  body("dominos")
    .isArray({ min: 2 }) // Changed from isArray() to require at least 2 dominos
    .withMessage("Dominos must be an array with at least 2 items"),

  body("dominos.*.id")
    .isNumeric()
    .withMessage("Each domino must have a numeric id"),

  body("dominos.*.isEditable")
    .isBoolean()
    .withMessage("Each domino must specify isEditable as boolean"),

  // Add these new validations after the existing domino validations
  body("dominos.*.exactX")
    .exists()
    .withMessage("Each domino must have an exactX coordinate")
    .isNumeric()
    .withMessage("exactX must be a number"),

  body("dominos.*.exactY")
    .exists()
    .withMessage("Each domino must have an exactY coordinate")
    .isNumeric()
    .withMessage("exactY must be a number"),
  // Enhance the arrows validation when they exist
  body("arrows").optional().isArray().withMessage("Arrows must be an array"),

  body("arrows.*.exactX")
    .if(body("arrows").exists().isArray({ min: 1 }))
    .exists()
    .withMessage("Each arrow must have an exactX coordinate")
    .isNumeric()
    .withMessage("Arrow exactX must be a number"),

  body("arrows.*.exactY")
    .if(body("arrows").exists().isArray({ min: 1 }))
    .exists()
    .withMessage("Each arrow must have an exactY coordinate")
    .isNumeric()
    .withMessage("Arrow exactY must be a number"),

  // Check correct answer
  body("correctAnswer")
    .isObject()
    .withMessage("Correct answer must be an object"),

  body("correctAnswer.dominoId")
    .isNumeric()
    .withMessage("correctAnswer must have dominoId"),

  body("correctAnswer.topValue")
    .custom(
      (value) =>
        value === null || (Number.isInteger(value) && value >= 1 && value <= 6)
    )
    .withMessage("topValue must be null or an integer between 1 and 6"),

  body("correctAnswer.bottomValue")
    .custom(
      (value) =>
        value === null || (Number.isInteger(value) && value >= 1 && value <= 6)
    )
    .withMessage("bottomValue must be null or an integer between 1 and 6"),

  // Custom validation to ensure at least one editable domino
  body("dominos").custom((dominos, { req }) => {
    const editableDominos = dominos.filter((d) => d.isEditable === true);
    if (editableDominos.length === 0) {
      throw new Error("At least one domino must be editable");
    }
    if (editableDominos.length > 1) {
      throw new Error("Only one domino can be editable");
    }

    // Also check if correctAnswer references an editable domino
    const correctAnswer = req.body.correctAnswer;
    if (
      correctAnswer &&
      !editableDominos.some((d) => d.id === correctAnswer.dominoId)
    ) {
      throw new Error("correctAnswer must reference the editable domino");
    }

    return true;
  }),

  // Run the validator
  validateRequest,
];

// Validate creating or updating a multiple choice question
const validateMultipleChoiceQuestion = [
  // Check basic fields
  body("instruction")
    .isString()
    .withMessage("Instruction is required")
    .notEmpty()
    .withMessage("Instruction cannot be empty"),

  body("difficulty")
    .isIn(["easy", "medium", "hard", "expert"])
    .withMessage("Difficulty must be one of: easy, medium, hard, expert"),

  body("questionType")
    .equals("MultipleChoiceQuestion")
    .withMessage("Question type must be 'MultipleChoiceQuestion'"),

  // Check options array
  body("options")
    .isArray({ min: 2 })
    .withMessage("Options must be an array with at least 2 items"),

  body("options.*.text")
    .isString()
    .withMessage("Each option must have text")
    .notEmpty()
    .withMessage("Option text cannot be empty"),

  body("correctOptionIndex")
    .isInt({ min: 0 })
    .withMessage("correctOptionIndex must be a non-negative integer")
    .custom((value, { req }) => {
      if (value >= req.body.options.length) {
        throw new Error("correctOptionIndex cannot exceed options length");
      }
      return true;
    }),

  // Run the validator
  validateRequest,
];

// Common validator for any question type
const validateQuestion = (req, res, next) => {
  const { questionType } = req.body;
  const isUpdate = req.method === "PUT"; // Check if this is an update operation

  if (!questionType && !isUpdate) {
    return next(
      new AppError("questionType is required", StatusCodes.BAD_REQUEST)
    );
  }

  // For updates, we don't need to validate everything, just what's being updated
  if (isUpdate) {
    // Skip extensive validation for updates and proceed
    return next();
  }

  // For new questions, validate fully
  if (questionType === "DominoQuestion") {
    // Apply each validator in sequence
    for (const validator of validateDominoQuestion) {
      try {
        if (
          typeof validator === "function" &&
          validator.name === "validateRequest"
        ) {
          // This is the last validator that calls next()
          return validator(req, res, next);
        } else {
          // Apply the validation but don't call next() yet
          validator(req, res, () => {});
        }
      } catch (error) {
        return next(error);
      }
    }
  } else if (questionType === "MultipleChoiceQuestion") {
    // Apply each validator in sequence
    for (const validator of validateMultipleChoiceQuestion) {
      try {
        if (
          typeof validator === "function" &&
          validator.name === "validateRequest"
        ) {
          // This is the last validator that calls next()
          return validator(req, res, next);
        } else {
          // Apply the validation but don't call next() yet
          validator(req, res, () => {});
        }
      } catch (error) {
        return next(error);
      }
    }
  } else {
    return next(new AppError("Invalid question type", StatusCodes.BAD_REQUEST));
  }
};

// Validate question ID parameter
const validateQuestionId = [
  param("id").isMongoId().withMessage("Invalid question ID format"),
  validateRequest,
];

// Validate position movement
const validatePositionMove = [
  param("id").isMongoId().withMessage("Invalid question ID format"),
  body("newPosition")
    .isInt({ min: 1 })
    .withMessage("newPosition must be a positive integer"),
  validateRequest,
];

module.exports = {
  validateQuestion,
  validateDominoQuestion,
  validateMultipleChoiceQuestion,
  validateQuestionId,
  validatePositionMove,
};
