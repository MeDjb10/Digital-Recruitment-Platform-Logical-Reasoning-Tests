const { asyncHandler } = require("../utils/error-handler.util");
const userService = require("../services/user.service");

/**
 * @desc    Update user profile
 * @route   PUT /api/profile/:userId
 * @access  Private (Self or Admin)
 */
exports.updateProfile = asyncHandler(async (req, res) => {
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
 * @desc    Upload or update profile picture
 * @route   POST /api/profile/:userId/picture
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
 * @route   DELETE /api/profile/:userId/picture
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
