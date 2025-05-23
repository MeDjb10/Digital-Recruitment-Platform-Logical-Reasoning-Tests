// test-assignment-service/src/utils/message-broker.js
const amqplib = require("amqplib");
const { EXCHANGES, QUEUES, ROUTING_KEYS } = require("../config/rabbit.config");
const logger = require("./logger.util");

let connection = null;
let channel = null;
let connectionPromise = null;

// Connect to RabbitMQ
async function connect() {
  // Don't create multiple connections if one is already in progress
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create a new connection promise
  connectionPromise = (async () => {
    try {
      const rabbitUri = process.env.RABBITMQ_URI || "amqp://localhost:5672";
      logger.info(`Connecting to RabbitMQ at ${rabbitUri}...`);

      connection = await amqplib.connect(rabbitUri);

      // Handle connection close events
      connection.on("close", () => {
        logger.warn(
          "RabbitMQ connection closed, will reconnect on next publish"
        );
        channel = null;
        connection = null;
        connectionPromise = null; // Allow reconnection attempts
      });

      connection.on("error", (err) => {
        logger.error(`RabbitMQ connection error: ${err.message}`);
        channel = null;
        connection = null;
        connectionPromise = null; // Allow reconnection attempts
      });

      // Create channel
      channel = await connection.createChannel();

      // Ensure exchanges exist
      await channel.assertExchange(EXCHANGES.USER_EVENTS, "topic", {
        durable: true,
      });
      await channel.assertExchange(EXCHANGES.TEST_EVENTS, "topic", {
        durable: true,
      });
      await channel.assertExchange(EXCHANGES.ASSIGNMENT_EVENTS, "topic", {
        durable: true,
      });
      await channel.assertExchange("notification_events", "topic", {
        durable: true,
      });

      // Ensure queues exist and bind them to exchanges
      await channel.assertQueue(QUEUES.CANDIDATE_APPROVED, { durable: true });
      await channel.bindQueue(
        QUEUES.CANDIDATE_APPROVED,
        EXCHANGES.USER_EVENTS,
        ROUTING_KEYS.CANDIDATE_APPROVED
      );

      await channel.assertQueue(QUEUES.TEST_LIST_REQUEST, { durable: true });
      await channel.bindQueue(
        QUEUES.TEST_LIST_REQUEST,
        EXCHANGES.TEST_EVENTS,
        ROUTING_KEYS.TEST_LIST_REQUEST
      );

      await channel.assertQueue(QUEUES.TEST_LIST_RESPONSE, { durable: true });
      await channel.bindQueue(
        QUEUES.TEST_LIST_RESPONSE,
        EXCHANGES.TEST_EVENTS,
        ROUTING_KEYS.TEST_LIST_RESPONSE
      );

      await channel.assertQueue(QUEUES.ASSIGNMENT_COMPLETED, { durable: true });
      await channel.bindQueue(
        QUEUES.ASSIGNMENT_COMPLETED,
        EXCHANGES.ASSIGNMENT_EVENTS,
        ROUTING_KEYS.ASSIGNMENT_COMPLETED
      );

      // Also assert and bind the candidate rejected queue
      await channel.assertQueue("candidate.rejected", { durable: true });
      await channel.bindQueue(
        "candidate.rejected",
        EXCHANGES.USER_EVENTS,
        ROUTING_KEYS.CANDIDATE_REJECTED
      );

      logger.info("Connected to RabbitMQ and set up exchanges/queues");

      return channel;
    } catch (err) {
      logger.error(`Failed to connect to RabbitMQ: ${err.message}`);
      connectionPromise = null; // Allow retry
      throw err;
    }
  })();

  return connectionPromise;
}

// Get channel (connect if needed)
async function getChannel() {
  if (!channel) {
    await connect();
  }
  return channel;
}

// Publish a message to an exchange with a routing key
async function publishMessage(exchange, routingKey, message) {
  try {
    const ch = await getChannel();
    if (!ch) {
      throw new Error("Unable to get a valid RabbitMQ channel");
    }

    logger.debug(
      `Publishing message to ${exchange} with routing key ${routingKey}`
    );

    // Convert the message to a Buffer if it's not already one
    const content = Buffer.isBuffer(message)
      ? message
      : Buffer.from(JSON.stringify(message));

    const result = ch.publish(exchange, routingKey, content, {
      persistent: true,
    });

    if (result) {
      logger.info(
        `Successfully published message to ${exchange}.${routingKey}`
      );
    } else {
      logger.warn(
        `Buffer full when publishing to ${exchange}.${routingKey}. Message may be delayed.`
      );
      // Wait for drain event
      await new Promise((resolve) => ch.once("drain", resolve));
      logger.info(`Buffer drained for ${exchange}.${routingKey}`);
    }

    return result;
  } catch (error) {
    logger.error(
      `Error publishing message to ${exchange}.${routingKey}: ${error.message}`
    );

    // Attempt to reconnect on next attempt - clear connection
    channel = null;
    connection = null;
    connectionPromise = null;

    throw error;
  }
}

// Consume messages from a queue
async function consumeMessage(queue, callback) {
  try {
    const ch = await getChannel();
    if (!ch) {
      throw new Error("Unable to get a valid RabbitMQ channel for consumer");
    }

    return ch.consume(queue, async (message) => {
      if (message !== null) {
        try {
          await callback(message);
          ch.ack(message);
        } catch (error) {
          logger.error(
            `Error processing message from ${queue}: ${error.message}`
          );
          // Negative acknowledge without requeue to avoid infinite loop
          ch.nack(message, false, false);
        }
      }
    });
  } catch (error) {
    logger.error(`Failed to set up consumer for ${queue}: ${error.message}`);
    throw error;
  }
}

// Close connection
async function close() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    channel = null;
    connection = null;
    connectionPromise = null;
    logger.info("RabbitMQ connection closed gracefully");
  } catch (error) {
    logger.error(`Error closing RabbitMQ connection: ${error.message}`);
  }
}

// Initialize connection on module load but don't block
(async () => {
  try {
    await connect();
  } catch (err) {
    // Already logged in connect()
  }
})();

module.exports = {
  connect,
  getChannel,
  publishMessage,
  consumeMessage,
  close,
  channel, // Export the channel for checking in assignment.service.js
};
