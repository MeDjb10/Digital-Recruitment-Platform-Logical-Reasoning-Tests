const axios = require('axios');
const logger = require('../utils/logger.util');

// Authentication middleware with role-based authorization
function verifyToken(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No token provided.'
        });
      }
      
      const token = authHeader.split(' ')[1];
      
      // Call Authentication Service to verify token
      const response = await axios.get(`${process.env.AUTH_SERVICE_URL || 'http://localhost:3000/api/auth'}/verify`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // If we reach here, token is valid
      const { userId, role } = response.data;
      
      // Add user info to request object
      req.userId = userId;
      req.userRole = role;
      
      // Role-based authorization check
      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        logger.warn(`Access denied for user ${userId} with role ${role}. Required roles: ${allowedRoles.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      
      // Handle different types of auth errors
      if (error.response) {
        // Auth service responded with an error
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
      
      // Network or other errors
      return res.status(500).json({
        success: false,
        message: 'Authentication service unavailable'
      });
    }
  };
}

module.exports = verifyToken;