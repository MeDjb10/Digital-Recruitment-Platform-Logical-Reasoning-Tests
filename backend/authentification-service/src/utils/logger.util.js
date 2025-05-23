const winston = require("winston");
const path = require("path");

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "development" ? "debug" : "info";
};

// Add colors to Winston
winston.addColors(colors);

// Define Winston format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console(),

  // Error log file transport
  new winston.transports.File({
    filename: path.join("logs", "error.log"),
    level: "error",
  }),

  // Combined log file transport
  new winston.transports.File({
    filename: path.join("logs", "combined.log"),
  }),
];

// Create logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// Ensure log directory exists
const fs = require("fs");
const dir = "./logs";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

module.exports = logger;
