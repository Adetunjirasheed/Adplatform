const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');

router.use(isAdmin);

// Dashboard Routes
router.get('/', adminController.dashboard);
router.get('/dashboard', adminController.dashboard);

// User / Customer Management
router.get('/users', adminController.listUsers);
router.get('/customers', adminController.listUsers);
router.post('/users/:id/suspend', adminController.suspendUser);
router.post('/users/:id/reactivate', adminController.reactivateUser);

// Order / Campaign Management
router.get('/campaigns', adminController.listCampaigns);
router.get('/orders', adminController.listCampaigns);
router.get('/campaigns/:campaignId', adminController.showCampaignDetail);
router.get('/orders/:campaignId', adminController.showCampaignDetail);

// Order Status & Payment Verification Actions
router.post('/campaigns/:campaignId/order-status', adminController.updateOrderStatus);
router.post('/orders/:campaignId/order-status', adminController.updateOrderStatus);

router.post('/campaigns/:campaignId/verify-payment', adminController.verifyPayment);
router.post('/orders/:campaignId/verify-payment', adminController.verifyPayment);

router.post('/campaigns/:campaignId/reject-payment', adminController.rejectPayment);
router.post('/orders/:campaignId/reject-payment', adminController.rejectPayment);

router.post('/campaigns/:campaignId/resend-email', adminController.resendCampaignEmail);
router.post('/campaigns/:campaignId/send-ad-link', adminController.sendAdLink);
router.post('/orders/:campaignId/send-ad-link', adminController.sendAdLink);
router.post('/campaigns/:campaignId/delete', adminController.deleteCampaign);

// Payments & Financials
router.get('/payments', adminController.listPayments);

// Platform & API Settings
router.get('/settings', adminController.showSettings);
router.post('/settings/service-fees', adminController.updateServiceFees);
router.post('/settings/exchange-rate', adminController.updateExchangeRate);
router.post('/settings/platform-credentials', adminController.updatePlatformCredentials);

// Support Desk
router.get('/support', adminController.listSupportTickets);
router.post('/support/:id/reply', adminController.replySupportTicket);

module.exports = router;
