require('dotenv').config();

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const { getDb, setupDatabase } = require('./models/setup');
const UserModel = require('./models/user');
const { loadUser, requireAuth } = require('./middleware/auth');
const { getAllPlans } = require('../config/plans');
const {
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  handleWebhookEvent,
} = require('./services/stripe');

const app = express();
const PORT = process.env.PORT || 3000;

// Database
const db = getDb();
setupDatabase(db);
app.locals.db = db;

const userModel = new UserModel(db);

// Security
app.use(helmet({ contentSecurityPolicy: false }));

// Logging
app.use(morgan('short'));

// Stripe webhook needs raw body — MUST be before express.json()
app.post('/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const event = constructWebhookEvent(req.body, sig);

    // Idempotency check
    const existing = db
      .prepare('SELECT id FROM webhook_events WHERE stripe_event_id = ?')
      .get(event.id);
    if (existing) {
      return res.json({ received: true, duplicate: true });
    }

    // Store event
    const { v4: uuidv4 } = require('uuid');
    db.prepare(`
      INSERT INTO webhook_events (id, stripe_event_id, type, data)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), event.id, event.type, JSON.stringify(event.data));

    await handleWebhookEvent(event, userModel);
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

// Load user for all requests
app.use(loadUser(userModel));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => res.render('index'));
app.use(require('./routes/auth')(userModel));
app.use(require('./routes/dashboard')(userModel));
app.use(require('./routes/api')(userModel));

// Pricing
app.get('/pricing', (req, res) => res.render('pricing', { plans: getAllPlans() }));

// Billing: checkout
app.post('/billing/checkout', requireAuth, async (req, res) => {
  try {
    const { priceId } = req.body;
    if (!priceId) return res.status(400).json({ error: 'Price ID is required' });

    const user = userModel.findById(req.session.userId);
    const customerId = await getOrCreateCustomer(userModel, user);
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

    const checkoutSession = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing`,
    });

    res.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Billing: success page
app.get('/billing/success', requireAuth, (req, res) => {
  res.render('billing-success');
});

// Billing: customer portal
app.post('/billing/portal', requireAuth, async (req, res) => {
  try {
    const user = userModel.findById(req.session.userId);
    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const portalSession = await createPortalSession({
      customerId: user.stripe_customer_id,
      returnUrl: `${baseUrl}/dashboard`,
    });
    res.json({ url: portalSession.url });
  } catch (err) {
    console.error('Portal error:', err.message);
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SaaS app running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
