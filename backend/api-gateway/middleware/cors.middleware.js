/**
 * Enhanced CORS middleware for API Gateway
 */
function corsMiddleware(req, res, next) {
  // Get origin from environment variable or use wildcard
  const allowedOrigin = process.env.CORS_ORIGIN || "*";

  // Set CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Add Cross-Origin-Resource-Policy header to allow resources to be shared
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
}

module.exports = corsMiddleware;
