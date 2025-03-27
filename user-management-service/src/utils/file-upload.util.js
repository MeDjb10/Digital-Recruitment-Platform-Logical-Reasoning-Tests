const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const { ErrorResponse } = require("./error-handler.util");

// Base directory for profile pictures
const PROFILE_PICS_DIR = path.join(__dirname, "../../uploads/profile-pictures");

// Ensure directories exist
const ensureDirectoriesExist = () => {
  const directories = [
    PROFILE_PICS_DIR,
    path.join(PROFILE_PICS_DIR, "candidates"),
    path.join(PROFILE_PICS_DIR, "admins"),
    path.join(PROFILE_PICS_DIR, "psychologists"),
    path.join(PROFILE_PICS_DIR, "moderators"),
  ];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Configure storage
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new ErrorResponse("Only image files are allowed", 400), false);
  }
};

// Setup multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: fileFilter,
});

// Get folder based on role
const getFolderByRole = (role) => {
  switch (role) {
    case "admin":
      return "admins";
    case "moderator":
      return "moderators";
    case "psychologist":
      return "psychologists";
    default:
      return "candidates";
  }
};

// Process and save image
const processAndSaveImage = async (file, userId, role) => {
  ensureDirectoriesExist();

  const folder = getFolderByRole(role);
  const filename = `${userId}-${uuidv4()}.webp`;
  const filePath = path.join(PROFILE_PICS_DIR, folder, filename);

  // Process image with sharp - resize and convert to webp for optimization
  await sharp(file.buffer)
    .resize(300, 300)
    .webp({ quality: 80 })
    .toFile(filePath);

  return `/uploads/profile-pictures/${folder}/${filename}`;
};

// Delete old profile picture if it exists
const deleteOldProfilePicture = async (picturePath) => {
  if (!picturePath) return;

  try {
    const fullPath = path.join(__dirname, "../../", picturePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error("Error deleting old profile picture:", error);
  }
};

module.exports = {
  uploadMiddleware: upload.single("profilePicture"),
  processAndSaveImage,
  deleteOldProfilePicture,
};
