const nodemailer = require('nodemailer');

function createTransporter() {
  if (process.env.DEMO_MODE === 'true') {
    return {
      sendMail: async (options) => {
        console.log('\n📧 [DEMO EMAIL] ─────────────────────');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log('─────────────────────────────────────\n');
        return { messageId: 'demo-' + Date.now(), accepted: [options.to] };
      }
    };
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

module.exports = { createTransporter };
