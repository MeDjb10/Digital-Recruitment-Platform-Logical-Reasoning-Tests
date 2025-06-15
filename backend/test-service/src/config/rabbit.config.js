module.exports = {
  // Exchanges
  EXCHANGES: {
    USER_EVENTS: "user.events",
    TEST_EVENTS: "test.events",
    ASSIGNMENT_EVENTS: "test.assignment.events",
    AI_EVENTS: "ai.events",
  },

  // Queues
  QUEUES: {
    TEST_LIST_REQUEST: "test.list.request",
    TEST_LIST_RESPONSE: "test.list.response",
    AI_CLASSIFICATION: "test.attempts.classified",
  },

  // Routing keys
  ROUTING_KEYS: {
    TEST_LIST_REQUEST: "test.list.request",
    TEST_LIST_RESPONSE: "test.list.response",
    AI_CLASSIFICATION: "ai.classification.completed",
  },
};