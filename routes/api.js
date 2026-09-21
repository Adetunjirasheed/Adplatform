const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { uploadCampaignMedia, uploadPaymentProof } = require('../middleware/upload');
const { validateRegistration, validateLogin, validateCampaign, handleValidationErrors } = require('../middleware/validation');
const { Campaign, CampaignPlatform, UploadedMedia, Payment, User, Notification, AuditLog } = require('../models');
const campaignService = require('../services/campaignService');
const pricingService = require('../services/pricingService');
const path = require('path');
const fs = require('fs');

// CSRF Token Provider
router.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken ? req.csrfToken() : '' });
});

// Current Authenticated User Session
router.get('/auth/me', (req, res) => {
  if (req.session && req.session.userId && req.user) {
    return res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        fullName: req.user.fullName,
        businessName: req.user.businessName,
        email: req.user.businessEmail,
        phone: req.user.phone,
        role: req.user.role
      }
    });
  }
  res.json({ authenticated: false, user: null });
});

// Pricing Data Endpoint
router.get('/pricing', async (req, res) => {
  try {
    const pricing = await pricingService.getPricingConfig();
    res.json({ success: true, pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load pricing config' });
  }
});

// Customer Orders API (Authenticated & User-Scoped)
router.get('/orders', isAuthenticated, async (req, res) => {
  try {
    const orders = await Campaign.findAll({
      where: { userId: req.session.userId },
      include: [
        { model: CampaignPlatform, as: 'platforms' },
        { model: UploadedMedia, as: 'media' },
        { model: Payment, as: 'payments' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});

// Specific Order (Strict Ownership Verified)
router.get('/orders/:campaignId', isAuthenticated, async (req, res) => {
  try {
    const order = await campaignService.getCampaignWithDetails(req.params.campaignId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.userId !== req.session.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this order' });
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving order' });
  }
});

// Create Order API
router.post('/orders', isAuthenticated, uploadCampaignMedia, async (req, res) => {
  try {
    const campaign = await campaignService.createCampaign(
      req.session.userId,
      req.body,
      req.files
    );
    res.status(201).json({ success: true, campaign });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to place order' });
  }
});

// Upload Payment Proof API
router.post('/orders/:campaignId/payment-proof', isAuthenticated, uploadPaymentProof, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOne({ where: { campaignId } });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (campaign.userId !== req.session.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach a payment proof file' });
    }

    const { paymentReference } = req.body;
    await campaignService.attachPaymentProof(campaignId, req.file, paymentReference);
    res.json({ success: true, message: 'Payment proof attached successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to submit payment proof' });
  }
});

// Secure Proof Download (Authorized Only)
router.get('/uploads/proof/:filename', isAuthenticated, async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const proofPath = path.resolve(__dirname, '..', 'uploads', 'proofs', filename);

    if (!fs.existsSync(proofPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Admins can view any proof, users can only view their own
    if (req.user.role !== 'admin') {
      const payment = await Payment.findOne({ where: { proofFile: `/uploads/proofs/${filename}` } });
      if (!payment || payment.userId !== req.session.userId) {
        return res.status(403).json({ error: 'Unauthorized to access this receipt' });
      }
    }

    res.sendFile(proofPath);
  } catch (err) {
    res.status(500).json({ error: 'Error reading file' });
  }
});

// ==========================================
// ADMIN API ROUTES (Protected by isAdmin)
// ==========================================
router.get('/admin/metrics', isAdmin, async (req, res) => {
  try {
    const totalOrders = await Campaign.count();
    const reviewOrders = await Campaign.count({ where: { orderStatus: 'REVIEW' } });
    const processingOrders = await Campaign.count({ where: { orderStatus: 'PROCESSING' } });
    const completeOrders = await Campaign.count({ where: { orderStatus: 'COMPLETE' } });

    const totalCustomers = await User.count({ where: { role: 'customer' } });
    const verifiedPaymentsCount = await Payment.count({ where: { status: 'verified' } });

    const verifiedPayments = await Payment.findAll({ where: { status: 'verified' } });
    const totalRevenue = verifiedPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

    res.json({
      success: true,
      metrics: {
        totalOrders,
        reviewOrders,
        processingOrders,
        completeOrders,
        totalCustomers,
        verifiedPaymentsCount,
        totalRevenue
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch metrics' });
  }
});

router.get('/admin/orders', isAdmin, async (req, res) => {
  try {
    const orders = await Campaign.findAll({
      include: [
        { model: User, as: 'user' },
        { model: CampaignPlatform, as: 'platforms' },
        { model: UploadedMedia, as: 'media' },
        { model: Payment, as: 'payments' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin orders' });
  }
});

module.exports = router;
