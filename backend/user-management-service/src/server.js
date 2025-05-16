const app = require("./app");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const logger = require("./utils/logger.util");
const { initBrokerConnection, getChannel } = require("./utils/message-broker");
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

// Start server function
async function startServer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    logger.info(
      `Connected to MongoDB at ${MONGODB_URI.split("@")[1] || MONGODB_URI}`
    );

    // Try to connect to RabbitMQ but don't block server startup
    try {
      await initBrokerConnection();
    } catch (error) {
      logger.warn(`RabbitMQ connection failed: ${error.message}`);
      logger.info(
        "Service will continue without RabbitMQ - message publishing will retry later"
      );
    }

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`User Management Service running on port ${PORT}`);

      if (process.env.NODE_ENV === "development") {
        logger.info(
          `API Documentation available at: http://localhost:${PORT}/api-docs`
        );
      }
    });
  } catch (err) {
    logger.error("Error starting server:", err);
    process.exit(1);
  }
}

// Start the server
startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Promise Rejection:", err);
  // Don't exit process, just log
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  // Close server & exit process
  process.exit(1);
});

// Log RabbitMQ connection status on startup

setTimeout(async () => {
  try {
    const channel = await getChannel();
    if (channel) {
      console.log("RabbitMQ connection is active");
    } else {
      console.log("RabbitMQ connection not established");
    }
  } catch (error) {
    console.error("Error checking RabbitMQ connection status:", error);
  }
}, 5000);
