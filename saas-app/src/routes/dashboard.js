const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getPlan } = require('../../config/plans');

module.exports = function (userModel) {
  router.get('/dashboard', requireAuth, (req, res) => {
    const user = userModel.findById(req.session.userId);
    const plan = getPlan(user.plan);
    const projectCount = req.app.locals.db
      .prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?')
      .get(user.id).count;

    res.render('dashboard', {
      plan,
      planId: user.plan,
      projectCount,
      subscriptionStatus: user.subscription_status,
    });
  });

  return router;
};
