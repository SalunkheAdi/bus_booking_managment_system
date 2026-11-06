const express = require('express');
const {
  getPassengerManifest,
  getOccupancyReport,
  getBookingSummary,
  getAuditLogs
} = require('../controllers/reportController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

function createReportRoutes(db) {
  const router = express.Router();

  // All reporting routes require staff access (OPERATOR or ADMIN)
  router.get('/manifest/:tripId', authenticateToken, requireRoles('OPERATOR', 'ADMIN'), getPassengerManifest(db));
  router.get('/occupancy', authenticateToken, requireRoles('OPERATOR', 'ADMIN'), getOccupancyReport(db));
  router.get('/summary', authenticateToken, requireRoles('OPERATOR', 'ADMIN'), getBookingSummary(db));
  router.get('/audit-logs', authenticateToken, requireRoles('ADMIN'), getAuditLogs(db));

  return router;
}

module.exports = createReportRoutes;
