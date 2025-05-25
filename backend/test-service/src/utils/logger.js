const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Ensure logs directory exists
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// Create logger with proper error handling
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: customFormat,
  defaultMeta: { service: "test-service" },
  transports: [
    // Console transport with error handling
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), customFormat),
      handleExceptions: true,
      handleRejections: true,
    }),

    // File transports with proper options
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      handleExceptions: true,
      handleRejections: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),

    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      handleExceptions: true,
      handleRejections: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],

  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle logger errors
logger.on("error", (error) => {
  console.error("Logger error:", error);
});

// Graceful shutdown handling
process.on("SIGINT", () => {
  logger.info("Received SIGINT, closing logger...");
  logger.end(() => {
    console.log("Logger closed gracefully");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, closing logger...");
  logger.end(() => {
    console.log("Logger closed gracefully");
    process.exit(0);
  });
});

module.exports = logger;
