const amqplib = require("amqplib");
const { EXCHANGES, QUEUES, ROUTING_KEYS } = require("../config/rabbit.config");
const logger = require("./logger.util");

let connection = null;
let channel = null;
let connectionInitPromise = null;

const RABBITMQ_URL = process.env.RABBITMQ_URI || "amqp://localhost:5672";

// Initialize broker connection
async function connect() {
  // If we already have a connection initialization in progress, return that
  if (connectionInitPromise) {
    return connectionInitPromise;
  }
  
  // Create a new promise for the connection
  connectionInitPromise = (async () => {
    try {
      logger.info("Connecting to RabbitMQ...");
      connection = await amqplib.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      
      // Setup exchanges
      await channel.assertExchange(EXCHANGES.TEST_EVENTS, "topic", { durable: true });
      
      // Setup queues
      await channel.assertQueue(QUEUES.TEST_LIST_REQUEST, { durable: true });
      await channel.assertQueue(QUEUES.TEST_LIST_RESPONSE, { durable: true });
      
      // Bind queues to exchange with routing keys
      await channel.bindQueue(QUEUES.TEST_LIST_REQUEST, EXCHANGES.TEST_EVENTS, ROUTING_KEYS.TEST_LIST_REQUEST);
      await channel.bindQueue(QUEUES.TEST_LIST_RESPONSE, EXCHANGES.TEST_EVENTS, ROUTING_KEYS.TEST_LIST_RESPONSE);
      
      logger.info("Connected to RabbitMQ successfully");
      
      // Setup event listener for connection close
      connection.on("close", () => {
        logger.error("RabbitMQ connection closed unexpectedly");
        channel = null;
        connection = null;
        connectionInitPromise = null;
      });
      
      return channel;
    } catch (error) {
      logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      connectionInitPromise = null;
      throw error;
    }
  })();
  
  return connectionInitPromise;
}

// Publish a message to an exchange with a routing key
async function publishMessage(exchange, routingKey, message) {
  try {
    if (!channel) await connect();
    
    return channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
  } catch (error) {
    logger.error(`Error publishing message: ${error}`);
    throw error;
  }
}

// Consume messages from a queue
async function consumeMessage(queue, callback) {
  try {
    if (!channel) await connect();
    
    return channel.consume(queue, async (message) => {
      if (message !== null) {
        try {
          await callback(message);
          channel.ack(message);
        } catch (error) {
          logger.error(`Error processing message from ${queue}`, error);
          // Implement retry logic or dead-letter queue here
          channel.nack(message, false, false);
        }
      }
    });
  } catch (error) {
    logger.error(`Error consuming messages: ${error}`);
    throw error;
  }
}

// Close connection
async function close() {
  if (channel) await channel.close();
  if (connection) await connection.close();
}

// Initialize connection but don't block service startup
(async () => {
  try {
    await connect();
  } catch (error) {
    logger.warn(`Initial RabbitMQ connection failed: ${error.message}`);
    logger.info("Service will continue and retry RabbitMQ connection when needed");
  }
})();

module.exports = {
  connect,
  publishMessage,
  consumeMessage,
  close
};