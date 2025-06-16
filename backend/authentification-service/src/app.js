const express = require("express");
const dotenv = require("dotenv");

// Load environment variables first, before any other code
dotenv.config();

// Import middleware and configurations
const cors = require("cors");
const {
  securityHeaders,
  rateLimiter,
  speedLimiter,
} = require("./middleware/security.middleware");
const {
  fileLogger,
  consoleLogger,
  structuredLogger,
} = require("./middleware/logging.middleware");
const errorHandler = require("./middleware/error.middleware");
const { env, swagger } = require("./config");

// Import routes
const authRoutes = require("./routes/auth.routes");
const healthRoutes = require("./routes/health.routes");

const app = express();

// Environment info logging
console.log("Authentication service starting...");
console.log("Environment variables:");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- PORT:", process.env.PORT);
console.log(
  "- SERVICE_TOKEN available:",
  process.env.SERVICE_TOKEN ? "Yes" : "No"
);
if (process.env.SERVICE_TOKEN) {
  console.log(
    "- SERVICE_TOKEN first 5 chars:",
    process.env.SERVICE_TOKEN.substring(0, 5)
  );
}

// Security middleware (should be first)
app.use(securityHeaders);

// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:4200", "https://yourproductiondomain.com"], // Add your production domain when ready
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400, // Cache preflight requests for 1 day (in seconds)
  })
);

// Request logging middleware
app.use(fileLogger);
app.use(consoleLogger);
app.use(structuredLogger);

// Rate limiting and speed control
app.use(rateLimiter);
app.use(speedLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Swagger API Documentation (only in development)
if (env.nodeEnv === "development") {
  app.use(
    "/api-docs",
    swagger.swaggerUi.serve,
    swagger.swaggerUi.setup(swagger.specs, swagger.swaggerConfig)
  );
  console.log(
    `API Documentation will be available at: http://localhost:${env.port}/api-docs`
  );
}

// Initialize RabbitMQ connection
require("./utils/message-broker").initBrokerConnection();

// Health check route (before other routes)
app.use("/health", healthRoutes);

// API routes
app.use("/api/auth", authRoutes);

// 404 handler for unknown routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handling middleware (should be last)
app.use(errorHandler);

// Start the server
const PORT = env.port || 3000;
const server = app.listen(PORT, () => {
  console.log(`Auth microservice running on port ${PORT}`);
  console.log(`Environment: ${env.nodeEnv}`);
  if (env.nodeEnv === "development") {
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
  });
});

module.exports = app;
