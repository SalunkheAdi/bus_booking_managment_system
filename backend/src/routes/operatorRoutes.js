const express = require('express');
const {
  listOperators,
  createOperator,
  listBuses,
  createBus,
  listRoutes,
  createRoute,
  listOperatorTrips,
  createTripSchedule
} = require('../controllers/operatorController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

function createOperatorRoutes(db) {
  const router = express.Router();

  // Operators
  router.get('/operators', listOperators(db));
  router.post('/operators', authenticateToken, requireRoles('ADMIN'), createOperator(db));

  // Buses
  router.get('/buses', authenticateToken, requireRoles('OPERATOR', 'ADMIN'), listBuses(db));
  router.post('/buses', authenticateToken, requireRoles('OPERATOR', 'ADMIN'), createBus(db));

  // Routes
  router.get('/routes', authenticateToken, requireRoles('OPERATOR', 'ADMIN'), listRoutes(db));
  router.post('/routes', authenticateToken, requireRoles('OPERATOR', 'ADMIN'), createRoute(db));

  // Trips / Schedules
  router.get('/trips', authenticateToken, requireRoles('OPERATOR', 'ADMIN'), listOperatorTrips(db));
  router.post('/trips', authenticateToken, requireRoles('OPERATOR', 'ADMIN'), createTripSchedule(db));

  return router;
}

module.exports = createOperatorRoutes;
