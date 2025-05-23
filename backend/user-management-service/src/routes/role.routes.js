const express = require("express");
const router = express.Router();
const roleController = require("../controllers/role.controller");
const verifyToken = require("../middleware/auth.middleware");
const verifyServiceToken = require("../middleware/service-auth.middleware");
const { validateRoleAssignment } = require("../utils/validation.util");

// Role routes
router.put(
  "/role/assign",
  verifyToken(["admin", "moderator"]),
  validateRoleAssignment,
  roleController.assignRole
);

// Service-to-service endpoints
// Changed from /:userId to /role/:userId to align with the URL pattern
router.get("/role/:userId", verifyToken(), roleController.getUserRole);

module.exports = router;