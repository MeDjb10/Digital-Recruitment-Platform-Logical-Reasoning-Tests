const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const {
  Question,
  DominoQuestion,
  ArrowQuestion,
  MultipleChoiceQuestion,
  Test,
} = require("../models");

// Mock authentication middleware
jest.mock("../middleware/auth.middleware", () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: "mock-user-id", role: "admin" };
    next();
  },
  authorize:
    (...roles) =>
    (req, res, next) =>
      next(),
}));

describe("Question Controller", () => {
  let testId;
  let questionId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_TEST_URI ||
          "mongodb://localhost:27017/test-service-test"
      );
    }
  });

  afterAll(async () => {
    // Clean up and close connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Create a test
    const test = new Test({
      title: "Test for Questions",
      description: "A test to create questions for",
      difficulty: "medium",
      duration: 60,
      createdBy: "mock-user-id",
    });
    await test.save();
    testId = test._id;
  });

  afterEach(async () => {
    // Clean up questions and tests
    await Question.deleteMany({});
    await Test.deleteMany({});
  });

  describe("POST /api/questions/tests/:testId/questions", () => {
    it("should create a DominoQuestion successfully", async () => {
      const dominoQuestionData = {
        questionType: "DominoQuestion",
        instruction: "Find the missing domino piece",
        difficulty: "medium",
        questionNumber: 1,
        dominos: [
          { topDots: 2, bottomDots: 3, exactX: 10, exactY: 20 },
          { topDots: 1, bottomDots: 4, exactX: 30, exactY: 20 },
          {
            topDots: 0,
            bottomDots: 0,
            exactX: 50,
            exactY: 20,
            isMissing: true,
          },
        ],
        correctAnswer: { topDots: 3, bottomDots: 2 },
      };

      const response = await request(app)
        .post(`/api/questions/tests/${testId}/questions`)
        .send(dominoQuestionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questionType).toBe("DominoQuestion");
      expect(response.body.data.dominos).toHaveLength(3);
      expect(response.body.data.correctAnswer.topDots).toBe(3);

      questionId = response.body.data._id;
    });

    it("should create an ArrowQuestion successfully", async () => {
      const arrowQuestionData = {
        questionType: "ArrowQuestion",
        instruction: "Find the pattern in the arrow sequence",
        difficulty: "hard",
        questionNumber: 2,
        dominos: [
          { topDots: 1, bottomDots: 2, exactX: 10, exactY: 20 },
          { topDots: 2, bottomDots: 3, exactX: 30, exactY: 20 },
          {
            topDots: 0,
            bottomDots: 0,
            exactX: 50,
            exactY: 20,
            isMissing: true,
          },
        ],
        arrows: [
          { exactX: 15, exactY: 25, angle: 45 },
          { exactX: 35, exactY: 25, angle: 90 },
        ],
        correctAnswer: { topDots: 3, bottomDots: 4 },
      };

      const response = await request(app)
        .post(`/api/questions/tests/${testId}/questions`)
        .send(arrowQuestionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questionType).toBe("ArrowQuestion");
      expect(response.body.data.dominos).toHaveLength(3);
      expect(response.body.data.arrows).toHaveLength(2);
      expect(response.body.data.arrows[0].angle).toBe(45);
    });

    it("should create a MultipleChoiceQuestion successfully", async () => {
      const mcQuestionData = {
        questionType: "MultipleChoiceQuestion",
        instruction: "Select the correct answer for each proposition",
        difficulty: "easy",
        questionNumber: 3,
        propositions: [
          { text: "This statement is true", correctAnswer: "V" },
          { text: "This statement is false", correctAnswer: "F" },
          { text: "This statement is uncertain", correctAnswer: "?" },
        ],
      };

      const response = await request(app)
        .post(`/api/questions/tests/${testId}/questions`)
        .send(mcQuestionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questionType).toBe("MultipleChoiceQuestion");
      expect(response.body.data.propositions).toHaveLength(3);
      expect(response.body.data.propositions[0].correctAnswer).toBe("V");
    });

    it("should fail to create DominoQuestion with missing required fields", async () => {
      const invalidDominoData = {
        questionType: "DominoQuestion",
        instruction: "Find the missing domino piece",
        difficulty: "medium",
        questionNumber: 1,
        // Missing dominos and correctAnswer
      };

      const response = await request(app)
        .post(`/api/questions/tests/${testId}/questions`)
        .send(invalidDominoData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("dominos");
    });

    it("should fail to create ArrowQuestion with invalid arrow coordinates", async () => {
      const invalidArrowData = {
        questionType: "ArrowQuestion",
        instruction: "Find the pattern in the arrow sequence",
        difficulty: "hard",
        questionNumber: 2,
        dominos: [{ topDots: 1, bottomDots: 2, exactX: 10, exactY: 20 }],
        arrows: [
          { exactX: 15, exactY: 25 }, // Missing angle
        ],
        correctAnswer: { topDots: 3, bottomDots: 4 },
      };

      const response = await request(app)
        .post(`/api/questions/tests/${testId}/questions`)
        .send(invalidArrowData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("angle");
    });

    it("should fail to create MultipleChoiceQuestion with empty propositions", async () => {
      const invalidMcData = {
        questionType: "MultipleChoiceQuestion",
        instruction: "Select the correct answer",
        difficulty: "easy",
        questionNumber: 3,
        propositions: [],
      };

      const response = await request(app)
        .post(`/api/questions/tests/${testId}/questions`)
        .send(invalidMcData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("proposition");
    });
  });

  describe("POST /api/questions/validate-domino", () => {
    it("should validate correct domino question structure", async () => {
      const validDominoData = {
        dominos: [
          { topDots: 2, bottomDots: 3, exactX: 10, exactY: 20 },
          { topDots: 1, bottomDots: 4, exactX: 30, exactY: 20 },
        ],
        correctAnswer: { topDots: 3, bottomDots: 2 },
      };

      const response = await request(app)
        .post("/api/questions/validate-domino")
        .send(validDominoData)
        .expect(200);

      expect(response.body.isValid).toBe(true);
    });

    it("should invalidate incorrect domino question structure", async () => {
      const invalidDominoData = {
        dominos: [
          { topDots: 2, bottomDots: 3 }, // Missing coordinates
        ],
      };

      const response = await request(app)
        .post("/api/questions/validate-domino")
        .send(invalidDominoData)
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe("GET /api/questions/tests/:testId/questions", () => {
    beforeEach(async () => {
      // Create test questions
      const domino = new DominoQuestion({
        testId,
        instruction: "Test domino",
        difficulty: "medium",
        questionNumber: 1,
        dominos: [{ topDots: 1, bottomDots: 2, exactX: 10, exactY: 20 }],
        correctAnswer: { topDots: 2, bottomDots: 3 },
      });
      await domino.save();

      const arrow = new ArrowQuestion({
        testId,
        instruction: "Test arrow",
        difficulty: "hard",
        questionNumber: 2,
        dominos: [{ topDots: 1, bottomDots: 2, exactX: 10, exactY: 20 }],
        arrows: [{ exactX: 15, exactY: 25, angle: 45 }],
        correctAnswer: { topDots: 2, bottomDots: 3 },
      });
      await arrow.save();

      const mc = new MultipleChoiceQuestion({
        testId,
        instruction: "Test MC",
        difficulty: "easy",
        questionNumber: 3,
        propositions: [{ text: "Test proposition", correctAnswer: "V" }],
      });
      await mc.save();
    });

    it("should get all questions for a test", async () => {
      const response = await request(app)
        .get(`/api/questions/tests/${testId}/questions`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);
      expect(response.body.data).toHaveLength(3);

      const questionTypes = response.body.data.map((q) => q.questionType);
      expect(questionTypes).toContain("DominoQuestion");
      expect(questionTypes).toContain("ArrowQuestion");
      expect(questionTypes).toContain("MultipleChoiceQuestion");
    });
  });
});
