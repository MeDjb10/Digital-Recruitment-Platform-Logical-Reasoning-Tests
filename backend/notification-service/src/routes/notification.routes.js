const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const verifyServiceToken = require('../middlewares/service-auth.middleware');

// Service-to-service endpoints
router.post('/email', verifyServiceToken, notificationController.sendEmail);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'Success', message: 'Notification service is healthy' });
});

module.exports = router;