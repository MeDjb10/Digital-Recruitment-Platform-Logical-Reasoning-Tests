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
 * @param {Object} user - User object
 * @param {Boolean} rememberMe - Whether to extend token expiration
 * @returns {String} JWT access token
 */
exports.generateAccessToken = async (user, rememberMe = false) => {
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

    // Set expiration based on rememberMe flag
    const expiration = rememberMe 
      ? process.env.JWT_EXPIRY_EXTENDED || "24h" 
      : process.env.JWT_EXPIRY || "1h";
    
    console.log(`Using ${expiration} expiration for access token (rememberMe: ${rememberMe})`);

    // Generate token with role from User Management and ensure id is included
    return jwt.sign(
      {
        id: user._id.toString(), // Convert ObjectId to string
        email: user.email,
        role: role,
        firstName: user.firstName,
        lastName: user.lastName,
        tokenVersion: user.tokenVersion || 0,
      },
      process.env.JWT_SECRET,
      { expiresIn: expiration }
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

    // Set expiration based on rememberMe flag (fallback case)
    const expiration = rememberMe 
      ? process.env.JWT_EXPIRY_EXTENDED || "24h" 
      : process.env.JWT_EXPIRY || "1h";

    // Fallback with id property still included
    return jwt.sign(
      {
        id: user._id.toString(), // Ensure this is included and as string
        email: user.email,
        role: "candidate",
        firstName: user.firstName,
        lastName: user.lastName,
        tokenVersion: user.tokenVersion || 0,
      },
      process.env.JWT_SECRET,
      { expiresIn: expiration }
    );
  }
};

/**
 * Generate refresh token
 * @param {Object} user - User object
 * @param {Boolean} rememberMe - Whether to extend token expiration
 * @returns {String} JWT refresh token
 */
exports.generateRefreshToken = (user, rememberMe = false) => {
  // Set expiration based on rememberMe flag
  const expiration = rememberMe 
    ? process.env.REFRESH_TOKEN_EXPIRY_EXTENDED || "30d" 
    : process.env.REFRESH_TOKEN_EXPIRY || "7d";
  
  console.log(`Using ${expiration} expiration for refresh token (rememberMe: ${rememberMe})`);

  return jwt.sign(
    {
      id: user._id.toString(),
      tokenVersion: user.tokenVersion || 0, // For token revocation
      rememberMe: rememberMe, // Store the flag in the token
    },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
    { expiresIn: expiration }
  );
};
