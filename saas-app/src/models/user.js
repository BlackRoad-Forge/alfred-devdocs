const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class UserModel {
  constructor(db) {
    this.db = db;
  }

  create({ email, password, name }) {
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    this.db.prepare(`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (?, ?, ?, ?)
    `).run(id, email, passwordHash, name || null);
    return this.findById(id);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  findByEmail(email) {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  findByStripeCustomerId(customerId) {
    return this.db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId);
  }

  verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
  }

  updateStripeCustomer(userId, stripeCustomerId) {
    this.db.prepare(`
      UPDATE users SET stripe_customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(stripeCustomerId, userId);
  }

  updateSubscription(userId, { subscriptionId, status, plan, billingInterval }) {
    this.db.prepare(`
      UPDATE users SET
        stripe_subscription_id = ?,
        subscription_status = ?,
        plan = ?,
        billing_interval = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(subscriptionId, status, plan, billingInterval, userId);
  }

  updatePlan(userId, plan) {
    this.db.prepare(`
      UPDATE users SET plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(plan, userId);
  }

  cancelSubscription(userId) {
    this.db.prepare(`
      UPDATE users SET
        stripe_subscription_id = NULL,
        subscription_status = 'canceled',
        plan = 'free',
        billing_interval = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(userId);
  }
}

module.exports = UserModel;
