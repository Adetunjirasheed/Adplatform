const axios = require('axios');
const crypto = require('crypto');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL || 'http://localhost:3000/payments/callback';

async function initializePayment({ email, amount, campaignId, metadata = {} }) {
  const isDemo = process.env.DEMO_MODE === 'true';

  if (isDemo || !PAYSTACK_SECRET.startsWith('sk_')) {
    const demoRef = `DEMO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return {
      status: true,
      message: 'Demo payment initialized',
      data: {
        authorization_url: `${CALLBACK_URL}?reference=${demoRef}`,
        access_code: `demo_acc_${demoRef}`,
        reference: demoRef
      }
    };
  }

  // Real Paystack API call
  const amountInKobo = Math.round(parseFloat(amount) * 100);

  const response = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email,
      amount: amountInKobo,
      callback_url: CALLBACK_URL,
      metadata: {
        campaignId,
        ...metadata
      }
    },
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}

async function verifyPayment(reference) {
  const isDemo = process.env.DEMO_MODE === 'true' && process.env.DEMO_PAYMENTS === 'true';

  if (reference.startsWith('DEMO-')) {
    if (!isDemo) {
      return {
        status: false,
        message: 'Demo payments are disabled in this environment.'
      };
    }
    return {
      status: true,
      data: {
        status: 'success',
        reference,
        gateway_response: 'DEMO PAYMENT - Simulated successful transaction',
        paid_at: new Date().toISOString(),
        channel: 'demo_card',
        currency: 'NGN'
      }
    };
  }

  if (!PAYSTACK_SECRET || !PAYSTACK_SECRET.startsWith('sk_')) {
    return {
      status: false,
      message: 'Paystack secret key is not configured.'
    };
  }

  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`
      }
    }
  );

  return response.data;
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  try {
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const hash = crypto.createHmac('sha512', secret).update(bodyStr).digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');

    if (signatureBuffer.length !== hashBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, hashBuffer);
  } catch (err) {
    return false;
  }
}

module.exports = {
  initializePayment,
  verifyPayment,
  verifyWebhookSignature
};


