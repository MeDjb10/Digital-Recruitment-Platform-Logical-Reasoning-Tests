const mongoose = require("mongoose");
const { StatusCodes } = require("http-status-codes");
const attemptController = require("./attempt.controller");
const { AppError } = require("../middleware/errorHandler");
const logger = require("../utils/logger");

// Import models directly
const {
  TestAttempt,
  QuestionResponse,
  Test,
  DominoQuestion,
  MultipleChoiceQuestion,
} = require("../models");

// Mock the models and dependencies
jest.mock("../models");
jest.mock("../middleware/errorHandler");
jest.mock("../utils/logger");

// Mock response and request objects
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (body = {}, params = {}, headers = {}, query = {}) => ({
  body,
  params,
  headers,
  query,
  connection: { remoteAddress: "127.0.0.1" },
});

// Mock ObjectId generation
const mockObjectId = new mongoose.Types.ObjectId();
const mockTestId = new mongoose.Types.ObjectId();
const mockQuestionId = new mongoose.Types.ObjectId();
const mockAttemptId = new mongoose.Types.ObjectId();
const mockCandidateId = "candidate-123";

describe("Attempt Controller", () => {
  let req, res;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup req, res objects
    req = mockRequest();
    res = mockResponse();

    // Setup chain method mocks
     const sortMockResult = [
       {
         _id: mockQuestionId,
         testId: mockTestId,
         questionNumber: 1,
         title: "Domino Question",
         instruction: "Solve this",
         questionType: "DominoQuestion",
         difficulty: "medium",
         correctAnswer: { top: 3, bottom: 2 },
         toObject: () => ({
           _id: mockQuestionId,
           testId: mockTestId,
           questionNumber: 1,
           title: "Domino Question",
           instruction: "Solve this",
           questionType: "DominoQuestion",
           difficulty: "medium",
           correctAnswer: { top: 3, bottom: 2 },
         }),
       },
     ];

     // Mock DominoQuestion.find().sort()
     const sortMock = jest.fn().mockReturnValue(sortMockResult);
     DominoQuestion.find = jest.fn().mockReturnValue({
       sort: sortMock,
     });

     // Mock MultipleChoiceQuestion.find().sort()
     MultipleChoiceQuestion.find = jest.fn().mockReturnValue({
       sort: jest.fn().mockReturnValue([]),
     });

     // Common mock setup
     Test.findById.mockResolvedValue({
       _id: mockTestId,
       name: "Test Name",
       description: "Test Description",
       duration: 30,
       difficulty: "medium",
       type: "domino",
     });


    // Create a mock attempt with the methods we need to spy on
    const attemptMock = {
      _id: mockAttemptId,
      testId: mockTestId,
      candidateId: mockCandidateId,
      status: "in-progress",
      metrics: {
        visitCounts: new Map(),
        timePerQuestion: new Map(),
      },
      save: jest.fn().mockResolvedValue(true),
      finishAttempt: jest.fn().mockResolvedValue(true),
      calculateScore: jest.fn().mockResolvedValue(true),
    };

    TestAttempt.findById.mockResolvedValue(attemptMock);

    QuestionResponse.findOne.mockResolvedValue({
      _id: mockObjectId,
      attemptId: mockAttemptId,
      questionId: mockQuestionId,
      candidateId: mockCandidateId,
      recordAnswer: jest.fn().mockResolvedValue(true),
      toggleFlag: jest.fn().mockResolvedValue(true),
      recordVisit: jest.fn().mockResolvedValue(true),
      skipQuestion: jest.fn().mockResolvedValue(true),
      timeSpent: 10,
      save: jest.fn().mockResolvedValue(true),
    });

    QuestionResponse.find.mockResolvedValue([
      {
        _id: mockObjectId,
        questionId: mockQuestionId,
        isCorrect: true,
        isSkipped: false,
        isHalfCorrect: false,
        isReversed: false,
        timeSpent: 20,
        visitCount: 2,
      },
    ]);

    TestAttempt.create.mockResolvedValue({
      _id: mockAttemptId,
      testId: mockTestId,
      candidateId: mockCandidateId,
      status: "in-progress",
    });

    QuestionResponse.create.mockResolvedValue({
      _id: mockObjectId,
      attemptId: mockAttemptId,
      questionId: mockQuestionId,
      candidateId: mockCandidateId,
    });

    // Mock AppError to properly check error throwing
    AppError.mockImplementation((message, statusCode) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    });
  });

  // Direct unit testing of helper functions
  describe("Helper Functions", () => {
    describe("getUserDevice", () => {
      it("should identify Android device", () => {
        const userAgent = "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36";
        expect(attemptController.getUserDevice(userAgent)).toBe("Android");
      });

      it("should identify iOS device", () => {
        const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3)";
        expect(attemptController.getUserDevice(userAgent)).toBe("iOS");
      });

      it("should identify Windows device", () => {
        const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
        expect(attemptController.getUserDevice(userAgent)).toBe("Windows");
      });

      it("should return Unknown for empty user agent", () => {
        expect(attemptController.getUserDevice()).toBe("Unknown");
      });
    });

    describe("getUserBrowser", () => {
      it("should identify Chrome browser", () => {
        const userAgent = "Mozilla/5.0 Chrome/86.0.4240.75";
        expect(attemptController.getUserBrowser(userAgent)).toBe("Chrome");
      });

      it("should identify Firefox browser", () => {
        const userAgent = "Mozilla/5.0 Firefox/78.0";
        expect(attemptController.getUserBrowser(userAgent)).toBe("Firefox");
      });

      it("should identify Safari browser", () => {
        const userAgent = "Mozilla/5.0 Safari/605.1.15";
        expect(attemptController.getUserBrowser(userAgent)).toBe("Safari");
      });

      it("should return Unknown for empty user agent", () => {
        expect(attemptController.getUserBrowser()).toBe("Unknown");
      });
    });
  });

  describe("startTestAttempt", () => {
    it("should create a new test attempt successfully", async () => {
      // Setup
      req.params = { testId: mockTestId };
      req.body = { candidateId: mockCandidateId };
      req.headers = { "user-agent": "Mozilla/5.0 Chrome/86.0.4240.75" };
      TestAttempt.findOne.mockResolvedValue(null);

      // Execute
      await attemptController.startTestAttempt(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.anything(),
        })
      );
      expect(TestAttempt.create).toHaveBeenCalled();
      expect(QuestionResponse.create).toHaveBeenCalled();
    });

    it("should return existing attempt if one is in progress", async () => {
      // Setup
      req.params = { testId: mockTestId };
      req.body = { candidateId: mockCandidateId };
      TestAttempt.findOne.mockResolvedValue({
        _id: mockAttemptId,
        testId: mockTestId,
        candidateId: mockCandidateId,
        status: "in-progress",
      });

      // Execute
      await attemptController.startTestAttempt(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining("Resuming existing test attempt"),
        })
      );
      expect(TestAttempt.create).not.toHaveBeenCalled();
    });

    it("should throw error if test does not exist", async () => {
      // Setup
      req.params = { testId: mockTestId };
      req.body = { candidateId: mockCandidateId };
      Test.findById.mockResolvedValue(null);

      // Temporarily override the mock to allow the error to propagate
      AppError.mockImplementation((message, statusCode) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        throw error; // Actually throw the error here
      });

      // Execute & Assert
      await expect(
        attemptController.startTestAttempt(req, res)
      ).rejects.toThrow();
    });
  });

  describe("getAttemptById", () => {
    it("should return attempt by ID", async () => {
      // Setup
      req.params = { id: mockAttemptId };

      // Execute
      await attemptController.getAttemptById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.anything(),
        })
      );
    });

    it("should throw error if attempt not found", async () => {
      // Setup
      req.params = { id: mockAttemptId };
      TestAttempt.findById.mockResolvedValue(null);

      // Temporarily override the mock to allow the error to propagate
      AppError.mockImplementation((message, statusCode) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        throw error; // Actually throw the error here
      });

      // Execute & Assert
      await expect(
        attemptController.getAttemptById(req, res)
      ).rejects.toThrow();
    });
  });

  describe("getAttemptQuestions", () => {
    it("should return attempt questions with responses", async () => {
      // Setup
      req.params = { id: mockAttemptId };

      // Execute
      await attemptController.getAttemptQuestions(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            questions: expect.any(Array),
            attempt: expect.anything(),
          }),
        })
      );
    });
  });

  describe("submitAnswer", () => {
    it("should submit answer successfully", async () => {
      // Setup
      req.params = { attemptId: mockAttemptId, questionId: mockQuestionId };
      req.body = {
        candidateId: mockCandidateId,
        answer: { top: 2, bottom: 3 },
      };

      // Execute
      await attemptController.submitAnswer(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });

  describe("toggleQuestionFlag", () => {
    it("should toggle flag successfully", async () => {
      // Setup
      req.params = { attemptId: mockAttemptId, questionId: mockQuestionId };
      req.body = { candidateId: mockCandidateId };

      // Execute
      await attemptController.toggleQuestionFlag(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });

  describe("completeAttempt", () => {
    it("should complete attempt successfully", async () => {
      // Setup
      req.params = { id: mockAttemptId };
      req.body = { candidateId: mockCandidateId };

      const attemptWithMethods = {
        _id: mockAttemptId,
        testId: mockTestId,
        candidateId: mockCandidateId,
        status: "in-progress",
        finishAttempt: jest.fn().mockResolvedValue(true),
        calculateScore: jest.fn().mockResolvedValue(true),
      };

      TestAttempt.findById.mockResolvedValue(attemptWithMethods);

      // Execute
      await attemptController.completeAttempt(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
      expect(attemptWithMethods.finishAttempt).toHaveBeenCalled();
      expect(attemptWithMethods.calculateScore).toHaveBeenCalled();
    });
  });

  describe("getCandidateAttempts", () => {
    it("should return candidate's attempts", async () => {
      // Setup
      req.params = { candidateId: mockCandidateId };
      TestAttempt.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue([
            {
              _id: mockAttemptId,
              testId: { name: "Test Name" },
              status: "completed",
            },
          ]),
        }),
      });

      // Execute
      await attemptController.getCandidateAttempts(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalled();
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.success).toBe(true);
      expect(Array.isArray(jsonArg.data)).toBe(true);
    });
  });
});
