const sequelize = require('../config/database');

const User = require('./User')(sequelize);
const Campaign = require('./Campaign')(sequelize);
const CampaignPlatform = require('./CampaignPlatform')(sequelize);
const Payment = require('./Payment')(sequelize);
const ServiceFee = require('./ServiceFee')(sequelize);
const PlatformSetting = require('./PlatformSetting')(sequelize);
const EmailLog = require('./EmailLog')(sequelize);
const UploadedMedia = require('./UploadedMedia')(sequelize);
const Notification = require('./Notification')(sequelize);
const SupportTicket = require('./SupportTicket')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);

// Associations
User.hasMany(Campaign, { foreignKey: 'userId', as: 'campaigns' });
Campaign.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Campaign.hasMany(CampaignPlatform, { foreignKey: 'campaignId', as: 'platforms', onDelete: 'CASCADE' });
CampaignPlatform.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

Campaign.hasMany(Payment, { foreignKey: 'campaignId', as: 'payments' });
Payment.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Campaign.hasMany(UploadedMedia, { foreignKey: 'campaignId', as: 'media', onDelete: 'CASCADE' });
UploadedMedia.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

User.hasMany(UploadedMedia, { foreignKey: 'userId', as: 'media' });
UploadedMedia.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Campaign.hasMany(EmailLog, { foreignKey: 'campaignId', as: 'emailLogs' });
EmailLog.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(SupportTicket, { foreignKey: 'userId', as: 'tickets' });
SupportTicket.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(AuditLog, { foreignKey: 'adminId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

module.exports = {
  sequelize,
  User,
  Campaign,
  CampaignPlatform,
  Payment,
  ServiceFee,
  PlatformSetting,
  EmailLog,
  UploadedMedia,
  Notification,
  SupportTicket,
  AuditLog
};

