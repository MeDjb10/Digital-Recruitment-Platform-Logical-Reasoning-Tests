/**
 * Environment Configuration
 * Loads and validates environment variables
 */

require("dotenv").config();

const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || "supersecretkey123",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "refreshsecretkey456",
    expiry: process.env.JWT_EXPIRY || "1d",
    refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    expiryExtended: process.env.JWT_EXPIRY_EXTENDED || "15d",
    refreshExpiryExtended: process.env.REFRESH_TOKEN_EXPIRY_EXTENDED || "30d",
  },

  // Email configuration
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === "true",
    from: process.env.EMAIL_FROM || "recruitment@cofat.com",
  },

  // External services
  services: {
    userServiceUrl:
      process.env.USER_SERVICE_URL || "http://localhost:3001/api/users",
    serviceToken: process.env.SERVICE_TOKEN,
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
  },
};

// Validate required environment variables
const requiredEnvVars = ["JWT_SECRET", "SERVICE_TOKEN"];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.warn(`Warning: Required environment variable ${envVar} is not set`);
  }
});

module.exports = config;
