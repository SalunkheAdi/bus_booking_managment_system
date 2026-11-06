function searchTrips(db) {
  return (req, res) => {
    try {
      const { origin, destination, date } = req.query;

      let sql = `
        SELECT
          t.id AS trip_id,
          t.route_id,
          t.bus_id,
          t.operator_id,
          t.departure_time,
          t.arrival_time,
          t.base_fare,
          t.status AS trip_status,
          r.source_city,
          r.destination_city,
          r.distance_km,
          r.estimated_duration_mins,
          o.name AS operator_name,
          o.code AS operator_code,
          b.bus_number,
          b.bus_type,
          b.seat_layout_type,
          b.amenities,
          b.total_seats,
          (
            SELECT COUNT(*)
            FROM trip_seats ts
            WHERE ts.trip_id = t.id AND ts.status = 'AVAILABLE'
          ) AS available_seats
        FROM trips t
        JOIN routes r ON t.route_id = r.id
        JOIN operators o ON t.operator_id = o.id
        JOIN buses b ON t.bus_id = b.id
        WHERE t.status = 'SCHEDULED'
      `;

      const params = [];

      if (origin && origin.trim()) {
        sql += ` AND LOWER(r.source_city) LIKE ?`;
        params.push(`%${origin.trim().toLowerCase()}%`);
      }

      if (destination && destination.trim()) {
        sql += ` AND LOWER(r.destination_city) LIKE ?`;
        params.push(`%${destination.trim().toLowerCase()}%`);
      }

      if (date && date.trim()) {
        // Match trips where departure_time starts with date (e.g. '2026-11-08')
        sql += ` AND t.departure_time LIKE ?`;
        params.push(`${date.trim()}%`);
      }

      sql += ` ORDER BY t.departure_time ASC`;

      const trips = db.prepare(sql).all(...params);

      // Fetch stops for each trip's route
      const getStopsStmt = db.prepare(`
        SELECT id, stop_name, stop_type, stop_order, landmark, time_offset_mins
        FROM route_stops
        WHERE route_id = ?
        ORDER BY stop_order ASC
      `);

      const formattedTrips = trips.map(trip => {
        let amenities = [];
        try {
          amenities = JSON.parse(trip.amenities || '[]');
        } catch {
          amenities = [];
        }

        const allStops = getStopsStmt.all(trip.route_id);
        const boardingPoints = allStops.filter(s => s.stop_type === 'BOARDING');
        const dropPoints = allStops.filter(s => s.stop_type === 'DROPPING');

        return {
          ...trip,
          amenities,
          boarding_points: boardingPoints,
          drop_points: dropPoints
        };
      });

      return res.json({
        success: true,
        count: formattedTrips.length,
        trips: formattedTrips
      });
    } catch (err) {
      console.error('Search trips error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function getTripDetails(db) {
  return (req, res) => {
    try {
      const { id } = req.params;

      const trip = db.prepare(`
        SELECT
          t.id AS trip_id,
          t.route_id,
          t.bus_id,
          t.operator_id,
          t.departure_time,
          t.arrival_time,
          t.base_fare,
          t.status AS trip_status,
          r.source_city,
          r.destination_city,
          r.distance_km,
          r.estimated_duration_mins,
          o.name AS operator_name,
          o.code AS operator_code,
          o.contact_phone AS operator_phone,
          o.contact_email AS operator_email,
          b.bus_number,
          b.bus_type,
          b.seat_layout_type,
          b.amenities,
          b.total_seats,
          (
            SELECT COUNT(*)
            FROM trip_seats ts
            WHERE ts.trip_id = t.id AND ts.status = 'AVAILABLE'
          ) AS available_seats
        FROM trips t
        JOIN routes r ON t.route_id = r.id
        JOIN operators o ON t.operator_id = o.id
        JOIN buses b ON t.bus_id = b.id
        WHERE t.id = ?
      `).get(id);

      if (!trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      let amenities = [];
      try {
        amenities = JSON.parse(trip.amenities || '[]');
      } catch {
        amenities = [];
      }

      const stops = db.prepare(`
        SELECT id, stop_name, stop_type, stop_order, landmark, time_offset_mins
        FROM route_stops
        WHERE route_id = ?
        ORDER BY stop_order ASC
      `).all(trip.route_id);

      return res.json({
        success: true,
        trip: {
          ...trip,
          amenities,
          stops
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function getTripSeats(db) {
  return (req, res) => {
    try {
      const { id } = req.params;

      // Check trip exists
      const trip = db.prepare('SELECT id, bus_id FROM trips WHERE id = ?').get(id);
      if (!trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      // Join trip_seats with bus_seats to get physical coordinate positioning (row_num, col_num, deck, seat_type)
      const seats = db.prepare(`
        SELECT
          ts.id AS trip_seat_id,
          ts.trip_id,
          ts.seat_number,
          ts.status,
          COALESCE(bs.deck, 'LOWER') AS deck,
          COALESCE(bs.seat_type, 'SEATER') AS seat_type,
          COALESCE(bs.row_num, 1) AS row_num,
          COALESCE(bs.col_num, 1) AS col_num
        FROM trip_seats ts
        LEFT JOIN bus_seats bs ON bs.bus_id = ? AND bs.seat_number = ts.seat_number
        WHERE ts.trip_id = ?
        ORDER BY bs.deck ASC, bs.row_num ASC, bs.col_num ASC, ts.seat_number ASC
      `).all(trip.bus_id, id);

      const availableCount = seats.filter(s => s.status === 'AVAILABLE').length;
      const bookedCount = seats.filter(s => s.status === 'BOOKED').length;

      return res.json({
        success: true,
        tripId: Number(id),
        totalSeats: seats.length,
        availableCount,
        bookedCount,
        seats
      });
    } catch (err) {
      console.error('Get trip seats error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function getCities(db) {
  return (req, res) => {
    try {
      const sourceCities = db.prepare('SELECT DISTINCT source_city FROM routes ORDER BY source_city ASC').all().map(r => r.source_city);
      const destCities = db.prepare('SELECT DISTINCT destination_city FROM routes ORDER BY destination_city ASC').all().map(r => r.destination_city);

      const allCities = Array.from(new Set([...sourceCities, ...destCities])).sort();

      return res.json({
        success: true,
        cities: allCities,
        sources: sourceCities,
        destinations: destCities
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

module.exports = {
  searchTrips,
  getTripDetails,
  getTripSeats,
  getCities
};
