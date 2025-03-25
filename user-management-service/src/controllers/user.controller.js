const User = require("../models/user.model");
const { asyncHandler, ErrorResponse } = require("../utils/error-handler.util");
const emailUtil = require("../utils/email.util");
const mongoose = require("mongoose");

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

  // Status filter (admin only)
  if (req.query.status && req.userRole === "admin") {
    filter.status = req.query.status;
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
  // Only allow admins/moderators/psychologists to view other users or users to view themselves
  if (
    !["admin", "moderator", "psychologist"].includes(req.userRole) &&
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
 * @desc    Create a user from auth service (internal endpoint)
 * @route   POST /api/users/create
 * @access  Private (Service-to-service only)
 */
exports.createUser = asyncHandler(async (req, res) => {
  // Extract user data from request body
  const { authId, email, firstName, lastName, role = "candidate" } = req.body;

  // Validate required fields
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
      user: existingUser
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
    // Add default values for other fields as needed
    dateCreated: new Date(),
  });

  // Log the successful user creation
  console.log(`User profile created for authId: ${authId}, email: ${email}`);

  res.status(201).json({
    success: true,
    message: "User profile created successfully",
    user
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
 * @access  Private (Admin or Moderator with restrictions)
 */
exports.assignRole = asyncHandler(async (req, res) => {
  const { userId, role } = req.body;

  // Check if the user exists first
  const userToUpdate = await User.findById(userId);
  if (!userToUpdate) {
    throw new ErrorResponse("User not found", 404);
  }

  // Role-based permissions for role assignment
  if (req.userRole === "admin") {
    // Admin can assign any role
  } else if (req.userRole === "moderator") {
    // Moderator can only assign "psychologist" role
    if (role !== "psychologist") {
      throw new ErrorResponse(
        "Moderators can only assign the psychologist role",
        403
      );
    }
  } else {
    throw new ErrorResponse("Not authorized to assign roles", 403);
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true }
  ).select("-password");

  res.status(200).json({
    success: true,
    message: `User role updated to ${role} successfully`,
    user: updatedUser,
  });
});

/**
 * @desc    Delete a user
 * @route   DELETE /api/users/:userId
 * @access  Private (Admin only)
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }

  // Don't allow admins to delete themselves
  if (req.userId === req.params.userId) {
    throw new ErrorResponse("You cannot delete your own account", 400);
  }

  await User.deleteOne({ _id: req.params.userId });

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
  const user = await User.findById(req.userId).select("-password");

  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }

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
  const { status } = req.body;

  if (!["active", "inactive", "suspended"].includes(status)) {
    throw new ErrorResponse("Invalid status value", 400);
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.userId,
    { status },
    { new: true }
  ).select("-password");

  if (!updatedUser) {
    throw new ErrorResponse("User not found", 404);
  }

  res.status(200).json({
    success: true,
    message: `User status updated to ${status} successfully`,
    user: updatedUser,
  });
});

/**
 * @desc    Get user role by ID (service-to-service endpoint)
 * @route   GET /api/users/role/:userId
 * @access  Private (Service-to-service only)
 */
exports.getUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  
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
 * @desc    Submit test authorization request
 * @route   POST /api/users/test-authorization
 * @access  Private (Candidates only)
 */
exports.submitTestAuthorizationRequest = asyncHandler(async (req, res) => {
  // Check if user is a candidate
  const user = await User.findById(req.userId);
  
  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }
  
  if (user.role !== "candidate") {
    throw new ErrorResponse("Only candidates can submit test authorization requests", 403);
  }
  
  const { 
    // Test authorization data
    jobPosition, 
    company, 
    department, 
    additionalInfo,
    
    // User profile data
    firstName,
    lastName,
    dateOfBirth,
    gender,
    currentPosition,
    desiredPosition,
    educationLevel
  } = req.body;
  
  // Validate required fields for test authorization
  if (!jobPosition || !company) {
    throw new ErrorResponse("Job position and company are required fields", 400);
  }
  
  // Build update object including both test authorization and profile data
  const updateData = {
    testAuthorizationStatus: "pending",
    testEligibilityInfo: {
      jobPosition,
      company,
      department,
      additionalInfo,
      submissionDate: new Date()
    }
  };
  
  // Add profile data if provided
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
  if (gender) updateData.gender = gender;
  if (currentPosition) updateData.currentPosition = currentPosition;
  if (desiredPosition) updateData.desiredPosition = desiredPosition;
  if (educationLevel) updateData.educationLevel = educationLevel;
  
  // Update user with both test authorization request data and profile data
  const updatedUser = await User.findByIdAndUpdate(
    req.userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select("-password");
  
  // Send confirmation email
  await emailUtil.sendRequestSubmissionEmail(updatedUser);
  
  res.status(200).json({
    success: true,
    message: "Test authorization request submitted and profile updated successfully",
    user: updatedUser
  });
});


/**
 * @desc    Get all test authorization requests with pagination and filtering
 * @route   GET /api/users/test-authorization-requests
 * @access  Private (Admin, Moderator, Psychologist)
 */
exports.getTestAuthorizationRequests = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filters
  const filter = { testAuthorizationStatus: req.query.status || "pending" };

  if (req.query.search) {
    filter.$or = [
      { firstName: { $regex: req.query.search, $options: "i" } },
      { lastName: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
      { "testEligibilityInfo.jobPosition": { $regex: req.query.search, $options: "i" } },
      { "testEligibilityInfo.company": { $regex: req.query.search, $options: "i" } },
    ];
  }

  // Execute query with pagination
  const requests = await User.find(filter, { password: 0 })
    .sort({ "testEligibilityInfo.submissionDate": -1 })
    .skip(skip)
    .limit(limit);

  const totalRequests = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    requests,
    pagination: {
      total: totalRequests,
      page,
      pages: Math.ceil(totalRequests / limit),
      limit,
    },
  });
});

