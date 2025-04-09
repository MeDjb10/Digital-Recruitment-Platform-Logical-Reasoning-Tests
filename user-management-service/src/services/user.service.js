const User = require("../models/user.model");
const mongoose = require("mongoose");
const { ErrorResponse } = require("../utils/error-handler.util");
const emailUtil = require("../utils/email.util");
const {
  processAndSaveImage,
  deleteOldProfilePicture,
} = require("../utils/file-upload.util");
const logger = require("../utils/logger.util");

/**
 * Get users with pagination and filtering
 */
exports.getUsers = async (queryParams, userRole) => {
  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filters
  const filter = {};

  if (queryParams.role) {
    filter.role = queryParams.role;
  }

  if (queryParams.search) {
    filter.$or = [
      { firstName: { $regex: queryParams.search, $options: "i" } },
      { lastName: { $regex: queryParams.search, $options: "i" } },
      { email: { $regex: queryParams.search, $options: "i" } },
    ];
  }

  // Status filter (admin only)
  if (queryParams.status && userRole === "admin") {
    filter.status = queryParams.status;
  }

  // Execute query with pagination - use projection to exclude password
  const users = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalUsers = await User.countDocuments(filter);

  return {
    users,
    pagination: {
      total: totalUsers,
      page,
      pages: Math.ceil(totalUsers / limit),
      limit,
    },
  };
};

/**
 * Get user by ID
 */
exports.getUserById = async (userId, userRole, requestUserId) => {
  const user = await User.findById(userId).select("-password").lean();

  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }

  // Check if requester has permission to view this user
  if (
    !["admin", "moderator", "psychologist"].includes(userRole) &&
    requestUserId !== user._id.toString()
  ) {
    throw new ErrorResponse("Not authorized to access this user profile", 403);
  }

  return user;
};

/**
 * Create a user from auth service
 */
exports.createUser = async (userData) => {
  // Extract user data
  const { authId, email, firstName, lastName, role = "candidate" } = userData;

  // Validate required fields
  if (!authId || !email) {
    throw new ErrorResponse("Auth ID and email are required", 400);
  }

  // Check if user already exists with this authId
  const existingUser = await User.findOne({ _id: authId }).lean();
  if (existingUser) {
    // If user exists, return it without error (idempotent operation)
    logger.info(`User profile already exists for authId: ${authId}`);
    return existingUser;
  }

  // Create a new user profile with authId as _id
  const user = await User.create({
    _id: authId,
    email,
    firstName,
    lastName,
    role: role || "candidate",
    status: "active",
    dateCreated: new Date(),
  });

  logger.info(`User profile created for authId: ${authId}, email: ${email}`);
  return user;
};

/**
 * Update user profile
 */
exports.updateUser = async (
  userId,
  requestUserId,
  userRole,
  updateData,
  file
) => {
  // Check if user is updating their own profile or is an admin
  if (userId !== requestUserId && userRole !== "admin") {
    throw new ErrorResponse("Not authorized to update this user profile", 403);
  }

  // Get current user data
  const currentUser = await User.findById(userId);
  if (!currentUser) {
    throw new ErrorResponse("User not found", 404);
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
  if (userRole === "admin") {
    allowedUpdates.push("status");
  }

  // Filter out fields that aren't allowed to be updated
  const filteredUpdate = {};
  Object.keys(updateData).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      filteredUpdate[key] = updateData[key];
    }
  });

  // Handle profile picture upload if provided
  if (file) {
    // Delete old profile picture if exists
    await deleteOldProfilePicture(currentUser.profilePicture);

    // Process and save new profile picture
    const profilePicturePath = await processAndSaveImage(
      file,
      userId,
      currentUser.role
    );

    // Add profile picture path to update data
    filteredUpdate.profilePicture = profilePicturePath;
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: filteredUpdate },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedUser) {
    throw new ErrorResponse("User not found", 404);
  }

  return updatedUser;
};

/**
 * Assign role to user
 */
