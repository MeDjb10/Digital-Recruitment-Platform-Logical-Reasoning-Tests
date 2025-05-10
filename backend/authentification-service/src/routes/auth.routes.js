const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const verifyToken = require("../middlewares/auth.middleware");

/**
 * Authentication Routes
 * Handles authentication flows including login, token refresh, logout, and token verification
 */

// User authentication
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", verifyToken, authController.logout);
router.get("/verify", verifyToken, authController.verifyToken);

// Health check endpoint
router.get("/test", (req, res) => {
  res.json({ message: "Auth service is responding properly" });
});

module.exports = router;
