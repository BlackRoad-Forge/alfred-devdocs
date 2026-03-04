const Stripe = require('stripe');
const { getPlan, getAllPlans } = require('../../config/plans');

let stripeInstance = null;

function getStripe() {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

// Create or retrieve a Stripe customer for a user
async function getOrCreateCustomer(userModel, user) {
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId: user.id },
  });
  userModel.updateStripeCustomer(user.id, customer.id);
  return customer.id;
}

// Create a Stripe Checkout session for subscription
async function createCheckoutSession({ customerId, priceId, successUrl, cancelUrl }) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });
}

// Create a Stripe Billing Portal session
async function createPortalSession({ customerId, returnUrl }) {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// Verify and construct a webhook event
function constructWebhookEvent(payload, sig) {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(
    payload,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

// Resolve which plan a price ID belongs to
function resolvePlanFromPriceId(priceId) {
  const plans = getAllPlans();
  for (const [planId, plan] of Object.entries(plans)) {
    if (plan.stripePriceMonthly === priceId || plan.stripePriceYearly === priceId) {
      const interval = plan.stripePriceMonthly === priceId ? 'monthly' : 'yearly';
      return { planId, interval };
    }
  }
  return null;
}

// Handle webhook events from Stripe
async function handleWebhookEvent(event, userModel) {
  const data = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      // Retrieve the subscription to get the price
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(data.subscription);
      const priceId = subscription.items.data[0]?.price?.id;
      const resolved = resolvePlanFromPriceId(priceId);
      if (resolved) {
        const user = userModel.findByStripeCustomerId(data.customer);
        if (user) {
          userModel.updateSubscription(user.id, {
            subscriptionId: data.subscription,
            status: 'active',
            plan: resolved.planId,
            billingInterval: resolved.interval,
          });
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const user = userModel.findByStripeCustomerId(data.customer);
      if (user) {
        const priceId = data.items?.data?.[0]?.price?.id;
        const resolved = resolvePlanFromPriceId(priceId);
        userModel.updateSubscription(user.id, {
          subscriptionId: data.id,
          status: data.status,
          plan: resolved?.planId || user.plan,
          billingInterval: resolved?.interval || user.billing_interval,
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const user = userModel.findByStripeCustomerId(data.customer);
      if (user) {
        userModel.cancelSubscription(user.id);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const user = userModel.findByStripeCustomerId(data.customer);
      if (user) {
        userModel.updateSubscription(user.id, {
          subscriptionId: user.stripe_subscription_id,
          status: 'past_due',
          plan: user.plan,
          billingInterval: user.billing_interval,
        });
      }
      break;
    }
  }
}

module.exports = {
  getStripe,
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  handleWebhookEvent,
  resolvePlanFromPriceId,
};
