const jwt = require("jsonwebtoken");
const axios = require("axios");

const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:3001/api/users";
const SERVICE_TOKEN =
  process.env.SERVICE_TOKEN || "j4k5h6j45h6j45h6j45h6j45h6j4k5h6jk546";

// Debug to verify variables are set
console.log("User service URL:", USER_SERVICE_URL);
console.log(
  "Service token (first 5 chars):",
  SERVICE_TOKEN ? SERVICE_TOKEN.substring(0, 5) + "..." : "NOT SET"
);

/**
 * Generate access token with role from User Management Service
 */
exports.generateAccessToken = async (user) => {
  try {
    // Get the latest role from User Management service
    const response = await axios.get(`${USER_SERVICE_URL}/role/${user._id}`, {
      headers: {
        Authorization: `Bearer ${SERVICE_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log(
      "User Management response:",
      response.status,
      response.statusText
    );

    const role = response.data.role;
    console.log(
      `Retrieved role '${role}' for user ${user._id} from User Management Service`
    );

    // Generate token with role from User Management
    return jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: role,
        firstName: user.firstName,
        lastName: user.lastName,
        tokenVersion: user.tokenVersion || 0,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || "1h" }
    );
  } catch (error) {
    console.error("Failed to get role from User Management:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    } else if (error.request) {
      console.error("No response received");
    }
    console.error("Using default role 'candidate' for token generation");

    // Fallback to default role if User Management is unavailable
    return jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: "candidate", // Default fallback role
        firstName: user.firstName,
        lastName: user.lastName,
        tokenVersion: user.tokenVersion || 0,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || "1h" }
    );
  }
};

/**
 * Generate refresh token
 */
exports.generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      tokenVersion: user.tokenVersion || 0, // For token revocation
    },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
  );
};
