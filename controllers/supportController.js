const { SupportTicket } = require('../models');

async function showContactForm(req, res) {
  res.render('pages/contact', {
    title: 'Contact Support',
    errors: [],
    formData: {},
    successMessage: null
  });
}

async function submitTicket(req, res) {
  const { name, email, campaignRef, subject, message } = req.body;
  const userId = req.session.userId || null;

  try {
    await SupportTicket.create({
      userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      campaignRef: campaignRef ? campaignRef.trim() : null,
      subject: subject.trim(),
      message: message.trim(),
      status: 'open'
    });

    res.render('pages/contact', {
      title: 'Contact Support',
      errors: [],
      formData: {},
      successMessage: 'Thank you for reaching out. Our support team will review your inquiry and respond within 24 hours.'
    });
  } catch (error) {
    console.error('Support submission error:', error);
    res.render('pages/contact', {
      title: 'Contact Support',
      errors: [{ msg: 'Failed to submit support request. Please try again.' }],
      formData: req.body,
      successMessage: null
    });
  }
}

module.exports = {
  showContactForm,
  submitTicket
};

