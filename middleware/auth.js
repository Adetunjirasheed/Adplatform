const { User } = require('../models');

const isAuthenticated = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    req.session.flash = { type: 'warning', message: 'Please log in to continue.' };
    return res.redirect('/auth/login');
  }

  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/auth/login');
    }

    if (user.status === 'suspended') {
      req.session.destroy();
      return res.render('auth/login', {
        title: 'Login',
        error: 'Your account has been suspended. Please contact support.'
      });
    }

    req.user = user;
    res.locals.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.redirect('/auth/login');
  }
};

const isAdmin = async (req, res, next) => {
  const isApiRequest = (req.baseUrl && req.baseUrl.startsWith('/api')) || 
                       req.originalUrl?.includes('/api/') || 
                       req.xhr || 
                       req.headers.accept?.includes('json');

  if (!req.session || !req.session.userId) {
    if (isApiRequest) {
      return res.status(401).json({ success: false, error: 'Authentication required. Please sign in as administrator.' });
    }
    req.session.flash = { type: 'warning', message: 'Administrator access required. Please sign in.' };
    return res.redirect('/admin/login');
  }

  try {
    const user = await User.findByPk(req.session.userId);
    if (!user || user.role !== 'admin') {
      if (isApiRequest) {
        return res.status(403).json({ success: false, error: 'Access denied. Admin privileges required.' });
      }
      req.session.flash = { type: 'error', message: 'Access denied. Admin privileges required. Redirected to admin login.' };
      return res.redirect('/admin/login');
    }


    if (user.status === 'suspended') {
      req.session.destroy();
      return res.redirect('/admin/login');
    }

    req.user = user;
    res.locals.user = user;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.redirect('/admin/login');
  }
};

const redirectIfAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    if (res.locals.user && res.locals.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  redirectIfAuth
};
