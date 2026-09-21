const { createTransporter } = require('../config/email');
const { EmailLog } = require('../models');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.EMAIL_FROM || 'AdPlatform <noreply@adplatform.com>';

async function sendEmail({ to, subject, html, userId = null, campaignId = null, emailType = 'general' }) {
  const transporter = createTransporter();
  let status = 'pending';
  let errorMsg = null;

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html
    });

    status = 'sent';
    await EmailLog.create({
      userId,
      campaignId,
      emailType,
      recipient: to,
      subject,
      status: 'sent',
      sentAt: new Date()
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`Failed to send ${emailType} email to ${to}:`, err.message);
    errorMsg = err.message;
    status = 'failed';

    await EmailLog.create({
      userId,
      campaignId,
      emailType,
      recipient: to,
      subject,
      status: 'failed',
      error: errorMsg,
      sentAt: new Date()
    });

    return { success: false, error: errorMsg };
  }
}

// 1. Welcome Email
async function sendWelcomeEmail(user) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563EB;">Welcome to AdPlatform, ${user.fullName}!</h2>
      <p>Thank you for registering your business, <strong>${user.businessName}</strong>.</p>
      <p>With AdPlatform, you can launch targeted advertising campaigns across TikTok, Instagram, and Google Ads effortlessly.</p>
      <div style="margin: 25px 0;">
        <a href="${BASE_URL}/dashboard" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Your Dashboard</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">If you have any questions, feel free to reply to this email or visit our support page.</p>
    </div>
  `;
  return sendEmail({ to: user.businessEmail, subject: 'Welcome to AdPlatform!', html, userId: user.id, emailType: 'welcome' });
}

// 2. Email Verification
async function sendEmailVerification(user, token) {
  const verifyUrl = `${BASE_URL}/auth/verify-email?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563EB;">Verify Your Email Address</h2>
      <p>Hi ${user.fullName}, please verify your business email address for AdPlatform.</p>
      <div style="margin: 25px 0;">
        <a href="${verifyUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">Or copy and paste this link in your browser:<br>${verifyUrl}</p>
    </div>
  `;
  return sendEmail({ to: user.businessEmail, subject: 'Verify your AdPlatform account', html, userId: user.id, emailType: 'verification' });
}

// 3. Campaign Submitted
async function sendCampaignSubmittedEmail(user, campaign) {
  const payUrl = `${BASE_URL}/campaigns/${campaign.campaignId}/payment`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563EB;">Campaign Submitted Successfully</h2>
      <p>Dear ${user.businessName},</p>
      <p>Your advertising campaign <strong>"${campaign.title}"</strong> (ID: <code>${campaign.campaignId}</code>) has been submitted.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0;">Campaign ID:</td><td style="font-weight: bold;">${campaign.campaignId}</td></tr>
        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0;">Total Budget:</td><td style="font-weight: bold;">₦${Number(campaign.totalBudget).toLocaleString()}</td></tr>
        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0;">Service Fee:</td><td style="font-weight: bold;">₦${Number(campaign.totalServiceFee).toLocaleString()}</td></tr>
        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0;">Total Payable:</td><td style="font-weight: bold; color: #2563EB;">₦${Number(campaign.totalAmount).toLocaleString()}</td></tr>
      </table>
      <div style="margin: 25px 0;">
        <a href="${payUrl}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Complete Payment</a>
      </div>
    </div>
  `;
  return sendEmail({ to: user.businessEmail, subject: `Campaign Submitted: ${campaign.campaignId}`, html, userId: user.id, campaignId: campaign.id, emailType: 'campaign_submitted' });
}

// 4. Payment Successful
async function sendPaymentSuccessEmail(user, campaign, payment) {
  const receiptUrl = `${BASE_URL}/campaigns/${campaign.campaignId}/receipt`;
  const campaignUrl = `${BASE_URL}/campaign/${campaign.campaignId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #10B981;">Payment Received & Confirmed!</h2>
      <p>Hello ${user.businessName},</p>
      <p>We have successfully received your payment of <strong>₦${Number(payment.amount).toLocaleString()}</strong> for campaign <strong>"${campaign.title}"</strong>.</p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 4px 0;"><strong>Payment Reference:</strong> ${payment.reference}</p>
        <p style="margin: 4px 0;"><strong>Campaign ID:</strong> ${campaign.campaignId}</p>
        <p style="margin: 4px 0;"><strong>Status:</strong> ${campaign.status}</p>
      </div>
      <p>Your public campaign viewing link is live:</p>
      <p><a href="${campaignUrl}" style="color: #2563EB; font-weight: bold;">${campaignUrl}</a></p>
      <div style="margin: 25px 0;">
        <a href="${receiptUrl}" style="background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View Full Receipt</a>
      </div>
    </div>
  `;
  return sendEmail({ to: user.businessEmail, subject: `Payment Confirmed - ${campaign.campaignId}`, html, userId: user.id, campaignId: campaign.id, emailType: 'payment_success' });
}

