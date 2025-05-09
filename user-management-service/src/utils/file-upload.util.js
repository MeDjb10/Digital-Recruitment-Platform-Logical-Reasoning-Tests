const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const { ErrorResponse } = require("./error-handler.util");

// Base directories
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const PROFILE_PICS_DIR = path.join(UPLOADS_DIR, "profile-pictures");
const TEMP_DIR = path.join(UPLOADS_DIR, "temp");

// Ensure directories exist
const ensureDirectoriesExist = () => {
  console.log("Ensuring directories exist...");

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(`Creating uploads directory: ${UPLOADS_DIR}`);
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  if (!fs.existsSync(PROFILE_PICS_DIR)) {
    console.log(`Creating profile pictures directory: ${PROFILE_PICS_DIR}`);
    fs.mkdirSync(PROFILE_PICS_DIR, { recursive: true });
  }

  if (!fs.existsSync(TEMP_DIR)) {
    console.log(`Creating temp directory: ${TEMP_DIR}`);
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // Create role-based subdirectories
  ["candidates", "admins", "moderators", "psychologists"].forEach((role) => {
    const dir = path.join(PROFILE_PICS_DIR, role);
    if (!fs.existsSync(dir)) {
      console.log(`Creating role directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  console.log("All directories ready");
};

// Create directories at startup
ensureDirectoriesExist();

// Configure storage - simplified for robustness
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    // Create a unique filename to avoid collisions
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `temp-${uniqueSuffix}${ext}`);
  },
});

// Simple file filter for images
const fileFilter = (req, file, cb) => {
  console.log(
    `Filtering file: ${file.originalname}, mimetype: ${file.mimetype}`
  );

  // Only accept image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    console.log(`Rejected file: ${file.originalname} - not an image`);
    cb(new ErrorResponse("Only image files are allowed", 400), false);
  }
};

// Create multer middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

// Simplified upload middleware - single file only
const uploadMiddleware = (req, res, next) => {
  console.log("Starting file upload middleware");
  console.log("Headers:", req.headers);

  // Use .single() for a single file with field name 'profilePicture'
  upload.single("profilePicture")(req, res, (err) => {
    // Log upload completion
    if (req.file) {
      console.log(`Upload completed with file: ${req.file.originalname}`);
      console.log("File details:", {
        filename: req.file.filename,
        size: req.file.size,
        path: req.file.path,
      });
    } else {
      console.log("Upload completed without file");
    }

    // Handle errors
    if (err) {
      console.error("Upload error:", err);

      // Handle specific error types
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new ErrorResponse("File too large (max 10MB)", 400));
        }
        return next(new ErrorResponse(`Upload error: ${err.code}`, 400));
      }

      return next(new ErrorResponse(`Upload error: ${err.message}`, 400));
    }

    // Continue to next middleware
    next();
  });
};

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
  if (!file) {
    throw new ErrorResponse("No file provided", 400);
  }

  console.log(
    `Processing image: ${file.path} for user: ${userId} with role: ${role}`
  );

  try {
    // Get the appropriate folder for this user's role
    const folder = getFolderByRole(role);

    // Create a unique filename with the user ID
    const filename = `${userId}-${uuidv4()}.webp`;

    // Full path to save the processed image
    const outputPath = path.join(PROFILE_PICS_DIR, folder, filename);

    // Process the image with Sharp (resize and convert to webp)
    await sharp(file.path)
      .resize(300, 300, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(outputPath);

    console.log(`Image processed and saved to: ${outputPath}`);

    // Try to delete the temporary file, but don't throw if it fails
    try {
      await fs.promises.unlink(file.path);
      console.log(`Temporary file deleted: ${file.path}`);
    } catch (unlinkError) {
      // Just log the error but don't throw - the image was processed successfully
      console.warn(`Warning: Could not delete temporary file: ${file.path}`, unlinkError.message);
      
      // Schedule deletion for later (after 1 second)
      setTimeout(async () => {
        try {
          if (fs.existsSync(file.path)) {
            await fs.promises.unlink(file.path);
            console.log(`Delayed deletion of temporary file successful: ${file.path}`);
          }
        } catch (delayedError) {
          console.warn(`Warning: Could not delete temporary file even after delay: ${file.path}`);
        }
      }, 1000);
    }

    // Return the public URL path
    return `/uploads/profile-pictures/${folder}/${filename}`;
  } catch (error) {
    console.error("Error processing image:", error);

    // Try to clean up temp file if it exists, but don't throw if cleanup fails
    try {
      if (fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }
    } catch (cleanupError) {
      console.warn(`Warning: Could not clean up temporary file after error: ${file.path}`);
    }

    throw new ErrorResponse(`Image processing failed: ${error.message}`, 500);
  }
};

// Delete old profile picture
const deleteOldProfilePicture = async (picturePath) => {
  if (!picturePath) return;

  try {
    // Security check - ensure path is within uploads directory
    if (!picturePath.startsWith("/uploads/profile-pictures/")) {
      console.error("Invalid profile picture path:", picturePath);
      return;
    }

    const fullPath = path.join(__dirname, "../../", picturePath);
    console.log("Attempting to delete file:", fullPath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log("Successfully deleted profile picture:", fullPath);
    } else {
      console.log("Profile picture not found for deletion:", fullPath);
    }
  } catch (error) {
    console.error("Error deleting profile picture:", error);
  }
};

module.exports = {
  uploadMiddleware,
  processAndSaveImage,
  deleteOldProfilePicture,
};
