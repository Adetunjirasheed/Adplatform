const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CampaignPlatform = sequelize.define('CampaignPlatform', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    campaignId: { type: DataTypes.INTEGER, allowNull: false },
    platform: { type: DataTypes.ENUM('tiktok', 'instagram', 'google'), allowNull: false },
    budget: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    budgetUsd: { type: DataTypes.DECIMAL(15, 2) },
    serviceFee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    days: { type: DataTypes.INTEGER },
    exchangeRate: { type: DataTypes.DECIMAL(15, 4) }
  });

  return CampaignPlatform;
};
