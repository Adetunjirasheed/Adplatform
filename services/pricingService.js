const { PlatformSetting, ServiceFee } = require('../models');

async function getExchangeRate() {
  const setting = await PlatformSetting.findOne({
    where: { platform: 'general', settingKey: 'usd_to_ngn_rate' }
  });
  return setting ? parseFloat(setting.settingValue) : (parseFloat(process.env.USD_TO_NGN_RATE) || 1600);
}

async function getServiceFee(platform) {
  const fee = await ServiceFee.findOne({
    where: { platform, isActive: true }
  });
  if (!fee) {
    // Defaults if not configured yet
    const defaults = { tiktok: 20000, instagram: 15000, google: 20000 };
    return { feeType: 'flat', feeValue: defaults[platform] || 20000 };
  }
  return { feeType: fee.feeType, feeValue: parseFloat(fee.feeValue) };
}

async function getTikTokPricing(days) {
  const numDays = Math.max(1, Math.min(10, parseInt(days) || 1));
  const rateSetting = await PlatformSetting.findOne({
    where: { platform: 'tiktok', settingKey: 'daily_rate_usd' }
  });
  const dailyRateUsd = rateSetting ? parseFloat(rateSetting.settingValue) : 70;
  const exchangeRate = await getExchangeRate();
  const feeConfig = await getServiceFee('tiktok');

  const budgetUsd = dailyRateUsd * numDays;
  const budgetNgn = budgetUsd * exchangeRate;
  
  let serviceFee = feeConfig.feeType === 'percentage' 
    ? (budgetNgn * feeConfig.feeValue) / 100 
    : feeConfig.feeValue;

  return {
    platform: 'tiktok',
    days: numDays,
    dailyRateUsd,
    budgetUsd,
    exchangeRate,
    budgetNgn,
    serviceFee,
    total: budgetNgn + serviceFee
  };
}

async function getInstagramPricing(budgetNgn) {
  const amount = parseFloat(budgetNgn) || 50000;
  const feeConfig = await getServiceFee('instagram');
  let serviceFee = feeConfig.feeType === 'percentage'
    ? (amount * feeConfig.feeValue) / 100
    : feeConfig.feeValue;

  return {
    platform: 'instagram',
    budgetNgn: amount,
    serviceFee,
    total: amount + serviceFee
  };
}

async function getGooglePricing(budgetNgn) {
  const amount = parseFloat(budgetNgn) || 50000;
  const feeConfig = await getServiceFee('google');
  let serviceFee = feeConfig.feeType === 'percentage'
    ? (amount * feeConfig.feeValue) / 100
    : feeConfig.feeValue;

  return {
    platform: 'google',
    budgetNgn: amount,
    serviceFee,
    total: amount + serviceFee
  };
}

async function getPricingConfig() {
  const exchangeRate = await getExchangeRate();
  
  const tiktokDaily = await PlatformSetting.findOne({
    where: { platform: 'tiktok', settingKey: 'daily_rate_usd' }
  });
  const tiktokDailyRate = tiktokDaily ? parseFloat(tiktokDaily.settingValue) : 70;

  const defaultBudgets = [50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000, 500000];
  
  const igSetting = await PlatformSetting.findOne({
    where: { platform: 'instagram', settingKey: 'budget_options' }
  });
  const instagramBudgets = igSetting ? JSON.parse(igSetting.settingValue) : defaultBudgets;

  const googleSetting = await PlatformSetting.findOne({
    where: { platform: 'google', settingKey: 'budget_options' }
  });
  const googleBudgets = googleSetting ? JSON.parse(googleSetting.settingValue) : defaultBudgets;

  const tiktokFee = await getServiceFee('tiktok');
  const igFee = await getServiceFee('instagram');
  const googleFee = await getServiceFee('google');

  return {
    exchangeRate,
    tiktokDailyRate,
    instagramBudgets,
    googleBudgets,
    serviceFees: {
      tiktok: tiktokFee.feeValue,
      instagram: igFee.feeValue,
      google: googleFee.feeValue
    }
  };
}

module.exports = {
  getExchangeRate,
  getServiceFee,
  getTikTokPricing,
  getInstagramPricing,
  getGooglePricing,
  getPricingConfig
};

