const { body, param, query, validationResult } = require("express-validator");

/**
 * Helper function to validate request and return errors
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((error) => ({
        field: error.param,
        message: error.msg,
      })),
    });
  }
  next();
};

/**
 * Validation rules for user filters
 */
const validateUserFilters = [
  query("role")
    .optional()
    .isIn(["candidate", "admin", "moderator", "psychologist"])
    .withMessage("Invalid role specified"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  validateRequest,
];

/**
 * Validation rules for user ID parameter
 */
const validateUserId = [
  param("userId").isMongoId().withMessage("Invalid user ID format"),
  validateRequest,
];

/**
 * Validation rules for user profile updates
 */
const validateUserUpdate = [
  body("firstName")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("lastName")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format. Use ISO format (YYYY-MM-DD)"),
  body("gender")
    .optional()
    .isIn(["Male", "Female", "Other"])
    .withMessage("Gender must be Male, Female, or Other"),
  body("currentPosition")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Current position cannot exceed 100 characters"),
  body("desiredPosition")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Desired position cannot exceed 100 characters"),
  body("educationLevel")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Education level cannot exceed 100 characters"),
  body("status")
    .optional()
    .isIn(["active", "inactive", "suspended"])
    .withMessage("Status must be active, inactive, or suspended"),
  validateRequest,
];

/**
 * Validation rules for role assignment
 */
const validateRoleAssignment = [
  body("userId").isMongoId().withMessage("Invalid user ID format"),
  body("role")
    .isIn(["candidate", "admin", "moderator", "psychologist"])
    .withMessage(
      "Invalid role. Must be candidate, admin, moderator, or psychologist"
    ),
  validateRequest,
];

module.exports = {
  validateUserFilters,
  validateUserId,
  validateUserUpdate,
  validateRoleAssignment,
};
