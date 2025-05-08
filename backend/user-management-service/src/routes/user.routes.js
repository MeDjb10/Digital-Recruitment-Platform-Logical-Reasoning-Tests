const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const verifyToken = require("../middleware/auth.middleware");
const { uploadMiddleware } = require("../utils/file-upload.util");
const {
  validateUserFilters,
  validateUserId,
  validateUserUpdate,
  validateRoleAssignment,
  validateUserStatus,
  validateTestAuthRequest,
  validateTestAuthStatusUpdate,
  validateBulkTestAuthStatusUpdate,
  validateManualTestAssignment,
} = require("../utils/validation.util");
const verifyServiceToken = require("../middleware/service-auth.middleware");

// Add this route
router.get("/health", (req, res) => {
  res.json({ message: "User service is responding properly" });
});

/**
 * @swagger
 * /api/users/role/{userId}:
 *   get:
 *     summary: Get a user's role by ID (service-to-service endpoint)
 *     description: Used by Auth Service to get role information
 *     security:
 *       - serviceAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns user role
 */
router.get("/role/:userId", verifyServiceToken, userController.getUserRole);

/**
 * @swagger
 * /api/users/test-authorization:
 *   post:
 *     summary: Submit test authorization request
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobPosition
 *               - company
 *             properties:
 *               jobPosition:
 *                 type: string
 *               company:
 *                 type: string
 *               department:
 *                 type: string
 *               additionalInfo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test authorization request submitted successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Only candidates can submit requests
 */
router.post(
  "/test-authorization",
  verifyToken(["candidate"]),
  uploadMiddleware,
  validateTestAuthRequest,
  userController.submitTestAuthorizationRequest
);

/**
 * @swagger
 * /api/users/test-authorization-requests:
 *   get:
 *     summary: Get all test authorization requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           default: pending
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of test authorization requests
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get(
  "/test-authorization-requests",
  verifyToken(["admin", "moderator", "psychologist"]),
  userController.getTestAuthorizationRequests
);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile details
 *       401:
 *         description: Unauthorized
 */
router.get("/profile", verifyToken(), userController.getMyProfile);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [candidate, admin, moderator, psychologist]
 *         description: Filter users by role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter by user status (admin only)
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get(
  "/",
  verifyToken(["admin", "moderator", "psychologist"]),
  validateUserFilters,
  userController.getUsers
);

/**
 * @swagger
 * /api/users/role:
 *   put:
 *     summary: Assign role to user (admin can assign any role, moderator can only assign psychologist)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [candidate, admin, moderator, psychologist]
 *     responses:
 *       200:
 *         description: Role successfully updated
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: User not found
 */
router.put(
  "/role",
  verifyToken(["admin", "moderator"]),
  validateRoleAssignment,
  userController.assignRole
);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get(
  "/:userId",
  verifyToken(),
  validateUserId,
  userController.getUserById
);

/**
 * @swagger
 * /api/users/{userId}:
 *   put:
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *     responses:
 *       200:
 *         description: Updated user profile
 *       403:
 *         description: Unauthorized - can only update own profile unless admin
 *       404:
 *         description: User not found
 */
router.put(
  "/:userId",
  verifyToken(),
  validateUserId,
  uploadMiddleware,
  validateUserUpdate,
  userController.updateUser
);

/**
 * @swagger
 * /api/users/{userId}/profile-picture:
 *   post:
 *     summary: Upload or update profile picture
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture updated successfully
 *       400:
 *         description: No file uploaded
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post(
  "/:userId/profile-picture",
  verifyToken(),
  validateUserId,
  uploadMiddleware,
  userController.updateProfilePicture
);

/**
 * @swagger
 * /api/users/{userId}/profile-picture:
 *   delete:
 *     summary: Delete profile picture
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile picture deleted successfully
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.delete(
  "/:userId/profile-picture",
  verifyToken(),
  validateUserId,
  userController.deleteProfilePicture
);

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     summary: Delete a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: User not found
 */
router.delete(
  "/:userId",
  verifyToken(["admin"]),
  validateUserId,
  userController.deleteUser
);

/**
 * @swagger
 * /api/users/{userId}/status:
 *   patch:
 *     summary: Update user status (active/inactive/suspended)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Invalid status value
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: User not found
 */
router.patch(
  "/:userId/status",
  verifyToken(["admin"]),
  validateUserId,
  validateUserStatus,
  userController.updateUserStatus
);

/**
 * @swagger
 * /api/users/create:
 *   post:
 *     summary: Create a new user profile (internal service endpoint)
 *     description: This endpoint is for internal service-to-service communication only
 *     security:
 *       - serviceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - authId
 *               - email
 *             properties:
 *               authId:
 *                 type: string
 *                 description: ID from the auth service
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [candidate, admin, moderator, psychologist]
 *                 default: candidate
 *     responses:
 *       201:
 *         description: User profile created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized - invalid service token
 */
router.post("/create", verifyServiceToken, userController.createUser);

/**
 * @swagger
 * /api/users/{userId}/test-authorization:
 *   put:
 *     summary: Update test authorization status with optional test assignment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               examDate:
 *                 type: string
 *                 format: date-time
 *                 description: Optional exam date when approving
 *     responses:
 *       200:
 *         description: Test authorization status updated successfully
 *       400:
 *         description: Invalid status value
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: User not found
 */
router.put(
  "/:userId/test-authorization",
  verifyToken(["admin", "moderator", "psychologist"]),
  validateUserId,
  validateTestAuthStatusUpdate,
  userController.updateTestAuthorizationStatus
);

/**
 * @swagger
 * /api/users/{userId}/test-assignment:
 *   put:
 *     summary: Manually assign tests to an approved candidate
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedTest
 *             properties:
 *               assignedTest:
 *                 type: string
 *                 enum: [D-70, D-2000]
 *               additionalTests:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [logique_des_propositions]
 *               examDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Test assignment updated successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Forbidden - psychologist only
 *       404:
 *         description: User not found
 */
router.put(
  "/:userId/test-assignment",
  verifyToken(["admin", "psychologist"]),
  validateUserId,
  validateManualTestAssignment,
  userController.manualTestAssignment
);

/**
 * @swagger
 * /api/users/test-authorization/bulk:
 *   put:
 *     summary: Bulk update test authorization statuses with optional exam date
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - status
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               examDate:
 *                 type: string
 *                 format: date-time
 *                 description: Optional exam date for approved candidates
 *     responses:
 *       200:
 *         description: Test authorization statuses updated successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.put(
  "/test-authorization/bulk",
  verifyToken(["admin", "moderator", "psychologist"]),
  validateBulkTestAuthStatusUpdate,
  userController.bulkUpdateTestAuthorizationStatus
);

// Service-to-service auth endpoints
router.post('/validate-credentials', verifyServiceToken, userController.validateCredentials);
router.get('/by-email/:email', verifyServiceToken, userController.getUserByEmail);
router.get('/role/:userId', verifyServiceToken, userController.getUserRole);
router.post('/initiate-reset', verifyServiceToken, userController.initiatePasswordReset);
router.put('/reset-password', verifyServiceToken, userController.resetPassword);
router.post('/verify-email/:token', userController.verifyEmail);
router.post('/increment-token-version/:userId', verifyServiceToken, userController.incrementTokenVersion);


// Public routes for user management
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyUserOTP);
router.post("/resend-verification", userController.resendVerificationOTP);
router.post("/request-password-reset", userController.requestPasswordReset);
router.post("/verify-reset-otp", userController.verifyResetOTP);
router.post("/reset-password", userController.resetPasswordWithOTP);

module.exports = router;
