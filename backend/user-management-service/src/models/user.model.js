const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

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
  // Add OTP fields for authentication
  otp: {
    code: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
  },
  // Authentication-related fields
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  activationToken: {
    type: String,
    select: false,
  },
  activationExpires: {
    type: Date,
    select: false,
  },
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
  // Existing fields...
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

// Keep the matchPassword method if needed
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
