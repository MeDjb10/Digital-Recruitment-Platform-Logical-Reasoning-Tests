/**
 * Authentication Controller
 * Handles authentication flows including login, token refresh, logout, and token verification
 */
const jwt = require("jsonwebtoken");
const {
  publishMessage,
  AUTH_EXCHANGE,
  NOTIFICATION_EXCHANGE,
} = require("../utils/message-broker");
const userService = require("../utils/service-client");
const logger = require("../utils/logger.util");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/token.util");

/**
 * Authenticate user with email and password
 *
 * @route POST /api/auth/login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} User data and tokens if authentication is successful
 */
exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Validate credentials against User Management service
    const data = await userService.validateCredentials(email, password);

    // Check for authentication failure
    if (!data.success) {
      return res.status(401).json({
        success: false,
        message: data.message || "Invalid credentials",
      });
    }

    const user = data.user;
    logger.info(`User ${user._id} logged in successfully`);

    // If user is not verified, notify them
    if (!user.isEmailVerified || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        requiresVerification: true,
        email: user.email,
      });
    }

    // Generate tokens with respect to rememberMe option
    const accessToken = await generateAccessToken(user, rememberMe);
    const refreshToken = generateRefreshToken(user, rememberMe);

    // Log login event
    try {
      await publishMessage(AUTH_EXCHANGE, "auth.user.login", {
        userId: user._id,
        email: user.email,
        timestamp: new Date().toISOString(),
        rememberMe: !!rememberMe, // Include rememberMe flag in the event
      });
    } catch (eventError) {
      // Don't fail the login if event publishing fails
      logger.warn(`Failed to publish login event: ${eventError.message}`);
    }

    // Return tokens
    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      rememberMe: !!rememberMe, // Include the rememberMe flag in response
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);

    res.status(500).json({
      success: false,
      message: "Authentication service error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
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
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET
    );

    // Get user data from User Management service
    const data = await userService.getUserById(decoded.id);
    if (!data.success || !data.user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = data.user;

    // Check token version (for revocation)
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Extract rememberMe flag from the token (default to false if not present)
    const rememberMe = decoded.rememberMe || false;

    // Generate new tokens using the shared token utilities and preserving rememberMe choice
    const newAccessToken = await generateAccessToken(user, rememberMe);
    const newRefreshToken = generateRefreshToken(user, rememberMe);

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      rememberMe: rememberMe,
    });
  } catch (error) {
    logger.error(`Refresh token error: ${error.message}`);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    res.status(500).json({ error: "Authentication service error" });
  }
};

// The logout and verifyToken functions remain unchanged
exports.logout = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware

    if (userId) {
      // Increment token version to invalidate all refresh tokens
      await userService.incrementTokenVersion(userId);

      // Publish logout event
      await publishMessage(AUTH_EXCHANGE, "auth.user.logout", {
        userId,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    res.status(500).json({ error: "Authentication service error" });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    // Auth middleware already verified the token
    res.status(200).json({
      userId: req.userId,
      role: req.userRole,
      valid: true,
    });
  } catch (error) {
    logger.error(`Token verification error: ${error.message}`);
    res.status(500).json({ error: "Authentication service error" });
  }
};