/**
 * @desc    Update test authorization status (approve/reject)
 * @route   PUT /api/users/:userId/test-authorization
 * @access  Private (Admin, Moderator, Psychologist)
 */
exports.updateTestAuthorizationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    throw new ErrorResponse("Invalid status value", 400);
  }

  const user = await User.findById(req.params.userId);
  
  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }
  
  if (user.testAuthorizationStatus === "not_submitted") {
    throw new ErrorResponse("This user has not submitted a test authorization request", 400);
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.userId,
    { 
      testAuthorizationStatus: status,
      testAuthorizationDate: new Date(),
      authorizedBy: req.userId
    },
    { new: true }
  ).select("-password");

  // Send status change email
  await emailUtil.sendStatusChangeEmail(updatedUser, status);

  res.status(200).json({
    success: true,
    message: `Test authorization request ${status}`,
    user: updatedUser,
  });
});


/**
 * @desc    Bulk update test authorization statuses
 * @route   PUT /api/users/test-authorization/bulk
 * @access  Private (Admin, Moderator, Psychologist)
 */
exports.bulkUpdateTestAuthorizationStatus = asyncHandler(async (req, res) => {
  const { userIds, status } = req.body;
  
  // Validate input
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ErrorResponse("User IDs array is required", 400);
  }
  
  if (!["approved", "rejected"].includes(status)) {
    throw new ErrorResponse("Invalid status value", 400);
  }
  
  // Validate all user IDs
  for (const userId of userIds) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErrorResponse(`Invalid user ID format: ${userId}`, 400);
    }
  }
  
  // Update all users
  const updateResult = await User.updateMany(
    { 
      _id: { $in: userIds },
      testAuthorizationStatus: { $ne: "not_submitted" } // Only update users who have submitted a request
    },
    { 
      testAuthorizationStatus: status,
      testAuthorizationDate: new Date(),
      authorizedBy: req.userId
    }
  );
  
  // Find the updated users to send emails
  const updatedUsers = await User.find({
    _id: { $in: userIds },
    testAuthorizationStatus: status
  });
  
  // Send emails to all updated users
  const emailPromises = updatedUsers.map(user => 
    emailUtil.sendStatusChangeEmail(user, status)
  );
  
  // Wait for all emails to be sent
  await Promise.allSettled(emailPromises);
  
  res.status(200).json({
    success: true,
    message: `Bulk updated ${updateResult.modifiedCount} test authorization requests to ${status}`,
    updatedCount: updateResult.modifiedCount,
    totalRequested: userIds.length
  });
});