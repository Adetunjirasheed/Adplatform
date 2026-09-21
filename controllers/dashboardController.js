const { Campaign, CampaignPlatform, Payment, Notification, User } = require('../models');

async function index(req, res) {
  try {
    const userId = req.session.userId;

    const campaigns = await Campaign.findAll({
      where: { userId },
      include: [
        { model: CampaignPlatform, as: 'platforms' },
        { model: Payment, as: 'payments' }
      ],
      order: [['createdAt', 'DESC']]
    });

    const stats = {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === 'Running').length,
      pending: campaigns.filter(c => ['Draft', 'Awaiting Payment', 'Payment Confirmed', 'Under Review', 'Scheduled'].includes(c.status)).length,
      completed: campaigns.filter(c => c.status === 'Completed').length,
      draft: campaigns.filter(c => c.status === 'Draft' || c.status === 'Awaiting Payment').length
    };

    const recentNotifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.render('dashboard/index', {
      title: 'Customer Dashboard',
      campaigns,
      stats,
      recentNotifications
    });
  } catch (error) {
    console.error('Dashboard index error:', error);
    res.render('pages/error', { title: 'Dashboard Error', error: 'Failed to load dashboard data.' });
  }
}

async function showProfile(req, res) {
  res.render('dashboard/profile', {
    title: 'Business Profile',
    errors: [],
    successMessage: null
  });
}

async function updateProfile(req, res) {
  const { fullName, businessName, phone, currentPassword, newPassword, confirmPassword } = req.body;
  const user = req.user;

  try {
    if (fullName) user.fullName = fullName.trim();
    if (businessName) user.businessName = businessName.trim();
    if (phone) user.phone = phone.trim();

    // If password change is requested
    if (newPassword) {
      if (!currentPassword) {
        return res.render('dashboard/profile', {
          title: 'Business Profile',
          errors: [{ msg: 'Current password is required to change password.' }],
          successMessage: null
        });
      }

      const match = await user.validPassword(currentPassword);
      if (!match) {
        return res.render('dashboard/profile', {
          title: 'Business Profile',
          errors: [{ msg: 'Incorrect current password.' }],
          successMessage: null
        });
      }

      if (newPassword !== confirmPassword) {
        return res.render('dashboard/profile', {
          title: 'Business Profile',
          errors: [{ msg: 'New passwords do not match.' }],
          successMessage: null
        });
      }

      user.password = newPassword;
    }

    await user.save();

    res.render('dashboard/profile', {
      title: 'Business Profile',
      errors: [],
      successMessage: 'Profile updated successfully!'
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.render('dashboard/profile', {
      title: 'Business Profile',
      errors: [{ msg: 'Failed to update profile details.' }],
      successMessage: null
    });
  }
}

async function getNotifications(req, res) {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.session.userId },
      order: [['createdAt', 'DESC']]
    });

    res.render('dashboard/notifications', {
      title: 'Notifications',
      notifications
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.redirect('/dashboard');
  }
}

async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    await Notification.update(
      { isRead: true },
      { where: { id, userId: req.session.userId } }
    );

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ success: true });
    }
    res.redirect('/dashboard/notifications');
  } catch (error) {
    console.error('Mark notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.session.userId } }
    );

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ success: true });
    }
    res.redirect('/dashboard/notifications');
  } catch (error) {
    console.error('Mark all read error:', error);
    res.redirect('/dashboard/notifications');
  }
}

module.exports = {
  index,
  showProfile,
  updateProfile,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};

