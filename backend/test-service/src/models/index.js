const Test = require("./test.model");
const {
  Question,
  DominoQuestion,
  ArrowQuestion,
  MultipleChoiceQuestion,
} = require("./question.model");
const {
  QuestionTemplate,
  DominoTemplate,
  ArrowTemplate,
  MultipleChoiceTemplate,
} = require("./questionTemplate.model");
const TestAttempt = require("./testAttempt.model");
const QuestionResponse = require("./questionResponse.model");
const AnalyticsSnapshot = require("./analyticsSnapshot.model");

module.exports = {
  Test,
  Question,
  DominoQuestion,
  ArrowQuestion,
  MultipleChoiceQuestion,
  QuestionTemplate,
  DominoTemplate,
  ArrowTemplate,
  MultipleChoiceTemplate,
  TestAttempt,
  QuestionResponse,
  AnalyticsSnapshot,
};
