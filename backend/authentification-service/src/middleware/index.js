/**
 * Middleware Index
 * Exports all middleware modules
 */

const authMiddleware = require("./auth.middleware");
const errorMiddleware = require("./error.middleware");
const securityMiddleware = require("./security.middleware");
const loggingMiddleware = require("./logging.middleware");

module.exports = {
  verifyToken: authMiddleware,
  errorHandler: errorMiddleware,
  security: securityMiddleware,
  logging: loggingMiddleware,
};
