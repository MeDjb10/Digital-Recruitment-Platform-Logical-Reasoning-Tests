const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const verifyToken = require('../middleware/auth.middleware');

// Manual test assignment for approved candidates
router.put(
  '/:userId/assign',
  verifyToken(['admin', 'psychologist']), 
  assignmentController.manualTestAssignment
);

// Bulk update test authorization status with automatic test assignment
router.put(
  '/bulk-update',
  verifyToken(['admin', 'moderator', 'psychologist']),
  assignmentController.bulkAssignment
);

// Get assignment status for a user
router.get(
  '/:userId',
  verifyToken(),
  assignmentController.getAssignmentStatus
);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Test Assignment Service is healthy'
  });
});

module.exports = router;