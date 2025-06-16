/**
 * Authentication Middleware
 * JWT token verification middleware
 */

const jwt = require("jsonwebtoken");
const logger = require("../utils/logger.util");
const { env } = require("../config");

/**
 * Middleware to verify JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No authorization header provided",
      });
    }

    // Extract the token - remove "Bearer " prefix if present
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify the token
    jwt.verify(token, env.jwt.secret, (err, decoded) => {
      if (err) {
        logger.warn(`Token verification failed: ${err.message}`, {
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          path: req.path,
        });

        if (err.name === "TokenExpiredError") {
          return res.status(401).json({
            success: false,
            message: "Token has expired",
            code: "TOKEN_EXPIRED",
          });
        }

        if (err.name === "JsonWebTokenError") {
          return res.status(401).json({
            success: false,
            message: "Invalid token",
            code: "INVALID_TOKEN",
          });
        }

        return res.status(401).json({
          success: false,
          message: "Token verification failed",
          code: "TOKEN_VERIFICATION_FAILED",
        });
      }

      // Add user info to request object
      req.userId = decoded.id;
      req.userRole = decoded.role;
      req.tokenVersion = decoded.tokenVersion;

      logger.debug(`Token verified for user ${decoded.id}`);
      next();
    });
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
}

module.exports = verifyToken;
