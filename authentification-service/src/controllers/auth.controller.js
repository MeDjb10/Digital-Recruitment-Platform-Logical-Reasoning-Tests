const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/token.util");
const { sendEmail, createEmailTemplate } = require("../utils/email.util");
const { hashPassword } = require("../utils/password.util"); // Assuming you create this in a file
const {
  generateOTP,
  isOTPExpired,
  generateResetToken,
} = require("../utils/otp.util");

const axios = require("axios");
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:3001/api/users";
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || "your-secret-service-token";


// Modified register function with email verification
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // If user exists but isn't verified, allow re-sending verification code
      if (existingUser && !existingUser.isEmailVerified) {
        return await sendVerificationOTP(existingUser, res);
      }
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP for verification
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Generate activation token
    const activationToken = generateResetToken(); // Reusing the token generation function

    // Create new user (initially inactive)
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "candidate",
      isActive: false,
      isEmailVerified: false,
      otp: {
        code: otp,
        expiresAt: expiresAt,
      },
      activationToken: activationToken,
      activationExpires: expiresAt,
    });

    await newUser.save();

    // Send verification email with OTP using enhanced template
    const emailContent = createEmailTemplate(
      "Verify Your Email",
      `
        <p style="color: #4b5563; line-height: 1.5;">Hi ${firstName},</p>
        <p style="color: #4b5563; line-height: 1.5;">Thank you for signing up! To complete your registration, please use the verification code below:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; letter-spacing: 8px; margin: 0; color: #333; font-weight: 500;">${otp}</h1>
        </div>
        <p style="color: #4b5563; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #4b5563; line-height: 1.5; margin-top: 20px;">If you have any questions, feel free to contact our support team.</p>
      `
    );

    // Send verification email with OTP
    await sendEmail(
      email,
      "Verify Your Email - RecruitFlow",
      emailContent
    );

    // Return success response with activation token for the next step
    res.status(201).json({
      message: "Registration initiated successfully. Please verify your email.",
      email: email,
      activationToken: activationToken,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to resend verification OTP for existing unverified users
const sendVerificationOTP = async (user, res) => {
  try {
    // Generate new OTP and expiry
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Update user's OTP
    user.otp = {
      code: otp,
      expiresAt: expiresAt,
    };

    // Generate new activation token
    const activationToken = generateResetToken();
    user.activationToken = activationToken;
    user.activationExpires = expiresAt;

    await user.save();

    // Send verification email with enhanced template
    const emailContent = createEmailTemplate(
      "Complete Your Registration",
      `
        <p style="color: #4b5563; line-height: 1.5;">Hi ${user.firstName},</p>
        <p style="color: #4b5563; line-height: 1.5;">We noticed you previously tried to register. To complete your registration, please use this verification code:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; letter-spacing: 8px; margin: 0; color: #333; font-weight: 500;">${otp}</h1>
        </div>
        <p style="color: #4b5563; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #4b5563; line-height: 1.5; margin-top: 20px;">If you have any questions, feel free to contact our support team.</p>
      `
    );

    await sendEmail(
      user.email,
      "Verify Your Email - RecruitFlow",
      emailContent
    );

    return res.status(200).json({
      message: "Please verify your email to complete registration.",
      email: user.email,
      activationToken: activationToken,
    });
  } catch (error) {
    console.error("Error sending verification OTP:", error);
    throw error;
  }
};

// Verify email OTP after registration
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp, activationToken } = req.body;

    // Find user with matching email, OTP, and activation token
    const user = await User.findOne({
      email,
      activationToken,
      "otp.code": otp,
      activationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid verification code or expired token",
      });
    }

    // Check if OTP has expired
    if (isOTPExpired(user.otp.expiresAt)) {
      return res.status(400).json({ message: "Verification code has expired" });
    }

    // Activate account
    user.isActive = true;
    user.isEmailVerified = true;
    user.otp = undefined;
    user.activationToken = undefined;
    user.activationExpires = undefined;

    await user.save();

    // Generate tokens for authenticated user
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // IMPORTANT: Create the user in the User Management Service
    try {
      await axios.post(
        `${USER_SERVICE_URL}/create`,
        {
          authId: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        {
          headers: {
            Authorization: `Bearer ${SERVICE_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `User profile created in User Management Service for ${user.email}`
      );
    } catch (error) {
      // Log the error but don't fail the registration
      // We can implement a background retry mechanism later
      console.error(
        "Failed to create user profile in User Management Service:",
        error.message
      );
    }

    // Send welcome email with enhanced template
    const welcomeEmailContent = createEmailTemplate(
      "Welcome to RecruitFlow!",
      `
        <p style="color: #4b5563; line-height: 1.5;">Hi ${user.firstName},</p>
        <p style="color: #4b5563; line-height: 1.5;">Thank you for verifying your email. Your account has been successfully activated!</p>
        <p style="color: #4b5563; line-height: 1.5;">You can now log in and start using all the features of RecruitFlow. We're excited to have you on board!</p>
        <p style="color: #4b5563; line-height: 1.5; margin-top: 20px;">If you have any questions or need assistance, our support team is here to help.</p>
      `,
      
    );

    await sendEmail(email, "Welcome to RecruitFlow", welcomeEmailContent);

    // Return tokens for automatic login
    res.status(200).json({
      message: "Email verified and account activated successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Error in email verification:", error);
    res.status(500).json({ error: error.message });
  }
};

// Resend verification OTP
exports.resendVerificationOTP = async (req, res) => {
  try {
    const { email, activationToken } = req.body;

    // Find user by email and activation token
    const user = await User.findOne({
      email,
      activationToken,
      isEmailVerified: false,
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or activation token",
      });
    }

    // Generate new OTP and update expiry
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    user.otp = {
      code: otp,
      expiresAt: expiresAt,
    };
    user.activationExpires = expiresAt;

    await user.save();

    // Send verification email with enhanced template
    const emailContent = createEmailTemplate(
      "Complete Your Registration",
      `
        <p style="color: #4b5563; line-height: 1.5;">Hi ${user.firstName},</p>
        <p style="color: #4b5563; line-height: 1.5;">Here is your new verification code:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; letter-spacing: 8px; margin: 0; color: #333; font-weight: 500;">${otp}</h1>
        </div>
        <p style="color: #4b5563; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #4b5563; line-height: 1.5; margin-top: 20px;">If you didn't request this code, you can safely ignore this email.</p>
      `
    );

    await sendEmail(email, "Verify Your Email - RecruitFlow", emailContent);

    res.status(200).json({
      message: "New verification code sent to your email",
      email: email,
      activationToken: activationToken,
    });
  } catch (error) {
    console.error("Error in resending verification code:", error);
    res.status(500).json({ error: error.message });
  }
};

// Modify login function to check email verification status
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if email is verified
    if (!user.isEmailVerified || !user.isActive) {
      // Generate new verification materials
      const otp = generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      const activationToken = generateResetToken();

      user.otp = {
        code: otp,
        expiresAt: expiresAt,
      };
      user.activationToken = activationToken;
      user.activationExpires = expiresAt;

      await user.save();

      // Send verification email with enhanced template
      const emailContent = createEmailTemplate(
        "Email Verification Required",
        `
          <p style="color: #4b5563; line-height: 1.5;">Hi ${user.firstName},</p>
          <p style="color: #4b5563; line-height: 1.5;">Your account requires email verification. Please use this verification code to activate your account:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
            <h1 style="font-size: 32px; letter-spacing: 8px; margin: 0; color: #333; font-weight: 500;">${otp}</h1>
          </div>
          <p style="color: #4b5563; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>.</p>
          <p style="color: #4b5563; line-height: 1.5; margin-top: 20px;">If you have any questions, our support team is ready to assist you.</p>
        `
      );

      await sendEmail(
        email,
        "Email Verification Required - RecruitFlow",
        emailContent
      );

      return res.status(403).json({
        message: "Please verify your email before logging in",
        requiresVerification: true,
        email: email,
        activationToken: activationToken,
      });
    }

    // Generate tokens for authenticated user
    const accessToken = await generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Log token generation for debugging
    console.log(
      "Generated access token:",
      accessToken.substring(0, 20) + "..."
    );
    // Update last login
    user.lastLogin = new Date();
    await user.save();

     res.status(200).json({
       accessToken,
       refreshToken,
       user: {
         id: user._id,
         firstName: user.firstName,
         lastName: user.lastName,
         email: user.email,
         // We don't include role from auth service anymore
       },
     });
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
      expiresAt: expiresAt,
    };
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = expiresAt;
    await user.save();

    // Send email with OTP using enhanced template
    const emailContent = createEmailTemplate(
      "Password Reset Request",
      `
        <p style="color: #4b5563; line-height: 1.5;">Hi ${
          user.firstName || "there"
        },</p>
        <p style="color: #4b5563; line-height: 1.5;">We received a request to reset your password. Please use the following code to verify your identity:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; letter-spacing: 8px; margin: 0; color: #333; font-weight: 500;">${otp}</h1>
        </div>
        <p style="color: #4b5563; line-height: 1.5;">This code will expire in <strong>5 minutes</strong>.</p>
        <p style="color: #4b5563; line-height: 1.5; margin-top: 20px;">If you didn't request a password reset, please ignore this email or contact our support team if you have concerns.</p>
      `
    );

    await sendEmail(email, "Password Reset Code - RecruitFlow", emailContent);

    res.status(200).json({
      message: "OTP sent to your email",
      resetToken: resetToken, // This will be used to identify the reset request
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
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid reset token or token expired" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset fields
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.otp = undefined;
    await user.save();

    // Send confirmation email with enhanced template
    const emailContent = createEmailTemplate(
      "Password Reset Successful",
      `
        <p style="color: #4b5563; line-height: 1.5;">Hi ${
          user.firstName || "there"
        },</p>
        <p style="color: #4b5563; line-height: 1.5;">Your password has been reset successfully!</p>
        <p style="color: #4b5563; line-height: 1.5;">You can now log in to your account using your new password.</p>
        <p style="color: #4b5563; line-height: 1.5; margin-top: 20px; font-weight: 600; color: #dc2626;">If you didn't perform this action, please contact our support team immediately.</p>
      `,
      "Go to Login",
      process.env.FRONTEND_URL || "https://recruitflow.com/login"
    );

    await sendEmail(
      email,
      "Password Reset Successful - RecruitFlow",
      emailContent
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
      expiresAt: expiresAt,
    };
    await user.save();

    // Send email with OTP using enhanced template
    const emailContent = createEmailTemplate(
      "Login Verification Code",
      `
        <p style="color: #4b5563; line-height: 1.5;">Hi ${
          user.firstName || "there"
        },</p>
        <p style="color: #4b5563; line-height: 1.5;">Here is your one-time login verification code:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; letter-spacing: 8px; margin: 0; color: #333; font-weight: 500;">${otp}</h1>
        </div>
        <p style="color: #4b5563; line-height: 1.5;">This code will expire in <strong>5 minutes</strong>.</p>
        <p style="color: #4b5563; line-height: 1.5; margin-top: 20px;">If you didn't request this code, please secure your account by changing your password immediately.</p>
      `
    );

    await sendEmail(
      email,
      "Login Verification Code - RecruitFlow",
      emailContent
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
    const accessToken = await generateAccessToken(user);
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