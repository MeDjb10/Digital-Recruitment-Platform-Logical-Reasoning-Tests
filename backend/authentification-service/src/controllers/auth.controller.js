/**
 * Authentication Controller
 * Handles HTTP requests and delegates business logic to service layer
 */
const { authService } = require("../services");
const logger = require("../utils/logger.util");

/**
 * Authenticate user with email and password
 *
 * @route POST /api/auth/login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} User data and tokens if authentication is successful
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Delegate to service layer
    const result = await authService.authenticateUser(
      email,
      password,
      rememberMe
    );

    if (!result.success) {
      return res.status(401).json(result);
    }

    logger.info(`User login successful: ${email}`);

    res.status(200).json(result);
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
};

/**
 * Issue new access and refresh tokens using a valid refresh token
 *
 * @route POST /api/auth/refresh-token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} New access and refresh tokens
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Delegate to service layer
    const result = await authService.refreshTokens(refreshToken);

    if (!result.success) {
      return res.status(401).json(result);
    }

    logger.info("Token refresh successful");

    res.status(200).json(result);
  } catch (error) {
    logger.error(`Token refresh error: ${error.message}`);
    next(error);
  }
};

/**
 * Logout user and invalidate tokens
 *
 * @route POST /api/auth/logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Logout confirmation
 */
exports.logout = async (req, res, next) => {
  try {
    const { userId } = req;

    // Delegate to service layer
    const result = await authService.logoutUser(userId);

    logger.info(`User logout successful: ${userId}`);

    res.status(200).json(result);
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    next(error);
  }
};

/**
 * Verify token and return user information
 *
 * @route GET /api/auth/verify
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} User information if token is valid
 */
exports.verifyToken = async (req, res, next) => {
  try {
    const { userId, userRole } = req;

    res.status(200).json({
      success: true,
      message: "Token is valid",
      user: {
        id: userId,
        role: userRole,
      },
    });
  } catch (error) {
    logger.error(`Token verification error: ${error.message}`);
    next(error);
  }
};
