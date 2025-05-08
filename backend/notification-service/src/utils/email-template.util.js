/**
 * Create an email template with improved UI
 */
function createEmailTemplate(title, content, ctaText = '', ctaUrl = '') {
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
          : ''
      }
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} RecruitFlow. All rights reserved.</p>
        <p style="color: #64748b; font-size: 12px; margin: 5px 0 0;">If you didn't request this email, you can safely ignore it.</p>
      </div>
    </div>
  `;
}

module.exports = {
  createEmailTemplate
};