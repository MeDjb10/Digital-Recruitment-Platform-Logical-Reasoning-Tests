const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First name is required"],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, "Last name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email",
    ],
  },
  password: {
    type: String,
    select: false,
  },
  role: {
    type: String,
    enum: ["candidate", "admin", "moderator", "psychologist"],
    default: "candidate",
  },
  profilePicture: {
    type: String,
  },
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
  },
  currentPosition: {
    type: String,
    trim: true,
  },
  desiredPosition: {
    type: String,
    trim: true,
  },
  educationLevel: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active",
  },
  testAuthorizationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected", "not_submitted"],
    default: "not_submitted",
  },
  testAuthorizationDate: {
    type: Date,
  },
  authorizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  testEligibilityInfo: {
    jobPosition: String,
    company: String,
    department: String,
    additionalInfo: String,
    availability: {
      type: String,
      enum: ["immediately", "one_week", "two_weeks", "one_month"],
      default: "immediately",
    },
    submissionDate: Date,
  },
  testAssignment: {
    assignedTest: {
      type: String,
      enum: ["D-70", "D-2000", "none"],
      default: "none",
    },
    additionalTests: [
      {
        type: String,
        enum: ["logique_des_propositions"],
      },
    ],
    isManualAssignment: {
      type: Boolean,
      default: false,
    },
    assignmentDate: {
      type: Date,
    },
    examDate: {
      type: Date,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
