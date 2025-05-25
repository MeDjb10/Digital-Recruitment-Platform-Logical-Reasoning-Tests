const mongoose = require("mongoose");
const { Test } = require("../models");
const { AppError } = require("../middleware/errorHandler");
const { StatusCodes } = require("http-status-codes");
const logger = require("../utils/logger");

class TestService {
  /**
   * Create a new test
   */
  async createTest(testData, createdBy) {
    const test = await Test.create({
      ...testData,
      createdBy,
    });

    logger.info(`Test created successfully: ${test._id} by user ${createdBy}`);
    return test.toObject();
  }

  /**
   * Get all tests with filtering and pagination
   */
  async getAllTests(filters = {}, options = {}) {
    const {
      category,
      type,
      difficulty,
      isActive,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = { ...filters, ...options };

    // Build query
    const query = {};
    if (category) query.category = category;
    if (type) query.type = type;
    if (difficulty) query.difficulty = difficulty;
    if (isActive !== undefined) query.isActive = isActive === "true";

    // Pagination
    const skip = (page - 1) * limit;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query
    const tests = await Test.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTests = await Test.countDocuments(query);

    return {
      tests: tests.map((test) => test.toObject()),
      pagination: {
        total: totalTests,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalTests / limit),
      },
    };
  }

  /**
   * Get a single test by ID
   */
  async getTestById(testId) {
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      throw new AppError("Invalid test ID format", StatusCodes.BAD_REQUEST);
    }

    const test = await Test.findById(testId);

    if (!test) {
      throw new AppError(
        `Test not found with id ${testId}`,
        StatusCodes.NOT_FOUND
      );
    }

    return test.toObject();
  }

  /**
   * Get a test with its questions populated
   */
  async getTestWithQuestions(testId) {
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      throw new AppError("Invalid test ID format", StatusCodes.BAD_REQUEST);
    }

    const test = await Test.findById(testId).populate("questions");

    if (!test) {
      throw new AppError(
        `Test not found with id ${testId}`,
        StatusCodes.NOT_FOUND
      );
    }

    return test.toObject();
  }

  /**
   * Update a test
   */
  async updateTest(testId, updateData) {
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      throw new AppError("Invalid test ID format", StatusCodes.BAD_REQUEST);
    }

    const test = await Test.findByIdAndUpdate(testId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!test) {
      throw new AppError(
        `Test not found with id ${testId}`,
        StatusCodes.NOT_FOUND
      );
    }

    logger.info(`Test updated successfully: ${testId}`);
    return test.toObject();
  }

  /**
   * Delete a test
   */
  async deleteTest(testId) {
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      throw new AppError("Invalid test ID format", StatusCodes.BAD_REQUEST);
    }

    const test = await Test.findByIdAndDelete(testId);

    if (!test) {
      throw new AppError(
        `Test not found with id ${testId}`,
        StatusCodes.NOT_FOUND
      );
    }

    logger.info(`Test deleted successfully: ${testId}`);
    return { deleted: true };
  }
}

module.exports = new TestService();
