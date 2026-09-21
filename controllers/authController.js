const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, AuditLog } = require('../models');
const emailService = require('../services/emailService');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function showLogin(req, res) {
  res.render('auth/login', {
    title: 'Customer Login',
    errors: [],
    formData: {}
  });
}

// Helper: detect if request wants JSON (fetch() API call vs browser form submit)
function wantsJson(req) {
  return (req.headers['accept'] && req.headers['accept'].includes('application/json')) ||
         (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
}

async function login(req, res) {
  const emailInput = (req.body.emailOrUsername || req.body.email || req.body.businessEmail || '').trim();
  const password = req.body.password;

  try {
    if (!emailInput) {
      const msg = 'Please enter your email.';
      if (wantsJson(req)) return res.status(400).json({ errors: [{ msg }] });
      return res.render('auth/login', {
        title: 'Customer Login',
        errors: [{ msg }],
        formData: { emailOrUsername: emailInput }
      });
    }

    if (!password) {
      const msg = 'Please enter your password.';
      if (wantsJson(req)) return res.status(400).json({ errors: [{ msg }] });
      return res.render('auth/login', {
        title: 'Customer Login',
        errors: [{ msg }],
        formData: { emailOrUsername: emailInput }
      });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { businessEmail: emailInput.toLowerCase() },
          { username: emailInput }
        ]
      }
    });

    // CHECK 1 — DOES THE ACCOUNT EXIST?
    if (!user) {
      const msg = 'No account found. Please sign up first.';
      if (wantsJson(req)) return res.status(401).json({ success: false, errors: [{ msg }], message: msg });
      return res.render('auth/login', {
        title: 'Customer Login',
        errors: [{ msg }],
        formData: { emailOrUsername: emailInput }
      });
    }


    // Reject admin account logins on customer page
    if (user.role === 'admin') {
      const msg = 'Administrator accounts must log in via the Private Admin Portal.';
      if (wantsJson(req)) return res.status(403).json({ errors: [{ msg }] });
      return res.render('auth/login', {
        title: 'Customer Login',
        errors: [{ msg }],
        formData: { emailOrUsername: emailInput }
      });
    }

    // CHECK 3 — ACCOUNT STATUS
    if (user.status === 'suspended') {
      const msg = 'Your account has been suspended. Please contact support.';
      if (wantsJson(req)) return res.status(403).json({ errors: [{ msg }] });
      return res.render('auth/login', {
        title: 'Customer Login',
        errors: [{ msg }],
        formData: { emailOrUsername: emailInput }
      });
    }

    // CHECK 2 — IS THE PASSWORD CORRECT?
    const isMatch = await user.validPassword(password);
    if (!isMatch) {
      const msg = 'Incorrect email or password.';
      if (wantsJson(req)) return res.status(401).json({ errors: [{ msg }] });
      return res.render('auth/login', {
        title: 'Customer Login',
        errors: [{ msg }],
        formData: { emailOrUsername: emailInput }
      });
    }

    user.lastLogin = new Date();
    await user.save();

    req.session.userId = user.id;

    const userPayload = {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      businessName: user.businessName,
      businessEmail: user.businessEmail,
      phone: user.phone,
      role: user.role
    };

    if (wantsJson(req)) {
      return res.status(200).json({
        success: true,
        message: `Welcome back, ${user.fullName}!`,
        redirect: '/dashboard',
        user: userPayload
      });
    }
    req.session.flash = { type: 'success', message: `Welcome back, ${user.fullName}!` };
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    const msg = 'An error occurred during login. Please try again.';
    if (wantsJson(req)) return res.status(500).json({ errors: [{ msg }] });
    res.render('auth/login', {
      title: 'Customer Login',
      errors: [{ msg }],
      formData: { emailOrUsername: emailInput }
    });
  }
}

async function showRegister(req, res) {
  res.render('auth/register', {
    title: 'Register Business Account',
    errors: [],
    formData: {}
  });
}

