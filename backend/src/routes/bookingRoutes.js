const express = require('express');
const {
  handleCreateBooking,
  getMyBookings,
  getBookingByPnr,
  previewCancellation,
  handleCancelBooking
} = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/auth');

function createBookingRoutes(db) {
  const router = express.Router();

  // Public PNR lookup (can be checked by anyone with the PNR code)
  router.get('/pnr/:pnr', getBookingByPnr(db));

  // Customer / Authenticated actions
  router.post('/', authenticateToken, handleCreateBooking(db));
  router.get('/my-bookings', authenticateToken, getMyBookings(db));
  router.get('/:id/cancellation-preview', authenticateToken, previewCancellation(db));
  router.post('/:id/cancel', authenticateToken, handleCancelBooking(db));

  return router;
}

module.exports = createBookingRoutes;
