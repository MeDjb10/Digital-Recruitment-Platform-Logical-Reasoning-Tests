const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

// Create a transporter using SMTP or other service
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Email templates for different status changes
const getStatusChangeTemplate = (user, status) => {
  const templates = {
    approved: {
      subject: "Your Test Authorization Request Has Been Approved",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #2e7d32;">Test Authorization Approved</h2>
          <p>Hello ${user.firstName},</p>
          <p>Great news! Your request to take the logical reasoning test has been approved.</p>
          <p>You can now proceed to the testing platform to schedule and complete your test.</p>
          <div style="margin: 20px 0; padding: 15px; background-color: #e8f5e9; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold;">Job Position: ${
              user.testEligibilityInfo?.jobPosition || "Not specified"
            }</p>
            <p style="margin: 5px 0 0;">Company: ${
              user.testEligibilityInfo?.company || "Not specified"
            }</p>
          </div>
          <p>Please log in to your account to proceed with scheduling your test.</p>
          <p>Best regards,<br>The Recruitment Team</p>
        </div>
      `,
    },
    rejected: {
      subject: "Update on Your Test Authorization Request",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #c62828;">Test Authorization Status Update</h2>
          <p>Hello ${user.firstName},</p>
          <p>We have reviewed your request to take the logical reasoning test, and unfortunately, we are unable to approve it at this time.</p>
          <div style="margin: 20px 0; padding: 15px; background-color: #ffebee; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold;">Job Position: ${
              user.testEligibilityInfo?.jobPosition || "Not specified"
            }</p>
            <p style="margin: 5px 0 0;">Company: ${
              user.testEligibilityInfo?.company || "Not specified"
            }</p>
          </div>
          <p>If you believe this is an error or would like to discuss this further, please contact our support team.</p>
          <p>Best regards,<br>The Recruitment Team</p>
        </div>
      `,
    },
    pending: {
      subject: "Test Authorization Request Received",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #1565c0;">Test Authorization Request Received</h2>
          <p>Hello ${user.firstName},</p>
          <p>We have received your request to take the logical reasoning test.</p>
          <div style="margin: 20px 0; padding: 15px; background-color: #e3f2fd; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold;">Job Position: ${
              user.testEligibilityInfo?.jobPosition || "Not specified"
            }</p>
            <p style="margin: 5px 0 0;">Company: ${
              user.testEligibilityInfo?.company || "Not specified"
            }</p>
          </div>
          <p>Your request is now under review by our team. We'll notify you once a decision has been made.</p>
          <p>Best regards,<br>The Recruitment Team</p>
        </div>
      `,
    },
  };

  return templates[status] || templates.pending;
};

// Function to send status change email
exports.sendStatusChangeEmail = async (user, status) => {
  if (!user.email) {
    console.error("No email address provided for notification");
    return false;
  }

  try {
    const template = getStatusChangeTemplate(user, status);

    const info = await transporter.sendMail({
      from: `"Recruitment Platform" <${
        process.env.EMAIL_FROM || process.env.EMAIL_USER
      }>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`Email sent to ${user.email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Error sending email notification:", error);
    return false;
  }
};

// Function to send confirmation email for submission
exports.sendRequestSubmissionEmail = async (user) => {
  if (!user.email) {
    console.error("No email address provided for notification");
    return false;
  }

  try {
    const template = getStatusChangeTemplate(user, "pending");

    const info = await transporter.sendMail({
      from: `"Recruitment Platform" <${
        process.env.EMAIL_FROM || process.env.EMAIL_USER
      }>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
    });

    console.log(
      `Submission confirmation email sent to ${user.email}: ${info.messageId}`
    );
    return true;
  } catch (error) {
    console.error("Error sending submission confirmation email:", error);
    return false;
  }
};