exports.assignRole = async (userId, role, userRole) => {
  // Check if the user exists first
  const userToUpdate = await User.findById(userId);
  if (!userToUpdate) {
    throw new ErrorResponse("User not found", 404);
  }

  // Role-based permissions for role assignment
  if (userRole === "admin") {
    // Admin can assign any role
  } else if (userRole === "moderator") {
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

  return updatedUser;
};

/**
 * Update profile picture
 */
exports.updateProfilePicture = async (
  userId,
  requestUserId,
  userRole,
  file
) => {
  logger.debug("Update profile picture request received", { userId });

  // Check permissions
  if (userId !== requestUserId && userRole !== "admin") {
    throw new ErrorResponse(
      "Not authorized to update this user's profile picture",
      403
    );
  }

  // Find the user
  const user = await User.findById(userId);
  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }

  // Check if a file was uploaded
  if (!file) {
    throw new ErrorResponse("No image file provided", 400);
  }

  try {
    // Process the new image
    logger.debug("Processing new image", { filePath: file.path });
    const profilePicturePath = await processAndSaveImage(
      file,
      userId,
      user.role
    );

    // Delete old profile picture if it exists
    if (user.profilePicture) {
      await deleteOldProfilePicture(user.profilePicture);
    }

    // Update the user's profile picture in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture: profilePicturePath },
      { new: true }
    ).select("-password");

    return updatedUser;
  } catch (error) {
    logger.error("Error updating profile picture", { error: error.message });
    throw new ErrorResponse(
      `Failed to update profile picture: ${error.message}`,
      500
    );
  }
};

/**
 * Delete profile picture
 */
exports.deleteProfilePicture = async (userId, requestUserId, userRole) => {
  // Check permissions
  if (userId !== requestUserId && userRole !== "admin") {
    throw new ErrorResponse(
      "Not authorized to delete this user's profile picture",
      403
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }

  // Delete profile picture if exists
  if (user.profilePicture) {
    await deleteOldProfilePicture(user.profilePicture);
  }

  // Update user to remove profile picture reference
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $unset: { profilePicture: 1 } },
    { new: true }
  ).select("-password");

  return updatedUser;
};

/**
 * Delete a user
 */
exports.deleteUser = async (userId, requestUserId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }

  // Don't allow admins to delete themselves
  if (requestUserId === userId) {
    throw new ErrorResponse("You cannot delete your own account", 400);
  }

  await User.deleteOne({ _id: userId });
  return true;
};

/**
 * Get user profile (self)
 */
exports.getMyProfile = async (userId) => {
  const user = await User.findById(userId).select("-password").lean();

  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }

  return user;
};

/**
 * Update user status
 */
exports.updateUserStatus = async (userId, status) => {
  if (!["active", "inactive", "suspended"].includes(status)) {
    throw new ErrorResponse("Invalid status value", 400);
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { status },
    { new: true }
  ).select("-password");

  if (!updatedUser) {
    throw new ErrorResponse("User not found", 404);
  }

  return updatedUser;
};

/**
 * Get user role by ID
 */
exports.getUserRole = async (userId) => {
  const user = await User.findById(userId).select("role").lean();

  if (!user) {
    // For users that don't have profiles yet, return a default role
    return "candidate"; // Default role if user doesn't exist
  }

  return user.role;
};

/**
 * Submit test authorization request
 */
exports.submitTestAuthorizationRequest = async (userId, requestData, file) => {
  // Check if user is a candidate
  const user = await User.findById(userId);

  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }

  if (user.role !== "candidate") {
    throw new ErrorResponse(
      "Only candidates can submit test authorization requests",
      403
    );
  }

  const {
    // Test authorization data
    jobPosition,
    company,
    department,
    additionalInfo,
    availability,

    // User profile data
    firstName,
    lastName,
    dateOfBirth,
    gender,
    currentPosition,
    desiredPosition,
    educationLevel,
  } = requestData;

  // Validate required fields for test authorization
  if (!jobPosition || !company) {
    throw new ErrorResponse(
      "Job position and company are required fields",
      400
    );
  }

  // Build update object
  const updateData = {
    testAuthorizationStatus: "pending",
    testEligibilityInfo: {
      jobPosition,
      company,
      department,
      additionalInfo,
      availability: availability || "immediately",
      submissionDate: new Date(),
    },
  };

  // Add profile data if provided
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
  if (gender) updateData.gender = gender;
  if (currentPosition) updateData.currentPosition = currentPosition;
  if (desiredPosition) updateData.desiredPosition = desiredPosition;
  if (educationLevel) updateData.educationLevel = educationLevel;

  // Handle profile picture upload if provided
  if (file) {
    logger.debug("Processing profile picture for test authorization request", {
      fileName: file.originalname,
      fileSize: file.size,
    });

    try {
      // Delete old profile picture if exists
      if (user.profilePicture) {
        await deleteOldProfilePicture(user.profilePicture);
      }

      // Process and save new profile picture
      const profilePicturePath = await processAndSaveImage(
        file,
        userId,
        user.role
      );

      // Add profile picture path to update data
      updateData.profilePicture = profilePicturePath;
      logger.debug("Profile picture saved", { path: profilePicturePath });
    } catch (error) {
      logger.error("Error processing profile picture", {
        error: error.message,
      });
      // Continue with the request even if profile picture processing fails
    }
  }

  // Update user with both test authorization request data and profile data
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select("-password");

  // Send confirmation email
  await emailUtil.sendRequestSubmissionEmail(updatedUser);

  return updatedUser;
};

