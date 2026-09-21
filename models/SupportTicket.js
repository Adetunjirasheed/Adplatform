const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupportTicket = sequelize.define('SupportTicket', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    campaignRef: { type: DataTypes.STRING },
    subject: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM('open', 'in-progress', 'resolved', 'closed'),
      defaultValue: 'open'
    },
    adminReply: { type: DataTypes.TEXT },
    repliedAt: { type: DataTypes.DATE }
  });

  return SupportTicket;
};

