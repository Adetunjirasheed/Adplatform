const { Sequelize } = require('sequelize');
const path = require('path');

let sequelize;

if (process.env.DATABASE_URL) {
  // Production PostgreSQL support
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: process.env.NODE_ENV === 'production' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {},
    define: {
      timestamps: true,
      underscored: false
    }
  });
} else {
  // Development / fallback SQLite
  const fs = require('fs');
  const dbPath = process.env.DB_PATH || './database/adplatform.sqlite';
  const resolvedStorage = path.resolve(__dirname, '..', dbPath);
  const dbDir = path.dirname(resolvedStorage);
  if (!fs.existsSync(dbDir)) {
    try { fs.mkdirSync(dbDir, { recursive: true }); } catch (_) {}
  }
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: resolvedStorage,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: false
    }
  });
}


module.exports = sequelize;

