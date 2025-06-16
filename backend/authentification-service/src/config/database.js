/**
 * Database Configuration
 * Since the authentication service doesn't use a local database,
 * this file contains configuration for external service connections
 */

const config = {
  userService: {
    baseURL: process.env.USER_SERVICE_URL || "http://localhost:3001/api/users",
    timeout: parseInt(process.env.USER_SERVICE_TIMEOUT) || 5000,
    retryAttempts: parseInt(process.env.USER_SERVICE_RETRY_ATTEMPTS) || 3,
  },

  messageBroker: {
    url: process.env.RABBITMQ_URL || "amqp://localhost:5672",
    exchanges: {
      auth: "auth_events",
      user: "user_events",
      notification: "notification_events",
    },
  },
};

module.exports = config;
