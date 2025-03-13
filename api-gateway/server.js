const express = require("express");
const proxy = require("express-http-proxy");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  const start = Date.now();
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url} - Request received`
  );

  // Log response completion or error
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - Response: ${
        res.statusCode
      } (${duration}ms)`
    );
  });

  res.on("error", (error) => {
    const duration = Date.now() - start;
    console.error(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - Error: ${
        error.message
      } (${duration}ms)`
    );
  });

  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "API Gateway is running" });
});

// Home page
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "API Gateway is running",
    endpoints: {
      health: "/health",
      auth: "/api/auth/*",
      users: "/api/users/*",
    },
  });
});

// Add proxy middleware for Authentication Service
app.use(
  "/api/auth",
  proxy("http://localhost:3000", {
    timeout: 5000,
    proxyReqPathResolver: (req) => {
      console.log(`Proxying to auth service: ${req.originalUrl}`);
      return req.originalUrl;
    },
    proxyErrorHandler: (err, res, next) => {
      console.error("Auth proxy error:", err.message);
      if (err.code === "ECONNREFUSED") {
        return res.status(503).json({
          status: "error",
          message: "Authentication service is unavailable",
        });
      }
      if (err.code === "ETIMEDOUT") {
        return res.status(504).json({
          status: "error",
          message: "Authentication service timed out",
        });
      }
      res.status(500).json({
        status: "error",
        message: "Error connecting to authentication service",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    },
  })
);

// Add proxy middleware for User Service
app.use(
  "/api/users",
  proxy("http://localhost:3001", {
    timeout: 5000,
    proxyReqPathResolver: (req) => {
      console.log(`Proxying to user service: ${req.originalUrl}`);
      return req.originalUrl;
    },
    proxyErrorHandler: (err, res, next) => {
      console.error("User proxy error:", err.message);
      if (err.code === "ECONNREFUSED") {
        return res.status(503).json({
          status: "error",
          message: "User management service is unavailable",
        });
      }
      if (err.code === "ETIMEDOUT") {
        return res.status(504).json({
          status: "error",
          message: "User management service timed out",
        });
      }
      res.status(500).json({
        status: "error",
        message: "Error connecting to user management service",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    },
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Gateway error:", err);
  res.status(500).json({
    status: "error",
    message: "Something went wrong in the API gateway",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`⚡️ API Gateway running on port ${PORT}`);
  console.log("Available routes:");
  console.log(`🔍 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth Service: http://localhost:${PORT}/api/auth/*`);
  console.log(`👤 User Service: http://localhost:${PORT}/api/users/*`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
});
