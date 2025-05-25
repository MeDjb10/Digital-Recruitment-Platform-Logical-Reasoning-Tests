const { StatusCodes } = require("http-status-codes");
const { AppError } = require("../middleware/errorHandler");
const questionService = require("../services/question.service");

class QuestionController {
  /**
   * Create a new question
   */
  async createQuestion(req, res) {
    const { testId } = req.params;
    const question = await questionService.createQuestion(testId, req.body);

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: question,
    });
  }

  /**
   * Get all questions for a test
   */
  async getQuestionsByTestId(req, res) {
    const { testId } = req.params;
    const result = await questionService.getQuestionsByTestId(
      testId,
      req.query
    );

    res.status(StatusCodes.OK).json({
      success: true,
      count: result.questions.length,
      totalCount: result.pagination.totalCount,
      pagination: result.pagination,
      data: result.questions,
    });
  }

  /**
   * Get a single question by ID
   */
  async getQuestionById(req, res) {
    const { id } = req.params;
    const question = await questionService.getQuestionById(id);

    res.status(StatusCodes.OK).json({
      success: true,
      data: question,
    });
  }

  /**
   * Update a question by ID
   */
  async updateQuestion(req, res) {
    const { id } = req.params;
    const question = await questionService.updateQuestion(id, req.body);

    res.status(StatusCodes.OK).json({
      success: true,
      data: question,
    });
  }

  /**
   * Delete a question by ID
   */
  async deleteQuestion(req, res) {
    const { id } = req.params;
    await questionService.deleteQuestion(id);

    res.status(StatusCodes.OK).json({
      success: true,
    });
  }

  /**
   * Validate domino question structure
   */
  async validateDominoQuestion(req, res) {
    const result = await questionService.validateDominoQuestionStructure(
      req.body
    );

    res.status(StatusCodes.OK).json(result);
  }

  /**
   * Move a question's position in the test
   */
  async moveQuestionPosition(req, res) {
    const { id } = req.params;
    const { newPosition } = req.body;

    const result = await questionService.moveQuestionPosition(id, newPosition);

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.message,
      data: result.question,
    });
  }

  /**
   * Duplicate a question
   */
  async duplicateQuestion(req, res) {
    const { id } = req.params;
    const question = await questionService.duplicateQuestion(id);

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: question,
    });
  }
}

const questionController = new QuestionController();

module.exports = {
  createQuestion: questionController.createQuestion.bind(questionController),
  getQuestionsByTestId:
    questionController.getQuestionsByTestId.bind(questionController),
  getQuestionById: questionController.getQuestionById.bind(questionController),
  updateQuestion: questionController.updateQuestion.bind(questionController),
  deleteQuestion: questionController.deleteQuestion.bind(questionController),
  validateDominoQuestion:
    questionController.validateDominoQuestion.bind(questionController),
  moveQuestionPosition:
    questionController.moveQuestionPosition.bind(questionController),
  duplicateQuestion:
    questionController.duplicateQuestion.bind(questionController),
};
