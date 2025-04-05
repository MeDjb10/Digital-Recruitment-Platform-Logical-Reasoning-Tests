const express = require("express");
const router = express.Router();
const {
  createTest,
  getAllTests,
  getTestById,
  updateTest,
  deleteTest,
} = require("../controllers/test.controller");
const { verifyToken, authorize } = require("../middleware/auth.middleware");

// Public routes (if any)
router.get("/", getAllTests); // Could be public or protected based on requirements

// Protected routes
router.post("/", verifyToken, authorize("admin", "psychologist"), createTest);
router.get("/:id", verifyToken, getTestById);
// This route has been moved to question.routes.js
// router.get("/:id/questions", verifyToken, getTestWithQuestions);
router.put("/:id", verifyToken, authorize("admin", "psychologist"), updateTest);
router.delete(
  "/:id",
  verifyToken,
  authorize("admin", "psychologist"),
  deleteTest
);

module.exports = router;
