#!/usr/bin/env node
/**
 * Creates Stripe products and prices for your SaaS plans.
 * Run once: npm run stripe:sync
 * Then copy the price IDs into your .env file.
 */
require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = [
  {
    name: 'Basic',
    envPrefix: 'STRIPE_PRICE_BASIC',
    monthlyPrice: 900,  // in cents
    yearlyPrice: 9000,
  },
  {
    name: 'Pro',
    envPrefix: 'STRIPE_PRICE_PRO',
    monthlyPrice: 2900,
    yearlyPrice: 29000,
  },
];

async function sync() {
  console.log('Syncing products to Stripe...\n');

  for (const plan of PLANS) {
    // Create product
    const product = await stripe.products.create({
      name: `SaaS App - ${plan.name}`,
      metadata: { plan: plan.name.toLowerCase() },
    });
    console.log(`Created product: ${product.id} (${plan.name})`);

    // Create monthly price
    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthlyPrice,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log(`  Monthly price: ${monthly.id} ($${plan.monthlyPrice / 100}/mo)`);

    // Create yearly price
    const yearly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.yearlyPrice,
      currency: 'usd',
      recurring: { interval: 'year' },
    });
    console.log(`  Yearly price:  ${yearly.id} ($${plan.yearlyPrice / 100}/yr)`);

    console.log(`\n  Add to .env:`);
    console.log(`  ${plan.envPrefix}_MONTHLY=${monthly.id}`);
    console.log(`  ${plan.envPrefix}_YEARLY=${yearly.id}\n`);
  }

  console.log('Done! Copy the price IDs above into your .env file.');
}

sync().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
