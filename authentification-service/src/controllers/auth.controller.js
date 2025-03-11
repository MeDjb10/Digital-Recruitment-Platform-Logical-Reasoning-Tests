const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/token.util");
const { sendEmail } = require("../utils/email.util");
const { hashPassword } = require("../utils/password.util"); // Assuming you create this in a file
const {
  generateOTP,
  isOTPExpired,
  generateResetToken,
} = require("../utils/otp.util");

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "candidate", // Initially candidate; later profile completion can upgrade role
    });

    await newUser.save();

    // Send welcome email
    await sendEmail(
      email,
      "Welcome to RecruitFlow",
      `<p>Welcome ${firstName}, your account has been created successfully!</p>`
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// In auth.controller.js, modify the login function
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid)
      return res.status(401).json({ message: "Invalid credentials" });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    console.log("Generated access token:", accessToken.substring(0, 20) + "...");
    console.log("User data used for token:", { id: user._id, role: user.role });

    res.status(200).json({ accessToken, refreshToken });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.logout = (req, res) => {
  // For JWT, logout on client side by clearing tokens.
  // Optionally, maintain a token blacklist on the server.
  res.status(200).json({ message: "Logged out successfully" });
};

// Additional endpoints for password recovery, OTP, etc. can be added similarly.
// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Generate OTP and reset token
    const otp = generateOTP();
    const resetToken = generateResetToken();
    
    // Set expiration time (5 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    
    // Save OTP and token to user
    user.otp = {
      code: otp,
      expiresAt: expiresAt
    };
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = expiresAt;
    await user.save();
    
    // Send email with OTP
    await sendEmail(
      email,
      "Password Reset OTP",
      `<p>You requested a password reset.</p>
       <p>Your OTP is: <strong>${otp}</strong></p>
       <p>This OTP will expire in 5 minutes.</p>
       <p>If you did not request this, please ignore this email.</p>`
    );
    
    res.status(200).json({ 
      message: "OTP sent to your email",
      resetToken: resetToken // This will be used to identify the reset request
    });
  } catch (error) {
    console.error("Error in password reset request:", error);
    res.status(500).json({ error: error.message });
  }
};

// Verify OTP for password reset
exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp, resetToken } = req.body;
    
    // Find user
    const user = await User.findOne({ 
      email,
      passwordResetToken: resetToken,
      'otp.code': otp
    });
    
    if (!user) {
      return res.status(400).json({ message: "Invalid OTP or user" });
    }
    
    // Check if OTP has expired
    if (isOTPExpired(user.otp.expiresAt)) {
      return res.status(400).json({ message: "OTP has expired" });
    }
    
    // OTP is valid, allow password reset
    res.status(200).json({ 
      message: "OTP verified successfully",
      resetToken: resetToken // Still need this for the next step
    });
  } catch (error) {
    console.error("Error in OTP verification:", error);
    res.status(500).json({ error: error.message });
  }
};

// Reset password after OTP verification
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    
    // Find user
    const user = await User.findOne({ 
      email,
      passwordResetToken: resetToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: "Invalid reset token or token expired" });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password and clear reset fields
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.otp = undefined;
    await user.save();
    
    // Send confirmation email
    await sendEmail(
      email,
      "Password Reset Successful",
      `<p>Your password has been reset successfully.</p>
       <p>If you did not perform this action, please contact support immediately.</p>`
    );
    
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error in password reset:", error);
    res.status(500).json({ error: error.message });
  }
};

// Generate OTP for secure login
exports.requestLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Set expiration time (5 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    
    // Save OTP to user
    user.otp = {
      code: otp,
      expiresAt: expiresAt
    };
    await user.save();
    
    // Send email with OTP
    await sendEmail(
      email,
      "Login OTP",
      `<p>Your one-time password for login is: <strong>${otp}</strong></p>
       <p>This OTP will expire in 5 minutes.</p>`
    );
    
    res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Error in login OTP generation:", error);
    res.status(500).json({ error: error.message });
  }
};

// Verify OTP and login
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if OTP matches and hasn't expired
    if (!user.otp || user.otp.code !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    
    if (isOTPExpired(user.otp.expiresAt)) {
      return res.status(400).json({ message: "OTP has expired" });
    }
    
    // Clear OTP after successful verification
    user.otp = undefined;
    // Set email verification status if first login
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }
    await user.save();
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    res.status(200).json({ 
      message: "Login successful",
      accessToken,
      refreshToken 
    });
  } catch (error) {
    console.error("Error in OTP verification for login:", error);
    res.status(500).json({ error: error.message });
  }
};