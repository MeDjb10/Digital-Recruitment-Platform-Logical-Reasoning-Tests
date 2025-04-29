const { body, param, check } = require("express-validator"); // Import check
const { StatusCodes } = require("http-status-codes");
const { AppError } = require("../middleware/errorHandler");
const validateRequest = require("../middleware/validateRequest.middleware");

// Validate creating or updating a domino question
const validateDominoQuestion = [
  // Check basic fields
  check("instruction")
    .optional({ checkFalsy: false }) // Optional for update, required for create handled by validateQuestion
    .isString()
    .withMessage("Instruction must be a string")
    .notEmpty()
    .withMessage("Instruction cannot be empty"),

  check("difficulty")
    .optional()
    .isIn(["easy", "medium", "hard", "expert"])
    .withMessage("Difficulty must be one of: easy, medium, hard, expert"),

  // Check dominos array (only if present in update)
  check("dominos")
    .optional()
    .isArray({ min: 2 })
    .withMessage("Dominos must be an array with at least 2 items")
    .custom((dominos, { req }) => {
      if (!dominos) return true; // Skip if not provided
      const editableDominos = dominos.filter((d) => d.isEditable === true);
      if (editableDominos.length !== 1) {
        throw new Error("Exactly one domino must be editable");
      }
      // Check coordinates
      if (
        dominos.some(
          (d) =>
            d.exactX === undefined ||
            d.exactY === undefined ||
            typeof d.exactX !== "number" ||
            typeof d.exactY !== "number"
        )
      ) {
        throw new Error(
          "All dominos must have numeric exactX and exactY coordinates"
        );
      }
      // Check correctAnswer reference if correctAnswer is also being updated or exists
      const correctAnswer =
        req.body.correctAnswer || req.existingQuestion?.correctAnswer; // Need existingQuestion context if validating update
      if (correctAnswer && editableDominos[0].id !== correctAnswer.dominoId) {
        throw new Error(
          "correctAnswer must reference the editable domino's id"
        );
      }
      return true;
    }),

  check("dominos.*.id")
    .if(check("dominos").exists()) // Only validate subfields if dominos exists
    .isNumeric()
    .withMessage("Each domino must have a numeric id"),

  check("dominos.*.isEditable")
    .if(check("dominos").exists())
    .isBoolean()
    .withMessage("Each domino must specify isEditable as boolean"),

  // Check arrows (only if present)
  check("arrows").optional().isArray().withMessage("Arrows must be an array"),
  check("arrows.*.exactX")
    .if(check("arrows").exists().isArray({ min: 1 }))
    .isNumeric()
    .withMessage("Arrow exactX must be a number"),
  check("arrows.*.exactY")
    .if(check("arrows").exists().isArray({ min: 1 }))
    .isNumeric()
    .withMessage("Arrow exactY must be a number"),

  // Check correct answer (only if present)
  check("correctAnswer")
    .optional()
    .isObject()
    .withMessage("Correct answer must be an object"),
  check("correctAnswer.dominoId")
    .if(check("correctAnswer").exists())
    .isNumeric()
    .withMessage("correctAnswer must have a numeric dominoId"),
  check("correctAnswer.topValue")
    .if(check("correctAnswer").exists())
    .custom(
      (value) =>
        value === null || (Number.isInteger(value) && value >= 0 && value <= 6)
    ) // Allow 0-6 or null
    .withMessage("topValue must be null or an integer between 0 and 6"),
  check("correctAnswer.bottomValue")
    .if(check("correctAnswer").exists())
    .custom(
      (value) =>
        value === null || (Number.isInteger(value) && value >= 0 && value <= 6)
    ) // Allow 0-6 or null
    .withMessage("bottomValue must be null or an integer between 0 and 6"),
];

