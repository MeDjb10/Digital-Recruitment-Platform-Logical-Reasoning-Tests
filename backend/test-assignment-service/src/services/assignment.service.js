// test-assignment-service/src/services/assignment.service.js
require("dotenv").config();
const { publishMessage, consumeMessage } = require("./message-broker.service");
const { EXCHANGES, ROUTING_KEYS, QUEUES } = require("../config/rabbit.config");
const logger = require("../utils/logger.util");
const axios = require("axios");
const NodeCache = require("node-cache");
// Initialize with test types
const TEST_TYPES = {
  LOW_LEVEL: "D-70",
  HIGH_LEVEL: "D-2000",
  LOGIC: "logique_des_propositions",
};

const EDUCATION_LEVELS = {
  LOW: ["high_school", "vocational", "some_college"],
  HIGH: ["bachelor", "master", "phd", "doctorate"],
};

// Cache for available tests
let availableTests = [];

// Create a cache with 30-minute TTL for user data
const userCache = new NodeCache({ stdTTL: 1800 }); // 30 minutes cache

// Initialize message consumers
exports.initConsumers = async () => {
  // Listen for candidate approval events
  await consumeMessage(QUEUES.CANDIDATE_APPROVED, handleCandidateApproval);

  // Listen for test list responses
  await consumeMessage(QUEUES.TEST_LIST_RESPONSE, handleTestListResponse);

  logger.info("Test assignment service consumers initialized");
};

// Handle candidate approval event
const handleCandidateApproval = async (message) => {
  try {
    const candidateData = JSON.parse(message.content.toString());
    logger.info(`Received candidate approval: ${candidateData.userId}`);

    // Request latest test list from test service
    await requestTestList();

    // Wait for test list update (in a real system, you'd use a more robust approach)
    setTimeout(() => processAssignment(candidateData), 2000);
  } catch (error) {
    logger.error("Error processing candidate approval", error);
  }
};

// Request test list from test service
const requestTestList = async () => {
  await publishMessage(EXCHANGES.TEST_EVENTS, ROUTING_KEYS.TEST_LIST_REQUEST, {
    timestamp: Date.now(),
  });
  logger.info("Requested test list from test service");
};

// Handle test list response
const handleTestListResponse = async (message) => {
  try {
    const testList = JSON.parse(message.content.toString());
    availableTests = testList.tests;
    logger.info(`Updated available tests: ${availableTests.length} tests`);
    logger.debug(
      `Available test IDs: ${JSON.stringify(
        availableTests.map((t) => ({ id: t._id, name: t.name }))
      )}`
    );
  } catch (error) {
    logger.error("Error processing test list", error);
  }
};

// Process test assignment based on education level
const processAssignment = async (candidateData) => {
  const {
    userId,
    educationLevel,
    firstName,
    lastName,
    email,
    authorizedById,
    additionalData,
  } = candidateData;

  // Determine appropriate test based on education level
  const isLowLevel = EDUCATION_LEVELS.LOW.some((level) =>
    (educationLevel || "").toLowerCase().includes(level)
  );

  // Find the actual test objects from available tests
  const primaryTestType = isLowLevel
    ? TEST_TYPES.LOW_LEVEL
    : TEST_TYPES.HIGH_LEVEL;
  const primaryTest = availableTests.find(
    (test) => test.name === primaryTestType
  );

  if (!primaryTest) {
    logger.error(
      `Required test ${primaryTestType} not found in available tests`
    );
    return;
  }

  // Create test assignment
  const testAssignment = {
    assignedTest: primaryTestType,
    assignedTestId: primaryTest._id,
    additionalTests: [],
    additionalTestIds: [],
    isManualAssignment: false,
    assignmentDate: new Date(),
    assignedBy: authorizedById,
  };

  // Add exam date if provided
  if (additionalData && additionalData.examDate) {
    testAssignment.examDate = additionalData.examDate;
  }

  // Publish assignment event to user-management service
  await publishMessage(
    EXCHANGES.ASSIGNMENT_EVENTS,
    ROUTING_KEYS.ASSIGNMENT_COMPLETED,
    {
      userId,
      testAssignment,
      timestamp: Date.now(),
      statusUpdate: "approved" // Add this line to explicitly set status
    }
  );

  // Publish notification event for email
  try {
    await publishMessage(
      "notification_events",
      "notification.email.test_assignment",
      {
        user: {
          email: email,
          firstName: firstName,
          lastName: lastName,
          testAssignment: testAssignment,
          testEligibilityInfo: candidateData.testEligibilityInfo || {
            jobPosition: candidateData.jobPosition || "Not specified",
            company: candidateData.company || "Not specified",
          },
        },
      }
    );
    logger.info(`Published test assignment notification for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to publish notification for user ${userId}`, error);
    // We don't throw here to prevent blocking the main flow
  }

  logger.info(`Test assignment completed for user ${userId}`);
};

