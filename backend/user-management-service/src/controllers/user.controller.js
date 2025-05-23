const User = require("../models/user.model");
const { asyncHandler, ErrorResponse } = require("../utils/error-handler.util");
const userService = require("../services/user.service");

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
 * @desc    Get user by ID for regular user requests
 * @route   GET /api/users/:userId
 * @access  Private
 */
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(
    req.params.userId,
    req.userRole,
    req.userId,
    false // Not a service request
  );

  res.status(200).json({
    success: true,
    user,
  });
});

/**
 * @desc    Get user by ID (Service-to-Service)
 * @route   GET /api/users/service/:userId
 * @access  Private (Service-to-Service)
 */
exports.getServiceUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(
    req.params.userId,
    null,
    null,
    true // This is a service request
  );

  res.status(200).json(user);
});

/**
 * @desc    Get user profile (self)
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getMyProfile = asyncHandler(async (req, res) => {
  console.log("GetMyProfile called with userId:", req.userId);
  console.log("Token user info:", {
    id: req.userId,
    role: req.userRole,
    email: req.userEmail,
  });

  try {
    const user = await userService.getMyProfile(req.userId);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error in getMyProfile:", error.message);
    throw error;
  }
});

/**
 * @desc    Create user (Service-to-Service)
 * @route   POST /api/users/create
 * @access  Private (Service-to-Service)
 */
exports.createUser = asyncHandler(async (req, res) => {
  const { authId, email, firstName, lastName, role } = req.body;

  if (!authId || !email) {
    throw new ErrorResponse("Auth ID and email are required", 400);
  }

  // Check if user already exists with this authId
  const existingUser = await User.findOne({ authId });
  if (existingUser) {
    // If user exists, return it without error (idempotent operation)
    return res.status(200).json({
      success: true,
      message: "User profile already exists",
      user: existingUser,
    });
  }

  // Create a new user profile
  const user = await User.create({
    _id: authId,
    email,
    firstName,
    lastName,
    role: role || "candidate",
    status: "active",
    dateCreated: new Date(),
  });

  res.status(201).json({
    success: true,
    message: "User profile created successfully",
    user,
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
 * @desc    Get user role by ID (Service-to-Service)
 * @route   GET /api/users/role/:userId
 * @access  Private (Service-to-Service)
 */
exports.getUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select("role");
  
  if (!user) {
    // For users that don't have profiles yet, return a default role
    return res.status(200).json({
      success: true,
      role: "candidate" // Default role if user doesn't exist in User Management
    });
  }
  
  res.status(200).json({
    success: true,
    role: user.role
  });
});

/**
 * @desc    Get test assignment for a user
 * @route   GET /api/users/:userId/test-assignment
 * @access  Private (User themselves, Admin, Moderator, Psychologist)
 */
exports.getUserTestAssignment = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if user is accessing their own test assignment or has appropriate permissions
  if (userId !== req.userId && !["admin", "moderator", "psychologist"].includes(req.userRole)) {
    throw new ErrorResponse("Not authorized to access this test assignment", 403);
  }

  const testAssignment = await userService.getUserTestAssignment(userId);

  res.status(200).json({
    success: true,
    data: testAssignment,
  });
});
