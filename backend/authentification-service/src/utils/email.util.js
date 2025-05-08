const nodemailer = require("nodemailer");
require("dotenv").config();

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

// Email template with improved UI
const createEmailTemplate = (title, content, ctaText = "", ctaUrl = "") => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #3b82f6; margin: 0; font-size: 24px;">RecruitFlow</h2>
        <p style="color: #64748b; font-size: 14px; margin: 5px 0 0;">Digital Recruitment Platform</p>
      </div>
      <div style="border-top: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; padding: 20px 0; margin: 20px 0;">
        <h3 style="color: #1e293b; margin-top: 0;">${title}</h3>
        ${content}
      </div>
      ${
        ctaText && ctaUrl
          ? `
        <div style="text-align: center; margin: 25px 0;">
          <a href="${ctaUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; font-weight: 500;">${ctaText}</a>
        </div>
      `
          : ""
      }
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} RecruitFlow. All rights reserved.</p>
        <p style="color: #64748b; font-size: 12px; margin: 5px 0 0;">If you didn't request this email, you can safely ignore it.</p>
      </div>
    </div>
  `;
};

// Function to send email with enhanced template
async function sendEmail(to, subject, htmlContent) {
  try {
    // For local development/testing, you can use the conditional logic to use Ethereal
    if (
      process.env.NODE_ENV === "development" &&
      process.env.USE_ETHEREAL === "true"
    ) {
      // Create a test account on Ethereal
      const testAccount = await nodemailer.createTestAccount();
      console.log("Using test email account:", testAccount.user);

      // Create test transporter
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
        from: `"RecruitFlow" <${testAccount.user}>`,
        to,
        subject,
        html: htmlContent,
      });

      console.log("Email sent successfully with Ethereal!");
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      return info;
    } else {
      // Use the regular transporter for production
      const info = await transporter.sendMail({
        from: `"RecruitFlow" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: htmlContent,
      });

      console.log("Email sent successfully!");
      console.log("Message ID:", info.messageId);
      return info;
    }
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

module.exports = {
  sendEmail,
  createEmailTemplate,
};