/**
 * Get all test authorization requests
 */
exports.getTestAuthorizationRequests = async (queryParams) => {
  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filters
  const filter = { testAuthorizationStatus: queryParams.status || "pending" };

  if (queryParams.search) {
    filter.$or = [
      { firstName: { $regex: queryParams.search, $options: "i" } },
      { lastName: { $regex: queryParams.search, $options: "i" } },
      { email: { $regex: queryParams.search, $options: "i" } },
      {
        "testEligibilityInfo.jobPosition": {
          $regex: queryParams.search,
          $options: "i",
        },
      },
      {
        "testEligibilityInfo.company": {
          $regex: queryParams.search,
          $options: "i",
        },
      },
    ];
  }

  // Execute query with pagination
  const requests = await User.find(filter)
    .select("-password")
    .sort({ "testEligibilityInfo.submissionDate": -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalRequests = await User.countDocuments(filter);

  return {
    requests,
    pagination: {
      total: totalRequests,
      page,
      pages: Math.ceil(totalRequests / limit),
      limit,
    },
  };
};

/**
 * Update test authorization status with test assignment
 */
exports.updateTestAuthorizationStatus = async (
  userId,
  status,
  authorizedById,
  examDate = null
) => {
  if (!["approved", "rejected"].includes(status)) {
    throw new ErrorResponse("Invalid status value", 400);
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }

  if (user.testAuthorizationStatus === "not_submitted") {
    throw new ErrorResponse(
      "This user has not submitted a test authorization request",
      400
    );
  }

  // Create update object
  const updateData = {
    testAuthorizationStatus: status,
    testAuthorizationDate: new Date(),
    authorizedBy: authorizedById,
  };

  // If approved, automatically assign a test based on education level
  if (status === "approved") {
    // Determine education level and assign appropriate test
    const educationLevel = user.educationLevel || "";
    const lowerEducationLevels = ["high_school", "vocational", "some_college"];

    // Default test assignment logic
    const assignedTest = lowerEducationLevels.some((level) =>
      educationLevel.toLowerCase().includes(level)
    )
      ? "D-70"
      : "D-2000";

    updateData.testAssignment = {
      assignedTest,
      additionalTests: [],
      isManualAssignment: false,
      assignmentDate: new Date(),
      assignedBy: authorizedById,
    };

    // Add exam date if provided
    if (examDate) {
      updateData.testAssignment.examDate = new Date(examDate);
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: updateData,
    },
    { new: true }
  ).select("-password");

  // Send status change email with test assignment info if approved
  try {
    logger.info(
      `Sending status change email to user ${userId} with status ${status}`
    );
    await emailUtil.sendStatusChangeEmail(updatedUser, status);
  } catch (emailError) {
    logger.error(`Failed to send status change email to user ${userId}`, {
      error: emailError.message,
    });
    // Continue execution - don't fail the update due to email issues
  }

  return updatedUser;
};

/**
 * Manually assign tests to approved candidates
 */
exports.manualTestAssignment = async (
  userId,
  assignmentData,
  psychologistId
) => {
  const { assignedTest, additionalTests, examDate } = assignmentData;

  // Validate input
  if (!["D-70", "D-2000"].includes(assignedTest)) {
    throw new ErrorResponse("Invalid test assignment", 400);
  }

  // Validate additionalTests if provided
  if (additionalTests && !Array.isArray(additionalTests)) {
    throw new ErrorResponse("Additional tests must be an array", 400);
  }

  if (additionalTests) {
    for (const test of additionalTests) {
      if (test !== "logique_des_propositions") {
        throw new ErrorResponse(`Invalid additional test: ${test}`, 400);
      }
    }
  }

  // Get the user
  const user = await User.findById(userId);
  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }

  // Verify that the user is approved for testing
  if (user.testAuthorizationStatus !== "approved") {
    throw new ErrorResponse(
      "Cannot assign tests to users who haven't been approved",
      400
    );
  }

  // Create the test assignment
  const testAssignment = {
    assignedTest,
    additionalTests: additionalTests || [],
    isManualAssignment: true,
    assignmentDate: new Date(),
    assignedBy: psychologistId,
  };

  // Add exam date if provided
  if (examDate) {
    testAssignment.examDate = new Date(examDate);
  }

  // Update the user
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: { testAssignment },
    },
    { new: true }
  ).select("-password");

  // Send email notification about test assignment
  try {
    logger.info(`Sending test assignment email to user ${userId}`);
    await emailUtil.sendTestAssignmentEmail(updatedUser);
  } catch (emailError) {
    logger.error(`Failed to send test assignment email to user ${userId}`, {
      error: emailError.message,
    });
    // Continue execution - don't fail the update due to email issues
  }

  return updatedUser;
};

