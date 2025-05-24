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
  Question,
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
  socket: { remoteAddress: "127.0.0.1" },
});

// Test data
const mockObjectId = new mongoose.Types.ObjectId();
const mockTestId = new mongoose.Types.ObjectId();
const mockQuestionId = new mongoose.Types.ObjectId();
const mockAttemptId = new mongoose.Types.ObjectId();
const mockCandidateId = "candidate-123";

describe("Attempt Controller Tests", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();

    // Setup default mocks that don't throw errors
    setupBasicMocks();
  });

  const setupBasicMocks = () => {
    // Mock AppError to create error objects without throwing
    AppError.mockImplementation((message, statusCode) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    });

    // Mock logger
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();

    // Create mock response object with all required methods
    const createMockResponse = () => ({
      _id: mockObjectId,
      attemptId: mockAttemptId,
      questionId: mockQuestionId,
      candidateId: mockCandidateId,
      visitCount: 1,
      timeSpent: 0,
      isFlagged: false,
      isSkipped: false,
      isCorrect: false,
      dominoAnswer: null,
      propositionResponses: null,
      recordAnswer: jest.fn().mockResolvedValue(true),
      toggleFlag: jest.fn().mockResolvedValue(true),
      recordVisit: jest.fn().mockResolvedValue(true),
      skipQuestion: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue({
        _id: mockObjectId,
        visitCount: 1,
        timeSpent: 0,
        isFlagged: false,
        isSkipped: false,
        isCorrect: false,
      }),
    });

    // Mock Test model
    Test.findById = jest.fn().mockResolvedValue({
      _id: mockTestId,
      name: "Test Name",
      description: "Test Description",
      duration: 30,
      difficulty: "medium",
      type: "domino",
      isActive: true,
      save: jest.fn().mockResolvedValue(true),
    });

    // Mock Question model with proper chain
    Question.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: mockQuestionId,
          testId: mockTestId,
          questionNumber: 1,
          questionType: "DominoQuestion",
          instruction: "Solve this domino",
          difficulty: "medium",
          toObject: jest.fn().mockReturnValue({
            _id: mockQuestionId,
            questionNumber: 1,
            questionType: "DominoQuestion",
            instruction: "Solve this domino",
          }),
        },
      ]),
    });
    Question.countDocuments = jest.fn().mockResolvedValue(1);

    // Mock DominoQuestion and MultipleChoiceQuestion
    DominoQuestion.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: mockQuestionId,
          testId: mockTestId,
          questionNumber: 1,
          questionType: "DominoQuestion",
          instruction: "Solve this domino",
          difficulty: "medium",
          correctAnswer: { dominoId: 1, topValue: 3, bottomValue: 2 },
        },
      ]),
    });

    MultipleChoiceQuestion.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });

    // Mock TestAttempt with proper methods
    const mockAttempt = {
      _id: mockAttemptId,
      testId: mockTestId,
      candidateId: mockCandidateId,
      status: "in-progress",
      startTime: new Date(),
      lastActivityAt: new Date(),
      score: 0,
      percentageScore: 0,
      metrics: {
        visitCounts: new Map(),
        timePerQuestion: new Map(),
        questionsAnswered: 0,
        questionsSkipped: 0,
        answerChanges: 0,
        flaggedQuestions: 0,
      },
      save: jest.fn().mockResolvedValue(true),
      finishAttempt: jest.fn().mockResolvedValue(true),
      calculateScore: jest.fn().mockResolvedValue(true),
      markModified: jest.fn(),
      toObject: jest.fn().mockReturnValue({
        _id: mockAttemptId,
        testId: mockTestId,
        candidateId: mockCandidateId,
        status: "in-progress",
        score: 0,
        percentageScore: 0,
      }),
    };

    TestAttempt.findById = jest.fn().mockResolvedValue(mockAttempt);
    TestAttempt.findOne = jest.fn().mockResolvedValue(null);
    TestAttempt.create = jest.fn().mockResolvedValue(mockAttempt);
    TestAttempt.countDocuments = jest.fn().mockResolvedValue(1);
    TestAttempt.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockAttempt]),
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockAttempt]),
        }),
      }),
    });

    // Mock QuestionResponse
    QuestionResponse.findOne = jest
      .fn()
      .mockResolvedValue(createMockResponse());
    QuestionResponse.create = jest.fn().mockResolvedValue(createMockResponse());
    QuestionResponse.find = jest.fn().mockResolvedValue([createMockResponse()]);
  };

  describe("startTestAttempt", () => {
    beforeEach(() => {
      req.params = { testId: mockTestId };
      req.body = { candidateId: mockCandidateId };
      req.headers = { "user-agent": "Mozilla/5.0 Chrome/86.0.4240.75" };
    });

    test("should create a new test attempt successfully", async () => {
      await attemptController.startTestAttempt(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
      expect(TestAttempt.create).toHaveBeenCalled();
      expect(QuestionResponse.create).toHaveBeenCalled();
    });

    test("should resume existing in-progress attempt", async () => {
      const existingAttempt = {
        _id: mockAttemptId,
        testId: mockTestId,
        candidateId: mockCandidateId,
        status: "in-progress",
        lastActivityAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };
      TestAttempt.findOne.mockResolvedValueOnce(existingAttempt);

      await attemptController.startTestAttempt(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining("Resuming existing test attempt"),
        })
      );
      expect(existingAttempt.save).toHaveBeenCalled();
    });

    test("should prevent starting if test is inactive", async () => {
      Test.findById.mockResolvedValue({
        _id: mockTestId,
        isActive: false,
      });

      await expect(
        attemptController.startTestAttempt(req, res)
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("not active"),
        })
      );
    });

    test("should prevent starting if test not found", async () => {
      Test.findById.mockResolvedValue(null);

      await expect(
        attemptController.startTestAttempt(req, res)
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("not found"),
        })
      );
    });

    test("should prevent starting if candidate already completed test", async () => {
      TestAttempt.findOne
        .mockResolvedValueOnce(null) // No in-progress attempt
        .mockResolvedValueOnce({
          // But has completed attempt
          _id: mockAttemptId,
          status: "completed",
        });

      await expect(
        attemptController.startTestAttempt(req, res)
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("already completed"),
        })
      );
    });
  });

  describe("getAttemptById", () => {
    beforeEach(() => {
      req.params = { id: mockAttemptId };
    });

    test("should return attempt by ID successfully", async () => {
      const mockAttempt = {
        _id: mockAttemptId,
        testId: mockTestId,
        candidateId: mockCandidateId,
        status: "in-progress",
      };

      TestAttempt.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAttempt),
      });

      await attemptController.getAttemptById(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
    });

    test("should return 404 if attempt not found", async () => {
      TestAttempt.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(attemptController.getAttemptById(req, res)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("not found"),
        })
      );
    });

    test("should return 400 for invalid attempt ID format", async () => {
      req.params = { id: "invalid-id" };

      await expect(attemptController.getAttemptById(req, res)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("Invalid attempt ID format"),
        })
      );
    });
  });

  describe("getAttemptQuestions", () => {
    beforeEach(() => {
      req.params = { id: mockAttemptId };
    });

    test("should return questions with responses for in-progress attempt", async () => {
      await attemptController.getAttemptQuestions(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            attempt: expect.any(Object),
            questions: expect.any(Array),
          }),
        })
      );
    });

    test("should return 404 if attempt not found", async () => {
      TestAttempt.findById.mockResolvedValue(null);

      await expect(
        attemptController.getAttemptQuestions(req, res)
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("not found"),
        })
      );
    });
  });

  describe("submitAnswer", () => {
    beforeEach(() => {
      req.params = { attemptId: mockAttemptId, questionId: mockQuestionId };
      req.body = { candidateId: mockCandidateId };
    });

    test("should submit domino answer successfully", async () => {
      req.body.answer = { dominoId: 1, topValue: 3, bottomValue: 2 };

      await attemptController.submitAnswer(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
    });

    test("should submit multiple choice answer successfully", async () => {
      req.body.answer = [
        { propositionIndex: 0, candidateEvaluation: "V" },
        { propositionIndex: 1, candidateEvaluation: "F" },
      ];

      await attemptController.submitAnswer(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    test("should reject answer for completed attempt", async () => {
      TestAttempt.findById.mockResolvedValue({
        _id: mockAttemptId,
        candidateId: mockCandidateId,
        status: "completed",
      });

      req.body.answer = { dominoId: 1, topValue: 3, bottomValue: 2 };

      await expect(attemptController.submitAnswer(req, res)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("Cannot submit answer"),
        })
      );
    });

    test("should reject unauthorized candidate", async () => {
      req.body.candidateId = "different-candidate";
      req.body.answer = { dominoId: 1, topValue: 3, bottomValue: 2 };

      await expect(attemptController.submitAnswer(req, res)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("Unauthorized"),
        })
      );
    });

    test("should reject missing candidateId", async () => {
      req.body = { answer: { dominoId: 1, topValue: 3, bottomValue: 2 } };

      await expect(attemptController.submitAnswer(req, res)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("required"),
        })
      );
    });

    test("should reject missing answer", async () => {
      req.body = { candidateId: mockCandidateId };

      await expect(attemptController.submitAnswer(req, res)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("required"),
        })
      );
    });
  });

  describe("toggleQuestionFlag", () => {
    beforeEach(() => {
      req.params = { attemptId: mockAttemptId, questionId: mockQuestionId };
      req.body = { candidateId: mockCandidateId };
    });

    test("should toggle flag successfully", async () => {
      await attemptController.toggleQuestionFlag(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    test("should create response if not found when flagging", async () => {
      QuestionResponse.findOne.mockResolvedValueOnce(null);

      await attemptController.toggleQuestionFlag(req, res);

      expect(QuestionResponse.create).toHaveBeenCalled();
    });
  });

  describe("visitQuestion", () => {
    beforeEach(() => {
      req.params = { attemptId: mockAttemptId, questionId: mockQuestionId };
      req.body = { candidateId: mockCandidateId };
    });

    test("should record visit successfully", async () => {
      await attemptController.visitQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    test("should handle timeSpentOnPrevious parameter", async () => {
      req.body.timeSpentOnPrevious = 5000;

      await attemptController.visitQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    test("should reject negative time spent", async () => {
      req.body.timeSpentOnPrevious = -1000;

      await expect(attemptController.visitQuestion(req, res)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("Invalid timeSpentOnPrevious"),
        })
      );
    });
  });

  describe("skipQuestion", () => {
    beforeEach(() => {
      req.params = { attemptId: mockAttemptId, questionId: mockQuestionId };
      req.body = { candidateId: mockCandidateId };
    });

    test("should skip question successfully", async () => {
      await attemptController.skipQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    test("should create response if not found when skipping", async () => {
      QuestionResponse.findOne.mockResolvedValueOnce(null);

      await attemptController.skipQuestion(req, res);

      expect(QuestionResponse.create).toHaveBeenCalled();
    });
  });

  describe("completeAttempt", () => {
    beforeEach(() => {
      req.params = { id: mockAttemptId };
      req.body = { candidateId: mockCandidateId };
    });

    test("should complete attempt successfully", async () => {
      const attemptWithMethods = {
        _id: mockAttemptId,
        testId: mockTestId,
        candidateId: mockCandidateId,
        status: "in-progress",
        finishAttempt: jest.fn().mockResolvedValue(true),
        calculateScore: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: mockAttemptId,
          score: 85,
          percentageScore: 85,
          status: "completed",
        }),
      };

      TestAttempt.findById.mockResolvedValue(attemptWithMethods);

      await attemptController.completeAttempt(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Test attempt completed successfully",
        })
      );
      expect(attemptWithMethods.finishAttempt).toHaveBeenCalledWith(
        "completed"
      );
      expect(attemptWithMethods.calculateScore).toHaveBeenCalled();
    });

    test("should handle already completed attempt", async () => {
      const completedAttempt = {
        _id: mockAttemptId,
        status: "completed",
        toObject: jest.fn().mockReturnValue({
          status: "completed",
          score: 90,
        }),
      };
      TestAttempt.findById.mockResolvedValue(completedAttempt);

      await attemptController.completeAttempt(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Attempt already completed",
        })
      );
    });
  });

  describe("getCandidateAttempts", () => {
    beforeEach(() => {
      req.params = { candidateId: mockCandidateId };
    });

    test("should return candidate attempts successfully", async () => {
      await attemptController.getCandidateAttempts(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: expect.any(Number),
          data: expect.any(Array),
        })
      );
    });

    test("should filter by status", async () => {
      req.query = { status: "completed" };

      await attemptController.getCandidateAttempts(req, res);

      expect(TestAttempt.find).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateId: mockCandidateId,
          status: "completed",
        })
      );
    });

    test("should reject invalid status", async () => {
      req.query = { status: "invalid-status" };

      await expect(
        attemptController.getCandidateAttempts(req, res)
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("Invalid status"),
        })
      );
    });
  });

  describe("getTestAttempts", () => {
    beforeEach(() => {
      req.params = { testId: mockTestId };
    });

    test("should return test attempts with pagination", async () => {
      req.query = { page: 1, limit: 10 };

      await attemptController.getTestAttempts(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: expect.any(Number),
          totalCount: expect.any(Number),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            totalPages: expect.any(Number),
          }),
          data: expect.any(Array),
        })
      );
    });
  });

  describe("getAttemptResults", () => {
    beforeEach(() => {
      req.params = { id: mockAttemptId };
    });

    test("should return results for completed attempt", async () => {
      const completedAttempt = {
        _id: mockAttemptId,
        testId: {
          _id: mockTestId,
          name: "Test Name",
          id: mockTestId,
        },
        candidateId: mockCandidateId,
        status: "completed",
        score: 85,
        percentageScore: 85,
      };

      TestAttempt.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(completedAttempt),
      });

      await attemptController.getAttemptResults(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            attempt: expect.any(Object),
            questions: expect.any(Array),
          }),
        })
      );
    });

    test("should reject results for in-progress attempt", async () => {
      const inProgressAttempt = {
        _id: mockAttemptId,
        status: "in-progress",
      };

      TestAttempt.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(inProgressAttempt),
      });

      await expect(
        attemptController.getAttemptResults(req, res)
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("Results are only available"),
        })
      );
    });
  });

  // describe("Helper Functions", () => {
  //   describe("getUserDevice", () => {
  //     test("should identify Android device", () => {
  //       const userAgent = "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36";
  //       expect(attemptController.getUserDevice(userAgent)).toBe("Android");
  //     });

  //     test("should identify iOS device", () => {
  //       const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)";
  //       expect(attemptController.getUserDevice(userAgent)).toBe("iOS");
  //     });

  //     test("should identify Windows device", () => {
  //       const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
  //       expect(attemptController.getUserDevice(userAgent)).toBe("Windows");
  //     });

  //     test("should return Unknown for empty user agent", () => {
  //       expect(attemptController.getUserDevice()).toBe("Unknown");
  //     });
  //   });

  //   describe("getUserBrowser", () => {
  //     test("should identify Chrome browser", () => {
  //       const userAgent = "Mozilla/5.0 Chrome/86.0.4240.75";
  //       expect(attemptController.getUserBrowser(userAgent)).toBe("Chrome");
  //     });

  //     test("should identify Firefox browser", () => {
  //       const userAgent = "Mozilla/5.0 Firefox/82.0";
  //       expect(attemptController.getUserBrowser(userAgent)).toBe("Firefox");
  //     });

  //     test("should identify Safari browser", () => {
  //       const userAgent = "Mozilla/5.0 Safari/605.1.15";
  //       expect(attemptController.getUserBrowser(userAgent)).toBe("Safari");
  //     });

  //     test("should return Unknown for empty user agent", () => {
  //       expect(attemptController.getUserBrowser()).toBe("Unknown");
  //     });
  //   });
  // });

  describe("Error Handling", () => {
    test("should handle invalid ObjectId formats", async () => {
      req.params = { attemptId: "invalid-id", questionId: mockQuestionId };
      req.body = { candidateId: mockCandidateId, answer: {} };

      await expect(attemptController.submitAnswer(req, res)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("Invalid attempt ID format"),
        })
      );
    });

    test("should handle missing required fields", async () => {
      req.params = { attemptId: mockAttemptId, questionId: mockQuestionId };
      req.body = {}; // Missing candidateId

      await expect(attemptController.submitAnswer(req, res)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("required"),
        })
      );
    });

    test("should prevent operations on non-existent attempts", async () => {
      TestAttempt.findById.mockResolvedValue(null);

      req.params = { attemptId: mockAttemptId, questionId: mockQuestionId };
      req.body = { candidateId: mockCandidateId, answer: {} };

      await expect(attemptController.submitAnswer(req, res)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("not found"),
        })
      );
    });
  });
});
