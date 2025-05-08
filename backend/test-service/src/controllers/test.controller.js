const { StatusCodes } = require("http-status-codes");
const { Test } = require("../models");
const { AppError } = require("../middleware/errorHandler");

// Create a new test
const createTest = async (req, res) => {
  const test = await Test.create({
    ...req.body,
    createdBy: req.user.id, // Assuming user ID comes from authentication middleware
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    data: test,
  });
};

// Get all tests with filtering options
const getAllTests = async (req, res) => {
  const {
    category,
    type,
    difficulty,
    isActive,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

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

  res.status(StatusCodes.OK).json({
    success: true,
    data: tests,
    pagination: {
      total: totalTests,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(totalTests / limit),
    },
  });
};

// Get a single test by ID
const getTestById = async (req, res) => {
  const { id } = req.params;

  const test = await Test.findById(id);

  if (!test) {
    throw new AppError(`Test not found with id ${id}`, StatusCodes.NOT_FOUND);
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: test,
  });
};

// Get a test with its questions
const getTestWithQuestions = async (req, res) => {
  const { id } = req.params;

  const test = await Test.findById(id).populate("questions");

  if (!test) {
    throw new AppError(`Test not found with id ${id}`, StatusCodes.NOT_FOUND);
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: test,
  });
};

// Update a test
const updateTest = async (req, res) => {
  const { id } = req.params;

  const test = await Test.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!test) {
    throw new AppError(`Test not found with id ${id}`, StatusCodes.NOT_FOUND);
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: test,
  });
};

// Delete a test
const deleteTest = async (req, res) => {
  const { id } = req.params;

  const test = await Test.findByIdAndDelete(id);

  if (!test) {
    throw new AppError(`Test not found with id ${id}`, StatusCodes.NOT_FOUND);
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: {},
  });
};

module.exports = {
  createTest,
  getAllTests,
  getTestById,
  getTestWithQuestions,
  updateTest,
  deleteTest,
};
