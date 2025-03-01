const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
const logger = require("./config/logger");
// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middlewares
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan("dev")); // Request logging


// Add this with your routes
app.use("/api/auth", authRoutes);
// Simple test route

// Create a mock email service if needed for testing
if (
  process.env.NODE_ENV === "development" &&
  process.env.MOCK_EMAIL === "true"
) {
  logger.info("Using mock email service for development");

  // Override email service with mock functions that just log instead of sending
  const emailService = require("./services/emailService");

  emailService.sendWelcomeEmail = async (user) => {
    logger.info(`[MOCK EMAIL] Welcome email would be sent to ${user.email}`);
    return true;
  };

  emailService.sendVerificationEmail = async (user, token, baseUrl) => {
    logger.info(
      `[MOCK EMAIL] Verification email would be sent to ${user.email}`
    );
    logger.info(
      `[MOCK EMAIL] Verification URL: ${baseUrl}/api/auth/verify-email/${token}`
    );
    return true;
  };

  emailService.sendPasswordResetEmail = async (user, token, baseUrl) => {
    logger.info(
      `[MOCK EMAIL] Password reset email would be sent to ${user.email}`
    );
    logger.info(`[MOCK EMAIL] Reset URL: ${baseUrl}/reset-password/${token}`);
    return true;
  };
}

// With this:
if (
  process.env.NODE_ENV === "development" &&
  process.env.MOCK_EMAIL === "true"
) {
  logger.info("Using mock email service for development");
}

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Auth service is running!",
  });
});

// Default error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
});


module.exports = app;
