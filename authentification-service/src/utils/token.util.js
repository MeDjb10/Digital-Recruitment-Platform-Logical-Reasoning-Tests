const jwt = require("jsonwebtoken");

function generateAccessToken(user) {
  // Make sure you're including 'id' and 'role' in the payload
  return jwt.sign(
    {
      id: user._id, // Make sure this matches how you extract it in the middleware
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function generateRefreshToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
