const { asyncHandler } = require("../utils/error-handler.util");
const userService = require("../services/user.service");

/**
 * @desc    Submit test authorization request
 * @route   POST /api/test-auth/request
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
 * @route   GET /api/test-auth/requests
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
 * @route   PUT /api/test-auth/:userId/status
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

// /**
//  * @desc    Manually assign tests to an approved candidate
//  * @route   PUT /api/test-auth/:userId/assign
//  * @access  Private (Psychologist only)
//  */
// exports.manualTestAssignment = asyncHandler(async (req, res) => {
//   const { assignedTest, additionalTests, examDate } = req.body;

//   const updatedUser = await userService.manualTestAssignment(
//     req.params.userId,
//     { assignedTest, additionalTests, examDate },
//     req.userId
//   );

//   res.status(200).json({
//     success: true,
//     message: "Test assignment updated successfully",
//     user: updatedUser,
//   });
// });

// /**
//  * @desc    Bulk update test authorization statuses with optional exam date
//  * @route   PUT /api/test-auth/bulk-update
//  * @access  Private (Admin, Moderator, Psychologist)
//  */
// exports.bulkUpdateTestAuthorizationStatus = asyncHandler(async (req, res) => {
//   const { userIds, status, examDate } = req.body;

//   const result = await userService.bulkUpdateTestAuthorizationStatus(
//     userIds,
//     status,
//     req.userId,
//     examDate
//   );

//   res.status(200).json({
//     success: true,
//     message: `Bulk updated ${result.modifiedCount} test authorization requests to ${status}`,
//     updatedCount: result.modifiedCount,
//     totalRequested: userIds.length,
//   });
// });