const express = require("express");
const dotenv = require("dotenv");

// Load environment variables first, before any other code
dotenv.config();

// Rest of your imports
const authRoutes = require("./routes/auth.routes");
const healthRoutes = require("./routes/health.routes");
const cors = require("cors");

const app = express();

// At the beginning of app.js after dotenv.config()
console.log("Authentication service starting...");
console.log("Environment variables:");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- PORT:", process.env.PORT);
console.log(
  "- SERVICE_TOKEN available:",
  process.env.SERVICE_TOKEN ? "Yes" : "No"
);
if (process.env.SERVICE_TOKEN) {
  console.log(
    "- SERVICE_TOKEN first 5 chars:",
    process.env.SERVICE_TOKEN.substring(0, 5)
  );
}

app.use(
  cors({
    origin: ["http://localhost:4200", "https://yourproductiondomain.com"], // Add your production domain when ready
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400, // Cache preflight requests for 1 day (in seconds)
  })
);

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize RabbitMQ connection
require("./utils/message-broker").initBrokerConnection();

// Routes
app.use("/api/auth", authRoutes);
app.use("/health", healthRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Auth microservice running on port ${PORT}`);
});
