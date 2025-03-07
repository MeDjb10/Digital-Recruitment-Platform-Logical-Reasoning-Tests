const jwt = require("jsonwebtoken");

/**
 * Middleware to verify JWT and optionally check for required roles.
 * @param {Array} [allowedRoles] - Optional array of roles that are allowed.
 * @returns {Function} Express middleware function
 */
function verifyToken(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader) {
        return res.status(403).json({
          success: false,
          message: "Access denied. No token provided",
        });
      }

      // Extract the token - remove "Bearer " prefix if present
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : authHeader;

      // For security, avoid logging tokens in production
      if (process.env.NODE_ENV !== "production") {
        console.log("Received token:", token.substring(0, 20) + "...");
      }

      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          console.error("Token verification error:", err.message);

          if (err.name === "TokenExpiredError") {
            return res.status(401).json({
              success: false,
              message: "Token expired. Please login again",
            });
          }

          return res.status(401).json({
            success: false,
            message: "Failed to authenticate token",
            error: err.message,
          });
        }

        // For security, avoid logging decoded tokens in production
        if (process.env.NODE_ENV !== "production") {
          console.log("Decoded token:", decoded);
        }

        req.userId = decoded.id;
        req.userRole = decoded.role;
        req.userEmail = decoded.email; // Often useful to have

        // If allowedRoles is provided and not empty, check if user's role is allowed
        if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
          return res.status(403).json({
            success: false,
            message: `Access denied. Required role: ${allowedRoles.join(
              " or "
            )}`,
          });
        }

        next();
      });
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
