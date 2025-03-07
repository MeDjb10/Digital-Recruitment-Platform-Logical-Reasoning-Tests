const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const swaggerDocs = require("./config/swagger.config");
const userRoutes = require("./routes/user.routes");
const { errorHandler } = require("./utils/error-handler.util");
const { apiLimiter } = require("./middleware/rate-limit.middleware");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Rate limiting
app.use("/api/", apiLimiter);

// Body parser
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// MongoDB Connection - only connect if not in test environment
// or if the connection hasn't been established already
if (process.env.NODE_ENV !== "test" && mongoose.connection.readyState === 0) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB (User Management Service)"))
    .catch((err) => console.error("MongoDB connection error:", err));
}

// Main Routes
app.use("/api/users", userRoutes);

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "User Management Service is running",
    timestamp: new Date(),
  });
});

// Handle 404 errors
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.originalUrl} on this server`,
  });
});

// Global error handler
app.use(errorHandler);

// Only start the server if not in test environment
if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`User Management Service running on port ${PORT}`);
  });
}

// For testing purposes
module.exports = app;
