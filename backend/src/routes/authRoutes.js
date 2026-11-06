const express = require('express');
const { register, login, me, getDemoAccounts } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

function createAuthRoutes(db) {
  const router = express.Router();

  router.post('/register', register(db));
  router.post('/login', login(db));
  router.get('/me', authenticateToken, me(db));
  router.get('/demo-accounts', getDemoAccounts(db));

  return router;
}

module.exports = createAuthRoutes;
