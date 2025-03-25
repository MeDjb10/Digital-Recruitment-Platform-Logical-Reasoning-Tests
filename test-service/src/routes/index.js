const express = require("express");
const router = express.Router();

const testRoutes = require("./test.routes");
const questionRoutes = require("./question.routes");
const attemptRoutes = require("./attempt.routes");
const analyticsRoutes = require("./analytics.routes");

// Mount routes
router.use("/tests", testRoutes);
router.use("/questions", questionRoutes);
router.use("/attempts", attemptRoutes);
router.use("/analytics", analyticsRoutes);

module.exports = router;
