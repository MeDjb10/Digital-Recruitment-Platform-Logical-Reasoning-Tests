const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profile.controller");
const verifyToken = require("../middleware/auth.middleware");
const { uploadMiddleware } = require("../utils/file-upload.util");
const {
  validateUserId,
  validateUserUpdate,
} = require("../utils/validation.util");

// Profile routes
router.put(
  "/:userId",
  verifyToken(),
  validateUserId,
  uploadMiddleware,
  validateUserUpdate,
  profileController.updateProfile
);

router.post(
  "/:userId/picture",
  verifyToken(),
  validateUserId,
  uploadMiddleware,
  profileController.updateProfilePicture
);

router.delete(
  "/:userId/picture",
  verifyToken(),
  validateUserId,
  profileController.deleteProfilePicture
);

module.exports = router;
