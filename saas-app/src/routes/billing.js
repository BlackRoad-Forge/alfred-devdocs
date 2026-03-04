const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  handleWebhookEvent,
} = require('../services/stripe');
const { getAllPlans, getPlan } = require('../../config/plans');

module.exports = function (userModel) {
  // Pricing page (public)
  router.get('/pricing', (req, res) => {
    res.render('pricing', { plans: getAllPlans() });
  });

  // Start checkout for a plan
  router.post('/billing/checkout', requireAuth, async (req, res) => {
    try {
      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: 'Price ID is required' });
      }
      const user = userModel.findById(req.session.userId);
      const customerId = await getOrCreateCustomer(userModel, user);
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

      const session = await createCheckoutSession({
        customerId,
        priceId,
        successUrl: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/pricing`,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Checkout error:', err.message);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // Checkout success page
  router.get('/billing/success', requireAuth, (req, res) => {
    res.render('billing-success');
  });

  // Open Stripe customer portal (manage subscription)
  router.post('/billing/portal', requireAuth, async (req, res) => {
    try {
      const user = userModel.findById(req.session.userId);
      if (!user.stripe_customer_id) {
        return res.status(400).json({ error: 'No billing account found' });
      }
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const session = await createPortalSession({
        customerId: user.stripe_customer_id,
        returnUrl: `${baseUrl}/dashboard`,
      });
      res.json({ url: session.url });
    } catch (err) {
      console.error('Portal error:', err.message);
      res.status(500).json({ error: 'Failed to open billing portal' });
    }
  });

  // Stripe webhook endpoint — uses raw body
  router.post('/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    try {
      const event = constructWebhookEvent(req.body, sig);

      // Idempotency check
      const existing = req.app.locals.db
        .prepare('SELECT id FROM webhook_events WHERE stripe_event_id = ?')
        .get(event.id);
      if (existing) {
        return res.json({ received: true, duplicate: true });
      }

      // Store event
      req.app.locals.db.prepare(`
        INSERT INTO webhook_events (id, stripe_event_id, type, data)
        VALUES (?, ?, ?, ?)
      `).run(require('uuid').v4(), event.id, event.type, JSON.stringify(event.data));

      await handleWebhookEvent(event, userModel);
      res.json({ received: true });
    } catch (err) {
      console.error('Webhook error:', err.message);
      res.status(400).json({ error: 'Webhook verification failed' });
    }
  });

  return router;
};
