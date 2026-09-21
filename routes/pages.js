const express = require('express');
const router = express.Router();
const pricingService = require('../services/pricingService');
const { Campaign, CampaignPlatform, UploadedMedia, User } = require('../models');

// Public Customer Homepage
router.get('/', async (req, res) => {
  try {
    const pricingData = await pricingService.getPricingConfig();
    res.render('pages/home', {
      title: 'Nigeria’s Leading Multi-Platform Advertising Hub',
      pricingData
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.render('pages/home', {
      title: 'Digital Advertising for Nigerian Businesses',
      pricingData: null
    });
  }
});

// Customer Route Aliases
router.get('/login', (req, res) => res.redirect('/auth/login'));
router.get('/signup', (req, res) => res.redirect('/auth/register'));
router.get('/order', (req, res) => res.redirect('/campaigns/create'));
router.get('/orders', (req, res) => res.redirect('/dashboard'));
router.get('/receipt', async (req, res) => {
  if (req.session && req.session.userId) {
    const latest = await Campaign.findOne({
      where: { userId: req.session.userId },
      order: [['createdAt', 'DESC']]
    });
    if (latest) {
      return res.redirect(`/campaigns/${latest.campaignId}/receipt`);
    }
    return res.redirect('/dashboard');
  }
  res.redirect('/auth/login');
});

// Direct admin login alias
router.get('/admin/login', (req, res) => res.redirect('/auth/admin/login'));

// Public campaign viewing page (strictly protects customer personal info)
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOne({
      where: { campaignId },
      include: [
        { model: User, as: 'user', attributes: ['businessName'] },
        { model: CampaignPlatform, as: 'platforms' },
        { model: UploadedMedia, as: 'media' }
      ]
    });

    if (!campaign) {
      return res.status(404).render('pages/404', { title: 'Campaign Not Found' });
    }

    res.render('pages/campaign-view', {
      title: `${campaign.title} | Campaign Showcase`,
      campaign
    });
  } catch (error) {
    console.error('Public campaign view error:', error);
    res.status(500).render('pages/error', { title: 'Error', error: 'Unable to load campaign showcase.' });
  }
});

module.exports = router;
