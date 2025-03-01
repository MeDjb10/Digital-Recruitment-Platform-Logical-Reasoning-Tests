const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/user");
const Role = require("../models/role");

dotenv.config();

// Connect to database
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    testModels();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

async function testModels() {
  try {
    // Test creating a role
    const adminRole = await Role.create({
      name: "admin",
      permissions: ["manage:all"],
      description: "Administrator with full access",
    });

    console.log("Created role:", adminRole);

    // Test creating a user
    const adminUser = await User.create({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      gender: "Male",
      role: "admin",
    });

    console.log("Created user: (password is hashed)", {
      ...adminUser.toObject(),
      password: "[HIDDEN]",
    });

    console.log("Database test completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error.message);
    process.exit(1);
  }
}
