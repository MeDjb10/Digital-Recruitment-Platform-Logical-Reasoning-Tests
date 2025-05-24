const { StatusCodes } = require("http-status-codes");
const analyticsService = require("../services/analytics.service");

class AnalyticsController {
  /**
   * Generate analytics snapshot
   */
  async generateAnalyticsSnapshot(req, res) {
    const result = await analyticsService.generateAnalyticsSnapshot();

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.message,
    });
  }

  /**
   * Get latest analytics snapshot for dashboard
   */
  async getDashboardAnalytics(req, res) {
    const { category = "all" } = req.query;
    const data = await analyticsService.getDashboardAnalytics(category);

    res.status(StatusCodes.OK).json({
      success: true,
      data,
    });
  }

  /**
   * Get analytics snapshots for a date range
   */
  async getAnalyticsHistory(req, res) {
    const result = await analyticsService.getAnalyticsHistory(req.query);

    res.status(StatusCodes.OK).json({
      success: true,
      count: result.count,
      data: result.snapshots,
    });
  }

  /**
   * Get analytics for a specific test
   */
  async getTestAnalytics(req, res) {
    const { testId } = req.params;
    const analytics = await analyticsService.getTestAnalytics(
      testId,
      req.query
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: analytics,
    });
  }

  /**
   * Get candidate performance analytics
   */
  async getCandidateAnalytics(req, res) {
    const { candidateId } = req.params;
    const analytics = await analyticsService.getCandidateAnalytics(candidateId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: analytics,
    });
  }
}

const analyticsController = new AnalyticsController();

module.exports = {
  generateAnalyticsSnapshot:
    analyticsController.generateAnalyticsSnapshot.bind(analyticsController),
  getDashboardAnalytics:
    analyticsController.getDashboardAnalytics.bind(analyticsController),
  getAnalyticsHistory:
    analyticsController.getAnalyticsHistory.bind(analyticsController),
  getTestAnalytics:
    analyticsController.getTestAnalytics.bind(analyticsController),
  getCandidateAnalytics:
    analyticsController.getCandidateAnalytics.bind(analyticsController),
};
