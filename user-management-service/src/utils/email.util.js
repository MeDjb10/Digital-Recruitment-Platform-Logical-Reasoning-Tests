const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const logger = require("./logger.util");

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
  try {
    if (!user.email) {
      throw new Error("User email is required");
    }

    // Create styled email body based on status
    let emailSubject =
      status === "approved"
        ? "Your Test Authorization Request Has Been Approved"
        : "Update on Your Test Authorization Request";

    let emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: ${status === "approved" ? "#2e7d32" : "#c62828"};">${
      status === "approved"
        ? "Test Authorization Approved"
        : "Test Authorization Status Update"
    }</h2>
        <p>Hello ${user.firstName},</p>
    `;

    if (status === "approved") {
      emailBody += `
        <p>Great news! Your request to take the logical reasoning test has been approved.</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #e8f5e9; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold;">Job Position: ${
            user.testEligibilityInfo?.jobPosition || "Not specified"
          }</p>
          <p style="margin: 5px 0 0;">Company: ${
            user.testEligibilityInfo?.company || "Not specified"
          }</p>
      `;

      // Add test assignment information if available
      if (user.testAssignment && user.testAssignment.assignedTest !== "none") {
        emailBody += `
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #c8e6c9;">
            <p style="margin: 0; font-weight: bold;">Test Assignment:</p>
            <p style="margin: 5px 0 0;">Main Test: ${user.testAssignment.assignedTest}</p>
        `;

        if (
          user.testAssignment.additionalTests &&
          user.testAssignment.additionalTests.length > 0
        ) {
          emailBody += `<p style="margin: 5px 0 0;">Additional Tests: ${user.testAssignment.additionalTests.join(
            ", "
          )}</p>`;
        }

        if (user.testAssignment.examDate) {
          const formattedDate = new Date(
            user.testAssignment.examDate
          ).toLocaleDateString();
          emailBody += `<p style="margin: 5px 0 0;">Exam Date: ${formattedDate}</p>`;
        }

        emailBody += `</div>`;
      }

      emailBody += `
        </div>
        <p>You can now proceed to the testing platform to complete your assigned test${
          user.testAssignment?.examDate ? " on the scheduled date" : ""
        }.</p>
        <p>You will receive further instructions about the testing process soon.</p>
      `;
    } else {
      emailBody += `
        <p>We have reviewed your request to take the logical reasoning test, and unfortunately, we are unable to approve it at this time.</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #ffebee; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold;">Job Position: ${
            user.testEligibilityInfo?.jobPosition || "Not specified"
          }</p>
          <p style="margin: 5px 0 0;">Company: ${
            user.testEligibilityInfo?.company || "Not specified"
          }</p>
        </div>
        <p>If you believe this decision was made in error or if you need more information, please contact our support team.</p>
      `;
    }

    emailBody += `
        <p>Thank you for your understanding.</p>
        <p style="margin-top: 20px;">Best regards,<br>The Recruitment Team</p>
      </div>
    `;

    // Actually send the email
    try {
      const info = await transporter.sendMail({
        from: `"Recruitment Platform" <${
          process.env.EMAIL_FROM || process.env.EMAIL_USER
        }>`,
        to: user.email,
        subject: emailSubject,
        html: emailBody,
      });

      logger.info(
        `Status change email sent to ${user.email}: ${info.messageId}`
      );
    } catch (sendError) {
      logger.error("Error in SMTP sending", {
        error: sendError.message,
        userId: user._id,
      });

      // Log email content for debugging
      logger.info(`Would send to ${user.email} with subject: ${emailSubject}`);
      logger.debug(`Email body: ${emailBody}`);
    }

    return true;
  } catch (error) {
    logger.error("Error sending status change email", {
      error: error.message,
      userId: user._id,
    });
    return false;
  }
};

// Function to send confirmation email for submission
exports.sendRequestSubmissionEmail = async (user) => {
  try {
    if (!user.email) {
      throw new Error("User email is required");
    }

    const template = getStatusChangeTemplate(user, "pending");

    try {
      const info = await transporter.sendMail({
        from: `"Recruitment Platform" <${
          process.env.EMAIL_FROM || process.env.EMAIL_USER
        }>`,
        to: user.email,
        subject: template.subject,
        html: template.html,
      });

      logger.info(
        `Submission confirmation email sent to ${user.email}: ${info.messageId}`
      );
    } catch (sendError) {
      logger.error("Error in SMTP sending", {
        error: sendError.message,
        userId: user._id,
      });

      // Log email content for debugging
      logger.info(
        `Would send to ${user.email} with subject: ${template.subject}`
      );
      logger.debug(`Email body: ${template.html}`);
    }

    return true;
  } catch (error) {
    logger.error("Error sending submission confirmation email", {
      error: error.message,
      userId: user._id,
    });
    return false;
  }
};

// Function to send test assignment email
exports.sendTestAssignmentEmail = async (user) => {
  try {
    if (!user.email) {
      throw new Error("User email is required");
    }

    const testInfo = {
      mainTest: user.testAssignment.assignedTest,
      additionalTests: user.testAssignment.additionalTests || [],
      examDate: user.testAssignment.examDate
        ? new Date(user.testAssignment.examDate).toLocaleDateString()
        : "To be determined",
    };

    const emailSubject = "Your Test Assignment Details";

    let emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #1565c0;">Test Assignment Details</h2>
        <p>Hello ${user.firstName},</p>
        <p>Your test authorization request has been approved, and we are pleased to inform you about your test assignment:</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #e3f2fd; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold;">Test Assignment Details:</p>
          <p style="margin: 5px 0 0;">Main Test: ${testInfo.mainTest}</p>
    `;

    if (testInfo.additionalTests.length > 0) {
      emailBody += `<p style="margin: 5px 0 0;">Additional Tests: ${testInfo.additionalTests.join(
        ", "
      )}</p>`;
    }

    emailBody += `
          <p style="margin: 5px 0 0;">Exam Date: ${testInfo.examDate}</p>
          <p style="margin: 5px 0 0;">Job Position: ${
            user.testEligibilityInfo?.jobPosition || "Not specified"
          }</p>
          <p style="margin: 5px 0 0;">Company: ${
            user.testEligibilityInfo?.company || "Not specified"
          }</p>
        </div>
        
        <p>Please make sure you are prepared for the exam date. You'll receive additional instructions before the test.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p style="margin-top: 20px;">Best regards,<br>The Recruitment Team</p>
      </div>
    `;

    // Actually send the email instead of just logging it
    try {
      const info = await transporter.sendMail({
        from: `"Recruitment Platform" <${
          process.env.EMAIL_FROM || process.env.EMAIL_USER
        }>`,
        to: user.email,
        subject: emailSubject,
        html: emailBody,
      });

      logger.info(
        `Test assignment email sent to ${user.email}: ${info.messageId}`
      );
    } catch (sendError) {
      logger.error("Error in SMTP sending", {
        error: sendError.message,
        userId: user._id,
      });

      // Log email content for debugging
      logger.info(`Would send to ${user.email} with subject: ${emailSubject}`);
      logger.debug(`Email body: ${emailBody}`);
    }

    return true;
  } catch (error) {
    logger.error("Error sending test assignment email", {
      error: error.message,
      userId: user._id,
    });
    return false;
  }
};

// Function to send a test email
exports.sendTestEmail = async (email) => {
  try {
    const emailSubject = "Test Email from Recruitment Platform";
    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #1565c0;">Email Functionality Test</h2>
        <p>This is a test email from the Recruitment Platform.</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #e3f2fd; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold;">Email Status:</p>
          <p style="margin: 5px 0 0;">If you're receiving this, email sending is working correctly.</p>
          <p style="margin: 5px 0 0;">Current timestamp: ${new Date().toISOString()}</p>
        </div>
        
        <p style="margin-top: 20px;">Best regards,<br>The Recruitment Team</p>
      </div>
    `;

    // Send the email
    const info = await transporter.sendMail({
      from: `"Recruitment Platform" <${
        process.env.EMAIL_FROM || process.env.EMAIL_USER
      }>`,
      to: email,
      subject: emailSubject,
      html: emailBody,
    });

    logger.info(`Test email sent to ${email}: ${info.messageId}`);

    return {
      messageId: info.messageId,
      success: true,
    };
  } catch (error) {
    logger.error("Error sending test email", {
      error: error.message,
      email,
    });
    throw error;
  }
};
