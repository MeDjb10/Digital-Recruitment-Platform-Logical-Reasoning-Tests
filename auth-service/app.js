const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
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