// 5. Campaign Approved
async function sendCampaignApprovedEmail(user, campaign) {
  const campaignUrl = `${BASE_URL}/campaign/${campaign.campaignId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #10B981;">Campaign Approved!</h2>
      <p>Great news, ${user.businessName}!</p>
      <p>Your advertising campaign <strong>"${campaign.title}"</strong> (<code>${campaign.campaignId}</code>) has been approved by our team and is scheduled for deployment on the selected advertising networks.</p>
      <p>Track your campaign progress here:</p>
      <a href="${campaignUrl}" style="background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">View Campaign Status</a>
    </div>
  `;
  return sendEmail({ to: user.businessEmail, subject: `Campaign Approved: ${campaign.campaignId}`, html, userId: user.id, campaignId: campaign.id, emailType: 'campaign_approved' });
}

// 6. Campaign Rejected
async function sendCampaignRejectedEmail(user, campaign, reason) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #EF4444;">Campaign Review Update</h2>
      <p>Dear ${user.businessName},</p>
      <p>Your campaign <strong>"${campaign.title}"</strong> (<code>${campaign.campaignId}</code>) requires changes before it can be launched.</p>
      <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px; margin: 15px 0;">
        <strong>Reason for Rejection:</strong>
        <p style="margin: 6px 0 0 0;">${reason || 'Creative materials or links did not adhere to ad platform guidelines.'}</p>
      </div>
      <p>Our support team is ready to help you update your materials so we can launch promptly.</p>
      <a href="${BASE_URL}/support" style="color: #2563EB;">Contact Support</a>
    </div>
  `;
  return sendEmail({ to: user.businessEmail, subject: `Campaign Review Notice: ${campaign.campaignId}`, html, userId: user.id, campaignId: campaign.id, emailType: 'campaign_rejected' });
}

// 7. Campaign Launched
async function sendCampaignLaunchedEmail(user, campaign) {
  const campaignUrl = `${BASE_URL}/campaign/${campaign.campaignId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #10B981;">Your Campaign is Now Running! 🚀</h2>
      <p>Exciting news, ${user.businessName}!</p>
      <p>Your campaign <strong>"${campaign.title}"</strong> is actively running across your chosen advertising channels.</p>
      <div style="margin: 20px 0;">
        <a href="${campaignUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Live Campaign</a>
      </div>
    </div>
  `;
  return sendEmail({ to: user.businessEmail, subject: `Campaign Active: ${campaign.campaignId}`, html, userId: user.id, campaignId: campaign.id, emailType: 'campaign_launched' });
}

// 8. Campaign Completed
async function sendCampaignCompletedEmail(user, campaign) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563EB;">Campaign Completed</h2>
      <p>Dear ${user.businessName},</p>
      <p>Your campaign <strong>"${campaign.title}"</strong> (<code>${campaign.campaignId}</code>) has finished its scheduled run.</p>
      <p>Log in to your dashboard to review campaign performance and launch new campaigns.</p>
      <a href="${BASE_URL}/dashboard" style="background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">Go to Dashboard</a>
    </div>
  `;
  return sendEmail({ to: user.businessEmail, subject: `Campaign Completed: ${campaign.campaignId}`, html, userId: user.id, campaignId: campaign.id, emailType: 'campaign_completed' });
}

// 9. Password Reset
async function sendPasswordResetEmail(user, resetUrl) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563EB;">Password Reset Request</h2>
      <p>Hello ${user.fullName},</p>
      <p>We received a request to reset your AdPlatform account password. Click the button below to proceed:</p>
      <div style="margin: 25px 0;">
        <a href="${resetUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">This link is valid for 1 hour. If you did not request this, you can safely ignore this email.</p>
    </div>
  `;
  return sendEmail({ to: user.businessEmail, subject: 'AdPlatform - Password Reset Link', html, userId: user.id, emailType: 'password_reset' });
}

// 10. Campaign Link Delivery
async function sendCampaignLinkEmail(user, campaign) {
  const campaignUrl = `${BASE_URL}/campaign/${campaign.campaignId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563EB;">Your Campaign Link</h2>
      <p>Hello ${user.businessName},</p>
      <p>Here is your secure campaign viewing link for <strong>"${campaign.title}"</strong>:</p>
      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; word-break: break-all; margin: 15px 0;">
        <a href="${campaignUrl}" style="color: #2563EB; font-weight: bold; font-size: 16px;">${campaignUrl}</a>
      </div>
      <p>You can share this link with colleagues or clients to track campaign status and preview uploaded creative materials.</p>
    </div>
  `;
  return sendEmail({ to: user.businessEmail, subject: `Campaign Link: ${campaign.campaignId}`, html, userId: user.id, campaignId: campaign.id, emailType: 'campaign_link' });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendEmailVerification,
  sendCampaignSubmittedEmail,
  sendPaymentSuccessEmail,
  sendCampaignApprovedEmail,
  sendCampaignRejectedEmail,
  sendCampaignLaunchedEmail,
  sendCampaignCompletedEmail,
  sendPasswordResetEmail,
  sendCampaignLinkEmail
};

