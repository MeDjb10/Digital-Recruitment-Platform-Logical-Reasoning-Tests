const app = require("./app");
const connectDB = require("./config/database");
const logger = require("./config/logger");

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! Shutting down...");
  logger.error(`${err.name}: ${err.message}`);
  process.exit(1);
});

// Connect to database
connectDB();

// Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  logger.info(`Auth service running on port ${port}`);
});

// Handle unhandled rejections
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! Shutting down...");
  logger.error(`${err.name}: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});
