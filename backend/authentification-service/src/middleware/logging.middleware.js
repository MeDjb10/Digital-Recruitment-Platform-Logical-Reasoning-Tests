/**
 * Request Logging Middleware
 * Logs HTTP requests using Morgan
 */

const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger.util");

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a write stream for access logs
const accessLogStream = fs.createWriteStream(path.join(logsDir, "access.log"), {
  flags: "a",
});

// Custom format for request logging
const requestFormat =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

// Morgan middleware for file logging
const fileLogger = morgan(requestFormat, {
  stream: accessLogStream,
  skip: (req, res) => {
    // Skip health check logs in production
    return process.env.NODE_ENV === "production" && req.url.includes("/health");
  },
});

// Morgan middleware for console logging (development only)
const consoleLogger = morgan("combined", {
  skip: (req, res) => {
    // Only log in development, and skip health checks
    return (
      process.env.NODE_ENV !== "development" || req.url.includes("/health")
    );
  },
});

// Custom logger for structured logging
const structuredLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info("HTTP Request", {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      contentLength: res.get("Content-Length") || 0,
    });
  });

  next();
};

module.exports = {
  fileLogger,
  consoleLogger,
  structuredLogger,
};
