const emailService = require('../services/email.service');
const logger = require('../utils/logger.util');
const messageBroker = require('../utils/message-broker');

/**
 * @desc    Send email directly via API
 * @route   POST /api/notifications/email
 * @access  Private (Service-to-service)
 */
exports.sendEmail = async (req, res) => {
  try {
    const { to, subject, content, type, data } = req.body;
    
    if (!to || !subject || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, and type are required'
      });
    }
    
    let result;
    
    switch(type) {
      case 'verification':
        result = await emailService.sendVerificationEmail({
          email: to,
          firstName: data.firstName,
          otp: data.otp
        });
        break;
        
      case 'password_reset':
        result = await emailService.sendPasswordResetEmail({
          email: to,
          firstName: data.firstName,
          otp: data.otp
        });
        break;
        
      case 'welcome':
        result = await emailService.sendWelcomeEmail({
          email: to,
          ...data
        });
        break;
        
      case 'test_approval':
        result = await emailService.sendTestApprovalEmail({
          email: to,
          ...data
        });
        break;
        
      case 'custom':
        // For custom emails with direct content
        const htmlContent = content;
        result = await emailService.sendEmail(to, subject, htmlContent);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: `Unsupported email type: ${type}`
        });
    }
    
    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      data: {
        messageId: result.messageId,
        previewUrl: result.previewUrl || undefined
      }
    });
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};