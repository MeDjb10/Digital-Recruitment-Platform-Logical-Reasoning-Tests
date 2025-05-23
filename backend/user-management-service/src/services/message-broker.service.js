// user-management-service/src/services/message-broker.js
const {
  consumeQueue,
  publishMessage,
  initBrokerConnection,
  USER_EXCHANGE,
  ASSIGNMENT_EXCHANGE,
} = require("../utils/message-broker");
const { QUEUES, ROUTING_KEYS } = require("../config/rabbit.config");
const User = require("../models/user.model");
const logger = require("../utils/logger.util");

// Initialize connection explicitly first
exports.initConnection = async () => {
  try {
    await initBrokerConnection();
    return true;
  } catch (error) {
    logger.error(`Failed to initialize RabbitMQ connection: ${error.message}`);
    return false;
  }
};

// Initialize message consumers
exports.initConsumers = async () => {
  try {
    // Make sure we're connected first
    await this.initConnection();

    // Listen for test assignment events
    await consumeQueue(
      QUEUES.ASSIGNMENT_COMPLETED,
      ROUTING_KEYS.ASSIGNMENT_COMPLETED,
      ASSIGNMENT_EXCHANGE,
      handleAssignmentCompleted
    );

    // Add this new consumer for rejections
    await consumeQueue(
      QUEUES.CANDIDATE_REJECTED,
      ROUTING_KEYS.CANDIDATE_REJECTED,
      USER_EXCHANGE,
      handleCandidateRejection
    );

    logger.info("User management service consumers initialized");
    return true;
  } catch (error) {
    logger.error(`Failed to initialize consumers: ${error.message}`);
    return false;
  }
};

const handleAssignmentCompleted = async (data) => {
  try {
    const { userId, testAssignment, statusUpdate } = data;
    logger.info(`Received test assignment for user ${userId}`);

    // Create the update object with the test assignment
    const updateObj = { testAssignment };

    // If status update is provided, include it
    if (statusUpdate) {
      updateObj.testAuthorizationStatus = statusUpdate;
      updateObj.testAuthorizationDate = new Date();
    }

    // Update user with test assignment and possibly status
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateObj },
      { new: true }
    );

    if (!updatedUser) {
      logger.error(
        `Failed to update test assignment - user ${userId} not found`
      );
      return;
    }

    logger.info(
      `Updated test assignment for user ${userId}${
        statusUpdate ? ` with status change to ${statusUpdate}` : ""
      }`
    );

    // Send email notification through notification service
    try {
      await publishMessage(
        "notification_events",
        "notification.email.test_assignment",
        {
          user: {
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            testAssignment: updatedUser.testAssignment,
            testEligibilityInfo: updatedUser.testEligibilityInfo || {},
          },
        }
      );
      logger.info(
        `Published email notification for test assignment to user ${userId}`
      );
    } catch (emailError) {
      logger.error(
        `Failed to send test assignment email notification for user ${userId}`,
        {
          error: emailError.message,
        }
      );
    }
  } catch (error) {
    logger.error("Error processing test assignment event", error);
  }
};

// Handler function for candidate rejections
const handleCandidateRejection = async (data) => {
  try {
    const { userId, authorizedById } = data;
    logger.info(`Received candidate rejection for user ${userId}`);

    // Update the user's status
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          testAuthorizationStatus: "rejected",
          testAuthorizationDate: new Date(),
          authorizedBy: authorizedById,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      logger.error(
        `Failed to update test authorization status - user ${userId} not found`
      );
      return;
    }

    logger.info(
      `Updated test authorization status for user ${userId} to rejected`
    );

    // Send rejection notification
    try {
      await publishMessage(
        "notification_events",
        "notification.email.test_auth",
        {
          user: {
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            testEligibilityInfo: updatedUser.testEligibilityInfo || {},
          },
          status: "rejected",
        }
      );
      logger.info(`Published rejection notification for user ${userId}`);
    } catch (emailError) {
      logger.error(`Failed to send rejection notification for user ${userId}`, {
        error: emailError.message,
      });
    }
  } catch (error) {
    logger.error("Error processing candidate rejection event", error);
  }
};
