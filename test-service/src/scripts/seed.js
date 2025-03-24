const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const config = require("../config");
const { Test, DominoQuestion, MultipleChoiceQuestion } = require("../models");

// Sample data
const tests = [
  {
    name: "Basic Domino Logic Test",
    description:
      "A basic test to assess logical reasoning using domino patterns",
    category: "logical",
    type: "domino",
    duration: 20,
    difficulty: "easy",
    instructions:
      "Complete the domino patterns by selecting the correct values",
    tags: ["logic", "pattern", "domino"],
    createdBy: "admin",
    isActive: true,
  },
  {
    name: "Verbal Reasoning Assessment",
    description: "Test to evaluate verbal reasoning and comprehension",
    category: "verbal",
    type: "multiple-choice",
    duration: 30,
    difficulty: "medium",
    instructions: "Read each passage and answer the questions",
    tags: ["verbal", "reading", "comprehension"],
    createdBy: "admin",
    isActive: true,
  },
];

// Sample domino questions
const dominoQuestions = [
  {
    title: "Pattern Recognition",
    instruction: "Identify the correct domino to complete the pattern",
    difficulty: "easy",
    questionNumber: 1,
    pattern: "sequence",
    layoutType: "row",
    dominos: [
      { id: 1, row: 0, col: 0, topValue: 1, bottomValue: 2, isEditable: false },
      { id: 2, row: 0, col: 1, topValue: 2, bottomValue: 3, isEditable: false },
      { id: 3, row: 0, col: 2, topValue: 3, bottomValue: 4, isEditable: false },
      {
        id: 4,
        row: 0,
        col: 3,
        topValue: null,
        bottomValue: null,
        isEditable: true,
      },
    ],
    correctAnswer: {
      dominoId: 4,
      topValue: 4,
      bottomValue: 5,
    },
  },
  {
    title: "Grid Pattern",
    instruction:
      "Complete the grid by selecting the correct values for the missing domino",
    difficulty: "medium",
    questionNumber: 2,
    pattern: "grid",
    layoutType: "grid",
    dominos: [
      { id: 1, row: 0, col: 0, topValue: 1, bottomValue: 2, isEditable: false },
      { id: 2, row: 0, col: 1, topValue: 2, bottomValue: 3, isEditable: false },
      { id: 3, row: 1, col: 0, topValue: 3, bottomValue: 4, isEditable: false },
      {
        id: 4,
        row: 1,
        col: 1,
        topValue: null,
        bottomValue: null,
        isEditable: true,
      },
    ],
    gridLayout: {
      rows: 2,
      cols: 2,
      width: 200,
      height: 200,
    },
    correctAnswer: {
      dominoId: 4,
      topValue: 4,
      bottomValue: 5,
    },
  },
];

// Sample multiple choice questions
const multipleChoiceQuestions = [
  {
    title: "Reading Comprehension",
    instruction:
      "Read the following passage and select the most accurate statement.",
    difficulty: "medium",
    questionNumber: 1,
    options: [
      { text: "Option A is correct", isCorrect: true },
      { text: "Option B is incorrect", isCorrect: false },
      { text: "Option C is incorrect", isCorrect: false },
      { text: "Option D is incorrect", isCorrect: false },
    ],
    correctOptionIndex: 0,
  },
  {
    title: "Logical Inference",
    instruction:
      "Based on the given premises, select the most logical conclusion",
    difficulty: "hard",
    questionNumber: 2,
    options: [
      { text: "Option A is incorrect", isCorrect: false },
      { text: "Option B is incorrect", isCorrect: false },
      { text: "Option C is correct", isCorrect: true },
      { text: "Option D is incorrect", isCorrect: false },
    ],
    correctOptionIndex: 2,
  },
];

// Seed function
const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB(config.mongoUri);

    // Clear existing data
    await Test.deleteMany({});
    await DominoQuestion.deleteMany({});
    await MultipleChoiceQuestion.deleteMany({});

    console.log("Existing data cleared");

    // Insert tests
    const createdTests = await Test.create(tests);
    console.log(`Created ${createdTests.length} tests`);

    // Insert domino questions
    const dominoTest = createdTests.find((test) => test.type === "domino");
    if (dominoTest) {
      const dominoQuestionsWithTestId = dominoQuestions.map((q) => ({
        ...q,
        testId: dominoTest._id,
      }));
      await DominoQuestion.create(dominoQuestionsWithTestId);
      console.log(
        `Created ${dominoQuestionsWithTestId.length} domino questions`
      );

      // Update test question count
      await dominoTest.updateQuestionCount();
    }

    // Insert multiple choice questions
    const mcTest = createdTests.find((test) => test.type === "multiple-choice");
    if (mcTest) {
      const mcQuestionsWithTestId = multipleChoiceQuestions.map((q) => ({
        ...q,
        testId: mcTest._id,
      }));
      await MultipleChoiceQuestion.create(mcQuestionsWithTestId);
      console.log(
        `Created ${mcQuestionsWithTestId.length} multiple choice questions`
      );

      // Update test question count
      await mcTest.updateQuestionCount();
    }

    console.log("Database seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();
