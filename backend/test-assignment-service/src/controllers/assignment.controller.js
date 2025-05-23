// test-assignment-service/src/controllers/assignment.controller.js
const assignmentService = require("../services/assignment.service");

exports.manualTestAssignment = async (req, res) => {
  try {
    const { userId } = req.params;
    const { assignedTestId, additionalTestIds, examDate } = req.body;

    const result = await assignmentService.manualTestAssignment(
      userId,
      { assignedTestId, additionalTestIds, examDate },
      req.userId // From authentication middleware
    );

    res.status(200).json({
      success: true,
      message: "Test assignment completed",
      result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.bulkAssignment = async (req, res) => {
  try {
    const { userIds, status, examDate } = req.body;

    // Input validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs must be a non-empty array",
      });
    }

    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'approved' or 'rejected'",
      });
    }

    console.log(
      `Bulk assignment request received: ${userIds.length} users, status: ${status}`
    );

    const result = await assignmentService.bulkAssignment(
      userIds,
      status,
      req.userId,
      examDate
    );

    res.status(200).json({
      success: true,
      message: `Bulk operation completed. ${result.successCount} users processed.`,
      result,
    });
  } catch (error) {
    console.error("Error in bulk assignment controller:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
// Add this method to assignment.controller.js
exports.getAssignmentStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // This would typically fetch the user's test assignment from the User Management Service
    // For now, let's return a placeholder response
    res.status(200).json({
      success: true,
      message: "Assignment status retrieved",
      status: "Endpoint under development - will fetch assignment status from User Management Service"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};