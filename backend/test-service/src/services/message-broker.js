// test-service/src/services/message-broker.js
const { consumeMessage, publishMessage } = require("../utils/message-broker");
const { EXCHANGES, ROUTING_KEYS, QUEUES } = require("../config/rabbit.config");
const { Test, TestAttempt } = require("../models");
const logger = require("../utils/logger.util");

exports.initConsumers = async () => {
  // Listen for test list requests
  await consumeMessage(QUEUES.TEST_LIST_REQUEST, handleTestListRequest);
  // Listen for AI classification messages
  await consumeMessage(QUEUES.AI_CLASSIFICATION, handleAiClassification);
  logger.info("Test service message consumers initialized");
};

// Handle request for test list
const handleTestListRequest = async (message) => {
  try {
    // Get all active tests
    const tests = await Test.find({ isActive: true });

    // Map to simplified format with essential data
    const testsList = tests.map((test) => ({
      _id: test._id,
      name: test.name,
      type: test.type,
      category: test.category,
      difficulty: test.difficulty,
      duration: test.duration,
    }));

    // Publish test list
    await publishMessage(
      EXCHANGES.TEST_EVENTS,
      ROUTING_KEYS.TEST_LIST_RESPONSE,
      {
        tests: testsList,
        timestamp: Date.now(),
      }
    );

    logger.info(`Published test list with ${testsList.length} tests`);
  } catch (error) {
    logger.error("Error retrieving test list", error);
  }
};

// Handle AI classification messages
const handleAiClassification = async (message) => {
  try {
    const { attemptId, prediction, confidence, timestamp } = message;
    
    if (!attemptId || !prediction || confidence === undefined) {
      logger.error('Invalid AI classification message received:', message);
      return;
    }

    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) {
      logger.error(`Attempt ${attemptId} not found for AI classification update`);
      return;
    }

    // Update the attempt with AI classification
    attempt.aiClassification = {
      prediction,
      confidence,
      classifiedAt: new Date(timestamp),
    };

    await attempt.save();
    logger.info(`Updated attempt ${attemptId} with AI classification: ${prediction} (${confidence})`);

  } catch (error) {
    logger.error('Error handling AI classification message:', error);
  }
};
