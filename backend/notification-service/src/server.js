const app = require("./app");
const logger = require("./utils/logger.util");

// Set port
const PORT = process.env.PORT || 3008;

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Notification service running on port ${PORT}`);
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
