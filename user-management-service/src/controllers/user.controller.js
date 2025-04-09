const User = require("../models/user.model");
const { asyncHandler, ErrorResponse } = require("../utils/error-handler.util");
const emailUtil = require("../utils/email.util");
const mongoose = require("mongoose");
const userService = require("../services/user.service");
const {
  processAndSaveImage,
  deleteOldProfilePicture,
} = require("../utils/file-upload.util");

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
 * @desc    Create a user from auth service (internal endpoint)
 * @route   POST /api/users/create
 * @access  Private (Service-to-service only)
 */
exports.createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);

  res.status(201).json({
    success: true,
    message: "User profile created successfully",
    user,
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
 * @desc    Test email sending functionality
 * @route   POST /api/users/test-email
 * @access  Private (Admin only)
 */
exports.testEmailSending = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ErrorResponse("Email address is required", 400);
  }

  try {
    const result = await emailUtil.sendTestEmail(email);

    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
    });
  }
});
