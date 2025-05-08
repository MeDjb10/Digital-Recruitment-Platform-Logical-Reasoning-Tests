const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { asyncHandler, ErrorResponse } = require("../utils/error-handler.util");
const userService = require("../services/user.service");
// Add this import for message broker
const { publishMessage, NOTIFICATION_EXCHANGE, USER_EXCHANGE } = require("../utils/message-broker");

/**
 * @desc    Get all users with pagination and filtering
 * @route   GET /api/users
 * @access  Private (Admin, Moderator, Psychologist)
 */
exports.getUsers = asyncHandler(async (req, res) => {
  const { users, pagination } = await userService.getUsers(
    req.query,
    req.userRole
  );

  res.status(200).json({
    success: true,
    users,
    pagination,
  });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:userId
 * @access  Private
 */
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(
    req.params.userId,
    req.userRole,
    req.userId
  );

  res.status(200).json({
    success: true,
    user,
  });
});

/**
 * @desc    Create user with OTP
 * @route   POST /api/users/create
 * @access  Private (Service-to-Service)
 */
exports.createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, otp } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Hash password directly here - don't use utility functions
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user with the hashed password
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'candidate',
      isEmailVerified: false,
      isActive: false,
      otp: {
        code: otp.code,
        expiresAt: otp.expiresAt
      }
    });
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Verify OTP
 * @route   POST /api/users/verify-otp
 * @access  Private (Service-to-Service)
 */
exports.verifyOTP = asyncHandler(async (req, res) => {
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

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
  });
});

/**
 * @desc    Set reset OTP
 * @route   POST /api/users/set-reset-otp
 * @access  Private (Service-to-Service)
 */
exports.setResetOTP = asyncHandler(async (req, res) => {
  const { email, otp, otpExpiry } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Set the OTP
  user.otp = {
    code: otp,
    expiresAt: otpExpiry,
  };

  await user.save();

  res.status(200).json({
    success: true,
    message: "Reset OTP set successfully",
  });
});

/**
 * @desc    Verify reset OTP
 * @route   POST /api/users/verify-reset-otp
 * @access  Private (Service-to-Service)
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
 * @route   POST /api/users/reset-password
 * @access  Private (Service-to-Service)
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
  user.otp = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successful",
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/:userId
 * @access  Private (Self or Admin)
 */
exports.updateUser = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateUser(
    req.params.userId,
    req.userId,
    req.userRole,
    req.body,
    req.file
  );

  res.status(200).json({
    success: true,
    message: "User profile updated successfully",
    user: updatedUser,
  });
});

/**
 * @desc    Assign role to user
 * @route   PUT /api/users/role
 * @access  Private (Admin or Moderator with restrictions)
 */
exports.assignRole = asyncHandler(async (req, res) => {
  const updatedUser = await userService.assignRole(
    req.body.userId,
    req.body.role,
    req.userRole
  );

  res.status(200).json({
    success: true,
    message: `User role updated to ${req.body.role} successfully`,
    user: updatedUser,
  });
});

/**
 * @desc    Upload or update profile picture
 * @route   POST /api/users/:userId/profile-picture
 * @access  Private (Self or Admin)
 */
exports.updateProfilePicture = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateProfilePicture(
    req.params.userId,
    req.userId,
    req.userRole,
    req.file
  );

  // Add cache control headers
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.status(200).json({
    success: true,
    message: "Profile picture updated successfully",
    user: updatedUser,
  });
});

/**
 * @desc    Delete profile picture
 * @route   DELETE /api/users/:userId/profile-picture
 * @access  Private (Self or Admin)
 */
exports.deleteProfilePicture = asyncHandler(async (req, res) => {
  const updatedUser = await userService.deleteProfilePicture(
    req.params.userId,
    req.userId,
    req.userRole
  );

  res.status(200).json({
    success: true,
    message: "Profile picture deleted successfully",
    user: updatedUser,
  });
});

/**
 * @desc    Delete a user
 * @route   DELETE /api/users/:userId
 * @access  Private (Admin only)
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.userId, req.userId);

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

/**
 * @desc    Get user profile (self)
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.getMyProfile(req.userId);

  res.status(200).json({
    success: true,
    user,
  });
});

/**
 * @desc    Update user status (activate/deactivate)
 * @route   PATCH /api/users/:userId/status
 * @access  Private (Admin only)
 */
