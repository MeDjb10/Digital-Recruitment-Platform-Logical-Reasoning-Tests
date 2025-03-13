const jwt = require("jsonwebtoken");

function verifyToken(allowedRoles = []) {
  return (req, res, next) => {
    // DEVELOPMENT ONLY: Check for bypass flag
    if (
      process.env.NODE_ENV === "development" &&
      process.env.BYPASS_AUTH === "true"
    ) {
      console.log("⚠️ WARNING: Authentication bypassed for development");
      // Mock authenticated user as admin for testing
      req.userId = "mockuser123";
      req.userRole = "admin";
      req.userEmail = "admin@test.com";
      next();
      return;
    }

    // Normal authentication flow
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader) {
        return res.status(403).json({
          success: false,
          message: "Access denied. No token provided",
        });
      }

      // Rest of your existing code...
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Authentication error",
        error: error.message,
      });
    }
  };
}

module.exports = verifyToken;
