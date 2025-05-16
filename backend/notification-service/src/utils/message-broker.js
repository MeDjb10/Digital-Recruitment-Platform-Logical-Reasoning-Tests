const amqp = require("amqplib");
const logger = require("./logger.util");
const emailService = require("../services/email.service");

let channel = null;
let connection = null;

// Exchange and queue names
const NOTIFICATION_EXCHANGE = "notification_events";
const EMAIL_QUEUE = "notification_email_queue";
const SMS_QUEUE = "notification_sms_queue";
const PUSH_QUEUE = "notification_push_queue";
const TEST_AUTH_EMAIL_QUEUE = "test_auth_notification_queue";
const TEST_ASSIGNMENT_EMAIL_QUEUE = "test_assignment_notification_queue";

// Initialize broker connection
async function initBrokerConnection() {
  try {
    const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";

    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Setup exchanges
    await channel.assertExchange(NOTIFICATION_EXCHANGE, "topic", {
      durable: true,
    });

    // Setup queues
    await channel.assertQueue(EMAIL_QUEUE, { durable: true });
    await channel.assertQueue(SMS_QUEUE, { durable: true });
    await channel.assertQueue(PUSH_QUEUE, { durable: true });
    await channel.assertQueue(TEST_AUTH_EMAIL_QUEUE, { durable: true });
    await channel.assertQueue(TEST_ASSIGNMENT_EMAIL_QUEUE, { durable: true });

    // Bind queues to exchange with routing keys
    await channel.bindQueue(
      EMAIL_QUEUE,
      NOTIFICATION_EXCHANGE,
      "notification.email.*"
    );
    await channel.bindQueue(
      SMS_QUEUE,
      NOTIFICATION_EXCHANGE,
      "notification.sms.*"
    );
    await channel.bindQueue(
      PUSH_QUEUE,
      NOTIFICATION_EXCHANGE,
      "notification.push.*"
    );
    await channel.bindQueue(
      TEST_AUTH_EMAIL_QUEUE,
      NOTIFICATION_EXCHANGE,
      "notification.email.test_auth"
    );
    await channel.bindQueue(
      TEST_ASSIGNMENT_EMAIL_QUEUE,
      NOTIFICATION_EXCHANGE,
      "notification.email.test_assignment"
    );

    logger.info("Connected to RabbitMQ");

    // Set up consumers
    await consumeEmailMessages();
    await consumeTestAuthMessages();
    await consumeTestAssignmentMessages();

    // Setup event listener for connection close
    connection.on("close", () => {
      logger.error("RabbitMQ connection closed unexpectedly");
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
      throw new Error("RabbitMQ channel not initialized");
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

// Add this new consumer function
async function consumeTestAuthMessages() {
  try {
    if (!channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    channel.consume(TEST_AUTH_EMAIL_QUEUE, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`Processing test authorization email message`);

          await processTestAuthNotification(content);
          channel.ack(msg);
        } catch (error) {
          logger.error(
            `Error processing test auth email message: ${error.message}`
          );
          channel.nack(msg, false, false);
        }
      }
    });

    logger.info("Test auth email consumer initialized");
  } catch (error) {
    logger.error(`Error consuming test auth messages: ${error.message}`);
    throw error;
  }
}

// Add this new consumer function
async function consumeTestAssignmentMessages() {
  try {
    if (!channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    channel.consume(TEST_ASSIGNMENT_EMAIL_QUEUE, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`Processing test assignment email message`);

          await processTestAssignmentNotification(content);
          channel.ack(msg);
        } catch (error) {
          logger.error(
            `Error processing test assignment email message: ${error.message}`
          );
          channel.nack(msg, false, false);
        }
      }
    });

    logger.info("Test assignment email consumer initialized");
  } catch (error) {
    logger.error(`Error consuming test assignment messages: ${error.message}`);
    throw error;
  }
}

// Process email notifications based on routing key
async function processEmailNotification(routingKey, content) {
  switch (routingKey) {
    case "notification.email.verification":
      await emailService.sendVerificationEmail({
        email: content.email,
        firstName: content.firstName,
        otp: content.otp,
      });
      break;

    case "notification.email.password_reset":
      await emailService.sendPasswordResetEmail({
        email: content.email,
        firstName: content.firstName,
        otp: content.otp,
      });
      break;

    case "notification.email.welcome":
      await emailService.sendWelcomeEmail(content);
      break;

    case "notification.email.test_approval":
      await emailService.sendTestApprovalEmail(content);
      break;

    default:
      logger.warn(`Unknown email notification type: ${routingKey}`);
      break;
  }
}

// Add test authorization notification handler
async function processTestAuthNotification(content) {
  const { user, status } = content;

  try {
    if (status === "approved") {
      // Send approval email with test details
      await emailService.sendTestApprovalEmail({
        email: user.email,
        firstName: user.firstName,
        examDate: user.testAssignment?.examDate,
        testType: user.testAssignment?.assignedTest || "Logical Reasoning Test",
        jobPosition: user.testEligibilityInfo?.jobPosition || "Not specified",
        company: user.testEligibilityInfo?.company || "Not specified",
        additionalTests: user.testAssignment?.additionalTests || [],
      });
    } else {
      // Send rejection email
      await emailService.sendTestRejectionEmail({
        email: user.email,
        firstName: user.firstName,
        jobPosition: user.testEligibilityInfo?.jobPosition || "Not specified",
        company: user.testEligibilityInfo?.company || "Not specified",
      });
    }

    logger.info(`Test authorization ${status} email sent to ${user.email}`);
  } catch (error) {
    logger.error(`Failed to send test auth email to ${user.email}`, error);
  }
}

// Add test assignment notification handler
async function processTestAssignmentNotification(content) {
  const { user } = content;

  try {
    await emailService.sendTestAssignmentEmail({
      email: user.email,
      firstName: user.firstName,
      examDate: user.testAssignment?.examDate,
      testType: user.testAssignment?.assignedTest,
      additionalTests: user.testAssignment?.additionalTests || [],
      jobPosition: user.testEligibilityInfo?.jobPosition || "Not specified",
      company: user.testEligibilityInfo?.company || "Not specified",
    });

    logger.info(`Test assignment email sent to ${user.email}`);
  } catch (error) {
    logger.error(
      `Failed to send test assignment email to ${user.email}`,
      error
    );
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

    logger.info(
      `Published message to ${NOTIFICATION_EXCHANGE} with routing key ${routingKey}`
    );
  } catch (error) {
    logger.error(`Error publishing message: ${error.message}`);
    throw error;
  }
}

module.exports = {
  initBrokerConnection,
  publishMessage,
  NOTIFICATION_EXCHANGE,
};
