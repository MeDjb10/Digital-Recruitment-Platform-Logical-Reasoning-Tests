/**
 * Authentication Service
 * Contains business logic for authentication operations
 */

const userService = require("../utils/service-client");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/token.util");
const {
  publishMessage,
  AUTH_EXCHANGE,
  NOTIFICATION_EXCHANGE,
} = require("../utils/message-broker");
const logger = require("../utils/logger.util");
const jwt = require("jsonwebtoken");
const { env } = require("../config");

class AuthService {
  /**
   * Authenticate user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {boolean} rememberMe - Whether to extend token expiration
   * @returns {Object} Authentication result with tokens and user data
   */
  async authenticateUser(email, password, rememberMe = false) {
    try {
      // Validate credentials against User Management service
      const data = await userService.validateCredentials(email, password);

      if (!data.success) {
        return {
          success: false,
          message: data.message || "Invalid credentials",
        };
      }

      const user = data.user;
      logger.info(`User ${user._id} authenticated successfully`);

      // Check if user is verified and active
      if (!user.isEmailVerified || !user.isActive) {
        return {
          success: false,
          message:
            "Account not verified or inactive. Please verify your email.",
          requiresVerification: true,
          user: {
            id: user._id,
            email: user.email,
          },
        };
      }

      // Generate tokens
      const accessToken = await generateAccessToken(user, rememberMe);
      const refreshToken = generateRefreshToken(user, rememberMe);

      // Log authentication event
      await this.logAuthEvent("user.login", {
        userId: user._id,
        email: user.email,
        rememberMe: !!rememberMe,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: "Authentication successful",
        accessToken,
        refreshToken,
        rememberMe: !!rememberMe,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      };
    } catch (error) {
      logger.error(`Authentication error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {Object} New tokens
   */
  async refreshTokens(refreshToken) {
    try {
      if (!refreshToken) {
        return {
          success: false,
          message: "Refresh token is required",
        };
      }

      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        env.jwt.refreshSecret || env.jwt.secret
      );

      // Get user data from User Management service
      const data = await userService.getUserById(decoded.id);
      if (!data.success || !data.user) {
        return {
          success: false,
          message: "Invalid refresh token",
        };
      }

      const user = data.user;

      // Check token version (for revocation)
      if (user.tokenVersion !== decoded.tokenVersion) {
        return {
          success: false,
          message: "Token has been revoked",
        };
      }

      // Check if user is still active
      if (!user.isEmailVerified || !user.isActive) {
        return {
          success: false,
          message: "Account has been deactivated",
        };
      }

      // Get rememberMe flag from refresh token
      const rememberMe = decoded.rememberMe || false;

      // Generate new tokens
      const newAccessToken = await generateAccessToken(user, rememberMe);
      const newRefreshToken = generateRefreshToken(user, rememberMe);

      logger.info(`Token refresh successful for user ${user._id}`);

      return {
        success: true,
        message: "Tokens refreshed successfully",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        rememberMe: rememberMe,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      };
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return {
          success: false,
          message: "Refresh token has expired",
        };
      }
      if (error.name === "JsonWebTokenError") {
        return {
          success: false,
          message: "Invalid refresh token",
        };
      }

      logger.error(`Token refresh error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Logout user and potentially invalidate tokens
   * @param {string} userId - User ID
   * @returns {Object} Logout result
   */
  async logoutUser(userId) {
    try {
      // Increment token version to invalidate all existing tokens
      await userService.incrementTokenVersion(userId);

      // Log logout event
      await this.logAuthEvent("user.logout", {
        userId: userId,
        timestamp: new Date().toISOString(),
      });

      logger.info(`User ${userId} logged out successfully`);

      return {
        success: true,
        message: "Logged out successfully",
      };
    } catch (error) {
      logger.error(`Logout error: ${error.message}`);
      // Don't fail logout even if token version increment fails
      return {
        success: true,
        message: "Logged out successfully",
      };
    }
  }

  /**
   * Log authentication events to message broker
   * @param {string} eventType - Type of auth event
   * @param {Object} data - Event data
   * @private
   */
  async logAuthEvent(eventType, data) {
    try {
      await publishMessage(AUTH_EXCHANGE, `auth.${eventType}`, {
        ...data,
        service: "authentication",
      });
    } catch (error) {
      // Don't fail the main operation if event logging fails
      logger.warn(`Failed to publish auth event: ${error.message}`);
    }
  }
}

module.exports = new AuthService();
