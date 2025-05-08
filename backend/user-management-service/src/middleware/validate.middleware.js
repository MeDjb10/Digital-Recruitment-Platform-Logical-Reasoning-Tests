const Joi = require("joi");
const { ErrorResponse } = require("../utils/error-handler.util");
const logger = require("../utils/logger.util");

/**
 * Validate request data against a Joi schema
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const options = {
      abortEarly: false, // include all errors
      allowUnknown: true, // ignore unknown props
      stripUnknown: false, // remove unknown props
    };

    // Determine which part of the request to validate
    const dataToValidate = {};
    if (schema.body) dataToValidate.body = req.body;
    if (schema.query) dataToValidate.query = req.query;
    if (schema.params) dataToValidate.params = req.params;

    // Validate request against schema
    const { error, value } = Joi.object(schema).validate(
      dataToValidate,
      options
    );

    if (error) {
      // Extract validation error messages
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join("; ");

      logger.warn(`Validation error: ${errorMessage}`, {
        path: req.originalUrl,
        method: req.method,
        userId: req.userId || "unknown",
      });

      return next(new ErrorResponse(errorMessage, 400));
    }

    // Update req with validated values
    if (schema.body) req.body = value.body;
    if (schema.query) req.query = value.query;
    if (schema.params) req.params = value.params;

    next();
  };
};

module.exports = validateRequest;
