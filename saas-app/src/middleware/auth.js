// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/login');
  }
  next();
}

// Attach user to request if logged in
function loadUser(userModel) {
  return (req, res, next) => {
    if (req.session?.userId) {
      const user = userModel.findById(req.session.userId);
      if (user) {
        // Don't expose password hash to views
        const { password_hash, ...safeUser } = user;
        req.user = safeUser;
        res.locals.user = safeUser;
      } else {
        // User deleted, clear session
        req.session.destroy(() => {});
      }
    }
    res.locals.user = res.locals.user || null;
    next();
  };
}

module.exports = { requireAuth, loadUser };