async function register(req, res) {
  const fullName = (req.body.fullName || req.body.name || '').trim();
  const businessName = (req.body.businessName || '').trim();
  const businessEmail = (req.body.businessEmail || req.body.email || req.body.emailOrUsername || '').toLowerCase().trim();
  const phone = (req.body.phone || req.body.phoneNumber || '').trim();
  const password = req.body.password || '';
  const confirmPassword = req.body.confirmPassword || '';
  let username = (req.body.username || '').trim();

  try {
    // 1. Validate required fields
    if (!fullName) {
      const msg = 'Please enter your full name.';
      if (wantsJson(req)) return res.status(400).json({ errors: [{ msg }] });
      return res.render('auth/register', { title: 'Register Business Account', errors: [{ msg }], formData: req.body });
    }

    if (!businessName) {
      const msg = 'Please enter your business name.';
      if (wantsJson(req)) return res.status(400).json({ errors: [{ msg }] });
      return res.render('auth/register', { title: 'Register Business Account', errors: [{ msg }], formData: req.body });
    }

    if (!businessEmail || !/\S+@\S+\.\S+/.test(businessEmail)) {
      const msg = 'Please enter a valid email address.';
      if (wantsJson(req)) return res.status(400).json({ errors: [{ msg }] });
      return res.render('auth/register', { title: 'Register Business Account', errors: [{ msg }], formData: req.body });
    }

    if (!phone) {
      const msg = 'Please enter your phone number.';
      if (wantsJson(req)) return res.status(400).json({ errors: [{ msg }] });
      return res.render('auth/register', { title: 'Register Business Account', errors: [{ msg }], formData: req.body });
    }

    if (!password || password.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      if (wantsJson(req)) return res.status(400).json({ errors: [{ msg }] });
      return res.render('auth/register', { title: 'Register Business Account', errors: [{ msg }], formData: req.body });
    }

    // 2. Check password confirmation
    if (password !== confirmPassword) {
      const msg = 'Passwords do not match.';
      if (wantsJson(req)) return res.status(400).json({ errors: [{ msg }] });
      return res.render('auth/register', {
        title: 'Register Business Account',
        errors: [{ msg }],
        formData: req.body
      });
    }

    // 3. Check if email already exists
    const existingEmail = await User.findOne({ where: { businessEmail } });
    if (existingEmail) {
      const msg = 'An account with this email already exists. Please log in.';
      if (wantsJson(req)) return res.status(409).json({ success: false, errors: [{ msg }], message: msg });
      return res.render('auth/register', {
        title: 'Register Business Account',
        errors: [{ msg }],
        formData: req.body
      });
    }


    // 4. Generate unique username if not provided or collision
    if (!username) {
      username = businessEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    }
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      username = `${username}_${Date.now().toString().slice(-4)}`;
    }

    // 5. Create customer account (password securely hashed via User model beforeCreate hook)
    const user = await User.create({
      fullName,
      username,
      businessName,
      businessEmail,
      phone,
      password,
      role: 'customer',
      status: 'active'
    });

    // Send welcome email async
    emailService.sendWelcomeEmail(user).catch(console.error);

    req.session.userId = user.id;

    const userPayload = {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      businessName: user.businessName,
      businessEmail: user.businessEmail,
      phone: user.phone,
      role: user.role
    };

    if (wantsJson(req)) {
      return res.status(201).json({
        success: true,
        message: 'Account registered successfully! Welcome to AdPlatform.',
        redirect: '/dashboard',
        user: userPayload
      });
    }
    req.session.flash = { type: 'success', message: 'Account registered successfully! Welcome to AdPlatform.' };
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    const msg = 'Unable to create account. Please try again.';
    if (wantsJson(req)) return res.status(500).json({ errors: [{ msg }] });
    res.render('auth/register', {
      title: 'Register Business Account',
      errors: [{ msg }],
      formData: req.body
    });
  }
}

async function logout(req, res) {
  req.session.destroy(() => {
    if (wantsJson(req)) return res.status(200).json({ success: true });
    res.redirect('/auth/login');
  });
}

async function showForgotPassword(req, res) {
  res.render('auth/forgot-password', {
    title: 'Forgot Password',
    errors: [],
    successMessage: null
  });
}

async function forgotPassword(req, res) {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { businessEmail: email.toLowerCase().trim() } });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetToken = resetToken;
      user.resetTokenExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      const resetUrl = `${BASE_URL}/auth/reset-password/${resetToken}`;
      await emailService.sendPasswordResetEmail(user, resetUrl);
    }

    res.render('auth/forgot-password', {
      title: 'Forgot Password',
      errors: [],
      successMessage: 'If an account exists with that email, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.render('auth/forgot-password', {
      title: 'Forgot Password',
      errors: [{ msg: 'Unable to process password reset. Please try again.' }],
      successMessage: null
    });
  }
}

async function showResetPassword(req, res) {
  const { token } = req.params;

  const user = await User.findOne({
    where: {
      resetToken: token,
      resetTokenExpires: { [Op.gt]: Date.now() }
    }
  });

  if (!user) {
    req.session.flash = { type: 'error', message: 'Password reset link is invalid or has expired.' };
    return res.redirect('/auth/forgot-password');
  }

  res.render('auth/reset-password', {
    title: 'Reset Password',
    token,
    errors: []
  });
}

async function resetPassword(req, res) {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render('auth/reset-password', {
      title: 'Reset Password',
      token,
      errors: [{ msg: 'Passwords do not match.' }]
    });
  }

  try {
    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpires: { [Op.gt]: Date.now() }
      }
    });

    if (!user) {
      req.session.flash = { type: 'error', message: 'Password reset token is invalid or expired.' };
      return res.redirect('/auth/forgot-password');
    }

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    req.session.flash = { type: 'success', message: 'Password updated successfully! You can now log in.' };
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Reset password error:', error);
    res.render('auth/reset-password', {
      title: 'Reset Password',
      token,
      errors: [{ msg: 'Failed to update password. Please try again.' }]
    });
  }
}

async function showAdminLogin(req, res) {
  res.render('admin/login', {
    title: 'Administrator Access',
    errors: [],
    formData: {}
  });
}

