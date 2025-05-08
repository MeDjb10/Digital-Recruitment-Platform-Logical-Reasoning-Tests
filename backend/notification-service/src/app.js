const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// Load env vars - Make sure this is at the top before other imports
const dotenv = require("dotenv");
dotenv.config();

// Now import other modules that use env vars
const { rateLimit } = require("express-rate-limit");
const notificationRoutes = require("./routes/notification.routes");
const logger = require("./utils/logger.util");

// Security and middleware
const app = express();
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:4200", process.env.FRONTEND_URL],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});
app.use("/api", limiter);

// Body parser
app.use(express.json());

// Routes
app.use("/api/notifications", notificationRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    service: "notification-service",
    time: new Date().toISOString(),
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`);

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || "Server Error",
  });
});

// Initialize message broker connection
require("./utils/message-broker").initBrokerConnection();

module.exports = app;
