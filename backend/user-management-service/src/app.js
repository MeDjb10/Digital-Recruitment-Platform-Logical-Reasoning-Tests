const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const compression = require("compression");
const { errorHandler } = require("./utils/error-handler.util");
const logger = require("./utils/logger.util");

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const profileRoutes = require("./routes/profile.routes");
const roleRoutes = require("./routes/role.routes");
const testAuthRoutes = require("./routes/test-auth.routes");

// Load environment variables
dotenv.config();

const app = express();

// Apply security headers with image handling configuration
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// Compress responses
app.use(compression());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

const jsonParser = express.json();
const urlencodedParser = express.urlencoded({ extended: true });

// Use these selectively on routes that don't handle file uploads
app.use((req, res, next) => {
  // Skip for routes that handle multipart/form-data
  if (
    req.headers["content-type"] &&
    req.headers["content-type"].startsWith("multipart/form-data")
  ) {
    logger.debug("Skipping JSON/urlencoded parsing for multipart request");
    return next();
  }

  // Only apply these parsers to non-multipart requests
  jsonParser(req, res, (err) => {
    if (err) {
      logger.error("JSON parse error:", err);
      return res.status(400).json({ success: false, message: "Invalid JSON" });
    }
    urlencodedParser(req, res, next);
  });
});

// Request logging
if (process.env.NODE_ENV === "development") {
  app.use(
    morgan("dev", {
      stream: {
        write: (message) => logger.http(message.trim()),
      },
    })
  );
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info("Created uploads directory");
}

// Serve static files with proper MIME types and CORS headers
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    setHeaders: (res, path) => {
      // Set proper MIME types
      if (path.endsWith(".webp")) {
        res.setHeader("Content-Type", "image/webp");
      }

      // Set CORS headers for all static files
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader(
        "Access-Control-Allow-Origin",
        process.env.CORS_ORIGIN || "*"
      );
      res.setHeader("Access-Control-Allow-Methods", "GET");
      res.setHeader("Cache-Control", "max-age=86400"); // Cache for 1 day
    },
  })
);

// Special route for image assets that sets appropriate headers
app.get("/uploads/profile-pictures/:role/:filename", (req, res, next) => {
  const filePath = path.join(
    __dirname,
    "../uploads/profile-pictures",
    req.params.role,
    req.params.filename
  );

  // Set explicit cross-origin headers for images
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Cache-Control", "public, max-age=86400");

  // Send the file
  res.sendFile(filePath, (err) => {
    if (err) {
      logger.error(`Error serving image file: ${err.message}`);
      next(err);
    }
  });
});

// Swagger configuration
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "User Management API",
      version: "1.0.0",
      description: "API for user management and role-based access control",
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:3001/api",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/users", authRoutes);
app.use("/api/users", profileRoutes);
app.use("/api/users", roleRoutes);
app.use("/api/users", testAuthRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "User Management Service",
    status: "UP",
    timestamp: new Date(),
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
