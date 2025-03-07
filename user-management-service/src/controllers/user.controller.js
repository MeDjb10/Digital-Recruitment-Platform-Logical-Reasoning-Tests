const User = require("../models/user.model");
const { asyncHandler } = require("../utils/error-handler.util");
const { ErrorResponse } = require("../utils/error-handler.util");

/**
 * @desc    Get all users with pagination and filtering
 * @route   GET /api/users
 * @access  Private (Admin, Moderator, Psychologist)
 */
exports.getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filters
  const filter = {};

  if (req.query.role) {
    filter.role = req.query.role;
  }

  if (req.query.search) {
    filter.$or = [
      { firstName: { $regex: req.query.search, $options: "i" } },
      { lastName: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ];
  }

  // Execute query with pagination
  const users = await User.find(filter, { password: 0 })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalUsers = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    users,
    pagination: {
      total: totalUsers,
      page,
      pages: Math.ceil(totalUsers / limit),
      limit,
    },
  });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:userId
 * @access  Private
 */
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId, { password: 0 });

  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }

  // Check if requester has permission to view this user
  // Only allow admins/moderators to view other users or users to view themselves
  if (
    req.userRole !== "admin" &&
    req.userRole !== "moderator" &&
    req.userId !== user._id.toString()
  ) {
    throw new ErrorResponse("Not authorized to access this user profile", 403);
  }

  res.status(200).json({
    success: true,
    user,
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/:userId
 * @access  Private (Self or Admin)
 */
exports.updateUser = asyncHandler(async (req, res) => {
  // Check if user is updating their own profile or is an admin
  if (req.params.userId !== req.userId && req.userRole !== "admin") {
    throw new ErrorResponse("Not authorized to update this user profile", 403);
  }

  // Fields that regular users can update
  const allowedUpdates = [
    "firstName",
    "lastName",
    "dateOfBirth",
    "gender",
    "currentPosition",
    "desiredPosition",
    "educationLevel",
  ];

  // Additional fields that admins can update
  if (req.userRole === "admin") {
    allowedUpdates.push("status");
  }

  // Filter out fields that aren't allowed to be updated
  const updateData = {};
  Object.keys(req.body).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updateData[key] = req.body[key];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(
    req.params.userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedUser) {
    throw new ErrorResponse("User not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "User profile updated successfully",
    user: updatedUser,
  });
});

/**
 * @desc    Assign role to user
 * @route   PUT /api/users/role
 * @access  Private (Admin only)
 */
exports.assignRole = asyncHandler(async (req, res) => {
  const { userId, role } = req.body;

  // This check is redundant with validation, but good as a safeguard
  const validRoles = ["candidate", "admin", "moderator", "psychologist"];
  if (!validRoles.includes(role)) {
    throw new ErrorResponse("Invalid role specified", 400);
  }

  // Find user by ID and update role
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedUser) {
    throw new ErrorResponse("User not found", 404);
  }

  res.status(200).json({
    success: true,
    message: `User role updated to ${role} successfully`,
    user: updatedUser,
  });
});
