const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const API_URL = `http://localhost:${process.env.PORT || 3000}/api/auth`;
let authToken;
let testUserEmail = `test${Date.now()}@example.com`;

const testUser = {
  firstName: "Test",
  lastName: "User",
  email: testUserEmail,
  password: "Password123",
  gender: "Male",
  role: "candidate",
  dateOfBirth: "1990-01-01",
  currentPosition: "Developer",
  desiredPosition: "Senior Developer",
  educationLevel: "Bachelor",
};

async function runTests() {
  try {
    console.log("🔍 Starting authentication tests...");

    // Test health endpoint
    console.log("\n1. Testing health endpoint...");
    const healthResponse = await axios.get(
      `http://localhost:${process.env.PORT || 3000}/api/health`
    );
    console.log(`✅ Health endpoint: ${healthResponse.data.message}`);

    // Test basic auth route
    console.log("\n2. Testing auth routes...");
    const authRouteResponse = await axios.get(`${API_URL}/test`);
    console.log(`✅ Auth routes: ${authRouteResponse.data.message}`);

    // Test registration
    console.log("\n3. Testing user registration...");
    try {
      const registerResponse = await axios.post(
        `${API_URL}/register`,
        testUser
      );
      console.log("✅ Registration successful!");
      console.log("User details:", registerResponse.data.data.user);
      authToken = registerResponse.data.data.token;
      console.log("JWT Token received");
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(
          "⚠️ User with this email may already exist. Trying to login..."
        );
      } else {
        throw error;
      }
    }

    // Test login
    console.log("\n4. Testing login...");
    const loginResponse = await axios.post(`${API_URL}/login`, {
      email: testUser.email,
      password: testUser.password,
    });

    console.log("✅ Login successful!");
    console.log("User details:", loginResponse.data.data.user);
    authToken = loginResponse.data.data.token;
    console.log("JWT Token received");

    // Test get current user (protected route)
    console.log("\n5. Testing get current user (protected route)...");
    const meResponse = await axios.get(`${API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log("✅ Protected route accessed successfully!");
    console.log("User profile:", meResponse.data.data.user);

    // Test forgot password
    console.log("\n6. Testing forgot password functionality...");
    const forgotResponse = await axios.post(`${API_URL}/forgot-password`, {
      email: testUser.email,
    });

    console.log("✅ Forgot password request successful!");
    console.log("Message:", forgotResponse.data.message);

    console.log("\n✅ All tests completed successfully!");
    console.log(
      "\nNote: Email verification and password reset require manual testing"
    );
    console.log("with real email service configured in .env file");
  } catch (error) {
    console.error("\n❌ Test failed:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the tests
runTests();
