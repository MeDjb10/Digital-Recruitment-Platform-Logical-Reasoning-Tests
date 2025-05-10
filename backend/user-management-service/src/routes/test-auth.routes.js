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
  "/request",
  verifyToken(["candidate"]),
  uploadMiddleware,
  validateTestAuthRequest,
  testAuthController.submitTestAuthorizationRequest
);

router.get(
  "/requests",
  verifyToken(["admin", "moderator", "psychologist"]),
  testAuthController.getTestAuthorizationRequests
);

router.put(
  "/:userId/status",
  verifyToken(["admin", "moderator", "psychologist"]),
  validateUserId,
  validateTestAuthStatusUpdate,
  testAuthController.updateTestAuthorizationStatus
);

router.put(
  "/:userId/assign",
  verifyToken(["admin", "psychologist"]),
  validateUserId,
  validateManualTestAssignment,
  testAuthController.manualTestAssignment
);

router.put(
  "/bulk-update",
  verifyToken(["admin", "moderator", "psychologist"]),
  validateBulkTestAuthStatusUpdate,
  testAuthController.bulkUpdateTestAuthorizationStatus
);

module.exports = router;