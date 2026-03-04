const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { getPlan } = require('../../config/plans');

module.exports = function (userModel) {
  // Get current user info
  router.get('/api/me', requireAuth, (req, res) => {
    const user = userModel.findById(req.session.userId);
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  });

  // List projects
  router.get('/api/projects', requireAuth, (req, res) => {
    const projects = req.app.locals.db
      .prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.session.userId);
    res.json(projects);
  });

  // Create project (respects plan limits)
  router.post('/api/projects', requireAuth, (req, res) => {
    const user = userModel.findById(req.session.userId);
    const plan = getPlan(user.plan);
    const count = req.app.locals.db
      .prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?')
      .get(user.id).count;

    if (count >= plan.limits.projects) {
      return res.status(403).json({
        error: `Plan limit reached. ${plan.name} plan allows ${plan.limits.projects} projects. Upgrade at /pricing`,
      });
    }

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const id = uuidv4();
    req.app.locals.db.prepare(`
      INSERT INTO projects (id, user_id, name, description) VALUES (?, ?, ?, ?)
    `).run(id, user.id, name, description || null);

    const project = req.app.locals.db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json(project);
  });

  // Delete project
  router.delete('/api/projects/:id', requireAuth, (req, res) => {
    const result = req.app.locals.db
      .prepare('DELETE FROM projects WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.session.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ deleted: true });
  });

  // Health check
  router.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  return router;
};
