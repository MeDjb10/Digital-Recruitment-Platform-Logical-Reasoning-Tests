const { validationResult } = require("express-validator");
const { StatusCodes } = require("http-status-codes");
const { AppError } = require("./errorHandler");

/**
 * Middleware that checks for validation errors from express-validator
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    throw new AppError(errorMessages.join(", "), StatusCodes.BAD_REQUEST);
  }
  next();
};

module.exports = validateRequest;
