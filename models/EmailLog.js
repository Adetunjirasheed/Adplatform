const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmailLog = sequelize.define('EmailLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    campaignId: { type: DataTypes.INTEGER, allowNull: true },
    emailType: { type: DataTypes.STRING, allowNull: false },
    recipient: { type: DataTypes.STRING, allowNull: false },
    subject: { type: DataTypes.STRING },
    status: { type: DataTypes.ENUM('pending', 'sent', 'failed'), defaultValue: 'pending' },
    error: { type: DataTypes.TEXT },
    sentAt: { type: DataTypes.DATE }
  });

  return EmailLog;
};

