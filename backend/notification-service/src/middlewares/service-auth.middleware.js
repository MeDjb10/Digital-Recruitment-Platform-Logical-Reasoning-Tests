const logger = require('../utils/logger.util');

function verifyServiceToken(req, res, next) {
  try {
    logger.info('Verifying service-to-service request');

    // Get token from header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      logger.warn('Access denied: No authorization header');
      return res.status(403).json({
        success: false,
        message: 'Access denied. No service token provided'
      });
    }

    // Extract token from Bearer <token>
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Invalid authorization format');
      return res.status(403).json({
        success: false,
        message: 'Invalid token format. Expected \'Bearer <token>\''
      });
    }

    const token = parts[1];
    if (!token) {
      logger.warn('Token is empty');
      return res.status(403).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    const expectedToken = process.env.SERVICE_TOKEN;
    if (!expectedToken || token !== expectedToken) {
      logger.warn('Invalid service token');
      return res.status(403).json({
        success: false,
        message: 'Invalid service token'
      });
    }

    logger.info('Service token verified successfully');
    next();
  } catch (error) {
    logger.error(`Service auth middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Service authentication error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = verifyServiceToken;