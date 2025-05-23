const express = require('express');
const router = express.Router();
const userService = require('../utils/service-client');
const messageBroker = require('../utils/message-broker');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const services = {
      auth: {
        status: 'healthy',
        timestamp: new Date().toISOString()
      },
      userService: {
        status: 'unknown',
        lastChecked: new Date().toISOString()
      },
      messageBroker: {
        status: 'unknown',
        lastChecked: new Date().toISOString()
      }
    };
    
    // Check user service connection
    try {
      await userService.getUserRole('health-check');
      services.userService.status = 'connected';
    } catch (error) {
      services.userService.status = 'disconnected';
      services.userService.error = error.message;
    }
    
    // Check message broker connection
    try {
      const isConnected = messageBroker.checkConnection();
      services.messageBroker.status = isConnected ? 'connected' : 'disconnected';
    } catch (error) {
      services.messageBroker.status = 'disconnected';
      services.messageBroker.error = error.message;
    }
    
    // Determine overall status
    const allHealthy = Object.values(services).every(
      service => service.status === 'healthy' || service.status === 'connected'
    );
    
    res.status(allHealthy ? 200 : 503).json({
      service: 'authentication-service',
      status: allHealthy ? 'healthy' : 'degraded',
      services,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      service: 'authentication-service',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;