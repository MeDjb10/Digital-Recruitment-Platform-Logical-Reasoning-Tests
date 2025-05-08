const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(403).json({ message: "No token provided" });

  // Extract the token - remove "Bearer " prefix if present
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  console.log("Received token:", token.substring(0, 20) + "..."); // Logging partial token for debugging

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("Token verification error:", err.message);
      return res
        .status(401)
        .json({ message: "Failed to authenticate token", error: err.message });
    }

    console.log("Decoded token:", decoded); // Log the decoded token
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
}

module.exports = verifyToken;
