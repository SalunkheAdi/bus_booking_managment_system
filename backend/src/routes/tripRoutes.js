const express = require('express');
const { searchTrips, getTripDetails, getTripSeats, getCities } = require('../controllers/tripController');

function createTripRoutes(db) {
  const router = express.Router();

  router.get('/search', searchTrips(db));
  router.get('/cities', getCities(db));
  router.get('/:id', getTripDetails(db));
  router.get('/:id/seats', getTripSeats(db));

  return router;
}

module.exports = createTripRoutes;
