const express = require("express");
const proxy = require("express-http-proxy");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


function isMultipartFormData(req) {
  const contentType = req.headers["content-type"] || "";
  return contentType.startsWith("multipart/form-data");
}

// Enable CORS
app.use(cors());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || [
      "http://localhost:4200",
      "https://your-production-frontend.com",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
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
      tests: "/api/tests/*", // Add this line
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

app.use(
  ["/api/users/:userId/profile-picture", "/api/users/test-authorization"],
  (req, res, next) => {
    if (isMultipartFormData(req)) {
      // Log detailed information about the request
      console.log(`File upload request received: ${req.originalUrl}`);
      console.log("Headers:", req.headers);
      console.log("Method:", req.method);

      // Handle with special file upload proxy settings
      proxy("http://localhost:3001", {
        parseReqBody: false, // Critical: Don't try to parse multipart form data
        timeout: 120000, // 2 minute timeout for uploads
        proxyReqPathResolver: (req) => {
          const url = req.originalUrl;
          console.log(`Proxying file upload to user service: ${url}`);
          return url;
        },
        proxyErrorHandler: (err, res, next) => {
          console.error("File upload proxy error:", err.message);
          res.status(500).json({
            success: false,
            message: "Error during file upload",
            error:
              process.env.NODE_ENV === "development" ? err.message : undefined,
          });
        },
      })(req, res, next);
    } else {
      // Not a multipart request, proceed to next handler
      next();
    }
  }
);

// 3. Then modify the general users proxy to skip file upload requests
app.use(
  "/api/users",
  (req, res, next) => {
    // Skip this proxy if it's a multipart/form-data request (already handled above)
    if (isMultipartFormData(req)) {
      return next("route");
    }
    next();
  },
  proxy("http://localhost:3001", {
    timeout: 5000,
    proxyReqPathResolver: (req) => {
      console.log(`Proxying to user service: ${req.originalUrl}`);
      return req.originalUrl;
    },
    // Keep existing error handling
  })
);

// Static file serving
app.use(
  "/uploads",
  proxy("http://localhost:3001", {
    timeout: 10000,
    proxyReqPathResolver: (req) => {
      console.log(`Proxying static file: ${req.originalUrl}`);
      return req.originalUrl;
    },
  })
);

// Proxy for test-related routes
app.use(
  "/api/tests",
  proxy("http://localhost:3002", {
    timeout: 5000,
    proxyReqPathResolver: (req) => {
      const newPath = req.originalUrl.replace(/^\/api\/tests/, '/api/v1/tests');
      console.log(`Proxying to test service: ${req.originalUrl} -> ${newPath}`);
      return newPath;
    },
    proxyErrorHandler: (err, res, next) => {
      console.error("Test proxy error:", err.message);
      // Error handling code...
    },
  })
);

// Proxy for question-related routes
app.use(
  "/api/questions",
  proxy("http://localhost:3002", {
    timeout: 5000,
    proxyReqPathResolver: (req) => {
      const newPath = req.originalUrl.replace(/^\/api\/questions/, '/api/v1/questions');
      console.log(`Proxying to test service (questions): ${req.originalUrl} -> ${newPath}`);
      return newPath;
    },
    proxyErrorHandler: (err, res, next) => {
      console.error("Question proxy error:", err.message);
      // Error handling code...
    },
  })
);

// Proxy for attempt-related routes
app.use(
  "/api/attempts",
  proxy("http://localhost:3002", {
    timeout: 5000,
    proxyReqPathResolver: (req) => {
      const newPath = req.originalUrl.replace(/^\/api\/attempts/, '/api/v1/attempts');
      console.log(`Proxying to test service (attempts): ${req.originalUrl} -> ${newPath}`);
      return newPath;
    },
    proxyErrorHandler: (err, res, next) => {
      console.error("Attempt proxy error:", err.message);
      // Error handling code...
    },
  })
);

// Proxy for analytics-related routes 
app.use(
  "/api/analytics",
  proxy("http://localhost:3002", {
    timeout: 5000,
    proxyReqPathResolver: (req) => {
      const newPath = req.originalUrl.replace(/^\/api\/analytics/, '/api/v1/analytics');
      console.log(`Proxying to test service (analytics): ${req.originalUrl} -> ${newPath}`);
      return newPath;
    },
    proxyErrorHandler: (err, res, next) => {
      console.error("Analytics proxy error:", err.message);
      // Error handling code...
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
// Update this section (around line 112):
app.listen(PORT, () => {
  console.log(`⚡️ API Gateway running on port ${PORT}`);
  console.log("Available routes:");
  console.log(`🔍 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth Service: http://localhost:${PORT}/api/auth/*`);
  console.log(`👤 User Service: http://localhost:${PORT}/api/users/*`);
  console.log(`📝 Test Service: http://localhost:${PORT}/api/tests/*`);  // Add this line
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
});
