const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { validateContact, handleValidationErrors } = require('../middleware/validation');

router.get('/', supportController.showContactForm);
router.post(
  '/',
  validateContact,
  handleValidationErrors('pages/contact', { title: 'Contact Support' }),
  supportController.submitTicket
);

module.exports = router;

