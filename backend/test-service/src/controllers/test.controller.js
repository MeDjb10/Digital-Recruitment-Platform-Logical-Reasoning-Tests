const { StatusCodes } = require("http-status-codes");
const { AppError } = require("../middleware/errorHandler");
const testService = require("../services/test.service");

class TestController {
  /**
   * Create a new test
   */
  async createTest(req, res) {
    if (!req.user?.id) {
      throw new AppError(
        "User authentication required",
        StatusCodes.UNAUTHORIZED
      );
    }

    const test = await testService.createTest(req.body, req.user.id);

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: test,
    });
  }

  /**
   * Get all tests with filtering options
   */
  async getAllTests(req, res) {
    const result = await testService.getAllTests(req.query);

    res.status(StatusCodes.OK).json({
      success: true,
      data: result.tests,
      pagination: result.pagination,
    });
  }

  /**
   * Get a single test by ID
   */
  async getTestById(req, res) {
    const { id } = req.params;
    const test = await testService.getTestById(id);

    res.status(StatusCodes.OK).json({
      success: true,
      data: test,
    });
  }

  /**
   * Get a test with its questions
   */
  async getTestWithQuestions(req, res) {
    const { id } = req.params;
    const test = await testService.getTestWithQuestions(id);

    res.status(StatusCodes.OK).json({
      success: true,
      data: test,
    });
  }

  /**
   * Update a test
   */
  async updateTest(req, res) {
    const { id } = req.params;
    const test = await testService.updateTest(id, req.body);

    res.status(StatusCodes.OK).json({
      success: true,
      data: test,
    });
  }

  /**
   * Delete a test
   */
  async deleteTest(req, res) {
    const { id } = req.params;
    await testService.deleteTest(id);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {},
    });
  }
}

const testController = new TestController();

module.exports = {
  createTest: testController.createTest.bind(testController),
  getAllTests: testController.getAllTests.bind(testController),
  getTestById: testController.getTestById.bind(testController),
  getTestWithQuestions:
    testController.getTestWithQuestions.bind(testController),
  updateTest: testController.updateTest.bind(testController),
  deleteTest: testController.deleteTest.bind(testController),
};
