const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const verifyServiceToken = require("../middleware/service-auth.middleware");

// Public routes
router.post("/signup", authController.signup);
router.post("/verify-otp", authController.verifyUserOTP);
router.post("/resend-verification", authController.resendVerificationOTP);
router.post("/request-password-reset", authController.requestPasswordReset);
router.post("/verify-reset-otp", authController.verifyResetOTP);
router.post("/reset-password", authController.resetPasswordWithOTP);
router.post("/verify-email/:token", authController.verifyEmail);

// Service-to-service auth endpoints
router.post('/validate-credentials', verifyServiceToken, authController.validateCredentials);
router.post('/increment-token-version/:userId', verifyServiceToken, authController.incrementTokenVersion);

module.exports = router;