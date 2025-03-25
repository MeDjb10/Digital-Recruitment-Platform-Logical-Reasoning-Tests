const { ErrorResponse } = require("./error-handler.util");
const mongoose = require("mongoose");

// Validate user filters for getUsers route
exports.validateUserFilters = (req, res, next) => {
  const { role, status } = req.query;

  // Validate role if provided
  if (
    role &&
    !["candidate", "admin", "moderator", "psychologist"].includes(role)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid role specified",
    });
  }

  // Validate status if provided
  if (status && !["active", "inactive", "suspended"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status specified",
    });
  }

  next();
};

// Validate userId parameter
exports.validateUserId = (req, res, next) => {
  const userId = req.params.userId;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID format",
    });
  }

  next();
};

// Validate user update data
exports.validateUserUpdate = (req, res, next) => {
  const {
    firstName,
    lastName,
    dateOfBirth,
    gender,
    currentPosition,
    desiredPosition,
    educationLevel,
    status,
  } = req.body;
  const errors = [];

  // Check if firstName is valid if provided
  if (
    firstName !== undefined &&
    (typeof firstName !== "string" || firstName.trim().length < 2)
  ) {
    errors.push("First name must be at least 2 characters");
  }

  // Check if lastName is valid if provided
  if (
    lastName !== undefined &&
    (typeof lastName !== "string" || lastName.trim().length < 2)
  ) {
    errors.push("Last name must be at least 2 characters");
  }

  // Check if dateOfBirth is a valid date if provided
  if (dateOfBirth !== undefined) {
    const isValidDate = !isNaN(Date.parse(dateOfBirth));
    if (!isValidDate) {
      errors.push("Invalid date of birth format");
    }
  }

  // Check if gender is valid if provided
  if (gender !== undefined && !["Male", "Female", "Other"].includes(gender)) {
    errors.push("Gender must be one of: Male, Female, Other");
  }

  // Check if status is valid if provided (admin only)
  if (status !== undefined) {
    if (req.userRole !== "admin") {
      errors.push("Only admins can update status");
    } else if (!["active", "inactive", "suspended"].includes(status)) {
      errors.push("Status must be one of: active, inactive, suspended");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors,
    });
  }

  next();
};

// Validate role assignment
exports.validateRoleAssignment = (req, res, next) => {
  const { userId, role } = req.body;
  const errors = [];

  // Check if userId is valid
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    errors.push("Valid user ID is required");
  }

  // Check if role is valid
  if (
    !role ||
    !["candidate", "admin", "moderator", "psychologist"].includes(role)
  ) {
    errors.push(
      "Role must be one of: candidate, admin, moderator, psychologist"
    );
  }

  // Check permissions based on requester's role
  if (req.userRole === "moderator" && role !== "psychologist") {
    errors.push("Moderators can only assign the psychologist role");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors,
    });
  }

  next();
};

// Validate user status update
exports.validateUserStatus = (req, res, next) => {
  const { status } = req.body;

  if (!status || !["active", "inactive", "suspended"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be one of: active, inactive, suspended",
    });
  }

  next();
};

exports.validateTestAuthRequest = (req, res, next) => {
  const { jobPosition, company } = req.body;

  if (!jobPosition || !company) {
    return res.status(400).json({
      success: false,
      message: "Job position and company are required fields",
    });
  }

  next();
};

// Validate test authorization status update
exports.validateTestAuthStatusUpdate = (req, res, next) => {
  const { status } = req.body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be either 'approved' or 'rejected'",
    });
  }

  next();
};


// Validate bulk test authorization status update
exports.validateBulkTestAuthStatusUpdate = (req, res, next) => {
  const { userIds, status } = req.body;
  const errors = [];

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    errors.push("User IDs array is required and cannot be empty");
  } else {
    // Check if all user IDs are valid
    for (const userId of userIds) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        errors.push(`Invalid user ID format: ${userId}`);
        break; // Stop after first invalid ID to avoid flooding errors
      }
    }
  }

  if (!status || !["approved", "rejected"].includes(status)) {
    errors.push("Status must be either 'approved' or 'rejected'");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors,
    });
  }

  next();
};