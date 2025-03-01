const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/auth");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.patch("/reset-password/:token", authController.resetPassword);
router.get("/verify-email/:token", authController.verifyEmail);

// Protected routes
router.get("/me", authMiddleware.protect, authController.getCurrentUser);

// Test route
router.get("/test", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Auth routes working!",
  });
});

module.exports = router;