// Manual test assignment
exports.manualTestAssignment = async (
  userId,
  assignmentData,
  psychologistId
) => {
  // Need to fetch user data (email, name) from user-management service
  const userData = await fetchUserData(userId);
  if (!userData) {
    throw new Error("Failed to fetch user data");
  }

  // Request test list if not available
  if (!availableTests.length) {
    logger.info("No tests available, requesting test list");
    await requestTestList();
    // Wait for test list to be updated
    logger.info("Waiting for test list response...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if tests were received
    if (!availableTests.length) {
      logger.error("No tests received after request");
      throw new Error("Failed to load available tests. Please try again.");
    }
  }

  const { assignedTestId, additionalTestIds, examDate } = assignmentData;

  // Validate that tests exist in available tests
  const primaryTest = availableTests.find(
    (test) => test._id.toString() === assignedTestId
  );
  if (!primaryTest) {
    throw new Error("Selected test not found");
  }

  // Validate additional tests
  const validAdditionalTests = [];
  const validAdditionalTestIds = [];

  if (additionalTestIds && Array.isArray(additionalTestIds)) {
    for (const testId of additionalTestIds) {
      const test = availableTests.find((t) => t._id.toString() === testId);
      if (test) {
        validAdditionalTests.push(test.name);
        validAdditionalTestIds.push(test._id);
      }
    }
  }

  // Create assignment
  const testAssignment = {
    assignedTest: primaryTest.name,
    assignedTestId: primaryTest._id,
    additionalTests: validAdditionalTests,
    additionalTestIds: validAdditionalTestIds,
    isManualAssignment: true,
    assignmentDate: new Date(),
    assignedBy: psychologistId,
  };

  if (examDate) {
    testAssignment.examDate = new Date(examDate);
  }

  // Publish assignment event to user-management
  await publishMessage(
    EXCHANGES.ASSIGNMENT_EVENTS,
    ROUTING_KEYS.ASSIGNMENT_COMPLETED,
    {
      userId,
      testAssignment,
      timestamp: Date.now(),
    }
  );

  // Publish notification event for email
  try {
    await publishMessage(
      "notification_events",
      "notification.email.test_assignment",
      {
        user: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          testAssignment: testAssignment,
          testEligibilityInfo: userData.testEligibilityInfo || {
            jobPosition: userData.jobPosition || "Not specified",
            company: userData.company || "Not specified",
          },
        },
      }
    );
    logger.info(
      `Published manual test assignment notification for user ${userId}`
    );
  } catch (error) {
    logger.error(
      `Failed to publish notification for manual assignment for user ${userId}`,
      error
    );
  }

  return { success: true, message: "Test assignment completed" };
};

// Bulk assignment
exports.bulkAssignment = async (
  userIds,
  status,
  authorizedById,
  examDate = null
) => {
  try {
    logger.info(
      `bulkAssignment called with status: ${status}, userIds: ${JSON.stringify(
        userIds
      )}, authorizedById: ${authorizedById}, examDate: ${examDate}`
    );

    // Validate parameters
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      logger.error("Invalid or empty userIds array");
      throw new Error("Invalid user IDs");
    }

    if (!status || !["approved", "rejected"].includes(status)) {
      logger.error(`Invalid status: ${status}`);
      throw new Error('Status must be either "approved" or "rejected"');
    }

    // Implementation for approved status
    if (status === "approved") {
      logger.info(
        `Processing ${userIds.length} users for approval with test assignment`
      );

      // Request latest test list
      await requestTestList();
      logger.debug("Test list requested, waiting for response");

      // Wait for test list update
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if tests were received
      if (availableTests.length === 0) {
        logger.error("No tests available after waiting for test list response");
        throw new Error("No tests available. Cannot process assignments.");
      }

      logger.info(
        `Processing assignments with ${availableTests.length} available tests`
      );

      // For each user, create an event
      const results = await Promise.all(
        userIds.map(async (userId) => {
          try {
            logger.debug(`Processing user ${userId} for approval`);

            // Fetch user data from User Management Service
            const userData = await fetchUserData(userId);

            if (!userData) {
              logger.error(`Failed to fetch user data for ${userId}`);
              return {
                userId,
                success: false,
                error: "Failed to fetch user data",
              };
            }

            // Process assignment
            await processAssignment({
              userId,
              educationLevel: userData.educationLevel || "",
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              authorizedById,
              additionalData: examDate ? { examDate } : {},
            });

            logger.info(`Successfully processed approval for user ${userId}`);
            return { userId, success: true };
          } catch (error) {
            logger.error(`Failed to process assignment for ${userId}`, error);
            return { userId, success: false, error: error.message };
          }
        })
      );

      const successCount = results.filter((r) => r.success).length;
      logger.info(
        `Bulk approval completed: ${successCount}/${userIds.length} successful`
      );

      return {
        successCount,
        totalRequested: userIds.length,
      };
    }
    // Implementation for rejected status
    else if (status === "rejected") {
      logger.info(`Processing ${userIds.length} users for rejection`);

      try {
        await require("../utils/message-broker").connect();
      } catch (connectionError) {
        logger.error(
          `Failed to establish RabbitMQ connection: ${connectionError.message}`
        );
        throw new Error("Cannot connect to message broker. Please try again.");
      }
    
      // For rejected users, we still need to update their status via user-management-service
      // We'll publish a rejection event for each user
      const results = await Promise.all(
        userIds.map(async (userId) => {
          try {
            logger.debug(`Processing user ${userId} for rejection`);

            // Explicitly check RabbitMQ connection before publishing
            if (!require("./message-broker.service").channel) {
              logger.error(
                `RabbitMQ channel not available for userId: ${userId}`
              );
              await require("./message-broker.service").connect();
              logger.info("Reconnected to RabbitMQ");
            }

            // Add more detailed logging for the publish action
            logger.info(
              `Publishing rejection event for user ${userId} to exchange ${EXCHANGES.USER_EVENTS} with routing key ${ROUTING_KEYS.CANDIDATE_REJECTED}`
            );

            // Publish rejection event with await to catch any errors
            const publishResult = await publishMessage(
              EXCHANGES.USER_EVENTS,
              ROUTING_KEYS.CANDIDATE_REJECTED,
              {
                userId,
                authorizedById,
                status: "rejected",
                timestamp: Date.now(),
              }
            );

            logger.debug(`Publish result: ${publishResult}`);
            logger.info(`Successfully processed rejection for user ${userId}`);
            return { userId, success: true };
          } catch (error) {
            logger.error(
              `Failed to process rejection for ${userId}: ${error.message}`,
              error
            );
            return { userId, success: false, error: error.message };
          }
        })
      );

      const successCount = results.filter((r) => r.success).length;
      logger.info(
        `Bulk rejection completed: ${successCount}/${userIds.length} successful`
      );

      return {
        successCount,
        totalRequested: userIds.length,
      };
    }

    // This shouldn't happen due to validation above, but just in case
    logger.warn(`Unhandled status: ${status}`);
    return { successCount: 0, totalRequested: userIds.length };
  } catch (error) {
    // Add top-level error handling
    logger.error(`Error in bulkAssignment: ${error.message}`, error);
    throw error;
  }
};

