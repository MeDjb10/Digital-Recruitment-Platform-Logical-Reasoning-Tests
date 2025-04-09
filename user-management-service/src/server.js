const app = require("./app");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const logger = require("./utils/logger.util");

// Load environment variables
dotenv.config();

// Environment variables
const PORT = process.env.PORT || 3001;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/user-management";

// Mongoose connection options
const mongooseOptions = {
  autoIndex: process.env.NODE_ENV !== "production", // Build indexes in dev but not in prod
};

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    logger.info(
      `Connected to MongoDB at ${MONGODB_URI.split("@")[1] || MONGODB_URI}`
    );

    // Start server
    app.listen(PORT, () => {
      logger.info(`User Management Service running on port ${PORT}`);

      if (process.env.NODE_ENV === "development") {
        logger.info(
          `API Documentation available at: http://localhost:${PORT}/api-docs`
        );
      }
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Promise Rejection:", err);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  // Close server & exit process
  process.exit(1);
});
