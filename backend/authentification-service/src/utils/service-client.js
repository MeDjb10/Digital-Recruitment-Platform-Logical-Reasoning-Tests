const axios = require("axios");
const { createBreaker } = require("./circuit-breaker");
const logger = require("./logger.util");

// Basic client without default headers
const userServiceClient = axios.create({
  baseURL: process.env.USER_SERVICE_URL || "http://localhost:3001/api/users",
  timeout: 5000,
});

// Add request interceptor to inject headers on each request
userServiceClient.interceptors.request.use((config) => {
  logger.debug("Adding authorization headers to request");
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${process.env.SERVICE_TOKEN}`,
    "Content-Type": "application/json",
  };
  return config;
});

// Log service configuration
logger.info(
  "User Service URL:",
  process.env.USER_SERVICE_URL || "http://localhost:3001/api/users"
);
logger.info(
  "Service Token configured:",
  process.env.SERVICE_TOKEN
    ? "Yes (first 5 chars: " +
        process.env.SERVICE_TOKEN.substring(0, 5) +
        "...)"
    : "No"
);

// Create specialized error class for authentication failures (not a service failure)
class AuthenticationError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AuthenticationError";
    this.statusCode = statusCode;
  }
}

// Create circuit breakers for different API calls - but with proper error handling
const validateCredentialsBreaker = createBreaker(
  async (email, password) => {
    try {
      const response = await userServiceClient.post("/validate-credentials", {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      // Important: Client errors (4xx) should not trip the circuit breaker
      if (
        error.response &&
        error.response.status >= 400 &&
        error.response.status < 500
      ) {
        // Client errors are expected and should be handled normally
        logger.debug(
          `Authentication result for ${email}: ${error.response.status} ${
            error.response.data?.message || "Authentication failed"
          }`
        );
        throw new AuthenticationError(
          error.response.data?.message || "Invalid credentials",
          error.response.status
        );
      }
      // Server errors (5xx) or network issues should trip the circuit breaker
      logger.error(
        `Service error during credential validation: ${error.message}`
      );
      throw error; // Let the circuit breaker handle this
    }
  },
  "validateCredentials",
  {
    timeout: 3000,
    errorThresholdPercentage: 50, // Open after 50% of requests fail
    resetTimeout: 10000, // Try again after 10 seconds
  }
);

const getUserByIdBreaker = createBreaker(async (userId) => {
  try {
    // Fix the double slash issue by using a properly formatted path
    const path = `service/${userId}`; // Remove the leading slash

    console.log(`Making request to: ${path}`);
    
    const response = await userServiceClient.get(path);
    return response.data;
  } catch (error) {
    // Handle 404s specially (user not found is a normal case)
    if (error.response && error.response.status === 404) {
      return null;
    }
    // Client errors shouldn't trip the circuit breaker
    if (
      error.response &&
      error.response.status >= 400 &&
      error.response.status < 500
    ) {
      throw new Error(
        error.response.data?.message || `Error fetching user: ${error.message}`
      );
    }
    throw error;
  }
}, "getUserById");

const getUserByEmailBreaker = createBreaker(async (email) => {
  try {
    const response = await userServiceClient.get(
      `/by-email/${encodeURIComponent(email)}`
    );
    return response.data;
  } catch (error) {
    // Handle 404s specially (user not found is a normal case)
    if (error.response && error.response.status === 404) {
      return null;
    }
    // Client errors shouldn't trip the circuit breaker
    if (
      error.response &&
      error.response.status >= 400 &&
      error.response.status < 500
    ) {
      throw new Error(
        error.response.data?.message || `Error fetching user: ${error.message}`
      );
    }
    throw error;
  }
}, "getUserByEmail");

const incrementTokenVersionBreaker = createBreaker(async (userId) => {
  try {
    const response = await userServiceClient.post(
      `/increment-token-version/${userId}`
    );
    return response.data;
  } catch (error) {
    // Client errors shouldn't trip the circuit breaker
    if (
      error.response &&
      error.response.status >= 400 &&
      error.response.status < 500
    ) {
      throw new Error(
        error.response.data?.message ||
          `Error incrementing token version: ${error.message}`
      );
    }
    throw error;
  }
}, "incrementTokenVersion");

// Service client with circuit breaker - focused on authentication only
const userService = {
  async validateCredentials(email, password) {
    try {
      logger.debug(`Validating credentials for ${email}`);
      return await validateCredentialsBreaker.fire(email, password);
    } catch (error) {
      // Differentiate between authentication errors and service errors
      if (error instanceof AuthenticationError) {
        // This is just an authentication failure, not a service failure
        logger.debug(`Authentication failed for ${email}: ${error.message}`);
        return { success: false, message: error.message };
      }

      logger.error(`Error validating credentials: ${error.message}`);
      throw new Error("Authentication service unavailable");
    }
  },

  async getUserById(userId) {
    try {
      logger.debug(`Fetching user by ID: ${userId}`);
      const result = await getUserByIdBreaker.fire(userId);
      if (!result) {
        logger.debug(`User not found: ${userId}`);
        return { success: false, message: "User not found" };
      }
      return { success: true, user: result };
    } catch (error) {
      logger.error(`Error fetching user ${userId}: ${error.message}`);
      throw new Error("User service unavailable");
    }
  },

  async getUserByEmail(email) {
    try {
      logger.debug(`Fetching user by email: ${email}`);
      const result = await getUserByEmailBreaker.fire(email);
      if (!result) {
        logger.debug(`User not found: ${email}`);
        return { success: false, message: "User not found" };
      }
      return { success: true, user: result };
    } catch (error) {
      logger.error(`Error fetching user by email ${email}: ${error.message}`);
      throw new Error("User service unavailable");
    }
  },

  async incrementTokenVersion(userId) {
    try {
      logger.debug(`Incrementing token version for user: ${userId}`);
      return await incrementTokenVersionBreaker.fire(userId);
    } catch (error) {
      logger.error(
        `Error incrementing token version for user ${userId}: ${error.message}`
      );
      return { success: false, message: "Failed to invalidate user tokens" };
    }
  },
};

module.exports = userService;
