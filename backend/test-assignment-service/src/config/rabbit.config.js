// test-assignment-service/src/config/rabbit.config.js
module.exports = {
  // Exchanges
  EXCHANGES: {
    USER_EVENTS: "user.events",
    TEST_EVENTS: "test.events",
    ASSIGNMENT_EVENTS: "test.assignment.events",
  },

  // Queues
  QUEUES: {
    CANDIDATE_APPROVED: "candidate.approved",
    TEST_LIST_REQUEST: "test.list.request",
    TEST_LIST_RESPONSE: "test.list.response",
    ASSIGNMENT_COMPLETED: "test.assignment.completed",
  },

  // Routing keys
  ROUTING_KEYS: {
    CANDIDATE_APPROVED: "user.candidate.approved",
    CANDIDATE_REJECTED: "user.candidate.rejected",
    TEST_LIST_REQUEST: "test.list.request",
    TEST_LIST_RESPONSE: "test.list.response",
    ASSIGNMENT_COMPLETED: "test.assignment.completed",
  },
};
