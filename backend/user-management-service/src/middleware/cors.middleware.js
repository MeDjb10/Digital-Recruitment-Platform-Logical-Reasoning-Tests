const logger = require("../utils/logger.util");

/**
 * CORS middleware with enhanced headers for static resources
 */
const corsMiddleware = (req, res, next) => {
  // Get allowed origin from env or use default
  const allowedOrigin = process.env.CORS_ORIGIN || "*";

  // Set standard CORS headers
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  // Add Cross-Origin-Resource-Policy header
  res.header("Cross-Origin-Resource-Policy", "cross-origin");

  // For image resources, add additional headers
  if (
    req.path.startsWith("/uploads/") &&
    (req.path.endsWith(".jpg") ||
      req.path.endsWith(".png") ||
      req.path.endsWith(".webp"))
  ) {
    logger.debug(
      `Setting enhanced CORS headers for image resource: ${req.path}`
    );

    // Add Cross-Origin-Embedder-Policy for images
    res.header("Cross-Origin-Embedder-Policy", "require-corp");

    // Allow browser to cache images
    res.header("Cache-Control", "public, max-age=86400"); // 1 day
  }

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
};

module.exports = corsMiddleware;
