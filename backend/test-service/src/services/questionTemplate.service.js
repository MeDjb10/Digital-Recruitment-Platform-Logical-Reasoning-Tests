const mongoose = require("mongoose");
const {
  QuestionTemplate,
  DominoTemplate,
  ArrowTemplate,
  MultipleChoiceTemplate,
} = require("../models");
const { AppError } = require("../middleware/errorHandler");
const { StatusCodes } = require("http-status-codes");
const logger = require("../utils/logger");

class QuestionTemplateService {
  /**
   * Create a new template
   */
  async createTemplate(templateData, createdBy) {
    const completeTemplateData = {
      ...templateData,
      createdBy,
    };

    let template;

    try {
      switch (templateData.category) {
        case "domino":
          template = new DominoTemplate(completeTemplateData);
          break;
        case "arrow":
          template = new ArrowTemplate(completeTemplateData);
          break;
        case "multiple-choice":
          template = new MultipleChoiceTemplate(completeTemplateData);
          break;
        default:
          throw new AppError(
            "Invalid template category",
            StatusCodes.BAD_REQUEST
          );
      }

      await template.save();
      logger.info(`Template created successfully: ${template._id}`);
      return template.toObject();
    } catch (error) {
      if (error.name === "ValidationError") {
        throw new AppError(
          `Validation error: ${error.message}`,
          StatusCodes.BAD_REQUEST
        );
      }
      throw error;
    }
  }

  /**
   * Get templates with filters and pagination
   */
  async getTemplates(filters = {}, options = {}) {
    const {
      category,
      createdBy,
      isPublic,
      tags,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = { ...filters, ...options };

    // Build query
    const query = {};
    if (category) query.category = category;
    if (createdBy) query.createdBy = createdBy;
    if (isPublic !== undefined) query.isPublic = isPublic === "true";
    if (tags && tags.length > 0) query.tags = { $in: tags };

    // Pagination
    const skip = (page - 1) * limit;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query
    const templates = await QuestionTemplate.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTemplates = await QuestionTemplate.countDocuments(query);

    return {
      templates: templates.map((template) => template.toObject()),
      pagination: {
        total: totalTemplates,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalTemplates / limit),
      },
    };
  }

  /**
   * Get a single template by ID
   */
  async getTemplateById(templateId) {
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw new AppError("Invalid template ID format", StatusCodes.BAD_REQUEST);
    }

    const template = await QuestionTemplate.findById(templateId);

    if (!template) {
      throw new AppError(
        `Template not found with id ${templateId}`,
        StatusCodes.NOT_FOUND
      );
    }

    return template.toObject();
  }

  /**
   * Update a template
   */
  async updateTemplate(templateId, updateData, userId) {
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw new AppError("Invalid template ID format", StatusCodes.BAD_REQUEST);
    }

    const template = await QuestionTemplate.findById(templateId);

    if (!template) {
      throw new AppError(
        `Template not found with id ${templateId}`,
        StatusCodes.NOT_FOUND
      );
    }

    // Check ownership (unless public template and user is admin)
    if (template.createdBy !== userId && !template.isPublic) {
      throw new AppError(
        "You don't have permission to update this template",
        StatusCodes.FORBIDDEN
      );
    }

    const updatedTemplate = await QuestionTemplate.findByIdAndUpdate(
      templateId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    logger.info(`Template updated successfully: ${templateId}`);
    return updatedTemplate.toObject();
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId, userId) {
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw new AppError("Invalid template ID format", StatusCodes.BAD_REQUEST);
    }

    const template = await QuestionTemplate.findById(templateId);

    if (!template) {
      throw new AppError(
        `Template not found with id ${templateId}`,
        StatusCodes.NOT_FOUND
      );
    }

    // Check ownership
    if (template.createdBy !== userId) {
      throw new AppError(
        "You don't have permission to delete this template",
        StatusCodes.FORBIDDEN
      );
    }

    await QuestionTemplate.findByIdAndDelete(templateId);

    logger.info(`Template deleted successfully: ${templateId}`);
    return { deleted: true };
  }

  /**
   * Increment template usage count
   */
  async incrementUsage(templateId) {
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw new AppError("Invalid template ID format", StatusCodes.BAD_REQUEST);
    }

    const template = await QuestionTemplate.findById(templateId);

    if (!template) {
      throw new AppError(
        `Template not found with id ${templateId}`,
        StatusCodes.NOT_FOUND
      );
    }

    await template.incrementUsage();
    return template.toObject();
  }

  /**
   * Get user's templates
   */
  async getUserTemplates(userId, options = {}) {
    const { category, page = 1, limit = 20 } = options;

    const filters = { createdBy: userId };
    if (category) filters.category = category;

    return this.getTemplates(filters, { page, limit });
  }

  /**
   * Get public templates
   */
  async getPublicTemplates(options = {}) {
    const { category, page = 1, limit = 20 } = options;

    const filters = { isPublic: true };
    if (category) filters.category = category;

    return this.getTemplates(filters, { page, limit, sortBy: "usageCount" });
  }

  /**
   * Make template public/private
   */
  async toggleTemplateVisibility(templateId, userId) {
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw new AppError("Invalid template ID format", StatusCodes.BAD_REQUEST);
    }

    const template = await QuestionTemplate.findById(templateId);

    if (!template) {
      throw new AppError(
        `Template not found with id ${templateId}`,
        StatusCodes.NOT_FOUND
      );
    }

    // Check ownership
    if (template.createdBy !== userId) {
      throw new AppError(
        "You don't have permission to modify this template",
        StatusCodes.FORBIDDEN
      );
    }

    template.isPublic = !template.isPublic;
    await template.save();

    logger.info(
      `Template visibility toggled: ${templateId}, now ${
        template.isPublic ? "public" : "private"
      }`
    );
    return template.toObject();
  }
}

module.exports = new QuestionTemplateService();
