const mongoose = require("mongoose");
const { AnalyticsSnapshot } = require("../models");
const logger = require("./logger");
const config = require("../config");

// Function to connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoURI);
    logger.info("MongoDB connected for analytics scheduler");
    return true;
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);
    return false;
  }
};

// Function to generate analytics snapshots
const generateSnapshots = async () => {
  try {
    logger.info("Starting scheduled analytics snapshot generation");

    const connected = await connectDB();
    if (!connected) {
      logger.error(
        "Failed to connect to database. Skipping analytics generation"
      );
      process.exit(1);
    }

    await AnalyticsSnapshot.generateDailySnapshot();
    logger.info("Analytics snapshots generated successfully");

    // Disconnect from database
    await mongoose.disconnect();
    logger.info("Database disconnected");

    process.exit(0);
  } catch (error) {
    logger.error(`Error generating analytics snapshots: ${error.message}`);

    // Make sure to disconnect and exit even if error occurs
    try {
      await mongoose.disconnect();
    } catch (err) {
      // Ignore disconnect errors
    }

    process.exit(1);
  }
};

// If this script is run directly, generate snapshots
if (require.main === module) {
  generateSnapshots();
}

module.exports = generateSnapshots;
