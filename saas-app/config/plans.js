// Define your SaaS plans here. These map to Stripe products/prices.
const PLANS = {
  free: {
    name: 'Free',
    stripePriceMonthly: null,
    stripePriceYearly: null,
    features: ['5 projects', 'Basic support', 'Community access'],
    limits: { projects: 5, apiCalls: 1000 },
  },
  basic: {
    name: 'Basic',
    stripePriceMonthly: process.env.STRIPE_PRICE_BASIC_MONTHLY,
    stripePriceYearly: process.env.STRIPE_PRICE_BASIC_YEARLY,
    monthlyPrice: 9,
    yearlyPrice: 90,
    features: ['25 projects', 'Email support', 'API access'],
    limits: { projects: 25, apiCalls: 10000 },
  },
  pro: {
    name: 'Pro',
    stripePriceMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: ['Unlimited projects', 'Priority support', 'Full API access', 'Custom domains'],
    limits: { projects: Infinity, apiCalls: 100000 },
  },
};

function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

function getAllPlans() {
  return PLANS;
}

module.exports = { PLANS, getPlan, getAllPlans };
