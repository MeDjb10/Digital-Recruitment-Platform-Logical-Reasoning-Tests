const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const {
  QuestionTemplate,
  DominoTemplate,
  ArrowTemplate,
  MultipleChoiceTemplate,
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

describe("Question Template Tests", () => {
  let templateId;

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

  afterEach(async () => {
    // Clean up templates
    await QuestionTemplate.deleteMany({});
  });

  describe("DominoTemplate Creation", () => {
    it("should create a domino template successfully", async () => {
      const dominoTemplateData = {
        name: "Basic Sequence Template",
        description: "A template for basic domino sequences",
        category: "domino",
        createdBy: "mock-user-id",
        isPublic: true,
        tags: ["sequence", "basic"],
        templateData: {
          dominoPattern: "sequence",
          difficulty: "medium",
          sampleDominos: [
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
          sampleAnswer: { topDots: 3, bottomDots: 4 },
          instructions: "Find the next domino in the sequence",
        },
      };

      // Since we don't have template routes, we'll test direct model creation
      const template = new QuestionTemplate(dominoTemplateData);
      const savedTemplate = await template.save();

      expect(savedTemplate.name).toBe("Basic Sequence Template");
      expect(savedTemplate.category).toBe("domino");
      expect(savedTemplate.templateData.dominoPattern).toBe("sequence");
      expect(savedTemplate.usageCount).toBe(0);
    });
  });

  describe("ArrowTemplate Creation", () => {
    it("should create an arrow template successfully", async () => {
      const arrowTemplateData = {
        name: "Arrow Pattern Template",
        description: "A template for arrow pattern questions",
        category: "arrow",
        createdBy: "mock-user-id",
        isPublic: false,
        tags: ["arrows", "pattern", "advanced"],
        templateData: {
          arrowPattern: "rotation",
          difficulty: "hard",
          sampleDominos: [
            { topDots: 1, bottomDots: 2, exactX: 10, exactY: 20 },
            { topDots: 2, bottomDots: 3, exactX: 30, exactY: 20 },
          ],
          sampleArrows: [
            { exactX: 15, exactY: 25, angle: 45 },
            { exactX: 35, exactY: 25, angle: 90 },
          ],
          sampleAnswer: { topDots: 3, bottomDots: 4 },
          instructions: "Follow the arrow pattern to find the missing domino",
        },
      };

      const template = new QuestionTemplate(arrowTemplateData);
      const savedTemplate = await template.save();

      expect(savedTemplate.name).toBe("Arrow Pattern Template");
      expect(savedTemplate.category).toBe("arrow");
      expect(savedTemplate.templateData.arrowPattern).toBe("rotation");
      expect(savedTemplate.isPublic).toBe(false);
    });
  });

  describe("MultipleChoiceTemplate Creation", () => {
    it("should create a multiple choice template successfully", async () => {
      const mcTemplateData = {
        name: "Logic Propositions Template",
        description: "A template for logical reasoning propositions",
        category: "multiple-choice",
        createdBy: "mock-user-id",
        isPublic: true,
        tags: ["logic", "propositions", "true-false"],
        templateData: {
          propositionType: "logical",
          difficulty: "easy",
          samplePropositions: [
            { text: "All cats are animals", correctAnswer: "V" },
            { text: "Some animals are not cats", correctAnswer: "V" },
            { text: "All animals are cats", correctAnswer: "F" },
          ],
          instructions:
            "Determine if each proposition is True (V), False (F), or Uncertain (?)",
        },
      };

      const template = new QuestionTemplate(mcTemplateData);
      const savedTemplate = await template.save();

      expect(savedTemplate.name).toBe("Logic Propositions Template");
      expect(savedTemplate.category).toBe("multiple-choice");
      expect(savedTemplate.templateData.propositionType).toBe("logical");
      expect(savedTemplate.templateData.samplePropositions).toHaveLength(3);
    });
  });

  describe("Template Validation", () => {
    it("should fail to create template without required fields", async () => {
      const invalidTemplateData = {
        name: "Invalid Template",
        // Missing category, createdBy, templateData
      };

      const template = new QuestionTemplate(invalidTemplateData);

      try {
        await template.save();
        fail("Should have thrown validation error");
      } catch (error) {
        expect(error.name).toBe("ValidationError");
        expect(error.errors.category).toBeDefined();
        expect(error.errors.createdBy).toBeDefined();
        expect(error.errors.templateData).toBeDefined();
      }
    });

    it("should fail to create template with invalid category", async () => {
      const invalidTemplateData = {
        name: "Invalid Category Template",
        category: "invalid-category",
        createdBy: "mock-user-id",
        templateData: { test: "data" },
      };

      const template = new QuestionTemplate(invalidTemplateData);

      try {
        await template.save();
        fail("Should have thrown validation error");
      } catch (error) {
        expect(error.name).toBe("ValidationError");
        expect(error.errors.category).toBeDefined();
      }
    });
  });

  describe("Template Usage and Analytics", () => {
    beforeEach(async () => {
      const template = new QuestionTemplate({
        name: "Test Template",
        category: "domino",
        createdBy: "mock-user-id",
        templateData: { test: "data" },
        usageCount: 5,
      });
      const savedTemplate = await template.save();
      templateId = savedTemplate._id;
    });

    it("should increment usage count", async () => {
      const template = await QuestionTemplate.findById(templateId);
      expect(template.usageCount).toBe(5);

      template.usageCount += 1;
      await template.save();

      const updatedTemplate = await QuestionTemplate.findById(templateId);
      expect(updatedTemplate.usageCount).toBe(6);
    });

    it("should find templates by category", async () => {
      // Create additional templates
      await new QuestionTemplate({
        name: "Arrow Template 1",
        category: "arrow",
        createdBy: "mock-user-id",
        templateData: { test: "data" },
      }).save();

      await new QuestionTemplate({
        name: "Arrow Template 2",
        category: "arrow",
        createdBy: "mock-user-id",
        templateData: { test: "data" },
      }).save();

      const dominoTemplates = await QuestionTemplate.find({
        category: "domino",
      });
      const arrowTemplates = await QuestionTemplate.find({ category: "arrow" });

      expect(dominoTemplates).toHaveLength(1);
      expect(arrowTemplates).toHaveLength(2);
    });

    it("should find public templates only", async () => {
      // Create a private template
      await new QuestionTemplate({
        name: "Private Template",
        category: "multiple-choice",
        createdBy: "mock-user-id",
        isPublic: false,
        templateData: { test: "data" },
      }).save();

      // Create a public template
      await new QuestionTemplate({
        name: "Public Template",
        category: "multiple-choice",
        createdBy: "mock-user-id",
        isPublic: true,
        templateData: { test: "data" },
      }).save();

      const publicTemplates = await QuestionTemplate.find({ isPublic: true });
      const allTemplates = await QuestionTemplate.find({});

      expect(publicTemplates).toHaveLength(1);
      expect(allTemplates).toHaveLength(3); // Including the one from beforeEach
    });
  });
});
