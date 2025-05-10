const express = require("express");
const router = express.Router();
const testAuthController = require("../controllers/test-auth.controller");
const verifyToken = require("../middleware/auth.middleware");
const { uploadMiddleware } = require("../utils/file-upload.util");
const {
  validateUserId,
  validateTestAuthRequest,
  validateTestAuthStatusUpdate,
  validateBulkTestAuthStatusUpdate,
  validateManualTestAssignment,
} = require("../utils/validation.util");

// Test authorization routes
router.post(
  "/test-auth/request",
  verifyToken(["candidate"]),
  uploadMiddleware,
  validateTestAuthRequest,
  testAuthController.submitTestAuthorizationRequest
);

router.get(
  "/test-auth/requests",
  verifyToken(["admin", "moderator", "psychologist"]),
  testAuthController.getTestAuthorizationRequests
);

router.put(
  "/test-auth/:userId/status",
  verifyToken(["admin", "moderator", "psychologist"]),
  validateUserId,
  validateTestAuthStatusUpdate,
  testAuthController.updateTestAuthorizationStatus
);

router.put(
  "/test-auth/:userId/assign",
  verifyToken(["admin", "psychologist"]),
  validateUserId,
  validateManualTestAssignment,
  testAuthController.manualTestAssignment
);

router.put(
  "/test-auth/bulk-update",
  verifyToken(["admin", "moderator", "psychologist"]),
  validateBulkTestAuthStatusUpdate,
  testAuthController.bulkUpdateTestAuthorizationStatus
);

module.exports = router;