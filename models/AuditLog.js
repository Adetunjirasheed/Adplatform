const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    adminId: { type: DataTypes.INTEGER, allowNull: true },
    action: { type: DataTypes.STRING, allowNull: false },
    entityType: { type: DataTypes.STRING },
    entityId: { type: DataTypes.STRING },
    details: { type: DataTypes.TEXT },
    ipAddress: { type: DataTypes.STRING }
  });

  return AuditLog;
};

