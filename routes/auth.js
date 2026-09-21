const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const {
  validateRegistration,
  validateLogin,
  handleValidationErrors
} = require('../middleware/validation');

// Customer Login
router.get('/login', redirectIfAuth, authController.showLogin);
router.post('/login', authLimiter, validateLogin, handleValidationErrors('auth/login', { title: 'Customer Login' }), authController.login);

// Customer Register & Signup
router.get('/register', redirectIfAuth, authController.showRegister);
router.post('/register', authLimiter, validateRegistration, handleValidationErrors('auth/register', { title: 'Register Business Account' }), authController.register);
router.get('/signup', redirectIfAuth, authController.showRegister);
router.post('/signup', authLimiter, validateRegistration, handleValidationErrors('auth/register', { title: 'Register Business Account' }), authController.register);

// Logout — GET for navbar link, POST for fetch() API call from standalone index.html
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

// Forgot & Reset Password
router.get('/forgot-password', authController.showForgotPassword);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.get('/reset-password/:token', authController.showResetPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Administrator Login & Setup
router.get('/admin/login', authController.showAdminLogin);
router.post('/admin/login', authLimiter, authController.adminLogin);
router.post('/admin/setup', authController.adminSetup);

module.exports = router;

