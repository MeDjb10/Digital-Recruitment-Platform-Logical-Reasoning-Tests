// Update email.util.js to use Ethereal Email for testing
const nodemailer = require("nodemailer");
require("dotenv").config();

async function sendEmail(to, subject, htmlContent) {
  try {
    // Create a test account on Ethereal
    const testAccount = await nodemailer.createTestAccount();
    console.log("Created test email account:", testAccount.user);

    // Create reusable transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const mailOptions = {
      from: `"RecruitFlow" <${testAccount.user}>`,
      to,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
    console.log("Message ID:", info.messageId);

    // Show URL where you can see the email
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

module.exports = { sendEmail };
