// test-service/src/services/message-broker.js
const { consumeMessage, publishMessage } = require("../utils/message-broker");
const { EXCHANGES, ROUTING_KEYS, QUEUES } = require("../config/rabbit.config");
const { Test } = require("../models");
const logger = require("../utils/logger.util");

exports.initConsumers = async () => {
  // Listen for test list requests
  await consumeMessage(QUEUES.TEST_LIST_REQUEST, handleTestListRequest);
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
