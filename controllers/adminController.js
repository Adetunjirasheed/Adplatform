const { Op, fn, col } = require('sequelize');
const {
  User,
  Campaign,
  CampaignPlatform,
  Payment,
  ServiceFee,
  PlatformSetting,
  EmailLog,
  UploadedMedia,
  SupportTicket,
  AuditLog
} = require('../models');
const campaignService = require('../services/campaignService');
const emailService = require('../services/emailService');

async function dashboard(req, res) {
  try {
    const totalUsers = await User.count({ where: { role: 'customer' } });
    const totalOrders = await Campaign.count();

    const pendingOrders = await Campaign.count({ where: { orderStatus: 'REVIEW' } });
    const processingOrders = await Campaign.count({ where: { orderStatus: 'PROCESSING' } });
    const completedOrders = await Campaign.count({ where: { orderStatus: 'COMPLETE' } });

    const verifiedPaymentsCount = await Campaign.count({ where: { paymentStatus: 'VERIFIED' } });

    // Financial calculations
    const verifiedPayments = await Payment.findAll({
      where: { status: { [Op.in]: ['verified', 'success'] } },
      include: [
        {
          model: Campaign,
          as: 'campaign',
          include: [{ model: CampaignPlatform, as: 'platforms' }]
        }
      ]
    });

    let totalRevenue = 0;
    let totalAdBudget = 0;
    let estimatedProfit = 0;
    let tiktokRevenue = 0;
    let instagramRevenue = 0;
    let googleRevenue = 0;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;

    for (const p of verifiedPayments) {
      const amt = parseFloat(p.amount) || 0;
      totalRevenue += amt;

      const pDate = new Date(p.createdAt);
      if (pDate >= startOfToday) todayRevenue += amt;
      if (pDate >= startOfWeek) weekRevenue += amt;
      if (pDate >= startOfMonth) monthRevenue += amt;

      if (p.campaign) {
        totalAdBudget += parseFloat(p.campaign.totalBudget) || 0;
        estimatedProfit += parseFloat(p.campaign.totalServiceFee) || 0;

        if (p.campaign.platforms) {
          for (const plat of p.campaign.platforms) {
            const pTot = (parseFloat(plat.budget) || 0) + (parseFloat(plat.serviceFee) || 0);
            if (plat.platform === 'tiktok') tiktokRevenue += pTot;
            if (plat.platform === 'instagram') instagramRevenue += pTot;
            if (plat.platform === 'google') googleRevenue += pTot;
          }
        }
      }
    }

    const proofSubmittedCount = await Campaign.count({ where: { paymentStatus: 'PROOF_SUBMITTED' } });

    const recentOrders = await Campaign.findAll({
      include: [
        { model: User, as: 'user' },
        { model: CampaignPlatform, as: 'platforms' },
        { model: UploadedMedia, as: 'media' }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const recentPayments = await Payment.findAll({
      include: [
        { model: User, as: 'user' },
        { model: Campaign, as: 'campaign' }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const stats = {
      totalUsers,
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      verifiedPaymentsCount,
      totalRevenue,
      totalAdBudget,
      estimatedProfit,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      tiktokRevenue,
      instagramRevenue,
      googleRevenue,
      proofSubmittedCount
    };

    res.render('admin/index', {
      title: 'Admin Control Center',
      currentPage: 'dashboard',
      stats,
      recentOrders,
      recentPayments
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('pages/error', { title: 'Admin Error', error: 'Failed to load dashboard data.' });
  }
}

async function listUsers(req, res) {
  try {
    const { search, status } = req.query;
    const where = { role: 'customer' };

    if (status && ['active', 'suspended'].includes(status)) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
        { businessName: { [Op.like]: `%${search}%` } },
        { businessEmail: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      include: [{ model: Campaign, as: 'campaigns' }],
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/users', {
      title: 'Manage Customers',
      currentPage: 'users',
      users,
      search: search || '',
      statusFilter: status || 'all'
    });
  } catch (error) {
    console.error('List users error:', error);
    res.redirect('/admin');
  }
}

async function suspendUser(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (user && user.role !== 'admin') {
      user.status = 'suspended';
      await user.save();

      await AuditLog.create({
        adminId: req.session.userId,
        action: 'SUSPEND_USER',
        entityType: 'User',
        entityId: String(user.id),
        details: `Suspended user ${user.username} (${user.businessEmail})`
      });

      req.session.flash = { type: 'success', message: `Customer ${user.businessName} has been suspended.` };
    }
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Suspend user error:', error);
    res.redirect('/admin/users');
  }
}

async function reactivateUser(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (user) {
      user.status = 'active';
      await user.save();

      await AuditLog.create({
        adminId: req.session.userId,
        action: 'REACTIVATE_USER',
        entityType: 'User',
        entityId: String(user.id),
        details: `Reactivated user ${user.username}`
      });

      req.session.flash = { type: 'success', message: `Customer ${user.businessName} reactivated.` };
    }
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.redirect('/admin/users');
  }
}

async function listCampaigns(req, res) {
  try {
    const { search, orderStatus, paymentStatus, platform, date } = req.query;
    const where = {};

    if (orderStatus && orderStatus !== 'all') {
      where.orderStatus = orderStatus;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus;
    }

    if (search) {
      where[Op.or] = [
        { campaignId: { [Op.like]: `%${search}%` } },
        { title: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
        { customerEmail: { [Op.like]: `%${search}%` } },
        { businessName: { [Op.like]: `%${search}%` } }
      ];
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.createdAt = { [Op.between]: [startDate, endDate] };
    }

    let campaigns = await Campaign.findAll({
      where,
      include: [
        { model: User, as: 'user' },
        { model: CampaignPlatform, as: 'platforms' },
        { model: UploadedMedia, as: 'media' },
        { model: Payment, as: 'payments' }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (platform && platform !== 'all') {
      campaigns = campaigns.filter(c => c.platforms && c.platforms.some(p => p.platform === platform));
    }

    res.render('admin/campaigns', {
      title: 'Manage Orders',
      currentPage: 'campaigns',
      campaigns,
      search: search || '',
      orderStatusFilter: orderStatus || 'all',
      paymentStatusFilter: paymentStatus || 'all',
      platformFilter: platform || 'all',
      dateFilter: date || ''
    });
  } catch (error) {
    console.error('List campaigns error:', error);
    res.redirect('/admin');
  }
}

async function showCampaignDetail(req, res) {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOne({
      where: { campaignId },
      include: [
        { model: User, as: 'user' },
        { model: CampaignPlatform, as: 'platforms' },
        { model: UploadedMedia, as: 'media' },
        { model: Payment, as: 'payments' },
        { model: EmailLog, as: 'emailLogs' }
      ]
    });

    if (!campaign) {
      return res.status(404).render('pages/404', { title: 'Order Not Found' });
    }

    res.render('admin/campaign-detail', {
      title: `Order #${campaign.campaignId}`,
      currentPage: 'campaigns',
      campaign
    });
  } catch (error) {
    console.error('Admin order detail error:', error);
    res.redirect('/admin/campaigns');
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { campaignId } = req.params;
    const { orderStatus, adminNotes } = req.body;

    await campaignService.updateOrderStatus(
      campaignId,
      orderStatus,
      req.session.userId,
      adminNotes
    );

    const wantsJson = req.headers.accept && req.headers.accept.includes('application/json');
    if (wantsJson) {
      return res.json({ success: true, message: `Order #${campaignId} status updated to ${orderStatus}.` });
    }
    req.session.flash = { type: 'success', message: `Order #${campaignId} status updated to ${orderStatus}.` };
    res.redirect(`/admin/campaigns/${campaignId}`);
  } catch (error) {
    console.error('Update order status error:', error);
    const wantsJson = req.headers.accept && req.headers.accept.includes('application/json');
    if (wantsJson) {
      return res.status(500).json({ success: false, message: 'Failed to update order status.' });
    }
    req.session.flash = { type: 'error', message: 'Failed to update order status.' };
    res.redirect('back');
  }
}

async function verifyPayment(req, res) {
  try {
    const { campaignId } = req.params;
    const { adminNotes } = req.body;

    await campaignService.verifyOrderPayment(campaignId, req.session.userId, adminNotes);

    const wantsJson = req.headers.accept && req.headers.accept.includes('application/json');
    if (wantsJson) {
      return res.json({ success: true, message: `Payment for Order #${campaignId} VERIFIED and confirmed!` });
    }
    req.session.flash = { type: 'success', message: `Payment for Order #${campaignId} VERIFIED and confirmed!` };
    res.redirect(`/admin/campaigns/${campaignId}`);
  } catch (error) {
    console.error('Verify payment error:', error);
    const wantsJson = req.headers.accept && req.headers.accept.includes('application/json');
    if (wantsJson) {
      return res.status(500).json({ success: false, message: 'Failed to verify payment.' });
    }
    req.session.flash = { type: 'error', message: 'Failed to verify payment.' };
    res.redirect('back');
  }
}

async function rejectPayment(req, res) {
  try {
    const { campaignId } = req.params;
    const { rejectionReason } = req.body;

    await campaignService.rejectOrderPayment(campaignId, req.session.userId, rejectionReason);

    req.session.flash = { type: 'warning', message: `Payment proof for Order #${campaignId} REJECTED.` };
    res.redirect(`/admin/campaigns/${campaignId}`);
  } catch (error) {
    console.error('Reject payment error:', error);
    req.session.flash = { type: 'error', message: 'Failed to reject payment.' };
    res.redirect('back');
  }
}

async function resendCampaignEmail(req, res) {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOne({
      where: { campaignId },
      include: [{ model: User, as: 'user' }]
    });

    if (campaign) {
      const email = campaign.customerEmail || (campaign.user ? campaign.user.businessEmail : null);
      if (email) {
        await emailService.sendCampaignLinkEmail({ businessName: campaign.businessName, businessEmail: email }, campaign);
        req.session.flash = { type: 'success', message: `Order notification email resent to ${email}.` };
      }
    }
    res.redirect(`/admin/campaigns/${campaignId}`);
  } catch (error) {
    console.error('Resend email error:', error);
    req.session.flash = { type: 'error', message: 'Failed to resend email.' };
    res.redirect('back');
  }
}

async function deleteCampaign(req, res) {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOne({ where: { campaignId } });

    if (campaign) {
      await AuditLog.create({
        adminId: req.session.userId,
        action: 'DELETE_ORDER',
        entityType: 'Campaign',
        entityId: campaign.campaignId,
        details: `Deleted order #${campaign.campaignId}: "${campaign.title}"`
      });

      await campaign.destroy();
      req.session.flash = { type: 'success', message: `Order #${campaignId} deleted.` };
    }
    res.redirect('/admin/campaigns');
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.redirect('/admin/campaigns');
  }
}

async function listPayments(req, res) {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { reference: { [Op.like]: `%${search}%` } },
        { customerEmail: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } }
      ];
    }

    const payments = await Payment.findAll({
      where,
      include: [
        { model: User, as: 'user' },
        { model: Campaign, as: 'campaign' }
      ],
      order: [['createdAt', 'DESC']]
    });

    const totalRevenue = payments
      .filter(p => p.status === 'verified' || p.status === 'success')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    res.render('admin/payments', {
      title: 'Payment Settlements & Proofs',
      currentPage: 'payments',
      payments,
      totalRevenue,
      statusFilter: status || 'all',
      search: search || ''
    });
  } catch (error) {
    console.error('List payments error:', error);
    res.redirect('/admin');
  }
}

async function showSettings(req, res) {
  try {
    const settings = await PlatformSetting.findAll();
    const serviceFees = await ServiceFee.findAll();

    const settingsMap = {};
    settings.forEach(s => {
      if (!settingsMap[s.platform]) settingsMap[s.platform] = {};
      settingsMap[s.platform][s.settingKey] = s.settingValue;
    });

    res.render('admin/settings', {
      title: 'Platform Configurations',
      currentPage: 'settings',
      settings: settingsMap,
      serviceFees
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.redirect('/admin');
  }
}

async function updateServiceFees(req, res) {
  try {
    const { tiktokFee, instagramFee, googleFee, feeType } = req.body;

    if (tiktokFee) {
      await ServiceFee.upsert({
        platform: 'tiktok',
        feeType: feeType || 'flat',
        feeValue: parseFloat(tiktokFee),
        isActive: true
      });
    }

    if (instagramFee) {
      await ServiceFee.upsert({
        platform: 'instagram',
        feeType: feeType || 'flat',
        feeValue: parseFloat(instagramFee),
        isActive: true
      });
    }

    if (googleFee) {
      await ServiceFee.upsert({
        platform: 'google',
        feeType: feeType || 'flat',
        feeValue: parseFloat(googleFee),
        isActive: true
      });
    }

    await AuditLog.create({
      adminId: req.session.userId,
      action: 'UPDATE_SERVICE_FEES',
      details: `Updated service fees: TikTok ₦${tiktokFee}, IG ₦${instagramFee}, Google ₦${googleFee}`
    });

    req.session.flash = { type: 'success', message: 'Management and service fees updated successfully.' };
    res.redirect('/admin/settings');
  } catch (error) {
    console.error('Update fees error:', error);
    res.redirect('/admin/settings');
  }
}

async function updateExchangeRate(req, res) {
  try {
    const { usdToNgnRate } = req.body;

    await PlatformSetting.upsert({
      platform: 'general',
      settingKey: 'usd_to_ngn_rate',
      settingValue: String(usdToNgnRate),
      description: 'Configured USD to NGN exchange rate'
    });

    await AuditLog.create({
      adminId: req.session.userId,
      action: 'UPDATE_EXCHANGE_RATE',
      details: `Updated exchange rate to 1 USD = ₦${usdToNgnRate}`
    });

    req.session.flash = { type: 'success', message: `USD/NGN Exchange rate updated to ₦${usdToNgnRate}.` };
    res.redirect('/admin/settings');
  } catch (error) {
    console.error('Update exchange rate error:', error);
    res.redirect('/admin/settings');
  }
}

async function updatePlatformCredentials(req, res) {
  try {
    const {
      tiktokAppId,
      tiktokAppSecret,
      metaAppId,
      metaAppSecret,
      googleClientId,
      googleClientSecret,
      googleDevToken
    } = req.body;

    if (tiktokAppId) {
      await PlatformSetting.upsert({
        platform: 'tiktok',
        settingKey: 'app_id',
        settingValue: tiktokAppId,
        description: 'TikTok App ID'
      });
    }
    if (tiktokAppSecret) {
      await PlatformSetting.upsert({
        platform: 'tiktok',
        settingKey: 'app_secret',
        settingValue: tiktokAppSecret,
        description: 'TikTok App Secret'
      });
    }

    if (metaAppId) {
      await PlatformSetting.upsert({
        platform: 'instagram',
        settingKey: 'app_id',
        settingValue: metaAppId,
        description: 'Meta Marketing App ID'
      });
    }
    if (metaAppSecret) {
      await PlatformSetting.upsert({
        platform: 'instagram',
        settingKey: 'app_secret',
        settingValue: metaAppSecret,
        description: 'Meta Marketing App Secret'
      });
    }

    if (googleClientId) {
      await PlatformSetting.upsert({
        platform: 'google',
        settingKey: 'client_id',
        settingValue: googleClientId,
        description: 'Google Ads Client ID'
      });
    }
    if (googleClientSecret) {
      await PlatformSetting.upsert({
        platform: 'google',
        settingKey: 'client_secret',
        settingValue: googleClientSecret,
        description: 'Google Ads Client Secret'
      });
    }
    if (googleDevToken) {
      await PlatformSetting.upsert({
        platform: 'google',
        settingKey: 'dev_token',
        settingValue: googleDevToken,
        description: 'Google Ads Developer Token'
      });
    }

    await AuditLog.create({
      adminId: req.session.userId,
      action: 'UPDATE_PLATFORM_CREDENTIALS',
      details: 'Updated official advertising network API credentials'
    });

    req.session.flash = { type: 'success', message: 'Platform credentials stored securely.' };
    res.redirect('/admin/settings');
  } catch (error) {
    console.error('Update credentials error:', error);
    res.redirect('/admin/settings');
  }
}

async function listSupportTickets(req, res) {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const tickets = await SupportTicket.findAll({
      where,
      include: [{ model: User, as: 'user' }],
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/support', {
      title: 'Customer Support Desk',
      currentPage: 'support',
      tickets,
      statusFilter: status || 'all'
    });
  } catch (error) {
    console.error('Support tickets error:', error);
    res.redirect('/admin');
  }
}

async function replySupportTicket(req, res) {
  try {
    const { id } = req.params;
    const { replyMessage, status } = req.body;

    const ticket = await SupportTicket.findByPk(id);
    if (ticket) {
      ticket.adminReply = replyMessage;
      ticket.repliedAt = new Date();
      ticket.status = status || 'resolved';
      await ticket.save();

      emailService.sendEmail({
        to: ticket.email,
        subject: `Re: ${ticket.subject} (Ticket #${ticket.id})`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h3>AdPlatform Support Reply</h3>
            <p>Dear ${ticket.name},</p>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin: 15px 0;">
              ${replyMessage}
            </div>
            <p style="color: #64748b; font-size: 13px;">Original Ticket: ${ticket.subject}</p>
          </div>
        `,
        userId: ticket.userId
      }).catch(console.error);

      req.session.flash = { type: 'success', message: 'Reply sent to customer email.' };
    }
    res.redirect('/admin/support');
  } catch (error) {
    console.error('Reply ticket error:', error);
    res.redirect('/admin/support');
  }
}

async function sendAdLink(req, res) {
  try {
    const { campaignId } = req.params;
    const { adminAdLink } = req.body;

    if (!adminAdLink) {
      req.session.flash = { type: 'error', message: 'Please enter a valid advertisement link.' };
      return res.redirect('back');
    }

    const campaign = await campaignService.sendAdminAdLink(campaignId, adminAdLink, req.session.userId);

    req.session.flash = {
      type: 'success',
      message: `Advertisement link sent successfully to ${campaign.customerEmail || campaign.businessName}!`
    };

    res.redirect(`/admin/campaigns/${campaignId}`);
  } catch (error) {
    console.error('Send ad link error:', error);
    req.session.flash = { type: 'error', message: error.message || 'Failed to send advertisement link.' };
    res.redirect('back');
  }
}

module.exports = {
  dashboard,
  listUsers,
  suspendUser,
  reactivateUser,
  listCampaigns,
  showCampaignDetail,
  updateOrderStatus,
  verifyPayment,
  rejectPayment,
  sendAdLink,
  resendCampaignEmail,
  deleteCampaign,
  listPayments,
  showSettings,
  updateServiceFees,
  updateExchangeRate,
  updatePlatformCredentials,
  listSupportTickets,
  replySupportTicket
};