exports.updateUserStatus = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateUserStatus(
    req.params.userId,
    req.body.status
  );

  res.status(200).json({
    success: true,
    message: `User status updated to ${req.body.status} successfully`,
    user: updatedUser,
  });
});

/**
 * @desc    Get user role by ID (service-to-service endpoint)
 * @route   GET /api/users/role/:userId
 * @access  Private (Service-to-service only)
 */
exports.getUserRole = asyncHandler(async (req, res) => {
  const role = await userService.getUserRole(req.params.userId);

  res.status(200).json({
    success: true,
    role,
  });
});

/**
 * @desc    Submit test authorization request
 * @route   POST /api/users/test-authorization
 * @access  Private (Candidates only)
 */
exports.submitTestAuthorizationRequest = asyncHandler(async (req, res) => {
  const updatedUser = await userService.submitTestAuthorizationRequest(
    req.userId,
    req.body,
    req.file
  );

  res.status(200).json({
    success: true,
    message:
      "Test authorization request submitted and profile updated successfully",
    user: updatedUser,
  });
});

/**
 * @desc    Get all test authorization requests with pagination and filtering
 * @route   GET /api/users/test-authorization-requests
 * @access  Private (Admin, Moderator, Psychologist)
 */
exports.getTestAuthorizationRequests = asyncHandler(async (req, res) => {
  const { requests, pagination } =
    await userService.getTestAuthorizationRequests(req.query);

  res.status(200).json({
    success: true,
    requests,
    pagination,
  });
});

/**
 * @desc    Update test authorization status (approve/reject) with test assignment
 * @route   PUT /api/users/:userId/test-authorization
 * @access  Private (Admin, Moderator, Psychologist)
 */
exports.updateTestAuthorizationStatus = asyncHandler(async (req, res) => {
  const { status, examDate } = req.body;

  const updatedUser = await userService.updateTestAuthorizationStatus(
    req.params.userId,
    status,
    req.userId,
    examDate
  );

  res.status(200).json({
    success: true,
    message: `Test authorization request ${status}`,
    user: updatedUser,
  });
});

/**
 * @desc    Manually assign tests to an approved candidate
 * @route   PUT /api/users/:userId/test-assignment
 * @access  Private (Psychologist only)
 */
exports.manualTestAssignment = asyncHandler(async (req, res) => {
  const { assignedTest, additionalTests, examDate } = req.body;

  const updatedUser = await userService.manualTestAssignment(
    req.params.userId,
    { assignedTest, additionalTests, examDate },
    req.userId
  );

  res.status(200).json({
    success: true,
    message: "Test assignment updated successfully",
    user: updatedUser,
  });
});

/**
 * @desc    Bulk update test authorization statuses with optional exam date
 * @route   PUT /api/users/test-authorization/bulk
 * @access  Private (Admin, Moderator, Psychologist)
 */
exports.bulkUpdateTestAuthorizationStatus = asyncHandler(async (req, res) => {
  const { userIds, status, examDate } = req.body;

  const result = await userService.bulkUpdateTestAuthorizationStatus(
    userIds,
    status,
    req.userId,
    examDate
  );

  res.status(200).json({
    success: true,
    message: `Bulk updated ${result.modifiedCount} test authorization requests to ${status}`,
    updatedCount: result.modifiedCount,
    totalRequested: userIds.length,
  });
});

/**
 * @desc    Validate user credentials for authentication service
 * @route   POST /api/users/validate-credentials
 * @access  Private (Service-to-Service)
 */
exports.validateCredentials = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }
    
    // Use bcrypt directly - avoid any utility functions for this critical path
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    return res.status(200).json({
      success: true,
      message: 'Credentials valid',
      user: userResponse
    });
  } catch (error) {
    console.error('Credential validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * @desc    Get user by email (for auth service)
 * @route   GET /api/users/by-email/:email
 * @access  Private (Service-to-Service)
 */
exports.getUserByEmail = asyncHandler(async (req, res) => {
  const { email } = req.params;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json(user);
});

/**
 * @desc    Initiate password reset
 * @route   POST /api/users/initiate-reset
 * @access  Private (Service-to-Service)
 */
exports.initiatePasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Set token and expiry in database (24 hour expiry)
  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.passwordResetExpires = Date.now() + 24 * 60 * 60 * 1000;

  await user.save();

  res.status(200).json({
    success: true,
    resetToken,
  });
});

