const jwt = require("jsonwebtoken");
const logger = require("../config/logger");

/**
 * Generate JWT token for authenticated user
 * @param {Object} user - User object with id
 * @returns {String} JWT token
 */
exports.generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRATION,
    }
  );
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object|null} Decoded token or null if invalid
 */
exports.verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    logger.error("JWT verification error:", error.message);
    return null;
  }
};
