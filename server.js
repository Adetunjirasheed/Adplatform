require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const hpp = require('hpp');
const csrf = require('csurf');
const fs = require('fs');

const { sequelize } = require('./models');
const { setupSecurity, generalLimiter } = require('./middleware/security');
const demoMode = require('./middleware/demoMode');

const app = express();
const PORT = process.env.PORT || 3000;

// Create required directories
['uploads', 'database'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files: ONLY serve explicitly public assets from /public
app.use(express.static(path.join(__dirname, 'public')));

// Controlled serving of the frontend portals without exposing root project directory
app.get(['/', '/index.html'], (req, res, next) => {
  if (req.accepts('html')) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  next();
});

app.get(['/admin.html', '/admin-portal'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.paystack.co", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'", "https://api.paystack.co"],
      frameSrc: ["'self'", "https://checkout.paystack.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(hpp());

// Session store
const sessionStore = new SequelizeStore({ db: sequelize, tableName: 'Sessions' });

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Rate limiting
app.use(generalLimiter);

// Demo mode middleware
app.use(demoMode);

// CSRF protection: Excluded for server-to-server webhook and admin JSON API endpoints
// (standalone admin.html cannot embed CSRF tokens; SameSite=lax cookie protects against CSRF)
const csrfProtection = csrf({
  cookie: true,
  value: (req) => {
    return req.headers['x-csrf-token'] || req.headers['csrf-token'] || req.body?._csrf || req.query?._csrf;
  }
});

const csrfExcludedPaths = [
  '/payments/webhook',
  '/auth/admin/login',
  '/auth/admin/setup',
  '/auth/login',
  '/auth/register',
  '/auth/signup'
];

app.use((req, res, next) => {
  const isExcluded = csrfExcludedPaths.some(p => req.path === p || req.path.startsWith(p));
  if (isExcluded) {
    return next();
  }
  csrfProtection(req, res, next);
});


// Template locals & CSRF cookie propagation
app.use(async (req, res, next) => {
  try {
    const token = req.csrfToken ? req.csrfToken() : '';
    res.locals.csrfToken = token;
    // Set readable CSRF cookie for fetch / AJAX requests
    res.cookie('XSRF-TOKEN', token, { httpOnly: false, sameSite: 'lax' });
  } catch (_) {
    res.locals.csrfToken = '';
  }
  res.locals.user = null;
  res.locals.flash = req.session.flash || null;
  res.locals.notificationCount = 0;
  delete req.session.flash;

  if (req.session.userId) {
    try {
      const { User, Notification } = require('./models');
      const user = await User.findByPk(req.session.userId);
      if (user && user.status === 'active') {
        res.locals.user = user;
        req.user = user;
        res.locals.notificationCount = await Notification.count({
          where: { userId: user.id, isRead: false }
        });
      } else if (user && user.status === 'suspended') {
        req.session.destroy();
        res.locals.flash = { type: 'error', message: 'Your account has been suspended.' };
      }
    } catch (err) {
      console.error('Error loading user:', err);
    }
  }
  next();
});

// Routes
app.use('/api', require('./routes/api'));
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/campaigns', require('./routes/campaigns'));
app.use('/payments', require('./routes/payments'));
app.use('/admin', require('./routes/admin'));
app.use('/support', require('./routes/support'));


// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err.code === 'EBADCSRFTOKEN') {
    req.session.flash = { type: 'error', message: 'Form expired. Please try again.' };
    return res.redirect('back');
  }
  res.status(err.status || 500).render('pages/error', {
    title: 'Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    sessionStore.sync();
    console.log('Database connected and synced.');

    // Auto-seed/ensure configured administrator account exists
    const { User } = require('./models');
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    const adminPass = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPass) {
      const existingAdmin = await User.findOne({ where: { businessEmail: adminEmail } });
      if (!existingAdmin) {
        await User.create({
          fullName: process.env.ADMIN_FULLNAME || 'Platform Administrator',
          username: 'admin_' + Date.now(),
          businessName: 'AdPlatform Headquarters',
          businessEmail: adminEmail,
          phone: process.env.ADMIN_PHONE || '+2348000000000',
          password: adminPass,
          role: 'admin',
          status: 'active',
          emailVerified: true
        });
        console.log(`🛡️ Administrator account verified/created in database: ${adminEmail}`);
      }
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 AdPlatform running at http://localhost:${PORT}`);
      console.log(`📌 Demo Mode: ${process.env.DEMO_MODE === 'true' ? 'ON' : 'OFF'}`);
      console.log(`📌 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}


start();