/**
 * Bulk update test authorization statuses with optional test assignment
 */
exports.bulkUpdateTestAuthorizationStatus = async (
  userIds,
  status,
  authorizedById,
  examDate = null
) => {
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

  // For approved candidates, we need to find them first to assign tests based on education level
  if (status === "approved") {
    // Get all users to be approved
    const usersToApprove = await User.find({
      _id: { $in: userIds },
      testAuthorizationStatus: { $ne: "not_submitted" },
    });

    // Process each user individually to assign appropriate tests
    const updatePromises = usersToApprove.map(async (user) => {
      // Determine education level and assign appropriate test
      const educationLevel = user.educationLevel || "";
      const lowerEducationLevels = [
        "high_school",
        "vocational",
        "some_college",
      ];

      const assignedTest = lowerEducationLevels.some((level) =>
        educationLevel.toLowerCase().includes(level)
      )
        ? "D-70"
        : "D-2000";

      const testAssignment = {
        assignedTest,
        additionalTests: [],
        isManualAssignment: false,
        assignmentDate: new Date(),
        assignedBy: authorizedById,
      };

      // Add exam date if provided
      if (examDate) {
        testAssignment.examDate = new Date(examDate);
      }

      // Update each user with appropriate test assignment
      return User.findByIdAndUpdate(user._id, {
        $set: {
          testAuthorizationStatus: status,
          testAuthorizationDate: new Date(),
          authorizedBy: authorizedById,
          testAssignment,
        },
      });
    });

    // Execute all updates
    await Promise.all(updatePromises);
  } else {
    // For rejected candidates, a simple bulk update is sufficient
    await User.updateMany(
      {
        _id: { $in: userIds },
        testAuthorizationStatus: { $ne: "not_submitted" },
      },
      {
        testAuthorizationStatus: status,
        testAuthorizationDate: new Date(),
        authorizedBy: authorizedById,
      }
    );
  }

  // Find the updated users to send emails
  const updatedUsers = await User.find({
    _id: { $in: userIds },
    testAuthorizationStatus: status,
  });

  // Send emails to all updated users
  logger.info(
    `Sending status change emails to ${updatedUsers.length} users with status ${status}`
  );

  const emailPromises = updatedUsers.map((user) =>
    emailUtil.sendStatusChangeEmail(user, status).catch((error) => {
      logger.error(`Failed to send status change email to user ${user._id}`, {
        error: error.message,
      });
      return false; // Prevent Promise.allSettled from failing
    })
  );

  // Wait for all emails to be sent
  await Promise.allSettled(emailPromises);

  return {
    modifiedCount: updatedUsers.length,
  };
};
