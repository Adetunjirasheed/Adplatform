const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PlatformSetting = sequelize.define('PlatformSetting', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    platform: { type: DataTypes.STRING, allowNull: false },
    settingKey: { type: DataTypes.STRING, allowNull: false },
    settingValue: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.STRING }
  }, {
    indexes: [
      {
        unique: true,
        fields: ['platform', 'settingKey']
      }
    ]
  });

  return PlatformSetting;
};

