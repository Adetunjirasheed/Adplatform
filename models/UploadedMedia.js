const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UploadedMedia = sequelize.define('UploadedMedia', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    campaignId: { type: DataTypes.INTEGER, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    fileType: { type: DataTypes.ENUM('video', 'image'), allowNull: false },
    originalName: { type: DataTypes.STRING, allowNull: false },
    fileName: { type: DataTypes.STRING, allowNull: false },
    filePath: { type: DataTypes.STRING, allowNull: false },
    mimeType: { type: DataTypes.STRING, allowNull: false },
    fileSize: { type: DataTypes.INTEGER, allowNull: false }
  });

  return UploadedMedia;
};

