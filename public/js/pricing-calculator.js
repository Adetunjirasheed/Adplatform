/**
 * AdPlatform - Pricing Calculator
 */

const PricingCalculator = {
  getConfig() {
    return window.pricingData || {
      exchangeRate: 1600,
      tiktokDailyRate: 70,
      serviceFees: { tiktok: 20000, instagram: 15000, google: 20000 }
    };
  },

  calculateTikTok(days) {
    const cfg = this.getConfig();
    const d = Math.max(1, Math.min(10, parseInt(days) || 1));
    const dailyRate = cfg.tiktokDailyRate || 70;
    const rate = cfg.exchangeRate || 1600;
    const fee = cfg.serviceFees ? cfg.serviceFees.tiktok : 20000;

    const budgetUsd = dailyRate * d;
    const budgetNgn = budgetUsd * rate;
    const total = budgetNgn + fee;

    return {
      days: d,
      budgetUsd,
      exchangeRate: rate,
      budgetNgn,
      serviceFee: fee,
      total
    };
  },

  calculateInstagram(budget) {
    const cfg = this.getConfig();
    const b = parseFloat(budget) || 50000;
    const fee = cfg.serviceFees ? cfg.serviceFees.instagram : 15000;

    return {
      budgetNgn: b,
      serviceFee: fee,
      total: b + fee
    };
  },

  calculateGoogle(budget) {
    const cfg = this.getConfig();
    const b = parseFloat(budget) || 50000;
    const fee = cfg.serviceFees ? cfg.serviceFees.google : 20000;

    return {
      budgetNgn: b,
      serviceFee: fee,
      total: b + fee
    };
  }
};

