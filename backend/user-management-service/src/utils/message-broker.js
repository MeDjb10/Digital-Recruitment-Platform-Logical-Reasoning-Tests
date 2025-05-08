const amqp = require('amqplib');
const logger = require('./logger.util');

let channel = null;
let connection = null;
let connectionInitPromise = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

// Exchange names
const USER_EXCHANGE = 'user_events';
const NOTIFICATION_EXCHANGE = 'notification_events';

// Initialize broker connection
async function initBrokerConnection() {
  // If we already have a connection initialization in progress, return that
  if (connectionInitPromise) {
    return connectionInitPromise;
  }
  
  // Create a new promise for the connection
  connectionInitPromise = (async () => {
    try {
      logger.info('Connecting to RabbitMQ...');
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      
      // Setup exchanges
      await channel.assertExchange(USER_EXCHANGE, 'topic', { durable: true });
      await channel.assertExchange(NOTIFICATION_EXCHANGE, 'topic', { durable: true });
      
      logger.info('Connected to RabbitMQ successfully');
      
      // Setup event listener for connection close
      connection.on('close', () => {
        logger.error('RabbitMQ connection closed unexpectedly');
        channel = null;
        connection = null;
        connectionInitPromise = null;
        // Don't auto-reconnect here, let the next publish attempt initiate reconnection
      });
      
      return channel;
    } catch (error) {
      logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      connectionInitPromise = null; // Clear the promise so we can try again
      throw error; // Let the caller handle the error
    }
  })();
  
  return connectionInitPromise;
}

// Get the message broker channel - initialize if needed
async function getChannel() {
  if (!channel) {
    await initBrokerConnection().catch(err => {
      logger.error(`Error initializing broker connection: ${err.message}`);
    });
  }
  return channel;
}

// Publish a message to an exchange
async function publishMessage(exchange, routingKey, message) {
  try {
    const ch = await getChannel();
    
    if (!ch) {
      logger.error('Cannot publish message: RabbitMQ connection not available');
      throw new Error('RabbitMQ connection not available');
    }
    
    await ch.publish(
      exchange, 
      routingKey, 
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
    logger.info(`Published message to ${exchange} with routing key ${routingKey}`);
  } catch (error) {
    logger.warn(`Error publishing message to ${exchange}: ${error.message}`);
    // Fail gracefully - don't crash the application for messaging errors
  }
}

// Initialize connection but don't block service startup
(async () => {
  try {
    await initBrokerConnection();
  } catch (error) {
    // Log but don't crash - we'll retry when needed
    logger.warn(`Initial RabbitMQ connection failed: ${error.message}`);
    logger.info('Service will continue and retry RabbitMQ connection when needed');
  }
})();

module.exports = {
  initBrokerConnection,
  getChannel,
  publishMessage,
  USER_EXCHANGE,
  NOTIFICATION_EXCHANGE
};