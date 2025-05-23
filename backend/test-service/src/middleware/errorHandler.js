const { StatusCodes } = require("http-status-codes");
const logger = require("../utils/logger");
const config = require("../config");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log the error
  logger.error(`${err.message}`, {
    error: err,
    stack: err.stack,
    url: req.originalUrl,
  });

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = new AppError(message, StatusCodes.BAD_REQUEST);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate value entered for ${field}: ${value}. Please use another value!`;
    error = new AppError(message, StatusCodes.CONFLICT);
  }

  // Mongoose cast error
  if (err.name === "CastError") {
    const message = `Resource not found with id of ${err.value}`;
    error = new AppError(message, StatusCodes.NOT_FOUND);
  }
  // Add specific error handling for attempt errors
  if (err.message.includes("test attempt") || err.message.includes("Attempt")) {
    statusCode = err.statusCode || StatusCodes.BAD_REQUEST;
    message = err.message;
  }

  // Send error response
  res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: error.message || "Server Error",
    ...(config.nodeEnv === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
module.exports.AppError = AppError;
