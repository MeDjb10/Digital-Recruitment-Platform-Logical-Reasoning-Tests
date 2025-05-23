function verifyServiceToken(req, res, next) {
  try {
    console.log("⚡️ Verifying service-to-service request to:", req.originalUrl);

    // Get token from header
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      console.log("❌ Access denied: No authorization header");
      return res.status(403).json({
        success: false,
        message: "Access denied. No service token provided",
      });
    }

    // Extract token from Bearer <token>
    const parts = authHeader.split(" ");
    
    // Check format is "Bearer <token>"
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      console.log("❌ Invalid authorization format. Expected 'Bearer <token>'");
      return res.status(403).json({
        success: false,
        message: "Invalid token format. Expected 'Bearer <token>'",
      });
    }

    const token = parts[1];
    if (!token) {
      console.log("❌ Token is empty");
      return res.status(403).json({
        success: false,
        message: "Invalid token format",
      });
    }

    const expectedToken = process.env.SERVICE_TOKEN;
    
    // Log token checks (for debugging only - just show first few chars)
    console.log(
      "🔑 Expected token starts with:",
      expectedToken ? expectedToken.substring(0, 5) + "..." : "NOT SET"
    );
    console.log(
      "🔑 Received token starts with:",
      token ? token.substring(0, 5) + "..." : "EMPTY"
    );

    if (!expectedToken) {
      console.log("❌ SERVICE_TOKEN environment variable not set");
      return res.status(500).json({
        success: false,
        message: "Service not configured correctly. Contact administrator."
      });
    }

    if (token !== expectedToken) {
      console.log("❌ Invalid service token");
      return res.status(403).json({
        success: false,
        message: "Invalid service token",
      });
    }

    console.log("✅ Service token verified successfully");
    next();
  } catch (error) {
    console.error("❌ Service auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Service authentication error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

module.exports = verifyServiceToken;
