const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const verifyToken = require("../middleware/auth.middleware");
const verifyServiceToken = require("../middleware/service-auth.middleware");
const {
  validateUserFilters,
  validateUserId,
  validateUserStatus,
} = require("../utils/validation.util");

// Health check route
router.get("/health", (req, res) => {
  res.json({ message: "User service is responding properly" });
});

// User retrieval routes
router.get(
  "/",
  verifyToken(["admin", "moderator", "psychologist"]),
  validateUserFilters,
  userController.getUsers
);

router.get("/profile", verifyToken(), userController.getMyProfile);

router.get(
  "/:userId",
  verifyToken(["admin", "moderator", "psychologist"]),
  validateUserId,
  userController.getUserById
);

// Test assignment route
router.get(
  "/:userId/test-assignment",
  verifyToken(),
  validateUserId,
  userController.getUserTestAssignment
);

// User management routes
router.post("/create", verifyServiceToken, userController.createUser);

router.delete(
  "/:userId",
  verifyToken(["admin"]),
  validateUserId,
  userController.deleteUser
);

router.patch(
  "/:userId/status",
  verifyToken(["admin"]),
  validateUserId,
  validateUserStatus,
  userController.updateUserStatus
);

// Service-to-service endpoints
router.get(
  "/by-email/:email",
  verifyServiceToken,
  userController.getUserByEmail
);

// Add a separate route handler for service requests
router.get(
  "/service/:userId",
  verifyServiceToken,
  validateUserId,
  userController.getServiceUserById // Use the new controller method
);

router.get(
  "/role/:userId",
  verifyServiceToken, 
  validateUserId,
  userController.getUserRole // You'll need to add this controller method
);

module.exports = router;
