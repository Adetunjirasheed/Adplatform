const { Campaign, Payment, User, Notification, AuditLog } = require('../models');
const paymentService = require('../services/paymentService');
const emailService = require('../services/emailService');

async function initializePayment(req, res) {
  try {
    const { campaignId } = req.body;

    const campaign = await Campaign.findOne({
      where: { campaignId },
      include: [{ model: User, as: 'user' }]
    });

    if (!campaign) {
      req.session.flash = { type: 'error', message: 'Campaign not found.' };
      return res.redirect('/dashboard');
    }

    if (campaign.userId !== req.session.userId && req.user.role !== 'admin') {
      req.session.flash = { type: 'error', message: 'Unauthorized action.' };
      return res.redirect('/dashboard');
    }

    const payResult = await paymentService.initializePayment({
      email: campaign.user.businessEmail,
      amount: campaign.totalAmount,
      campaignId: campaign.campaignId,
      metadata: {
        userId: campaign.userId,
        businessName: campaign.user.businessName,
        campaignTitle: campaign.title
      }
    });

    if (!payResult.status) {
      req.session.flash = { type: 'error', message: payResult.message || 'Payment initialization failed.' };
      return res.redirect(`/campaigns/${campaign.campaignId}/payment`);
    }

    // Record or update pending payment
    let payment = await Payment.findOne({
      where: {
        campaignId: campaign.id,
        status: 'pending'
      }
    });

    if (payment) {
      payment.reference = payResult.data.reference;
      payment.amount = campaign.totalAmount;
      await payment.save();
    } else {
      await Payment.create({
        campaignId: campaign.id,
        userId: campaign.userId,
        amount: campaign.totalAmount,
        currency: 'NGN',
        reference: payResult.data.reference,
        gateway: 'paystack',
        status: 'pending'
      });
    }

    // Redirect to Paystack checkout or demo callback
    res.redirect(payResult.data.authorization_url);
  } catch (error) {
    console.error('Payment init error:', error);
    req.session.flash = { type: 'error', message: 'Failed to initiate payment gateway.' };
    res.redirect('back');
  }
}

async function handleCallback(req, res) {
  const { reference } = req.query;

  if (!reference) {
    req.session.flash = { type: 'error', message: 'No payment reference provided.' };
    return res.redirect('/dashboard');
  }

  try {
    // 1. Locate payment record strictly by reference
    const payment = await Payment.findOne({
      where: { reference },
      include: [
        {
          model: Campaign,
          as: 'campaign',
          include: [{ model: User, as: 'user' }]
        }
      ]
    });

    if (!payment) {
      req.session.flash = { type: 'error', message: 'Unable to locate payment transaction record for this reference.' };
      return res.redirect('/dashboard');
    }

    // 2. Ensure current session owns this payment or is admin
    if (req.session && req.session.userId && payment.userId !== req.session.userId && (!req.user || req.user.role !== 'admin')) {
      req.session.flash = { type: 'error', message: 'Unauthorized: Payment does not belong to your account.' };
      return res.redirect('/dashboard');
    }

    // 3. If already successful, return idempotent receipt view
    if (payment.status === 'verified' || payment.status === 'success') {
      req.session.flash = { type: 'info', message: 'Payment for this order has already been verified.' };
      return res.redirect(`/campaigns/${payment.campaign.campaignId}/receipt`);
    }

    // 4. Verify with payment gateway
    const verifyResult = await paymentService.verifyPayment(reference);

    if (verifyResult.status && verifyResult.data && verifyResult.data.status === 'success') {
      // Validate expected amount in kobo if real Paystack transaction
      if (!reference.startsWith('DEMO-') && typeof verifyResult.data.amount === 'number') {
        const expectedKobo = Math.round(parseFloat(payment.amount) * 100);
        if (verifyResult.data.amount < expectedKobo) {
          payment.status = 'failed';
          payment.gatewayResponse = JSON.stringify({ ...verifyResult.data, reason: 'Amount paid is less than expected' });
          await payment.save();
          req.session.flash = { type: 'error', message: 'Payment verification failed: Amount paid does not match order amount.' };
          return res.redirect(`/campaigns/${payment.campaign.campaignId}/payment`);
        }
      }

      payment.status = 'verified';
      payment.verifiedAt = new Date();
      payment.gatewayResponse = JSON.stringify(verifyResult.data);
      await payment.save();

      const campaign = payment.campaign;
      campaign.status = 'Payment Confirmed';
      campaign.paymentStatus = 'VERIFIED';
      await campaign.save();

      // Notification
      await Notification.create({
        userId: campaign.userId,
        type: 'payment',
        title: 'Payment Successful',
        message: `Payment of ₦${Number(payment.amount).toLocaleString()} for ${campaign.campaignId} has been confirmed.`,
        campaignId: campaign.campaignId,
        link: `/campaigns/${campaign.campaignId}/receipt`
      });

      // Email receipt
      if (campaign.user) {
        emailService.sendPaymentSuccessEmail(campaign.user, campaign, payment).catch(console.error);
      }

      req.session.flash = { type: 'success', message: 'Payment confirmed successfully!' };
      return res.redirect(`/campaigns/${campaign.campaignId}/receipt`);
    } else {
      payment.status = 'failed';
      payment.gatewayResponse = JSON.stringify(verifyResult.data || {});
      await payment.save();

      req.session.flash = { type: 'error', message: 'Payment verification failed or transaction was cancelled.' };
      return res.redirect(`/campaigns/${payment.campaign.campaignId}/payment`);
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    req.session.flash = { type: 'error', message: 'An error occurred while verifying your payment.' };
    res.redirect('/dashboard');
  }
}


async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-paystack-signature'];
    const isValid = paymentService.verifyWebhookSignature(req.body, signature);

    if (!isValid && process.env.DEMO_MODE !== 'true') {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const payment = await Payment.findOne({
        where: { reference },
        include: [{ model: Campaign, as: 'campaign', include: [{ model: User, as: 'user' }] }]
      });

      if (payment && payment.status !== 'success') {
        payment.status = 'success';
        payment.verifiedAt = new Date();
        payment.gatewayResponse = JSON.stringify(event.data);
        await payment.save();

        const campaign = payment.campaign;
        if (campaign) {
          campaign.status = 'Payment Confirmed';
          await campaign.save();

          await Notification.create({
            userId: campaign.userId,
            type: 'payment',
            title: 'Payment Confirmed (Webhook)',
            message: `Payment for ${campaign.campaignId} confirmed via webhook.`,
            campaignId: campaign.campaignId,
            link: `/campaigns/${campaign.campaignId}/receipt`
          });

          if (campaign.user) {
            emailService.sendPaymentSuccessEmail(campaign.user, campaign, payment).catch(console.error);
          }
        }
      }
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook server error');
  }
}

module.exports = {
  initializePayment,
  handleCallback,
  handleWebhook
};

