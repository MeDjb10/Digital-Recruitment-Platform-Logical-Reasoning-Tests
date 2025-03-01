const nodemailer = require("nodemailer");
const logger = require("../config/logger");

// Create transporter with Gmail configuration
let transporter;

// Only set up real transporter if mock emails are not enabled
if (
  process.env.NODE_ENV !== "development" ||
  process.env.MOCK_EMAIL !== "true"
) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false, // Only use in development!
    },
  });

  // Verify connection only if we're using the real transporter
  transporter
    .verify()
    .then(() => {
      logger.info("Email server is ready to send messages");
    })
    .catch((error) => {
      logger.error("Email service error:", error);
      logger.info(
        "Continuing without email verification. Some features may not work."
      );
    });
}

/**
 * Send welcome email to new user
 * @param {Object} user - User object with email, firstName
 */
exports.sendWelcomeEmail = async (user) => {
  // If in mock mode, just log and return
  if (
    process.env.NODE_ENV === "development" &&
    process.env.MOCK_EMAIL === "true"
  ) {
    logger.info(`[MOCK EMAIL] Welcome email would be sent to ${user.email}`);
    return true;
  }

  try {
    const mailOptions = {
      from: `"Recruitment Platform" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: "Welcome to the Digital Recruitment Platform",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to the Digital Recruitment Platform!</h2>
          <p>Hello ${user.firstName},</p>
          <p>Thank you for creating an account with us. We're excited to have you on board!</p>
          <p>With your account, you can:</p>
          <ul>
            <li>Take recruitment tests</li>
            <li>View your results</li>
            <li>Track your application progress</li>
          </ul>
          <p>To get started, please verify your email by clicking the link in our verification email.</p>
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          <p>Best regards,<br>The Digital Recruitment Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${user.email}`);
    return true;
  } catch (error) {
    logger.error("Error sending welcome email:", error);
    return false;
  }
};

/**
 * Send email verification link
 * @param {Object} user - User object with email, firstName
 * @param {String} verificationToken - Token for email verification
 * @param {String} baseUrl - Base URL for verification link
 */
exports.sendVerificationEmail = async (user, verificationToken, baseUrl) => {
  // If in mock mode, just log and return
  if (
    process.env.NODE_ENV === "development" &&
    process.env.MOCK_EMAIL === "true"
  ) {
    logger.info(
      `[MOCK EMAIL] Verification email would be sent to ${user.email}`
    );
    logger.info(
      `[MOCK EMAIL] Verification URL: ${baseUrl}/api/auth/verify-email/${verificationToken}`
    );
    return true;
  }

  const verificationUrl = `${baseUrl}/api/auth/verify-email/${verificationToken}`;

  try {
    const mailOptions = {
      from: `"Recruitment Platform" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: "Please verify your email address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Hello ${user.firstName},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">Verify Email</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <p>Best regards,<br>The Digital Recruitment Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${user.email}`);
    return true;
  } catch (error) {
    logger.error("Error sending verification email:", error);
    return false;
  }
};

/**
 * Send password reset link
 * @param {Object} user - User object with email, firstName
 * @param {String} resetToken - Token for password reset
 * @param {String} baseUrl - Base URL for reset link
 */
exports.sendPasswordResetEmail = async (user, resetToken, baseUrl) => {
  // If in mock mode, just log and return
  if (
    process.env.NODE_ENV === "development" &&
    process.env.MOCK_EMAIL === "true"
  ) {
    logger.info(
      `[MOCK EMAIL] Password reset email would be sent to ${user.email}`
    );
    logger.info(
      `[MOCK EMAIL] Reset URL: ${baseUrl}/reset-password/${resetToken}`
    );
    return true;
  }

  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

  try {
    const mailOptions = {
      from: `"Recruitment Platform" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.firstName},</p>
          <p>We received a request to reset your password. If you made this request, click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 10 minutes.</p>
          <p>If you didn't request a password reset, please ignore this email or contact our support team if you have concerns.</p>
          <p>Best regards,<br>The Digital Recruitment Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${user.email}`);
    return true;
  } catch (error) {
    logger.error("Error sending password reset email:", error);
    return false;
  }
};
