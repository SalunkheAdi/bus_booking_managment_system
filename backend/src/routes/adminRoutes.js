const express = require('express');
const { listCancellationRules, updateCancellationRule } = require('../controllers/adminController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

function createAdminRoutes(db) {
  const router = express.Router();

  // Public/all can view cancellation rules, admin can update
  router.get('/cancellation-rules', listCancellationRules(db));
  router.put('/cancellation-rules/:id', authenticateToken, requireRoles('ADMIN'), updateCancellationRule(db));

  return router;
}

module.exports = createAdminRoutes;
