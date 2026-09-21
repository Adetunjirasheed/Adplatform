const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    campaignId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    customerName: { type: DataTypes.STRING, allowNull: true },
    customerEmail: { type: DataTypes.STRING, allowNull: true },
    businessName: { type: DataTypes.STRING, allowNull: true },
    customerPhone: { type: DataTypes.STRING, allowNull: true },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    currency: { type: DataTypes.STRING, defaultValue: 'NGN' },
    reference: { type: DataTypes.STRING, allowNull: false, unique: true },
    gateway: { type: DataTypes.STRING, defaultValue: 'bank_transfer' }, // 'bank_transfer' or 'paystack'
    status: {
      type: DataTypes.ENUM('pending', 'proof_submitted', 'verified', 'rejected', 'failed', 'cancelled', 'refunded'),
      defaultValue: 'pending'
    },
    proofFile: { type: DataTypes.STRING, allowNull: true },
    proofSubmittedAt: { type: DataTypes.DATE, allowNull: true },
    verifiedAt: { type: DataTypes.DATE, allowNull: true },
    verifiedBy: { type: DataTypes.INTEGER, allowNull: true },
    adminNotes: { type: DataTypes.TEXT, allowNull: true },
    gatewayResponse: { type: DataTypes.TEXT },
    metadata: { type: DataTypes.TEXT }
  }, {
    indexes: [
      { fields: ['reference'] },
      { fields: ['status'] },
      { fields: ['customerEmail'] }
    ]
  });

  return Payment;
};
