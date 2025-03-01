const express = require("express");
const router = express.Router();

// Simple test route
router.get("/test", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Auth routes working!",
  });
});

module.exports = router;
