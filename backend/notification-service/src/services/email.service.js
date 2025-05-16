const nodemailer = require("nodemailer");
const logger = require("../utils/logger.util");
const { createEmailTemplate } = require("../utils/email-template.util");

logger.info("Email configuration:");
logger.info(`- EMAIL_HOST: ${process.env.EMAIL_HOST || "not set"}`);
logger.info(`- EMAIL_USER: ${process.env.EMAIL_USER ? "set" : "not set"}`);
logger.info(
  `- EMAIL_PASS: ${
    process.env.EMAIL_PASS
      ? "set (length: " + process.env.EMAIL_PASS.length + ")"
      : "not set"
  }`
);

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an email
 */
async function sendEmail(to, subject, htmlContent) {
  try {
    // For development testing
    if (
      process.env.NODE_ENV === "development" &&
      process.env.USE_ETHEREAL === "true"
    ) {
      const testAccount = await nodemailer.createTestAccount();
      logger.info(`Using test email account: ${testAccount.user}`);

      const testTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await testTransporter.sendMail({
        from: `"RecruitFlow - Cofat Recruitment" <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html: htmlContent,
      });

      logger.info(
        `Email sent successfully with Ethereal! Preview URL: ${nodemailer.getTestMessageUrl(
          info
        )}`
      );
      return info;
    } else {
      const info = await transporter.sendMail({
        from: `"RecruitFlow - Cofat Recruitment" <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html: htmlContent,
      });

      logger.info(`Email sent successfully! Message ID: ${info.messageId}`);
      return info;
    }
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
    throw error;
  }
}

/**
 * Send verification email with OTP
 */
async function sendVerificationEmail(data) {
  const { email, firstName, otp } = data;

  const content = `
    <p>Hello ${firstName},</p>
    <p>Thank you for registering with RecruitFlow. To verify your email address, please use the verification code below:</p>
    <div style="margin: 20px auto; padding: 10px; background-color: #f0f4f8; border-radius: 4px; text-align: center; font-size: 24px; letter-spacing: 8px; font-weight: bold; color: #334155;">
      ${otp}
    </div>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't request this code, you can safely ignore this email.</p>
  `;

  const htmlContent = createEmailTemplate("Verify Your Email Address", content);

  return await sendEmail(email, "RecruitFlow: Verify Your Email", htmlContent);
}

/**
 * Send password reset email with OTP
 */
async function sendPasswordResetEmail(data) {
  const { email, firstName, otp } = data;

  const content = `
    <p>Hello ${firstName},</p>
    <p>You have requested to reset your password for RecruitFlow. Please use the verification code below to complete the password reset process:</p>
    <div style="margin: 20px auto; padding: 10px; background-color: #f0f4f8; border-radius: 4px; text-align: center; font-size: 24px; letter-spacing: 8px; font-weight: bold; color: #334155;">
      ${otp}
    </div>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't request this code, please secure your account and contact support.</p>
  `;

  const htmlContent = createEmailTemplate("Reset Your Password", content);

  return await sendEmail(
    email,
    "RecruitFlow: Password Reset Code",
    htmlContent
  );
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(data) {
  const { email, firstName } = data;

  const content = `
    <p>Hello ${firstName},</p>
    <p>Welcome to RecruitFlow! Your account has been successfully activated.</p>
    <p>You can now log in to the platform and explore our testing solutions.</p>
    <p>Thank you for choosing RecruitFlow for your assessment needs.</p>
  `;

  const htmlContent = createEmailTemplate(
    "Welcome to RecruitFlow",
    content,
    "Log In",
    process.env.FRONTEND_URL + "/auth/login"
  );

  return await sendEmail(email, "Welcome to RecruitFlow", htmlContent);
}

/**
 * Send test approval email
 */
async function sendTestApprovalEmail(data) {
  const { email, firstName, examDate, testType } = data;

  const examDateFormatted = new Date(examDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const content = `
    <p>Hello ${firstName},</p>
    <p>Good news! Your test request has been approved.</p>
    <p><strong>Test Type:</strong> ${testType}</p>
    <p><strong>Scheduled Date and Time:</strong> ${examDateFormatted}</p>
    <p>Please be prepared and log in to the system a few minutes before your test is scheduled to start.</p>
    <p>Good luck!</p>
  `;

  const htmlContent = createEmailTemplate(
    "Your Test Request Has Been Approved",
    content,
    "Go to Dashboard",
    process.env.FRONTEND_URL + "/dashboard"
  );

  return await sendEmail(
    email,
    "RecruitFlow: Test Request Approved",
    htmlContent
  );
}

/**
 * Send test rejection email
 */
async function sendTestRejectionEmail(data) {
  const { email, firstName, jobPosition, company } = data;

  const content = `
    <p>Hello ${firstName},</p>
    <p>We have reviewed your request to take the logical reasoning test, and unfortunately, we are unable to approve it at this time.</p>
    <div style="margin: 20px 0; padding: 15px; background-color: #ffebee; border-radius: 4px;">
      <p style="margin: 0; font-weight: bold;">Job Position: ${jobPosition}</p>
      <p style="margin: 5px 0 0;">Company: ${company}</p>
    </div>
    <p>If you believe this decision was made in error or would like to discuss this further, please contact our support team.</p>
  `;

  const htmlContent = createEmailTemplate(
    "Update on Your Test Authorization Request",
    content
  );

  return await sendEmail(
    email,
    "RecruitFlow: Test Request Status Update",
    htmlContent
  );
}

/**
 * Send test assignment email with more detailed information
 */
async function sendTestAssignmentEmail(data) {
  const {
    email,
    firstName,
    examDate,
    testType,
    additionalTests,
    jobPosition,
    company,
  } = data;

  let formattedDate = "To be determined";
  if (examDate) {
    formattedDate = new Date(examDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  let additionalTestsHtml = "";
  if (additionalTests && additionalTests.length > 0) {
    additionalTestsHtml = `<p><strong>Additional Tests:</strong> ${additionalTests.join(
      ", "
    )}</p>`;
  }

  const content = `
    <p>Hello ${firstName},</p>
    <p>Your test authorization request has been approved, and we are pleased to inform you about your test assignment:</p>
    <div style="margin: 20px 0; padding: 15px; background-color: #e3f2fd; border-radius: 4px;">
      <p style="margin: 0;"><strong>Test Assignment Details:</strong></p>
      <p><strong>Main Test:</strong> ${testType}</p>
      ${additionalTestsHtml}
      <p><strong>Exam Date:</strong> ${formattedDate}</p>
      <p><strong>Job Position:</strong> ${jobPosition}</p>
      <p><strong>Company:</strong> ${company}</p>
    </div>
    <p>Please make sure you are prepared for the exam date. You'll receive additional instructions before the test.</p>
    <p>If you have any questions, please contact our support team.</p>
  `;

  const htmlContent = createEmailTemplate(
    "Your Test Assignment Details",
    content,
    "Go to Dashboard",
    process.env.FRONTEND_URL + "/dashboard"
  );

  return await sendEmail(
    email,
    "RecruitFlow: Test Assignment Details",
    htmlContent
  );
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendTestApprovalEmail,
  sendTestRejectionEmail, // Add this
  sendTestAssignmentEmail, // Add this
};
