const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ServiceFee = sequelize.define('ServiceFee', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    platform: { type: DataTypes.ENUM('tiktok', 'instagram', 'google'), allowNull: false },
    feeType: { type: DataTypes.ENUM('flat', 'percentage'), defaultValue: 'flat' },
    feeValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  });

  return ServiceFee;
};

