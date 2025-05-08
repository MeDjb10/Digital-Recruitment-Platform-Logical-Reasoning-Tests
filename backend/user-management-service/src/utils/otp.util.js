const crypto = require("crypto");

/**
 * Generate a random 6-digit OTP
 */
function generateOTP() {
  // Generate a random 6-digit number
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if an OTP has expired
 */
function isOTPExpired(expiresAt) {
  return new Date() > new Date(expiresAt);
}

/**
 * Generate a password reset token
 */
function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = {
  generateOTP,
  isOTPExpired,
  generateResetToken,
};