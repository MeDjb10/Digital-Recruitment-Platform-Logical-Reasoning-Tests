const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { asyncHandler, ErrorResponse } = require("../utils/error-handler.util");
const {
  publishMessage,
  NOTIFICATION_EXCHANGE,
} = require("../utils/message-broker");

/**
 * @desc    Signup user directly
 * @route   POST /api/auth/signup
 * @access  Public
 */
exports.signup = asyncHandler(async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Generate OTP
    const otp = require("../utils/otp.util").generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "candidate",
      isEmailVerified: false,
      isActive: false,
      otp: {
        code: otp,
        expiresAt: otpExpiry,
      },
    });

    // Publish message to notification service for email verification
    await publishMessage(
      NOTIFICATION_EXCHANGE,
      "notification.email.verification",
      {
        userId: user._id,
        email,
        firstName,
        otp,
        type: "email_verification",
      }
    );

    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please verify your email with the OTP sent.",
      email,
      requiresVerification: true,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @desc    Verify user OTP for email verification
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyUserOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // Get user by email
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (!user.otp || !user.otp.code) {
    return res.status(400).json({
      success: false,
      message: "No verification code found for this user",
    });
  }

  if (new Date() > new Date(user.otp.expiresAt)) {
    return res.status(400).json({
      success: false,
      message: "Verification code has expired",
    });
  }

  if (user.otp.code !== otp) {
    return res.status(400).json({
      success: false,
      message: "Invalid verification code",
    });
  }

  // Verify the user
  user.isEmailVerified = true;
  user.isActive = true;
  user.otp = undefined;

  await user.save();

  // Send welcome email
  await publishMessage(NOTIFICATION_EXCHANGE, "notification.email.welcome", {
    userId: user._id,
    email: user.email,
    firstName: user.firstName,
    type: "welcome",
  });

  const userResponse = user.toObject();
  delete userResponse.password;

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
    user: userResponse,
  });
});

/**
 * @desc    Resend verification OTP to user
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
exports.resendVerificationOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Get user by email
  const user = await User.findOne({ email });

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
  user.otp = {
    code: otp,
    expiresAt: otpExpiry,
  };

  await user.save();

  // Send verification email with OTP
  await publishMessage(
    NOTIFICATION_EXCHANGE,
    "notification.email.verification",
    {
      userId: user._id,
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
});

/**
 * @desc    Request password reset (sends OTP)
 * @route   POST /api/auth/request-password-reset
 * @access  Public
 */
exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if user exists
  const user = await User.findOne({ email });

  if (!user) {
    // For security reasons, don't reveal if user exists or not
    return res.status(200).json({
      success: true,
      message:
        "If your email is registered, a password reset code will be sent.",
    });
  }

  // Generate OTP
  const otp = require("../utils/otp.util").generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

  // Save OTP to user
  user.otp = {
    code: otp,
    expiresAt: otpExpiry,
  };

  await user.save();

  // Send OTP via email
  await publishMessage(
    NOTIFICATION_EXCHANGE,
    "notification.email.password_reset",
    {
      userId: user._id,
      email,
      firstName: user.firstName,
      otp,
      type: "password_reset",
    }
  );

  res.status(200).json({
    success: true,
    message: "Password reset OTP sent to your email",
    email,
  });
});

/**
 * @desc    Verify reset OTP
 * @route   POST /api/auth/verify-reset-otp
 * @access  Public
 */
exports.verifyResetOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (!user.otp || !user.otp.code) {
    return res.status(400).json({
      success: false,
      message: "No reset code found for this user",
    });
  }

  if (new Date() > new Date(user.otp.expiresAt)) {
    return res.status(400).json({
      success: false,
      message: "Reset code has expired",
    });
  }

  if (user.otp.code !== otp) {
    return res.status(400).json({
      success: false,
      message: "Invalid reset code",
    });
  }

  res.status(200).json({
    success: true,
    message: "Reset OTP verified successfully",
  });
});

/**
 * @desc    Reset password with verified OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
exports.resetPasswordWithOTP = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  // Clear OTP and increment token version
  user.isEmailVerified = true;
  user.isActive = true;
  user.otp = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successful",
  });
});

/**
 * @desc    Validate user credentials for authentication service
 * @route   POST /api/auth/validate-credentials
 * @access  Private (Service-to-Service)
 */
exports.validateCredentials = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is not active",
      });
    }

    // Use bcrypt directly
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      message: "Credentials valid",
      user: userResponse,
    });
  } catch (error) {
    console.error("Credential validation error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

/**
 * @desc    Verify email token
 * @route   POST /api/auth/verify-email/:token
 * @access  Public
 */
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find user with matching activation token and valid expiry
  const user = await User.findOne({
    activationToken: hashedToken,
    activationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired verification token",
    });
  }

  // Activate the user
  user.isEmailVerified = true;
  user.isActive = true;
  user.activationToken = undefined;
  user.activationExpires = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Email verification successful",
  });
});

/**
 * @desc    Increment token version (for logout/token revocation)
 * @route   POST /api/auth/increment-token-version/:userId
 * @access  Private (Service-to-Service)
 */
exports.incrementTokenVersion = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Increment token version to invalidate all existing refresh tokens
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Token version incremented",
  });
});
