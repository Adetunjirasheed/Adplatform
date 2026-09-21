require('dotenv').config();
const { sequelize, User, ServiceFee, PlatformSetting } = require('../models');

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('Database synced for seeding.');

    // 1. Seed Administrator
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@adplatform.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
    const adminFullName = process.env.ADMIN_FULLNAME || 'Platform Administrator';

    let admin = await User.findOne({ where: { businessEmail: adminEmail } });


    if (!admin) {
      await User.create({
        fullName: adminFullName,
        username: 'admin',
        businessName: 'AdPlatform Headquarters',
        businessEmail: adminEmail,
        phone: process.env.ADMIN_PHONE || '09034109467',
        password: adminPassword,
        role: 'admin',
        status: 'active',
        emailVerified: true
      });
      console.log(`✅ Admin account created: ${adminEmail}`);
    } else {
      console.log(`ℹ️ Admin account already exists: ${adminEmail}`);
    }

    // 2. Seed Default Service Fees
    const defaultFees = [
      { platform: 'tiktok', feeType: 'flat', feeValue: 20000 },
      { platform: 'instagram', feeType: 'flat', feeValue: 15000 },
      { platform: 'google', feeType: 'flat', feeValue: 20000 }
    ];

    for (const f of defaultFees) {
      const existing = await ServiceFee.findOne({ where: { platform: f.platform } });
      if (!existing) {
        await ServiceFee.create(f);
        console.log(`✅ Service fee seeded for ${f.platform}: ₦${f.feeValue}`);
      }
    }

    // 3. Seed Platform Settings
    const defaultSettings = [
      { platform: 'tiktok', settingKey: 'daily_rate_usd', settingValue: '70', description: 'Configured TikTok daily ad budget assumption in USD' },
      { platform: 'tiktok', settingKey: 'min_days', settingValue: '1', description: 'Minimum campaign days for TikTok' },
      { platform: 'tiktok', settingKey: 'max_days', settingValue: '10', description: 'Maximum campaign days for TikTok' },
      { platform: 'general', settingKey: 'usd_to_ngn_rate', settingValue: process.env.USD_TO_NGN_RATE || '1600', description: 'Configured USD to NGN exchange rate' },
      {
        platform: 'instagram',
        settingKey: 'budget_options',
        settingValue: JSON.stringify([50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000, 500000]),
        description: 'Available budget tiers in NGN for Instagram/Meta ads'
      },
      {
        platform: 'google',
        settingKey: 'budget_options',
        settingValue: JSON.stringify([50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000, 500000]),
        description: 'Available budget tiers in NGN for Google/YouTube ads'
      },
      { platform: 'general', settingKey: 'platform_name', settingValue: 'AdPlatform', description: 'Website / Brand name' },
      { platform: 'general', settingKey: 'support_email', settingValue: 'support@adplatform.com', description: 'Support email contact' },
      { platform: 'tiktok', settingKey: 'api_connected', settingValue: 'false', description: 'Official TikTok Ads API connection state' },
      { platform: 'instagram', settingKey: 'api_connected', settingValue: 'false', description: 'Official Meta Marketing API connection state' },
      { platform: 'google', settingKey: 'api_connected', settingValue: 'false', description: 'Official Google Ads API connection state' }
    ];

    for (const s of defaultSettings) {
      const existing = await PlatformSetting.findOne({
        where: { platform: s.platform, settingKey: s.settingKey }
      });
      if (!existing) {
        await PlatformSetting.create(s);
        console.log(`✅ Setting seeded: [${s.platform}] ${s.settingKey} = ${s.settingValue}`);
      }
    }

    console.log('\n🎉 Database seeding finished successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();

