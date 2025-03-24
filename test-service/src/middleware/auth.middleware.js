const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const { AppError } = require("./errorHandler");
const config = require("../config");

// Verify JWT tokens
const verifyToken = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "Authentication token is missing",
        StatusCodes.UNAUTHORIZED
      );
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Add user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new AppError("Invalid token", StatusCodes.UNAUTHORIZED);
    }
    if (error.name === "TokenExpiredError") {
      throw new AppError("Token expired", StatusCodes.UNAUTHORIZED);
    }
    next(error);
  }
};

// Role-based access control middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED);
    }

    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      throw new AppError(
        "Not authorized to access this resource",
        StatusCodes.FORBIDDEN
      );
    }

    next();
  };
};

module.exports = {
  verifyToken,
  authorize,
};
