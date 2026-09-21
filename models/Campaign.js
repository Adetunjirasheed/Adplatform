const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Campaign = sequelize.define('Campaign', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    campaignId: { type: DataTypes.STRING, allowNull: false, unique: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    customerName: { type: DataTypes.STRING, allowNull: true },
    businessName: { type: DataTypes.STRING, allowNull: true },
    customerEmail: { type: DataTypes.STRING, allowNull: true },
    customerPhone: { type: DataTypes.STRING, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    productName: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    websiteUrl: { type: DataTypes.STRING },
    socialMediaUrl: { type: DataTypes.STRING },
    videoUrl: { type: DataTypes.STRING }, // Pasted advertising video link
    targetAudience: { type: DataTypes.TEXT },
    targetLocation: { type: DataTypes.STRING },
    startDate: { type: DataTypes.DATEONLY },
    endDate: { type: DataTypes.DATEONLY },
    // Order Status: REVIEW -> PROCESSING -> COMPLETE -> CANCELLED
    orderStatus: {
      type: DataTypes.ENUM('REVIEW', 'PROCESSING', 'COMPLETE', 'CANCELLED'),
      defaultValue: 'REVIEW'
    },
    // Payment Status: PENDING -> PROOF_SUBMITTED -> VERIFIED -> REJECTED
    paymentStatus: {
      type: DataTypes.ENUM('PENDING', 'PROOF_SUBMITTED', 'VERIFIED', 'REJECTED'),
      defaultValue: 'PENDING'
    },
    paymentProofFile: { type: DataTypes.STRING, allowNull: true },
    paymentProofSubmittedAt: { type: DataTypes.DATE, allowNull: true },
    contactAddress: { type: DataTypes.TEXT, allowNull: true },
    adminAdLink: { type: DataTypes.STRING, allowNull: true },
    adminAdLinkSent: { type: DataTypes.BOOLEAN, defaultValue: false },
    adminAdLinkSentAt: { type: DataTypes.DATE, allowNull: true },
    status: {
      type: DataTypes.ENUM(
        'Draft', 'Awaiting Payment', 'Payment Confirmed', 'Under Review',
        'Approved', 'Awaiting Platform Connection', 'Scheduled',
        'Running', 'Completed', 'Rejected', 'Cancelled'
      ),
      defaultValue: 'Awaiting Payment'
    },
    totalBudget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    totalServiceFee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    adminNotes: { type: DataTypes.TEXT }
  }, {
    indexes: [
      { fields: ['campaignId'] },
      { fields: ['userId'] },
      { fields: ['customerEmail'] },
      { fields: ['orderStatus'] },
      { fields: ['paymentStatus'] },
      { fields: ['status'] }
    ]
  });

  return Campaign;
};
