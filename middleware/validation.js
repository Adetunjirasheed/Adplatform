const { body, validationResult } = require('express-validator');

const validateRegistration = [
  body().custom((value, { req }) => {
    const fullName = req.body.fullName || req.body.name;
    if (!fullName || !fullName.trim()) {
      throw new Error('Please enter your full name.');
    }
    const businessName = req.body.businessName;
    if (!businessName || !businessName.trim()) {
      throw new Error('Please enter your business name.');
    }
    const email = req.body.businessEmail || req.body.email || req.body.emailOrUsername;
    if (!email || !/\S+@\S+\.\S+/.test(email.trim())) {
      throw new Error('Please enter a valid email address.');
    }
    const phone = req.body.phone || req.body.phoneNumber;
    if (!phone || !phone.trim()) {
      throw new Error('Please enter your phone number.');
    }
    const password = req.body.password;
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    const confirmPassword = req.body.confirmPassword;
    if (confirmPassword !== undefined && password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }
    return true;
  })
];

const validateLogin = [
  body().custom((value, { req }) => {
    const email = req.body.emailOrUsername || req.body.email || req.body.businessEmail;
    if (!email || !email.trim()) {
      throw new Error('Please enter your email.');
    }
    if (!req.body.password) {
      throw new Error('Please enter your password.');
    }
    return true;
  })
];

const validateCampaign = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Advertisement title is required'),
  body('description')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Advertisement description must be at least 10 characters')
];

const validateContact = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Your name is required'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('A valid email address is required'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required'),
  body('message')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Message must be at least 10 characters')
];

const handleValidationErrors = (view, extraData = {}) => {
  return (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return JSON for fetch() API calls (e.g., from index.html)
      const wantsJson = req.headers['accept'] && req.headers['accept'].includes('application/json');
      if (wantsJson) {
        return res.status(400).json({ errors: errors.array() });
      }
      return res.render(view, {
        title: extraData.title || 'Error',
        errors: errors.array(),
        formData: req.body,
        ...extraData
      });
    }
    next();
  };
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateCampaign,
  validateContact,
  handleValidationErrors
};

