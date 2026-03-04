const express = require('express');
const router = express.Router();

module.exports = function (userModel) {
  // Show login page
  router.get('/login', (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('login', { error: null });
  });

  // Handle login
  router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('login', { error: 'Email and password are required' });
    }
    const user = userModel.findByEmail(email);
    if (!user || !userModel.verifyPassword(user, password)) {
      return res.render('login', { error: 'Invalid email or password' });
    }
    req.session.userId = user.id;
    res.redirect('/dashboard');
  });

  // Show signup page
  router.get('/signup', (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('signup', { error: null });
  });

  // Handle signup
  router.post('/signup', (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.render('signup', { error: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.render('signup', { error: 'Password must be at least 8 characters' });
    }
    const existing = userModel.findByEmail(email);
    if (existing) {
      return res.render('signup', { error: 'An account with this email already exists' });
    }
    const user = userModel.create({ email, password, name });
    req.session.userId = user.id;
    res.redirect('/dashboard');
  });

  // Logout
  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });

  return router;
};
