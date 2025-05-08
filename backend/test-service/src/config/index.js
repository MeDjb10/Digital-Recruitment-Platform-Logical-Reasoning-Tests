require("dotenv").config();

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3002,
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/test-service",
  jwtSecret: process.env.JWT_SECRET || "supersecretkey123",
  authServiceUrl: process.env.AUTH_SERVICE_URL || "http://localhost:3000",
  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:3001",
  logLevel: process.env.LOG_LEVEL || "info",
};
