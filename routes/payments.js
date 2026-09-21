const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { isAuthenticated } = require('../middleware/auth');

router.post('/initialize', isAuthenticated, paymentController.initializePayment);
router.get('/callback', paymentController.handleCallback);
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;

