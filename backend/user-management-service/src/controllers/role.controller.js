const { asyncHandler } = require("../utils/error-handler.util");
const userService = require("../services/user.service");

/**
 * @desc    Assign role to user
 * @route   PUT /api/roles/assign
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
 * @desc    Get user role by ID (service-to-service endpoint)
 * @route   GET /api/roles/:userId
 * @access  Private (Service-to-service only)
 */
exports.getUserRole = asyncHandler(async (req, res) => {
  const role = await userService.getUserRole(req.params.userId);

  res.status(200).json({
    success: true,
    role,
  });
});