const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { isAuthenticated } = require('../middleware/auth');
const { uploadCampaignMedia, uploadPaymentProof } = require('../middleware/upload');
const { validateCampaign } = require('../middleware/validation');

router.use(isAuthenticated);

router.get('/create', campaignController.showCreateForm);
router.post('/create', uploadCampaignMedia, validateCampaign, campaignController.createCampaign);

router.get('/:campaignId', campaignController.showCampaignDetail);
router.get('/:campaignId/payment', campaignController.showPayment);
router.post('/:campaignId/payment-proof', uploadPaymentProof, campaignController.uploadPaymentProof);
router.get('/:campaignId/receipt', campaignController.showReceipt);

module.exports = router;
