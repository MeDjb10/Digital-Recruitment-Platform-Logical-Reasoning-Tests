const request = require("supertest");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");

// Import the Express app but prevent it from connecting to MongoDB
// This is important because we'll handle the connection separately in tests
jest.mock("../src/app", () => {
  // First capture the MongoDB connection call before importing
  jest.mock("mongoose", () => {
    const originalMongoose = jest.requireActual("mongoose");
    return {
      ...originalMongoose,
      connect: jest.fn().mockImplementation(() => Promise.resolve())
    };
  });
  
  // Now import and return the app
  const app = jest.requireActual("../src/app");
  return app;
});

// Import app after the mocks are set up
const app = require("../src/app");

// Mock JWT middleware for testing
jest.mock("../src/middleware/auth.middleware", () => {
  return (allowedRoles = []) =>
    (req, res, next) => {
      // Mock authenticated user
      req.userId = "5f7d6e9c6e9a6d6e9c6e9a6d";
      req.userRole = "admin";
      req.userEmail = "admin@test.com";
      next();
    };
});

describe("User Management API", () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      // Only connect if not already connected
      await mongoose.connect(process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/user-management-test");
      console.log("Test database connected");
    }
  });

  afterAll(async () => {
    // Clean up 
    await User.deleteMany({});
    // Only close if we opened the connection
    await mongoose.connection.close();
    console.log("Test database connection closed");
  });

  // Test user creation
  let testUserId;

  beforeEach(async () => {
    // Create a test user before each test
    await User.deleteMany({});

    const testUser = new User({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "hashedpassword",
      role: "candidate",
    });

    const savedUser = await testUser.save();
    testUserId = savedUser._id.toString();
  });

  // Rest of the test code remains the same...


  describe("GET /api/users", () => {
    it("should get all users with pagination", async () => {
      const res = await request(app).get("/api/users");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });
  });

  describe("GET /api/users/:userId", () => {
    it("should get user by ID", async () => {
      const res = await request(app).get(`/api/users/${testUserId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("test@example.com");
    });

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";
      const res = await request(app).get(`/api/users/${nonExistentId}`);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/users/:userId", () => {
    it("should update user profile", async () => {
      const updateData = {
        firstName: "Updated",
        lastName: "Name",
        currentPosition: "Developer",
      };

      const res = await request(app)
        .put(`/api/users/${testUserId}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.firstName).toBe("Updated");
      expect(res.body.user.lastName).toBe("Name");
      expect(res.body.user.currentPosition).toBe("Developer");
    });
  });
});
