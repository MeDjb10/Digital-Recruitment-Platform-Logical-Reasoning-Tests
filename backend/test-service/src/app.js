require("express-async-errors");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const bodyParser = require("body-parser");

const { connectDB } = require("./config/db");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const config = require("./config");

// Initialize Express app
const app = express();

// Apply middleware
app.use(helmet());
app.use(cors());
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/v1", routes);

// Healthcheck endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "test-service" });
});

// Error handling middleware
app.use(errorHandler);

// Connect to database and start server
const PORT = config.port || 3001;

const start = async () => {
  try {
    await connectDB(config.mongoUri);
    app.listen(PORT, () => {
      logger.info(`Test Microservice started on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

start();

const messageBrokerService = require('./services/message-broker');

// Initialize message broker consumers
(async () => {
  try {
    await messageBrokerService.initConsumers();
    console.log('Message broker consumers initialized for test service');
  } catch (error) {
    console.error('Failed to initialize message broker consumers:', error);
  }
})();

module.exports = app; // For testing purposes
