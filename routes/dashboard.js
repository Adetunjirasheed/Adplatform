const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middleware/auth');

router.use(isAuthenticated);

router.get('/', dashboardController.index);
router.get('/profile', dashboardController.showProfile);
router.post('/profile', dashboardController.updateProfile);
router.get('/notifications', dashboardController.getNotifications);
router.post('/notifications/:id/read', dashboardController.markNotificationRead);
router.post('/notifications/read-all', dashboardController.markAllNotificationsRead);

module.exports = router;

