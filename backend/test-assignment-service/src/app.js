// test-assignment-service/src/app.js
const express = require("express");
const cors = require("cors");
const { connect } = require("./utils/message-broker");
const assignmentService = require("./services/assignment.service");
const assignmentRoutes = require("./routes/assignment.routes");

const app = express();
app.use(express.json());
app.use(cors());

// API routes
app.use("/api/assignments", assignmentRoutes);

// Initialize RabbitMQ connection and consumers
async function initializeServices() {
  try {
    await connect();
    await assignmentService.initConsumers();
  } catch (error) {
    console.error("Failed to initialize services", error);
    process.exit(1);
  }
}

initializeServices();

module.exports = app;
