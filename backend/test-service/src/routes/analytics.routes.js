const express = require("express");
const router = express.Router();
const {
  generateAnalyticsSnapshot,
  getDashboardAnalytics,
  getAnalyticsHistory,
  getTestAnalytics,
  getCandidateAnalytics,
} = require("../controllers/analytics.controller");
const { verifyToken, authorize } = require("../middleware/auth.middleware");

// All analytics routes require authentication
// Most require admin/psychologist authorization

// Dashboard analytics
router.get(
  "/dashboard",
  verifyToken,
  authorize("admin", "psychologist", "recruiter"),
  getDashboardAnalytics
);

// Analytics history
router.get(
  "/history",
  verifyToken,
  authorize("admin", "psychologist"),
  getAnalyticsHistory
);

// Test specific analytics
router.get(
  "/tests/:testId",
  verifyToken,
  authorize("admin", "psychologist", "recruiter"),
  getTestAnalytics
);

// Candidate analytics
router.get(
  "/candidates/:candidateId",
  verifyToken,
  authorize("admin", "psychologist", "recruiter"),
  getCandidateAnalytics
);

// Generate analytics snapshot manually (admin only)
router.post(
  "/generate",
  verifyToken,
  authorize("admin"),
  generateAnalyticsSnapshot
);

module.exports = router;
