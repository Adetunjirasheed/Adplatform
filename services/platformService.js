const axios = require('axios');
const { PlatformSetting } = require('../models');
const { decrypt } = require('./encryptionService');

async function getPlatformCredentials(platform) {
  const settings = await PlatformSetting.findAll({ where: { platform } });
  const creds = {};
  for (const s of settings) {
    let val = s.settingValue;
    try {
      val = decrypt(val);
    } catch (_) {}
    creds[s.settingKey] = val;
  }
  return creds;
}

async function checkPlatformConnection(platform) {
  const creds = await getPlatformCredentials(platform);
  if (platform === 'tiktok') {
    return !!(creds.access_token || (process.env.TIKTOK_APP_ID && process.env.TIKTOK_APP_SECRET));
  }
  if (platform === 'instagram' || platform === 'meta') {
    return !!(creds.access_token || (process.env.META_APP_ID && process.env.META_APP_SECRET));
  }
  if (platform === 'google') {
    return !!(creds.developer_token || process.env.GOOGLE_ADS_DEVELOPER_TOKEN);
  }
  return false;
}

async function submitToPlatform(platform, campaign) {
  const isConnected = await checkPlatformConnection(platform);
  const creds = await getPlatformCredentials(platform);

  if (!isConnected) {
    return {
      success: false,
      status: 'not_configured',
      message: `${platform.toUpperCase()} Ads API is not connected. Requires authorized API credentials and access token.`
    };
  }

  try {
    if (platform === 'tiktok') {
      const accessToken = creds.access_token;
      const advertiserId = creds.advertiser_id;
      if (!accessToken || !advertiserId) {
        return {
          success: false,
          status: 'not_configured',
          message: 'TikTok Ads requires access_token and advertiser_id.'
        };
      }

      // Live TikTok API submission
      const resp = await axios.post(
        'https://business-api.tiktok.com/open_api/v1.3/campaign/create/',
        {
          advertiser_id: advertiserId,
          campaign_name: `${campaign.title} (${campaign.campaignId})`,
          objective_type: 'TRAFFIC',
          budget_mode: 'BUDGET_MODE_DAY',
          budget: Number(campaign.totalBudget) || 50000
        },
        {
          headers: { 'Access-Token': accessToken, 'Content-Type': 'application/json' }
        }
      );

      if (resp.data && resp.data.code === 0) {
        return {
          success: true,
          status: 'submitted',
          externalCampaignId: resp.data.data?.campaign_id,
          message: 'Campaign submitted to TikTok Ads.'
        };
      } else {
        return {
          success: false,
          status: 'submission_failed',
          message: resp.data?.message || 'TikTok API returned an error.'
        };
      }
    }

    if (platform === 'instagram' || platform === 'meta') {
      const accessToken = creds.access_token;
      const adAccountId = creds.ad_account_id;
      if (!accessToken || !adAccountId) {
        return {
          success: false,
          status: 'not_configured',
          message: 'Meta/Instagram Ads requires access_token and ad_account_id.'
        };
      }

      const resp = await axios.post(
        `https://graph.facebook.com/v18.0/act_${adAccountId}/campaigns`,
        {
          name: `${campaign.title} (${campaign.campaignId})`,
          objective: 'OUTCOME_TRAFFIC',
          status: 'PAUSED',
          special_ad_categories: []
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (resp.data && resp.data.id) {
        return {
          success: true,
          status: 'submitted',
          externalCampaignId: resp.data.id,
          message: 'Campaign submitted to Meta/Instagram Ads.'
        };
      } else {
        return {
          success: false,
          status: 'submission_failed',
          message: 'Meta API rejected campaign submission.'
        };
      }
    }

    if (platform === 'google') {
      const devToken = creds.developer_token || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
      const customerId = creds.customer_id;
      if (!devToken || !customerId) {
        return {
          success: false,
          status: 'not_configured',
          message: 'Google Ads requires developer_token and customer_id.'
        };
      }

      return {
        success: false,
        status: 'awaiting_approval',
        message: 'Google Ads account configured. Awaiting manager approval before dispatch.'
      };
    }

    return {
      success: false,
      status: 'unsupported_platform',
      message: `Platform ${platform} is not currently supported.`
    };
  } catch (apiErr) {
    return {
      success: false,
      status: 'submission_failed',
      message: apiErr.response?.data?.error?.message || apiErr.message || 'Platform API submission failed.'
    };
  }
}

async function getCampaignStatusFromPlatform(platform, campaignId) {
  const isConnected = await checkPlatformConnection(platform);
  if (!isConnected) {
    return 'not_connected';
  }
  return 'pending_review';
}

module.exports = {
  checkPlatformConnection,
  submitToPlatform,
  getCampaignStatusFromPlatform
};


