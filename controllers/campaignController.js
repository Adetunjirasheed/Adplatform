const pricingService = require('../services/pricingService');
const campaignService = require('../services/campaignService');
const { Campaign, CampaignPlatform, UploadedMedia, Payment, User } = require('../models');

async function showCreateForm(req, res) {
  try {
    const pricingData = await pricingService.getPricingConfig();
    res.render('dashboard/create-campaign', {
      title: 'Place Advertising Order',
      pricingData,
      errors: [],
      formData: {}
    });
  } catch (error) {
    console.error('Error loading campaign create form:', error);
    res.render('pages/error', { title: 'Error', error: 'Unable to load pricing options.' });
  }
}

async function createCampaign(req, res) {
  try {
    const platforms = req.body.platforms;
    if (!platforms || (Array.isArray(platforms) && platforms.length === 0)) {
      const pricingData = await pricingService.getPricingConfig();
      return res.render('dashboard/create-campaign', {
        title: 'Place Advertising Order',
        pricingData,
        errors: [{ msg: 'Please select at least one advertising network (TikTok, Instagram/Meta, or Google Ads).' }],
        formData: req.body
      });
    }

    const campaign = await campaignService.createCampaign(
      req.session.userId,
      req.body,
      req.files
    );

    req.session.flash = {
      type: 'success',
      message: `Order #${campaign.campaignId} placed successfully! Please review payment instructions below.`
    };

    res.redirect(`/campaigns/${campaign.campaignId}/payment`);
  } catch (error) {
    console.error('Campaign creation error:', error);
    const pricingData = await pricingService.getPricingConfig();
    res.render('dashboard/create-campaign', {
      title: 'Place Advertising Order',
      pricingData,
      errors: [{ msg: error.message || 'Failed to create campaign order. Please try again.' }],
      formData: req.body
    });
  }
}

async function showCampaignDetail(req, res) {
  try {
    const { campaignId } = req.params;
    const campaign = await campaignService.getCampaignWithDetails(campaignId);

    if (!campaign) {
      return res.status(404).render('pages/404', { title: 'Order Not Found' });
    }

    // Ownership check (unless admin)
    if (campaign.userId !== req.session.userId && req.user.role !== 'admin') {
      return res.status(403).render('pages/error', { title: 'Access Denied', error: 'Unauthorized access to this order.' });
    }

    res.render('dashboard/campaign-detail', {
      title: `Order #${campaign.campaignId}`,
      campaign
    });
  } catch (error) {
    console.error('Error loading campaign detail:', error);
    res.render('pages/error', { title: 'Error', error: 'Failed to retrieve order details.' });
  }
}

async function showPayment(req, res) {
  try {
    const { campaignId } = req.params;
    const campaign = await campaignService.getCampaignWithDetails(campaignId);

    if (!campaign) {
      return res.status(404).render('pages/404', { title: 'Order Not Found' });
    }

    if (campaign.userId !== req.session.userId && req.user.role !== 'admin') {
      return res.status(403).render('pages/error', { title: 'Access Denied', error: 'Unauthorized access.' });
    }

    const payment = await Payment.findOne({
      where: { campaignId: campaign.id },
      order: [['createdAt', 'DESC']]
    });

    res.render('dashboard/payment', {
      title: `Payment & Transfer Instructions — #${campaign.campaignId}`,
      campaign,
      payment
    });
  } catch (error) {
    console.error('Payment view error:', error);
    res.redirect('/dashboard');
  }
}

async function uploadPaymentProof(req, res) {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOne({ where: { campaignId } });

    if (!campaign) {
      req.session.flash = { type: 'error', message: 'Order not found.' };
      return res.redirect('/dashboard');
    }

    if (campaign.userId !== req.session.userId && req.user.role !== 'admin') {
      req.session.flash = { type: 'error', message: 'Unauthorized action.' };
      return res.redirect('/dashboard');
    }

    if (!req.file) {
      req.session.flash = { type: 'error', message: 'Please attach a payment receipt or confirmation file (Image or PDF).' };
      return res.redirect(`/campaigns/${campaignId}/payment`);
    }

    const { paymentReference } = req.body;
    await campaignService.attachPaymentProof(campaignId, req.file, paymentReference);

    req.session.flash = {
      type: 'success',
      message: 'Payment proof submitted successfully! Our billing team will verify your transfer and update your order.'
    };

    res.redirect(`/campaigns/${campaignId}/receipt`);
  } catch (error) {
    console.error('Upload payment proof error:', error);
    req.session.flash = { type: 'error', message: error.message || 'Failed to upload payment proof.' };
    res.redirect('back');
  }
}

async function showReceipt(req, res) {
  try {
    const { campaignId } = req.params;
    const campaign = await campaignService.getCampaignWithDetails(campaignId);

    if (!campaign) {
      return res.status(404).render('pages/404', { title: 'Receipt Not Found' });
    }

    if (campaign.userId !== req.session.userId && req.user.role !== 'admin') {
      return res.status(403).render('pages/error', { title: 'Access Denied', error: 'Unauthorized access.' });
    }

    const payment = await Payment.findOne({
      where: { campaignId: campaign.id },
      order: [['createdAt', 'DESC']]
    });

    res.render('dashboard/receipt', {
      title: `Order Receipt - #${campaign.campaignId}`,
      campaign,
      payment: payment || {
        reference: `REF-${campaign.campaignId}`,
        amount: campaign.totalAmount,
        status: campaign.paymentStatus.toLowerCase(),
        createdAt: campaign.createdAt
      }
    });
  } catch (error) {
    console.error('Receipt view error:', error);
    res.redirect('/dashboard');
  }
}

module.exports = {
  showCreateForm,
  createCampaign,
  showCampaignDetail,
  showPayment,
  uploadPaymentProof,
  showReceipt
};
