const mongoose = require("mongoose");
const path = require("path");
// Correctly load the .env file from the root directory
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// Import the User model
const User = require("../models/user.model");

// Log to debug the issue
console.log("MongoDB URI:", process.env.MONGODB_URI);

// Sample users data
const userData = [
  {
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com",
    password: "password123", // In production, this would be hashed
    role: "admin",
    gender: "Male",
    status: "active",
    currentPosition: "System Administrator",
    educationLevel: "Master's Degree",
  },
  {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    password: "password123",
    role: "candidate",
    gender: "Male",
    dateOfBirth: new Date("1990-01-15"),
    currentPosition: "Software Developer",
    desiredPosition: "Senior Developer",
    educationLevel: "Bachelor's Degree",
  },
  {
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@example.com",
    password: "password123",
    role: "moderator",
    gender: "Female",
    status: "active",
    currentPosition: "HR Manager",
  },
  {
    firstName: "Alice",
    lastName: "Johnson",
    email: "alice@example.com",
    password: "password123",
    role: "psychologist",
    gender: "Female",
    status: "active",
    currentPosition: "Clinical Psychologist",
    educationLevel: "PhD",
  },
];

// Use hardcoded connection string as fallback
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/user-management";

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB at:", MONGODB_URI);

    try {
      // Clear existing users
      await User.deleteMany({});
      console.log("Cleared existing users");

      // Insert new users
      const users = await User.insertMany(userData);
      console.log(`${users.length} users inserted successfully`);

      // Log IDs for reference during testing
      users.forEach((user) => {
        console.log(
          `${user.firstName} ${user.lastName} (${user.role}): ${user._id}`
        );
      });
    } catch (error) {
      console.error("Error seeding users:", error);
    } finally {
      // Close connection
      mongoose.connection.close();
      console.log("MongoDB connection closed");
    }
  })
  .catch((err) => console.error("MongoDB connection error:", err));
