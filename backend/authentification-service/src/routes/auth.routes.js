const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const verifyToken = require("../middlewares/auth.middleware");

// Authentication routes focused on token operations
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", verifyToken, authController.logout);
router.get("/verify", verifyToken, authController.verifyToken);

// Health check
router.get("/test", (req, res) => {
  res.json({ message: "Auth service is responding properly" });
});

module.exports = router;