async function adminLogin(req, res) {
  const { email, emailOrUsername, password } = req.body;
  const emailInput = email || emailOrUsername;

  try {
    const cleanEmail = (emailInput || '').toLowerCase().trim();
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { businessEmail: cleanEmail },
          { username: cleanEmail }
        ]
      }
    });

    // CHECK 1 — IS IT AN AUTHORIZED ADMIN ACCOUNT?
    if (!user || user.role !== 'admin') {
      const msg = 'Access Denied: Not an authorized administrator account.';
      if (wantsJson(req)) return res.status(403).json({ success: false, errors: [{ msg }] });
      return res.render('admin/login', {
        title: 'Administrator Access',
        errors: [{ msg }],
        formData: { email: emailInput }
      });
    }

    // CHECK 2 — IS THE ADMIN ACCOUNT ACTIVE?
    if (user.status === 'suspended') {
      const msg = 'Your admin account has been suspended. Please contact platform support.';
      if (wantsJson(req)) return res.status(403).json({ success: false, errors: [{ msg }] });
      return res.render('admin/login', {
        title: 'Administrator Access',
        errors: [{ msg }],
        formData: { email: emailInput }
      });
    }

    // CHECK 3 — IS THE PASSWORD CORRECT?
    const isMatch = await user.validPassword(password);
    if (!isMatch) {
      const msg = 'Incorrect email or password.';
      if (wantsJson(req)) return res.status(401).json({ success: false, errors: [{ msg }] });
      return res.render('admin/login', {
        title: 'Administrator Access',
        errors: [{ msg }],
        formData: { email: emailInput }
      });
    }

    user.lastLogin = new Date();
    await user.save();

    req.session.regenerate((sessionErr) => {
      if (sessionErr) console.error('Session regeneration error:', sessionErr);
    });
    req.session.userId = user.id;

    await AuditLog.create({
      adminId: user.id,
      action: 'ADMIN_LOGIN',
      entityType: 'User',
      entityId: String(user.id),
      details: 'Administrator logged into admin control center',
      ipAddress: req.ip
    });

    if (wantsJson(req)) {
      return res.status(200).json({
        success: true,
        message: 'Admin authentication successful.',
        redirect: '/admin',
        user: { id: user.id, email: user.businessEmail, businessEmail: user.businessEmail, fullName: user.fullName, role: 'admin' }
      });
    }
    res.redirect('/admin');
  } catch (error) {
    console.error('Admin login error:', error);
    const msg = 'An error occurred during admin login. Please try again.';
    if (wantsJson(req)) return res.status(500).json({ success: false, errors: [{ msg }] });
    res.render('admin/login', {
      title: 'Administrator Access',
      errors: [{ msg }],
      formData: { email: emailInput }
    });
  }
}

// Initial Secure Admin Creation Route (Protected by ADMIN_SETUP_SECRET)
async function adminSetup(req, res) {
  const { setupSecret, email, password, fullName, confirmPassword } = req.body;
  const envSecret = process.env.ADMIN_SETUP_SECRET;

  // Reject if ADMIN_SETUP_SECRET is not configured on the server
  if (!envSecret) {
    return res.status(503).json({ success: false, message: 'Admin setup is not configured on this server. Set ADMIN_SETUP_SECRET in your .env file.' });
  }

  if (!setupSecret || setupSecret !== envSecret) {
    return res.status(403).json({ success: false, message: 'Invalid or missing admin setup secret key.' });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  }

  try {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }


    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email address format.' });
    }

    const existing = await User.findOne({
      where: {
        [Op.or]: [
          { businessEmail: cleanEmail },
          { username: cleanEmail }
        ]
      }
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists. Please sign in instead.' });
    }


    const admin = await User.create({
      fullName: (fullName || 'Platform Admin').trim(),
      username: 'admin_' + Date.now(),
      businessName: 'AdPlatform Headquarters',
      businessEmail: cleanEmail,
      phone: '+2348000000000',
      password,
      role: 'admin',
      status: 'active',
      emailVerified: true
    });

    try {
      await AuditLog.create({
        adminId: admin.id,
        action: 'ADMIN_CREATED',
        entityType: 'User',
        entityId: String(admin.id),
        details: `New admin account created for: ${cleanEmail}`,
        ipAddress: req.ip
      });
    } catch (_) {}

    // Auto-login: set session so admin goes straight to dashboard
    req.session.userId = admin.id;

    res.json({
      success: true,
      message: 'Admin account created successfully! Welcome to the Admin Dashboard.',
      autoLogin: true,
      user: {
        id: admin.id,
        email: admin.businessEmail,
        fullName: admin.fullName,
        role: 'admin'
      }
    });
  } catch (err) {
    console.error('Admin setup error:', err);
    res.status(500).json({ success: false, message: 'Failed to create admin account. Please try again.' });
  }
}


module.exports = {
  showLogin,
  login,
  showRegister,
  register,
  logout,
  showForgotPassword,
  forgotPassword,
  showResetPassword,
  resetPassword,
  showAdminLogin,
  adminLogin,
  adminSetup
};

