const Test = require("./test.model");
const {
  Question,
  DominoQuestion,
  MultipleChoiceQuestion,
} = require("./question.model");
const TestAttempt = require("./testAttempt.model");
const QuestionResponse = require("./questionResponse.model");
const AnalyticsSnapshot = require("./analyticsSnapshot.model");

module.exports = {
  Test,
  Question,
  DominoQuestion,
  MultipleChoiceQuestion,
  TestAttempt,
  QuestionResponse,
  AnalyticsSnapshot,
};
