const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Base template schema for reusable question patterns
const QuestionTemplateSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["domino", "arrow", "multiple-choice"],
      required: [true, "Template category is required"],
    },
    createdBy: {
      type: String,
      required: [true, "Creator ID is required"],
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    usageCount: {
      type: Number,
      default: 0,
    },
    // Template-specific data stored as flexible object
    templateData: {
      type: Schema.Types.Mixed,
      required: [true, "Template data is required"],
    },
  },
  {
    discriminatorKey: "templateType",
    timestamps: true,
  }
);

// Indexes for efficient querying
QuestionTemplateSchema.index({ createdBy: 1, category: 1 });
QuestionTemplateSchema.index({ isPublic: 1, category: 1 });
QuestionTemplateSchema.index({ tags: 1 });

// Method to increment usage count
QuestionTemplateSchema.methods.incrementUsage = function () {
  this.usageCount += 1;
  return this.save();
};

// Create base model
const QuestionTemplate = mongoose.model(
  "QuestionTemplate",
  QuestionTemplateSchema
);

// Domino Template Schema
const DominoTemplateSchema = new Schema({
  layoutType: {
    type: String,
    enum: ["row", "grid", "rhombus", "custom", "rhombus-large", "spiral"],
    default: "grid",
  },
  gridLayout: {
    rows: Number,
    cols: Number,
    width: Number,
    height: Number,
  },
  // Store domino configuration without specific values
  dominoPositions: [
    {
      id: Number,
      row: Number,
      col: Number,
      isEditable: Boolean,
      isVertical: { type: Boolean, default: false },
      exactX: Number,
      exactY: Number,
      angle: { type: Number, default: 0 },
      scale: { type: Number, default: 1 },
      uniqueId: String,
    },
  ],
});

// Arrow Template Schema (extends Domino Template)
const ArrowTemplateSchema = new Schema({
  layoutType: {
    type: String,
    enum: ["row", "grid", "rhombus", "custom", "rhombus-large", "spiral"],
    default: "grid",
  },
  gridLayout: {
    rows: Number,
    cols: Number,
    width: Number,
    height: Number,
  },
  dominoPositions: [
    {
      id: Number,
      row: Number,
      col: Number,
      isEditable: Boolean,
      isVertical: { type: Boolean, default: false },
      exactX: Number,
      exactY: Number,
      angle: { type: Number, default: 0 },
      scale: { type: Number, default: 1 },
      uniqueId: String,
    },
  ],
  arrowPositions: [
    {
      id: Number,
      row: Number,
      col: Number,
      exactX: Number,
      exactY: Number,
      angle: Number,
      uniqueId: String,
      scale: { type: Number, default: 1 },
      length: Number,
      arrowColor: String,
      headSize: Number,
      curved: Boolean,
      curvature: Number,
    },
  ],
});

// Multiple Choice Template Schema
const MultipleChoiceTemplateSchema = new Schema({
  propositionCount: {
    type: Number,
    required: [true, "Number of propositions required"],
    min: 1,
  },
  // Store proposition structure without actual text/answers
  propositionStructure: [
    {
      placeholder: String, // e.g., "Statement about X"
      expectedEvaluation: {
        type: String,
        enum: ["V", "F", "?"],
      },
    },
  ],
});

// Register discriminators
const DominoTemplate = QuestionTemplate.discriminator(
  "DominoTemplate",
  DominoTemplateSchema
);
const ArrowTemplate = QuestionTemplate.discriminator(
  "ArrowTemplate",
  ArrowTemplateSchema
);
const MultipleChoiceTemplate = QuestionTemplate.discriminator(
  "MultipleChoiceTemplate",
  MultipleChoiceTemplateSchema
);

module.exports = {
  QuestionTemplate,
  DominoTemplate,
  ArrowTemplate,
  MultipleChoiceTemplate,
};
