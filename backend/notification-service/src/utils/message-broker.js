const amqp = require('amqplib');
const logger = require('./logger.util');
const emailService = require('../services/email.service');

let channel = null;
let connection = null;

// Exchange and queue names
const NOTIFICATION_EXCHANGE = 'notification_events';
const EMAIL_QUEUE = 'notification_email_queue';
const SMS_QUEUE = 'notification_sms_queue';
const PUSH_QUEUE = 'notification_push_queue';

// Initialize broker connection
async function initBrokerConnection() {
  try {
    const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Setup exchanges
    await channel.assertExchange(NOTIFICATION_EXCHANGE, 'topic', { durable: true });
    
    // Setup queues
    await channel.assertQueue(EMAIL_QUEUE, { durable: true });
    await channel.assertQueue(SMS_QUEUE, { durable: true });
    await channel.assertQueue(PUSH_QUEUE, { durable: true });
    
    // Bind queues to exchange with routing keys
    await channel.bindQueue(EMAIL_QUEUE, NOTIFICATION_EXCHANGE, 'notification.email.*');
    await channel.bindQueue(SMS_QUEUE, NOTIFICATION_EXCHANGE, 'notification.sms.*');
    await channel.bindQueue(PUSH_QUEUE, NOTIFICATION_EXCHANGE, 'notification.push.*');
    
    logger.info('Connected to RabbitMQ');
    
    // Set up consumers
    await consumeEmailMessages();
    
    // Setup event listener for connection close
    connection.on('close', () => {
      logger.error('RabbitMQ connection closed unexpectedly');
      setTimeout(initBrokerConnection, 5000);
    });
    
    return channel;
  } catch (error) {
    logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
    setTimeout(initBrokerConnection, 5000);
  }
}

// Consume email messages
async function consumeEmailMessages() {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    
    channel.consume(EMAIL_QUEUE, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          
          logger.info(`Processing email message: ${routingKey}`);
          
          await processEmailNotification(routingKey, content);
          channel.ack(msg);
        } catch (error) {
          logger.error(`Error processing email message: ${error.message}`);
          // Negative acknowledgment, don't requeue to avoid endless loop on permanent errors
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    logger.error(`Error consuming email messages: ${error.message}`);
    throw error;
  }
}

// Process email notifications based on routing key
async function processEmailNotification(routingKey, content) {
  switch(routingKey) {
    case 'notification.email.verification':
      await emailService.sendVerificationEmail({
        email: content.email,
        firstName: content.firstName,
        otp: content.otp
      });
      break;
      
    case 'notification.email.password_reset':
      await emailService.sendPasswordResetEmail({
        email: content.email,
        firstName: content.firstName,
        otp: content.otp
      });
      break;
      
    case 'notification.email.welcome':
      await emailService.sendWelcomeEmail(content);
      break;
      
    case 'notification.email.test_approval':
      await emailService.sendTestApprovalEmail(content);
      break;
      
    default:
      logger.warn(`Unknown email notification type: ${routingKey}`);
      break;
  }
}

// Publish a message to the notification exchange
async function publishMessage(routingKey, message) {
  try {
    if (!channel) await initBrokerConnection();
    
    await channel.publish(
      NOTIFICATION_EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
    logger.info(`Published message to ${NOTIFICATION_EXCHANGE} with routing key ${routingKey}`);
  } catch (error) {
    logger.error(`Error publishing message: ${error.message}`);
    throw error;
  }
}

module.exports = {
  initBrokerConnection,
  publishMessage,
  NOTIFICATION_EXCHANGE
};