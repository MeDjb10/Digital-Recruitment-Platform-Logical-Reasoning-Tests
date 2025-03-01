const jwt = require("jsonwebtoken");
const User = require("../models/user");
const logger = require("../config/logger");

// Update the protect middleware to handle access tokens specifically

/**
 * Middleware to protect routes by verifying JWT access token
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to access this resource.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          status: 'fail',
          message: 'Invalid token. Please log in again.'
        });
      }
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'fail',
          message: 'Your token has expired. Please use refresh token to get a new access token.'
        });
      }
      
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication failed. Please log in again.'
      });
    }

    // Check if user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to restrict access based on user role
 * @param  {...String} roles - Allowed roles
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};

/**
 * Middleware to check if email is verified
 */
exports.isEmailVerified = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({
      status: "fail",
      message: "Please verify your email to access this resource.",
    });
  }
  next();
};
