const amqp = require('amqplib');

let channel = null;
let connection = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

// Exchange and queue names
const AUTH_EXCHANGE = 'auth_events';
const USER_EXCHANGE = 'user_events';
const NOTIFICATION_EXCHANGE = 'notification_events';

// Initialize broker connection
async function initBrokerConnection() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Setup exchanges
    await channel.assertExchange(AUTH_EXCHANGE, 'topic', { durable: true });
    await channel.assertExchange(USER_EXCHANGE, 'topic', { durable: true });
    await channel.assertExchange(NOTIFICATION_EXCHANGE, 'topic', { durable: true });
    
    console.log('Connected to RabbitMQ');
    
    // Setup event listener for connection close
    connection.on('close', () => {
      console.error('RabbitMQ connection closed unexpectedly');
      setTimeout(initBrokerConnection, 5000);
    });
    
    return channel;
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error.message);
    setTimeout(initBrokerConnection, 5000);
  }
}

// Get the message broker channel
function getChannel() {
  if (!channel) throw new Error('RabbitMQ connection not initialized');
  return channel;
}

// Publish a message to an exchange
async function publishMessage(exchange, routingKey, message) {
  try {
    if (!channel) await initBrokerConnection();
    await channel.publish(
      exchange, 
      routingKey, 
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    console.log(`Published message to ${exchange} with routing key ${routingKey}`);
  } catch (error) {
    console.error(`Error publishing message: ${error.message}`);
    throw error;
  }
}

// Consume messages with a callback
async function consumeMessages(exchange, routingKey, queue, callback) {
  try {
    if (!channel) await initBrokerConnection();
    
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, routingKey);
    
    await channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          channel.ack(msg);
        } catch (error) {
          console.error(`Error processing message: ${error.message}`);
          channel.nack(msg, false, false); // Don't requeue
        }
      }
    });
    
    console.log(`Consuming messages from ${exchange} with routing key ${routingKey}`);
  } catch (error) {
    console.error(`Error consuming messages: ${error.message}`);
    throw error;
  }
}

module.exports = {
  initBrokerConnection,
  getChannel,
  publishMessage,
  consumeMessages,
  AUTH_EXCHANGE,
  USER_EXCHANGE,
  NOTIFICATION_EXCHANGE
};