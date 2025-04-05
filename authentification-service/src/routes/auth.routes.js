const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const verifyToken = require("../middlewares/auth.middleware");
const { sendEmail } = require("../utils/email.util");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
// Add new email verification routes
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerificationOTP);
router.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "You accessed a protected route",
    userId: req.userId,
    role: req.userRole,
  });
});
// router.post("/test-email", async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ message: "Email address is required" });
//     }

//     await sendEmail(
//       email,
//       "Test Email from RecruitFlow",
//       `<p>This is a test email to verify that the email system is working correctly.</p>
//        <p>If you received this, the email functionality is working!</p>`
//     );

//     res.status(200).json({ message: "Test email sent successfully" });
//   } catch (error) {
//     console.error("Error in test email route:", error);
//     res.status(500).json({ error: error.message });
//   }
// });
// Additional routes for OTP verification, password reset, etc.
router.post("/request-password-reset", authController.requestPasswordReset);
router.post("/verify-reset-otp", authController.verifyResetOTP);
router.post("/reset-password", authController.resetPassword);

// OTP login routes
router.post("/request-login-otp", authController.requestLoginOTP);
router.post("/verify-login-otp", authController.verifyLoginOTP);

router.get("/test", (req, res) => {
  res.json({ message: "Auth service is responding properly" });
});

module.exports = router;