/**
 * Fetch user data from user management service with caching and resilience
 * @param {string} userId - The user ID to fetch data for
 * @returns {Promise<Object|null>} The user data or null if not found/error
 */
const SERVICE_TOKEN =
  process.env.SERVICE_TOKEN || "j4k5h6j45h6j45h6j45h6j45h6j4k5h6jk546";

async function fetchUserData(userId) {
  try {
    // Check cache first
    const cachedUser = userCache.get(userId);
    if (cachedUser) {
      logger.info(`User ${userId} data retrieved from cache`);
      return cachedUser;
    }

    // Make API call with timeout and retry logic
    const USER_SERVICE_URL =
      process.env.USER_SERVICE_URL || "http://localhost:3001";

    // Log the token for debugging (first 5 chars only for security)
    logger.debug(
      `Using service token: ${
        SERVICE_TOKEN ? SERVICE_TOKEN.substring(0, 5) + "..." : "undefined"
      }`
    );

    // Fix URL typo and ensure token is passed
    logger.info(`Fetching user data for ${userId} from user service`);
    const response = await axios.get(
      `${USER_SERVICE_URL}/api/users/service/${userId}`,
      {
        timeout: 3000, // 3 second timeout
        headers: {
          Authorization: `Bearer ${SERVICE_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Extract user data from response - the response structure differs for service endpoints
    const userData = response.data; // The service endpoint directly returns the user object

    // Store in cache if we got valid data
    if (userData && userData.email) {
      userCache.set(userId, userData);
      logger.info(`User ${userId} data cached for 30 minutes`);
    } else {
      logger.warn(`Retrieved empty or invalid user data for ${userId}`);
    }

    return userData;
  } catch (error) {
    // Handle different types of errors
    if (error.code === "ECONNABORTED") {
      logger.warn(`Timeout fetching user data for ${userId}`);
    } else if (error.response) {
      // The request was made and the server responded with a non-2xx status
      logger.error(
        `Error fetching user data for ${userId}: ${error.response.status} - ${error.response.statusText}`
      );
    } else if (error.request) {
      // The request was made but no response was received
      logger.error(
        `No response when fetching user data for ${userId}: ${error.message}`
      );
    } else {
      // Something happened in setting up the request
      logger.error(
        `Error setting up request for user data ${userId}: ${error.message}`
      );
    }

    // Fall back to placeholder data in development environments
    if (process.env.NODE_ENV === "development") {
      logger.warn(
        `Using placeholder data for user ${userId} in development environment`
      );
      return {
        email: "candidate@example.com",
        firstName: "Candidate",
        lastName: "User",
        testEligibilityInfo: {
          jobPosition: "Developer",
          company: "COFAT",
        },
      };
    }

    return null;
  }
}
