const crypto = require("crypto");
const User = require("../models/user");
const Token = require("../models/token");
const emailService = require("../services/emailService");
const jwtUtils = require("../utils/jwt");
const logger = require("../config/logger");

/**
 * Register a new user
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    // Extract user data from request body
    const {
      firstName,
      lastName,
      email,
      password,
      gender,
      role,
      dateOfBirth,
      currentPosition,
      desiredPosition,
      educationLevel,
    } = req.body;

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "fail",
        message: "User with this email already exists",
      });
    }

    // Create user object based on role
    const userData = {
      firstName,
      lastName,
      email,
      password,
      gender,
      role: role || "candidate", // Default to candidate if no role specified
    };

    // Add candidate-specific fields if applicable
    if (userData.role === "candidate") {
      if (!dateOfBirth) {
        return res.status(400).json({
          status: "fail",
          message: "Date of birth is required for candidates",
        });
      }

      userData.dateOfBirth = dateOfBirth;
      userData.currentPosition = currentPosition;
      userData.desiredPosition = desiredPosition;
      userData.educationLevel = educationLevel;
    }

    // Create new user
    const newUser = await User.create(userData);

    // Generate email verification token
    const verificationToken = newUser.createEmailVerificationToken();
    await newUser.save({ validateBeforeSave: false });

    // Store token in database
    await Token.create({
      userId: newUser._id,
      token: crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex"),
      type: "verification",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Send verification and welcome emails
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    await emailService.sendVerificationEmail(
      newUser,
      verificationToken,
      baseUrl
    );
    await emailService.sendWelcomeEmail(newUser);

    // Generate JWT token
    const token = jwtUtils.generateToken(newUser);

    // Send response
    res.status(201).json({
      status: "success",
      message: "User registered successfully. Please verify your email.",
      data: {
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          emailVerified: newUser.emailVerified,
        },
        token,
      },
    });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to register user",
      error: error.message,
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide email and password",
      });
    }

    // Find user by email and include password field
    const user = await User.findOne({ email }).select("+password");

    // Check if user exists and password is correct
    if (!user || !(await user.correctPassword(password))) {
      return res.status(401).json({
        status: "fail",
        message: "Incorrect email or password",
      });
    }

    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = jwtUtils.generateToken(user);

    // Send response
    res.status(200).json({
      status: "success",
      message: "Logged in successfully",
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to login",
      error: error.message,
    });
  }
};

/**
 * Forgot Password - Send reset email
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide an email address",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    // Return success even if user not found for security reasons
    if (!user) {
      return res.status(200).json({
        status: "success",
        message:
          "If a user with this email exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Store token in database
    await Token.create({
      userId: user._id,
      token: crypto.createHash("sha256").update(resetToken).digest("hex"),
      type: "reset",
      expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send password reset email
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    try {
      await emailService.sendPasswordResetEmail(user, resetToken, baseUrl);

      res.status(200).json({
        status: "success",
        message: "Password reset link sent to your email address",
      });
    } catch (err) {
      // If email fails, reset passwordResetToken and passwordResetExpires
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      logger.error("Error sending password reset email:", err);

      return res.status(500).json({
        status: "error",
        message: "Error sending password reset email. Please try again later.",
      });
    }
  } catch (error) {
    logger.error("Forgot password error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to process forgot password request",
      error: error.message,
    });
  }
};

/**
 * Reset Password
 * @route PATCH /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const { token } = req.params;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide password and confirmation",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: "fail",
        message: "Passwords do not match",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: "fail",
        message: "Password must be at least 8 characters long",
      });
    }

    // Hash the token for comparison
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find token in database
    const resetToken = await Token.findOne({
      token: hashedToken,
      type: "reset",
      expires: { $gt: Date.now() },
    });

    if (!resetToken) {
      return res.status(400).json({
        status: "fail",
        message: "Token is invalid or has expired",
      });
    }

    // Find user
    const user = await User.findById(resetToken.userId);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Delete the token
    await Token.findByIdAndDelete(resetToken._id);

    // Generate new JWT
    const jwtToken = jwtUtils.generateToken(user);

    res.status(200).json({
      status: "success",
      message: "Password reset successful",
      data: {
        token: jwtToken,
      },
    });
  } catch (error) {
    logger.error("Reset password error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

/**
 * Verify Email
 * @route GET /api/auth/verify-email/:token
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the token for comparison
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find token in database
    const verificationToken = await Token.findOne({
      token: hashedToken,
      type: "verification",
      expires: { $gt: Date.now() },
    });

    if (!verificationToken) {
      return res.status(400).json({
        status: "fail",
        message: "Token is invalid or has expired",
      });
    }

    // Find user
    const user = await User.findById(verificationToken.userId);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // Update user
    user.emailVerified = true;
    user.status = "active";
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    // Delete the token
    await Token.findByIdAndDelete(verificationToken._id);

    // Redirect to frontend or return success
    res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
  } catch (error) {
    logger.error("Email verification error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to verify email",
      error: error.message,
    });
  }
};

/**
 * Get current user information
 * @route GET /api/auth/me
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth,
          currentPosition: user.currentPosition,
          desiredPosition: user.desiredPosition,
          educationLevel: user.educationLevel,
          status: user.status,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error("Get current user error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get user information",
      error: error.message,
    });
  }
};
