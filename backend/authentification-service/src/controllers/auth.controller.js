const jwt = require("jsonwebtoken");
const {
  publishMessage,
  AUTH_EXCHANGE,
  NOTIFICATION_EXCHANGE,
} = require("../utils/message-broker");
const userService = require("../utils/service-client");
const logger = require("../utils//logger.util");

// Function to create JWT tokens
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || "1h" }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      tokenVersion: user.tokenVersion || 0,
    },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
  );
}

// Login controller - gets user data from User Management service
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // If user is not verified, notify them
    if (!user.isEmailVerified || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        requiresVerification: true,
        email: user.email,
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Log login event
    try {
      await publishMessage(AUTH_EXCHANGE, "auth.user.login", {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
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
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
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

// Refresh token controller
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
    const user = data.user;

    // Check token version (for revocation)
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    res.status(500).json({ error: "Authentication service error" });
  }
};

// Handle logout
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
    console.error("Logout error:", error);
    res.status(500).json({ error: "Authentication service error" });
  }
};

// Verify token without checking database
exports.verifyToken = async (req, res) => {
  try {
    // Auth middleware already verified the token
    res.status(200).json({
      userId: req.userId,
      role: req.userRole,
      valid: true,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ error: "Authentication service error" });
  }
};

// Request password reset - delegate to User Management and Notification
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists via User Management service
    const user = await userService.getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate OTP
    const otp = require("../utils/otp.util").generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

    // Save OTP to user
    const resetData = await userService.setResetOTP(email, otp, otpExpiry);

    // Send OTP via email
    await publishMessage(
      NOTIFICATION_EXCHANGE,
      "notification.email.password_reset",
      {
        userId: user.id,
        email,
        firstName: user.firstName,
        otp,
        type: "password_reset",
      }
    );

    res.status(200).json({
      message: "Password reset OTP sent to your email",
      email,
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({ error: "Authentication service error" });
  }
};

// Add verifyResetOTP function
exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Verify OTP
    const verificationResult = await userService.verifyResetOTP(email, otp);

    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
    }

    // Reset password
    await userService.resetPassword(email, newPassword);

    res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset OTP verification error:", error);
    res.status(500).json({ error: "Password reset failed" });
  }
};

// Signup - creates user and sends verification OTP
exports.signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    try {
      const existingUser = await userService.getUserByEmail(email);
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "User already exists with this email" });
      }
    } catch (error) {
      // If error is 404, the user doesn't exist, which is what we want
      if (
        error.message !== "User service unavailable" &&
        !error.message.includes("404")
      ) {
        throw error;
      }
    }

    // Generate OTP
    const otp = require("../utils/otp.util").generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

    // Register user with User Management service
    const userData = await userService.createUser({
      email,
      password,
      firstName,
      lastName,
      otp: {
        code: otp,
        expiresAt: otpExpiry,
      },
      isEmailVerified: false,
      isActive: false,
    });

    // Send verification email with OTP
    await publishMessage(
      NOTIFICATION_EXCHANGE,
      "notification.email.verification",
      {
        userId: userData.user.id,
        email,
        firstName,
        otp,
        type: "email_verification",
      }
    );

    res.status(201).json({
      message:
        "Registration successful. Please verify your email with the OTP sent.",
      email,
      requiresVerification: true,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Get user by email
    const user = await userService.getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify OTP
    const verificationResult = await userService.verifyOTP(email, otp);

    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
    }

    // Get updated user data
    const updatedUser = await userService.getUserByEmail(email);

    // Generate tokens
    const accessToken = generateAccessToken(updatedUser);
    const refreshToken = generateRefreshToken(updatedUser);

    // Send welcome email
    await publishMessage(NOTIFICATION_EXCHANGE, "notification.email.welcome", {
      userId: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      type: "welcome",
    });

    res.status(200).json({
      message: "Email verification successful",
      accessToken,
      refreshToken,
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
};

// Add this new function to auth.controller.js

// Resend verification OTP
exports.resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Get user by email
    let userResponse;
    try {
      userResponse = await userService.getUserByEmail(email);
    } catch (error) {
      // If user is not found, give vague response for security
      return res.status(200).json({
        success: true,
        message:
          "If your email is registered, a new verification code has been sent.",
      });
    }

    const user = userResponse.user || userResponse;

    if (!user) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({
        success: true,
        message:
          "If your email is registered, a new verification code has been sent.",
      });
    }

    // Don't send new code if user is already verified
    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: "Your account is already verified. Please login.",
      });
    }

    // Generate new OTP
    const otp = require("../utils/otp.util").generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

    // Save OTP to user
    await userService.setResetOTP(email, otp, otpExpiry);

    // Send verification email with OTP
    await publishMessage(
      NOTIFICATION_EXCHANGE,
      "notification.email.verification",
      {
        userId: user.id,
        email,
        firstName: user.firstName,
        otp,
        type: "email_verification",
      }
    );

    res.status(200).json({
      success: true,
      message: "A new verification code has been sent to your email",
      email,
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Failed to resend verification code" });
  }
};
