const { v4: uuidv4 } = require('uuid');
const {
  Campaign,
  CampaignPlatform,
  UploadedMedia,
  Payment,
  Notification,
  AuditLog,
  User,
  sequelize
} = require('../models');
const pricingService = require('./pricingService');
const emailService = require('./emailService');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function generateCampaignId() {
  // Generates ADV-XXXXX (e.g. ADV-10025 or ADV-73921)
  const num = Math.floor(10000 + Math.random() * 90000);
  return `ADV-${num}`;
}

async function createCampaign(userId, formData, files) {
  const t = await sequelize.transaction();

  try {
    let campaignId = generateCampaignId();
    let exists = await Campaign.findOne({ where: { campaignId } });
    while (exists) {
      campaignId = generateCampaignId();
      exists = await Campaign.findOne({ where: { campaignId } });
    }

    const platformsSelected = Array.isArray(formData.platforms)
      ? formData.platforms
      : formData.platforms ? [formData.platforms] : [];

    let totalBudget = 0;
    let totalServiceFee = 0;
    const platformCalculations = [];

    for (const p of platformsSelected) {
      if (p === 'tiktok') {
        const days = parseInt(formData.tiktok_days) || 1;
        const pricing = await pricingService.getTikTokPricing(days);
        platformCalculations.push({
          platform: 'tiktok',
          budget: pricing.budgetNgn,
          budgetUsd: pricing.budgetUsd,
          serviceFee: pricing.serviceFee,
          days: pricing.days,
          exchangeRate: pricing.exchangeRate
        });
        totalBudget += pricing.budgetNgn;
        totalServiceFee += pricing.serviceFee;
      } else if (p === 'instagram') {
        const budget = parseFloat(formData.instagram_budget) || 50000;
        const pricing = await pricingService.getInstagramPricing(budget);
        platformCalculations.push({
          platform: 'instagram',
          budget: pricing.budgetNgn,
          serviceFee: pricing.serviceFee
        });
        totalBudget += pricing.budgetNgn;
        totalServiceFee += pricing.serviceFee;
      } else if (p === 'google') {
        const budget = parseFloat(formData.google_budget) || 50000;
        const pricing = await pricingService.getGooglePricing(budget);
        platformCalculations.push({
          platform: 'google',
          budget: pricing.budgetNgn,
          serviceFee: pricing.serviceFee
        });
        totalBudget += pricing.budgetNgn;
        totalServiceFee += pricing.serviceFee;
      }
    }

    const totalAmount = totalBudget + totalServiceFee;

    // Get user details for fallback
    const user = await User.findByPk(userId);

    const customerEmail = (formData.customerEmail || formData.businessEmail || (user ? user.businessEmail : '')).toLowerCase().trim();
    const customerName = formData.customerName || formData.fullName || (user ? user.fullName : '');
    const businessName = formData.businessName || (user ? user.businessName : '');
    const customerPhone = formData.customerPhone || formData.phone || (user ? user.phone : '');
    const videoUrl = formData.videoUrl ? formData.videoUrl.trim() : null;

    let paymentProofPath = null;
    if (files && files.paymentProof && files.paymentProof[0]) {
      paymentProofPath = `/uploads/${files.paymentProof[0].filename}`;
    }

    const campaign = await Campaign.create({
      campaignId,
      userId,
      customerName,
      businessName,
      customerEmail,
      customerPhone,
      title: formData.title,
      productName: formData.productName || null,
      description: formData.description,
      websiteUrl: formData.websiteUrl || null,
      socialMediaUrl: formData.socialMediaUrl || null,
      videoUrl,
      targetAudience: formData.targetAudience || null,
      targetLocation: formData.targetLocation || null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      orderStatus: 'REVIEW',
      paymentStatus: paymentProofPath ? 'PROOF_SUBMITTED' : 'PENDING',
      paymentProofFile: paymentProofPath,
      paymentProofSubmittedAt: paymentProofPath ? new Date() : null,
      status: 'Awaiting Payment',
      totalBudget,
      totalServiceFee,
      totalAmount
    }, { transaction: t });

    for (const pc of platformCalculations) {
      await CampaignPlatform.create({
        campaignId: campaign.id,
        ...pc
      }, { transaction: t });
    }

    // Save uploaded media files
    if (files) {
      if (files.video && files.video[0]) {
        const file = files.video[0];
        await UploadedMedia.create({
          campaignId: campaign.id,
          userId,
          fileType: 'video',
          originalName: file.originalname,
          fileName: file.filename,
          filePath: `/uploads/${file.filename}`,
          mimeType: file.mimetype,
          fileSize: file.size
        }, { transaction: t });
      }

      if (files.image && files.image[0]) {
        const file = files.image[0];
        await UploadedMedia.create({
          campaignId: campaign.id,
          userId,
          fileType: 'image',
          originalName: file.originalname,
          fileName: file.filename,
          filePath: `/uploads/${file.filename}`,
          mimeType: file.mimetype,
          fileSize: file.size
        }, { transaction: t });
      }
    }

    // Generate initial Payment Ledger record
    const payRef = `REF-${campaignId}-${Math.floor(1000 + Math.random() * 9000)}`;
    await Payment.create({
      campaignId: campaign.id,
      userId,
      customerName,
      customerEmail,
      businessName,
      customerPhone,
      amount: totalAmount,
      currency: 'NGN',
      reference: payRef,
      gateway: 'bank_transfer',
      status: paymentProofPath ? 'proof_submitted' : 'pending',
      proofFile: paymentProofPath,
      proofSubmittedAt: paymentProofPath ? new Date() : null
    }, { transaction: t });

    // Create Notification
    await Notification.create({
      userId,
      type: 'campaign',
      title: 'Order Placed',
      message: `Your advertising order #${campaign.campaignId} has been placed. Please complete payment transfer or submit payment proof.`,
      campaignId: campaign.campaignId,
      link: `/campaigns/${campaign.campaignId}/payment`
    }, { transaction: t });

    await t.commit();

    // Trigger email
    if (customerEmail) {
      emailService.sendCampaignSubmittedEmail({ businessName, businessEmail: customerEmail, fullName: customerName }, campaign).catch(console.error);
    }

    return campaign;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function attachPaymentProof(campaignId, file, paymentReference = null) {
  const campaign = await Campaign.findOne({ where: { campaignId } });
  if (!campaign) throw new Error('Order not found');

  const proofPath = `/uploads/${file.filename}`;
  campaign.paymentProofFile = proofPath;
  campaign.paymentProofSubmittedAt = new Date();
  campaign.paymentStatus = 'PROOF_SUBMITTED';
  campaign.status = 'Under Review';
  await campaign.save();

  // Update or create payment record
  let payment = await Payment.findOne({ where: { campaignId: campaign.id } });
  if (payment) {
    payment.proofFile = proofPath;
    payment.proofSubmittedAt = new Date();
    payment.status = 'proof_submitted';
    if (paymentReference) payment.reference = paymentReference;
    await payment.save();
  }

  // Create Notification
  await Notification.create({
    userId: campaign.userId,
    type: 'payment_proof',
    title: 'Payment Proof Submitted',
    message: `Payment confirmation for Order #${campaign.campaignId} was received and is pending administrator verification.`,
    campaignId: campaign.campaignId,
    link: `/campaigns/${campaign.campaignId}`
  });

  return campaign;
}

async function getCampaignWithDetails(campaignId) {
  return Campaign.findOne({
    where: { campaignId },
    include: [
      { model: CampaignPlatform, as: 'platforms' },
      { model: UploadedMedia, as: 'media' },
      { model: Payment, as: 'payments' },
      { model: User, as: 'user' }
    ]
  });
}

async function updateOrderStatus(campaignId, newOrderStatus, adminId = null, notes = null) {
  const campaign = await Campaign.findOne({
    where: { campaignId },
    include: [{ model: User, as: 'user' }]
  });

  if (!campaign) throw new Error('Order not found');

  const oldStatus = campaign.orderStatus;
  campaign.orderStatus = newOrderStatus;
  if (notes) campaign.adminNotes = notes;

  if (newOrderStatus === 'PROCESSING') {
    campaign.status = 'Scheduled';
  } else if (newOrderStatus === 'COMPLETE') {
    campaign.status = 'Completed';
  } else if (newOrderStatus === 'CANCELLED') {
    campaign.status = 'Cancelled';
  }

  await campaign.save();

  await AuditLog.create({
    adminId,
    action: 'UPDATE_ORDER_STATUS',
    entityType: 'Campaign',
    entityId: campaign.campaignId,
    details: `Order status changed from ${oldStatus} to ${newOrderStatus}. Notes: ${notes || ''}`
  });

  await Notification.create({
    userId: campaign.userId,
    type: 'order_status',
    title: `Order Status: ${newOrderStatus}`,
    message: `Your advertising order #${campaign.campaignId} is now marked as ${newOrderStatus}.`,
    campaignId: campaign.campaignId,
    link: `/campaigns/${campaign.campaignId}`
  });

  if (newOrderStatus === 'COMPLETE' && (campaign.customerEmail || (campaign.user && campaign.user.businessEmail))) {
    emailService.sendCampaignCompletedEmail(
      { businessEmail: campaign.customerEmail || campaign.user.businessEmail, businessName: campaign.businessName },
      campaign
    ).catch(console.error);
  }

  return campaign;
}

async function verifyOrderPayment(campaignId, adminId = null, notes = null) {
  const campaign = await Campaign.findOne({
    where: { campaignId },
    include: [{ model: User, as: 'user' }]
  });

  if (!campaign) throw new Error('Order not found');

  campaign.paymentStatus = 'VERIFIED';
  campaign.status = 'Payment Confirmed';
  if (campaign.orderStatus === 'REVIEW') {
    campaign.orderStatus = 'PROCESSING';
  }
  await campaign.save();

  // Update payment record
  const payment = await Payment.findOne({
    where: { campaignId: campaign.id },
    order: [['createdAt', 'DESC']]
  });

  if (payment) {
    payment.status = 'verified';
    payment.verifiedAt = new Date();
    payment.verifiedBy = adminId;
    if (notes) payment.adminNotes = notes;
    await payment.save();
  }

  await AuditLog.create({
    adminId,
    action: 'VERIFY_PAYMENT',
    entityType: 'Payment',
    entityId: campaign.campaignId,
    details: `Admin verified payment of ₦${Number(campaign.totalAmount).toLocaleString()} for order #${campaign.campaignId}`
  });

  await Notification.create({
    userId: campaign.userId,
    type: 'payment_verified',
    title: 'Payment Verified & Confirmed',
    message: `Your payment for order #${campaign.campaignId} has been verified by the administration. Order is now PROCESSING.`,
    campaignId: campaign.campaignId,
    link: `/campaigns/${campaign.campaignId}/receipt`
  });

  if (campaign.customerEmail || (campaign.user && campaign.user.businessEmail)) {
    emailService.sendPaymentSuccessEmail(
      { businessEmail: campaign.customerEmail || campaign.user.businessEmail, businessName: campaign.businessName },
      campaign,
      payment || { amount: campaign.totalAmount, reference: `VERIFIED-${campaign.campaignId}` }
    ).catch(console.error);
  }

  return campaign;
}

async function rejectOrderPayment(campaignId, adminId = null, reason = 'Payment proof could not be verified with receiving bank.') {
  const campaign = await Campaign.findOne({ where: { campaignId } });
  if (!campaign) throw new Error('Order not found');

  campaign.paymentStatus = 'REJECTED';
  campaign.status = 'Awaiting Payment';
  campaign.adminNotes = reason;
  await campaign.save();

  const payment = await Payment.findOne({
    where: { campaignId: campaign.id },
    order: [['createdAt', 'DESC']]
  });

  if (payment) {
    payment.status = 'rejected';
    payment.adminNotes = reason;
    await payment.save();
  }

  await AuditLog.create({
    adminId,
    action: 'REJECT_PAYMENT',
    entityType: 'Payment',
    entityId: campaign.campaignId,
    details: `Admin rejected payment for order #${campaign.campaignId}. Reason: ${reason}`
  });

  await Notification.create({
    userId: campaign.userId,
    type: 'payment_rejected',
    title: 'Payment Proof Rejected',
    message: `Payment confirmation for #${campaign.campaignId} was rejected. Reason: ${reason}`,
    campaignId: campaign.campaignId,
    link: `/campaigns/${campaign.campaignId}/payment`
  });

  return campaign;
}

async function sendAdminAdLink(campaignId, link, adminId = null) {
  const campaign = await Campaign.findOne({
    where: { campaignId },
    include: [{ model: User, as: 'user' }]
  });

  if (!campaign) throw new Error('Order not found');

  const cleanLink = link ? link.trim() : null;
  if (!cleanLink) throw new Error('Please provide a valid advertisement link');

  campaign.adminAdLink = cleanLink;
  campaign.adminAdLinkSent = true;
  campaign.adminAdLinkSentAt = new Date();
  await campaign.save();

  await AuditLog.create({
    adminId,
    action: 'SEND_ADVERTISEMENT_LINK',
    entityType: 'Campaign',
    entityId: campaign.campaignId,
    details: `Admin published advertisement link: ${cleanLink} for order #${campaign.campaignId}`
  });

  await Notification.create({
    userId: campaign.userId,
    type: 'ad_link_published',
    title: 'Advertisement Link Published! 🎉',
    message: `Your live campaign link is ready: ${cleanLink}`,
    campaignId: campaign.campaignId,
    link: cleanLink
  });

  const recipientEmail = campaign.customerEmail || (campaign.user && campaign.user.businessEmail);
  if (recipientEmail) {
    emailService.sendCampaignLinkEmail(
      { businessEmail: recipientEmail, businessName: campaign.businessName },
      campaign
    ).catch(err => console.error('Ad link email delivery notification:', err.message));
  }

  return campaign;
}

function generateCampaignLink(campaignId) {
  return `${BASE_URL}/campaign/${campaignId}`;
}

module.exports = {
  generateCampaignId,
  createCampaign,
  attachPaymentProof,
  getCampaignWithDetails,
  updateOrderStatus,
  verifyOrderPayment,
  rejectOrderPayment,
  sendAdminAdLink,
  generateCampaignLink
};