// Validate creating or updating a multiple choice question (V/F/?/X type)
const validateMultipleChoiceQuestion = [
  // Check basic fields
  check("instruction")
    .optional({ checkFalsy: false })
    .isString()
    .withMessage("Instruction must be a string")
    .notEmpty()
    .withMessage("Instruction cannot be empty"),

  check("difficulty")
    .optional()
    .isIn(["easy", "medium", "hard", "expert"])
    .withMessage("Difficulty must be one of: easy, medium, hard, expert"),

  // Check propositions array (only if present)
  check("propositions")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Propositions must be an array with at least 1 item"),

  // Validate each proposition within the array
  check("propositions.*.text")
    .if(check("propositions").exists())
    .isString()
    .withMessage("Each proposition text must be a string")
    .notEmpty()
    .withMessage("Proposition text cannot be empty"),

  check("propositions.*.correctEvaluation")
    .if(check("propositions").exists())
    .isIn(["V", "F", "?"])
    .withMessage("Each proposition correctEvaluation must be one of: V, F, ?"),
];

// Middleware to determine which validation chain to run based on questionType
const validateQuestionTypeSpecificFields = (req, res, next) => {
  const { questionType } = req.body;
  const isUpdate = req.method === "PUT" || req.method === "PATCH";

  // For updates, validation is handled within the update controller or using optional checks
  if (isUpdate) {
    // Pass existingQuestionType to req for validation logic if needed
    // req.existingQuestionType = req.existingQuestion?.questionType; // Assuming existingQuestion is attached earlier
    // Simplified: For now, let's assume update validation is less strict or handled differently.
    // If specific update validation is needed here, the logic needs refinement.
    // For now, just call next() for updates to let the controller handle it.
    // If you want optional validation on updates here, you'd need to:
    // 1. Fetch the existing question *before* this middleware.
    // 2. Determine its type.
    // 3. Select the appropriate chain (validateDominoQuestion or validateMultipleChoiceQuestion).
    // 4. Run the chain using Promise.all as below, but ensure checks are optional.
    // 5. Call validateRequest.
    return next(); // Skip complex update validation here for now
  }

  // For CREATE route
  if (!questionType) {
    return next(
      new AppError("questionType is required", StatusCodes.BAD_REQUEST)
    );
  }

  let validationChain = [];
  if (questionType === "DominoQuestion") {
    // Ensure required fields for create are present using separate checks
    check("instruction", "Instruction is required for DominoQuestion")
      .notEmpty()
      .run(req);
    check("difficulty", "Difficulty is required for DominoQuestion")
      .notEmpty()
      .run(req);
    check("dominos", "Dominos array (min 2) is required for DominoQuestion")
      .isArray({ min: 2 })
      .run(req);
    check(
      "correctAnswer",
      "CorrectAnswer object is required for DominoQuestion"
    )
      .isObject()
      .run(req);
    validationChain = validateDominoQuestion; // Get the chain without validateRequest
  } else if (questionType === "MultipleChoiceQuestion") {
    // Ensure required fields for create are present using separate checks
    check("instruction", "Instruction is required for MultipleChoiceQuestion")
      .notEmpty()
      .run(req);
    check("difficulty", "Difficulty is required for MultipleChoiceQuestion")
      .notEmpty()
      .run(req);
    check(
      "propositions",
      "Propositions array (min 1) is required for MultipleChoiceQuestion"
    )
      .isArray({ min: 1 })
      .run(req);
    validationChain = validateMultipleChoiceQuestion; // Get the chain without validateRequest
  } else {
    return next(
      new AppError("Invalid questionType specified", StatusCodes.BAD_REQUEST)
    );
  }

  // Run the selected validation chain
  Promise.all(validationChain.map((validation) => validation.run(req)))
    .then(() => {
      // After all validations run, call validateRequest to check for errors
      validateRequest(req, res, next);
    })
    .catch(next); // Catch any unexpected errors during validation runs
};

// Validate question ID parameter
const validateQuestionIdParam = [
  param("id")
    .isMongoId()
    .withMessage("Invalid question ID format in URL parameter"),
  validateRequest, // Keep validateRequest here as it's the final step for this specific chain
];

// Validate position movement
const validatePositionMove = [
  param("id").isMongoId().withMessage("Invalid question ID format"),
  body("newPosition")
    .isInt({ min: 1 })
    .withMessage("newPosition must be a positive integer"),
  validateRequest, // Keep validateRequest here
];

module.exports = {
  validateQuestionTypeSpecificFields, // Use this middleware in routes
  validateQuestionIdParam,
  validatePositionMove,
};