/**
 * @desc    Reset password
 * @route   PUT /api/users/reset-password
 * @access  Private (Service-to-Service)
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Hash the token from the request
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find user with this token and valid expiry
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired reset token",
    });
  }

  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);

  // Clear reset fields and increment token version for security
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successful",
  });
});

/**
 * @desc    Verify email
 * @route   POST /api/users/verify-email/:token
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
 * @route   POST /api/users/increment-token-version/:userId
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

/**
 * @desc    Signup user directly (new)
 * @route   POST /api/users/signup
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
        message: 'User already exists with this email'
      });
    }
    
    // Generate OTP
    const otp = require('../utils/otp.util').generateOTP();
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
      role: 'candidate',
      isEmailVerified: false,
      isActive: false,
      otp: {
        code: otp,
        expiresAt: otpExpiry
      }
    });

    // Publish message to notification service for email verification
    await publishMessage(
      NOTIFICATION_EXCHANGE,
      'notification.email.verification',
      {
        userId: user._id,
        email,
        firstName,
        otp,
        type: 'email_verification'
      }
    );
    
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent.',
      email,
      requiresVerification: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @desc    Verify user OTP for email verification (public access)
 * @route   POST /api/users/verify-user-otp
 * @access  Public
 */
exports.verifyUserOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  
  // Get user by email
  const user = await User.findOne({ email });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  if (!user.otp || !user.otp.code) {
    return res.status(400).json({
      success: false,
      message: 'No verification code found for this user'
    });
  }
  
  if (new Date() > new Date(user.otp.expiresAt)) {
    return res.status(400).json({
      success: false,
      message: 'Verification code has expired'
    });
  }
  
  if (user.otp.code !== otp) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification code'
    });
  }
  
  // Verify the user
  user.isEmailVerified = true;
  user.isActive = true;
  user.otp = undefined;
  
  await user.save();
  
  // Send welcome email
  await publishMessage(
    NOTIFICATION_EXCHANGE,
    'notification.email.welcome',
    {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      type: 'welcome'
    }
  );
  
  const userResponse = user.toObject();
  delete userResponse.password;
  
  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
    user: userResponse
  });
});

/**
 * @desc    Resend verification OTP to user
 * @route   POST /api/users/resend-verification
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
      message: 'If your email is registered, a new verification code has been sent.'
    });
  }
  
  // Don't send new code if user is already verified
  if (user.isEmailVerified) {
    return res.status(200).json({
      success: true,
      message: 'Your account is already verified. Please login.'
    });
  }
  
  // Generate new OTP
  const otp = require('../utils/otp.util').generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes
  
  // Save OTP to user
  user.otp = {
    code: otp,
    expiresAt: otpExpiry
  };
  
  await user.save();
  
  // Send verification email with OTP
  await publishMessage(
    NOTIFICATION_EXCHANGE,
    'notification.email.verification',
    {
      userId: user._id,
      email,
      firstName: user.firstName,
      otp,
      type: 'email_verification'
    }
  );
  
  res.status(200).json({
    success: true,
    message: 'A new verification code has been sent to your email',
    email
  });
});

/**
 * @desc    Request password reset (sends OTP)
 * @route   POST /api/users/request-password-reset
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
      message: 'If your email is registered, a password reset code will be sent.'
    });
  }
  
  // Generate OTP
  const otp = require('../utils/otp.util').generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes
  
  // Save OTP to user
  user.otp = {
    code: otp,
    expiresAt: otpExpiry
  };
  
  await user.save();
  
  // Send OTP via email
  await publishMessage(
    NOTIFICATION_EXCHANGE,
    'notification.email.password_reset',
    {
      userId: user._id,
      email,
      firstName: user.firstName,
      otp,
      type: 'password_reset'
    }
  );
  
  res.status(200).json({
    success: true,
    message: 'Password reset OTP sent to your email',
    email
  });
});
