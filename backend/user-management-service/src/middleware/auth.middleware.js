const jwt = require("jsonwebtoken");
const { ErrorResponse } = require("../utils/error-handler.util");

function verifyToken(allowedRoles = []) {
  return (req, res, next) => {
    // DEVELOPMENT ONLY: Check for bypass flag
    // if (
    //   process.env.NODE_ENV === "development" &&
    //   process.env.BYPASS_AUTH === "true"
    // ) {
    //   console.log("⚠️ WARNING: Authentication bypassed for development");
    //   // Mock authenticated user as admin for testing
    //   req.userId = "mockuser123";
    //   req.userRole = "admin";
    //   req.userEmail = "admin@test.com";
    //   next();
    //   return;
    // }

    // Normal authentication flow
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader) {
        return res.status(403).json({
          success: false,
          message: "Access denied. No token provided",
        });
      }

      // Extract token from Bearer <token>
      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(403).json({
          success: false,
          message: "Invalid token format",
        });
      }

      // Verify token with the secret from environment variables
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Set user info for use in controllers
      req.userId = decoded.id || decoded.userId;
      req.userRole = decoded.role;
      req.userEmail = decoded.email;

      // Role-based access control
      if (allowedRoles.length > 0 && !allowedRoles.includes(req.userRole)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Insufficient permissions",
        });
      }

      next();
    } catch (error) {
      console.error("Auth middleware error:", error);

      // Handle specific JWT errors with appropriate messages
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token has expired",
        });
      } else if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }

      // Generic error
      return res.status(500).json({
        success: false,
        message: "Authentication error",
        error: error.message,
      });
    }
  };
}

module.exports = verifyToken;
