/**
 * Standard error response format
 */
class ErrorResponse {
  constructor(message = "Server Error", statusCode = 500, errors = []) {
    this.success = false;
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;

    // Add stack trace in development mode
    if (process.env.NODE_ENV === "development") {
      this.stack = new Error().stack;
    }
  }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  ) {
    console.error("Error:", err);
  }

  let error = { ...err };
  error.message = err.message;

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));

    return res
      .status(400)
      .json(new ErrorResponse("Validation error", 400, errors));
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json(
      new ErrorResponse(`Duplicate field value: ${field}`, 400, [
        {
          field,
          message: "This value already exists",
        },
      ])
    );
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    return res
      .status(400)
      .json(new ErrorResponse(`Invalid ${err.path}: ${err.value}`, 400));
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res
      .status(401)
      .json(new ErrorResponse("Invalid authentication token", 401));
  }

  if (err.name === "TokenExpiredError") {
    return res
      .status(401)
      .json(new ErrorResponse("Token expired. Please log in again", 401));
  }

  // Default server error
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * Async handler to avoid try-catch blocks
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  ErrorResponse,
  errorHandler,
  asyncHandler,
};
