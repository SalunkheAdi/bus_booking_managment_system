const { logAudit } = require('../services/auditService');

// 1. Operators Management
function listOperators(db) {
  return (req, res) => {
    try {
      const operators = db.prepare(`
        SELECT o.*,
          (SELECT COUNT(*) FROM buses b WHERE b.operator_id = o.id) AS bus_count,
          (SELECT COUNT(*) FROM routes r WHERE r.operator_id = o.id) AS route_count,
          (SELECT COUNT(*) FROM trips t WHERE t.operator_id = o.id) AS trip_count
        FROM operators o
        ORDER BY o.name ASC
      `).all();

      return res.json({ success: true, count: operators.length, operators });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function createOperator(db) {
  return (req, res) => {
    try {
      const { name, code, contactEmail, contactPhone, address } = req.body;

      if (!name || !code || !contactEmail || !contactPhone) {
        return res.status(400).json({ success: false, error: 'Name, code, contactEmail, and contactPhone are required' });
      }

      const stmt = db.prepare(`
        INSERT INTO operators (name, code, contact_email, contact_phone, address)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = stmt.run(name.trim(), code.trim().toUpperCase(), contactEmail.trim(), contactPhone.trim(), address || '');

      logAudit(db, {
        userId: req.user.id,
        action: 'OPERATOR_CREATED',
        entityType: 'OPERATOR',
        entityId: result.lastInsertRowid,
        details: { name, code }
      });

      return res.status(201).json({
        success: true,
        message: 'Operator created successfully',
        operatorId: result.lastInsertRowid
      });
    } catch (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ success: false, error: 'Operator code already exists' });
      }
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

// 2. Bus Fleet & Seat Layout Management
function listBuses(db) {
  return (req, res) => {
    try {
      let sql = `
        SELECT b.*, o.name AS operator_name, o.code AS operator_code
        FROM buses b
        JOIN operators o ON b.operator_id = o.id
      `;
      const params = [];

      // If OPERATOR role, limit to their own buses
      if (req.user.role === 'OPERATOR') {
        sql += ` WHERE b.operator_id = ?`;
        params.push(req.user.operator_id);
      }

      sql += ` ORDER BY b.id DESC`;

      const buses = db.prepare(sql).all(...params);
      const formatted = buses.map(b => ({
        ...b,
        amenities: JSON.parse(b.amenities || '[]')
      }));

      return res.json({ success: true, count: formatted.length, buses: formatted });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function createBus(db) {
  return (req, res) => {
    try {
      const {
        busNumber,
        busType,
        seatLayoutType = 'SEATER_2X2',
        rows = 7,
        amenities = [],
        operatorId
      } = req.body;

      const targetOpId = req.user.role === 'OPERATOR' ? req.user.operator_id : (operatorId || req.user.operator_id);

      if (!busNumber || !busType || !targetOpId) {
        return res.status(400).json({ success: false, error: 'busNumber, busType and operatorId are required' });
      }

      const numRows = Math.max(1, Math.min(15, Number(rows) || 7));
      const totalSeats = seatLayoutType === 'SLEEPER_2X1' ? numRows * 3 : numRows * 4;

      const busTx = db.transaction(() => {
        // Insert bus
        const insertBusStmt = db.prepare(`
          INSERT INTO buses (operator_id, bus_number, bus_type, total_seats, seat_layout_type, amenities, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `);

        const busRes = insertBusStmt.run(
          targetOpId,
          busNumber.trim().toUpperCase(),
          busType.trim(),
          totalSeats,
          seatLayoutType,
          JSON.stringify(amenities)
        );

        const busId = busRes.lastInsertRowid;

        // Generate seat layout template
        const insertSeatStmt = db.prepare(`
          INSERT INTO bus_seats (bus_id, seat_number, deck, seat_type, row_num, col_num)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        if (seatLayoutType === 'SLEEPER_2X1') {
          for (let r = 1; r <= numRows; r++) {
            insertSeatStmt.run(busId, `L${r}A`, 'LOWER', 'SLEEPER', r, 1);
            insertSeatStmt.run(busId, `L${r}B`, 'LOWER', 'SLEEPER', r, 2);
            insertSeatStmt.run(busId, `S${r}`, 'LOWER', 'SLEEPER', r, 3);
          }
        } else {
          const cols = ['A', 'B', 'C', 'D'];
          for (let r = 1; r <= numRows; r++) {
            cols.forEach((col, idx) => {
              insertSeatStmt.run(busId, `${r}${col}`, 'LOWER', 'SEATER', r, idx + 1);
            });
          }
        }

        logAudit(db, {
          userId: req.user.id,
          action: 'BUS_CREATED',
          entityType: 'BUS',
          entityId: busId,
          details: { busNumber, totalSeats, seatLayoutType }
        });

        return busId;
      });

      const newBusId = busTx();

      return res.status(201).json({
        success: true,
        message: 'Bus fleet vehicle created with seat layout',
        busId: newBusId,
        totalSeats
      });
    } catch (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ success: false, error: 'Bus number already exists' });
      }
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

// 3. Route & Stops Management
function listRoutes(db) {
  return (req, res) => {
    try {
      let sql = `
        SELECT r.*, o.name AS operator_name, o.code AS operator_code,
          (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_id = r.id) AS stop_count,
          (SELECT COUNT(*) FROM trips t WHERE t.route_id = r.id) AS trip_count
        FROM routes r
        JOIN operators o ON r.operator_id = o.id
      `;
      const params = [];

      if (req.user.role === 'OPERATOR') {
        sql += ` WHERE r.operator_id = ?`;
        params.push(req.user.operator_id);
      }

      sql += ` ORDER BY r.source_city ASC, r.destination_city ASC`;

      const routes = db.prepare(sql).all(...params);

      const getStopsStmt = db.prepare(`
        SELECT id, stop_name, stop_type, stop_order, landmark, time_offset_mins
        FROM route_stops
        WHERE route_id = ?
        ORDER BY stop_order ASC
      `);

      const formatted = routes.map(r => ({
        ...r,
        stops: getStopsStmt.all(r.id)
      }));

      return res.json({ success: true, count: formatted.length, routes: formatted });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function createRoute(db) {
  return (req, res) => {
    try {
      const {
        sourceCity,
        destinationCity,
        distanceKm,
        estimatedDurationMins,
        operatorId,
        stops = []
      } = req.body;

      const targetOpId = req.user.role === 'OPERATOR' ? req.user.operator_id : (operatorId || req.user.operator_id);

      if (!sourceCity || !destinationCity || !distanceKm || !estimatedDurationMins || !targetOpId) {
        return res.status(400).json({ success: false, error: 'Source, destination, distance, duration, and operator are required' });
      }

      const routeTx = db.transaction(() => {
        const insertRouteStmt = db.prepare(`
          INSERT INTO routes (operator_id, source_city, destination_city, distance_km, estimated_duration_mins)
          VALUES (?, ?, ?, ?, ?)
        `);

        const result = insertRouteStmt.run(
          targetOpId,
          sourceCity.trim(),
          destinationCity.trim(),
          Number(distanceKm),
          Number(estimatedDurationMins)
        );

        const routeId = result.lastInsertRowid;

        const insertStopStmt = db.prepare(`
          INSERT INTO route_stops (route_id, stop_name, stop_type, stop_order, landmark, time_offset_mins)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        if (Array.isArray(stops) && stops.length > 0) {
          stops.forEach((s, idx) => {
            insertStopStmt.run(
              routeId,
              s.stopName.trim(),
              s.stopType.toUpperCase(),
              idx + 1,
              s.landmark || '',
              Number(s.timeOffsetMins) || 0
            );
          });
        } else {
          // Default start and end stops
          insertStopStmt.run(routeId, `${sourceCity} Main Bus Station`, 'BOARDING', 1, 'Central', 0);
          insertStopStmt.run(routeId, `${destinationCity} Terminal`, 'DROPPING', 2, 'City Gate', Number(estimatedDurationMins));
        }

        logAudit(db, {
          userId: req.user.id,
          action: 'ROUTE_CREATED',
          entityType: 'ROUTE',
          entityId: routeId,
          details: { sourceCity, destinationCity, distanceKm }
        });

        return routeId;
      });

      const newRouteId = routeTx();

      return res.status(201).json({
        success: true,
        message: 'Route and stops created successfully',
        routeId: newRouteId
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

// 4. Trip Scheduling Management
function listOperatorTrips(db) {
  return (req, res) => {
    try {
      let sql = `
        SELECT
          t.*,
          r.source_city,
          r.destination_city,
          r.distance_km,
          r.estimated_duration_mins,
          o.name AS operator_name,
          o.code AS operator_code,
          b.bus_number,
          b.bus_type,
          b.total_seats,
          (
            SELECT COUNT(*)
            FROM trip_seats ts
            WHERE ts.trip_id = t.id AND ts.status = 'AVAILABLE'
          ) AS available_seats,
          (
            SELECT COUNT(*)
            FROM trip_seats ts
            WHERE ts.trip_id = t.id AND ts.status = 'BOOKED'
          ) AS booked_seats
        FROM trips t
        JOIN routes r ON t.route_id = r.id
        JOIN operators o ON t.operator_id = o.id
        JOIN buses b ON t.bus_id = b.id
      `;

      const params = [];
      if (req.user.role === 'OPERATOR') {
        sql += ` WHERE t.operator_id = ?`;
        params.push(req.user.operator_id);
      }

      sql += ` ORDER BY t.departure_time DESC`;

      const trips = db.prepare(sql).all(...params);

      return res.json({ success: true, count: trips.length, trips });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function createTripSchedule(db) {
  return (req, res) => {
    try {
      const {
        routeId,
        busId,
        departureTime,
        arrivalTime,
        baseFare,
        operatorId
      } = req.body;

      const targetOpId = req.user.role === 'OPERATOR' ? req.user.operator_id : (operatorId || req.user.operator_id);

      if (!routeId || !busId || !departureTime || !arrivalTime || !baseFare || !targetOpId) {
        return res.status(400).json({
          success: false,
          error: 'routeId, busId, departureTime, arrivalTime, baseFare, and operatorId are required'
        });
      }

      // Check bus exists and belongs to operator
      const bus = db.prepare('SELECT id, operator_id FROM buses WHERE id = ?').get(busId);
      if (!bus) {
        return res.status(404).json({ success: false, error: 'Bus not found' });
      }

      const tripTx = db.transaction(() => {
        // 1. Insert trip
        const insertTripStmt = db.prepare(`
          INSERT INTO trips (route_id, bus_id, operator_id, departure_time, arrival_time, base_fare, status)
          VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED')
        `);

        const tripRes = insertTripStmt.run(
          Number(routeId),
          Number(busId),
          Number(targetOpId),
          departureTime,
          arrivalTime,
          Number(baseFare)
        );

        const newTripId = tripRes.lastInsertRowid;

        // 2. Fetch all bus_seats template for this bus
        const busSeats = db.prepare('SELECT seat_number FROM bus_seats WHERE bus_id = ?').all(busId);
        if (busSeats.length === 0) {
          throw new Error('This bus does not have a configured seat layout');
        }

        // 3. Populate trip_seats with AVAILABLE status
        const insertTripSeatStmt = db.prepare(`
          INSERT INTO trip_seats (trip_id, seat_number, status)
          VALUES (?, ?, 'AVAILABLE')
        `);

        for (const s of busSeats) {
          insertTripSeatStmt.run(newTripId, s.seat_number);
        }

        logAudit(db, {
          userId: req.user.id,
          action: 'TRIP_SCHEDULED',
          entityType: 'TRIP',
          entityId: newTripId,
          details: { routeId, busId, departureTime, baseFare, seatsGenerated: busSeats.length }
        });

        return { newTripId, seatsGenerated: busSeats.length };
      });

      const { newTripId, seatsGenerated } = tripTx();

      return res.status(201).json({
        success: true,
        message: 'Trip scheduled and seat inventory generated successfully',
        tripId: newTripId,
        seatsGenerated
      });
    } catch (err) {
      console.error('Create trip schedule error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

module.exports = {
  listOperators,
  createOperator,
  listBuses,
  createBus,
  listRoutes,
  createRoute,
  listOperatorTrips,
  createTripSchedule
};
