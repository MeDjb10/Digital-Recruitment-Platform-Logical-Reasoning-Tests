const app = require("./app");
const logger = require("./utils/logger.util");

// Add after imports but before app initialization
function validateEnvironment() {
  const requiredVars = [
    "PORT",
    "USER_SERVICE_URL",
    "SERVICE_TOKEN",
    "RABBITMQ_URI",
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error(
      "❌ Missing required environment variables:",
      missing.join(", ")
    );
    console.error("Please check your .env file and environment configuration.");

    // Log actual values for debugging (obscure sensitive data)
    console.log("Environment variables:");
    console.log(`- PORT: ${process.env.PORT || "not set"}`);
    console.log(
      `- USER_SERVICE_URL: ${process.env.USER_SERVICE_URL || "not set"}`
    );
    console.log(
      `- SERVICE_TOKEN: ${
        process.env.SERVICE_TOKEN
          ? process.env.SERVICE_TOKEN.substring(0, 5) + "..."
          : "not set"
      }`
    );
    console.log(`- RABBITMQ_URI: ${process.env.RABBITMQ_URI || "not set"}`);

    // Exit in production, but allow continuing in development
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  } else {
    console.log("✅ All required environment variables are set");
  }
}

// Call this function before initializing your app
validateEnvironment();

// Server configuration
const PORT = process.env.PORT || 3006;

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Test Assignment Service running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error(`Unhandled Rejection: ${err.name}: ${err.message}`);
  console.error(err);

  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.name}: ${err.message}`);
  console.error(err);

  // Exit process
  process.exit(1);
});
