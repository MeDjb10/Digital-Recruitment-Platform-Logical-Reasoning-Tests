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
    CANDIDATE_REJECTED: "candidate.rejected", // Make sure this is here
    ASSIGNMENT_COMPLETED: "test.assignment.completed",
  },

  // Routing keys
  ROUTING_KEYS: {
    CANDIDATE_APPROVED: "user.candidate.approved",
    CANDIDATE_REJECTED: "user.candidate.rejected",
    ASSIGNMENT_COMPLETED: "test.assignment.completed",
  },
};
