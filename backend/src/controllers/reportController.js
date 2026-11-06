function getPassengerManifest(db) {
  return (req, res) => {
    try {
      const { tripId } = req.params;

      const trip = db.prepare(`
        SELECT
          t.id AS trip_id,
          t.departure_time,
          t.arrival_time,
          t.base_fare,
          t.status AS trip_status,
          t.operator_id,
          r.source_city,
          r.destination_city,
          o.name AS operator_name,
          o.code AS operator_code,
          o.contact_phone AS operator_phone,
          b.bus_number,
          b.bus_type,
          b.total_seats
        FROM trips t
        JOIN routes r ON t.route_id = r.id
        JOIN operators o ON t.operator_id = o.id
        JOIN buses b ON t.bus_id = b.id
        WHERE t.id = ?
      `).get(tripId);

      if (!trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      // Check permissions: Operator can only view manifest of their own trips; Admin can view all
      if (req.user.role === 'OPERATOR' && req.user.operator_id !== trip.operator_id) {
        return res.status(403).json({ success: false, error: 'Unauthorized to view manifest for another operator' });
      }

      // Query passenger manifest: joining bookings, booking_passengers, route_stops
      // Only CONFIRMED bookings appear in active passenger manifest
      const passengers = db.prepare(`
        SELECT
          bp.id AS passenger_id,
          bp.seat_number,
          bp.passenger_name,
          bp.age,
          bp.gender,
          bp.fare,
          b.id AS booking_id,
          b.pnr,
          b.contact_name,
          b.contact_phone,
          b.contact_email,
          b.created_at AS booking_date,
          COALESCE(b_stop.stop_name, r.source_city || ' Origin') AS boarding_stop,
          COALESCE(d_stop.stop_name, r.destination_city || ' Terminal') AS drop_stop
        FROM booking_passengers bp
        JOIN bookings b ON bp.booking_id = b.id
        JOIN trips t ON b.trip_id = t.id
        JOIN routes r ON t.route_id = r.id
        LEFT JOIN route_stops b_stop ON b.boarding_stop_id = b_stop.id
        LEFT JOIN route_stops d_stop ON b.drop_stop_id = d_stop.id
        WHERE b.trip_id = ? AND b.status = 'CONFIRMED'
        ORDER BY bp.seat_number ASC
      `).all(tripId);

      // Also get cancelled booking history for audit/manifest reconciliation
      const cancelledRecords = db.prepare(`
        SELECT
          b.pnr,
          b.contact_name,
          b.total_passengers,
          b.total_amount,
          rf.refund_amount,
          rf.processed_at AS cancelled_at
        FROM bookings b
        LEFT JOIN refunds rf ON rf.booking_id = b.id
        WHERE b.trip_id = ? AND b.status = 'CANCELLED'
        ORDER BY b.created_at DESC
      `).all(tripId);

      const totalSeats = Number(trip.total_seats);
      const bookedCount = passengers.length;
      const availableCount = Math.max(0, totalSeats - bookedCount);
      const occupancyRate = totalSeats > 0 ? Math.round((bookedCount / totalSeats) * 1000) / 10 : 0;
      const totalRevenue = passengers.reduce((sum, p) => sum + Number(p.fare), 0);

      return res.json({
        success: true,
        trip,
        manifest: {
          totalSeats,
          confirmedPassengersCount: bookedCount,
          availableSeatsCount: availableCount,
          occupancyRatePercentage: occupancyRate,
          totalTripRevenue: Math.round(totalRevenue * 100) / 100,
          passengers,
          cancelledHistory: cancelledRecords
        }
      });
    } catch (err) {
      console.error('Manifest error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function getOccupancyReport(db) {
  return (req, res) => {
    try {
      let sql = `
        SELECT
          t.id AS trip_id,
          t.departure_time,
          t.arrival_time,
          t.base_fare,
          t.status AS trip_status,
          r.source_city,
          r.destination_city,
          o.id AS operator_id,
          o.name AS operator_name,
          b.bus_number,
          b.bus_type,
          b.total_seats,
          (
            SELECT COUNT(*)
            FROM trip_seats ts
            WHERE ts.trip_id = t.id AND ts.status = 'BOOKED'
          ) AS booked_seats,
          (
            SELECT COUNT(*)
            FROM trip_seats ts
            WHERE ts.trip_id = t.id AND ts.status = 'AVAILABLE'
          ) AS available_seats,
          COALESCE(
            (
              SELECT SUM(bkg.total_amount)
              FROM bookings bkg
              WHERE bkg.trip_id = t.id AND bkg.status = 'CONFIRMED'
            ), 0
          ) AS confirmed_revenue
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

      sql += ` ORDER BY t.departure_time ASC`;

      const trips = db.prepare(sql).all(...params);

      const report = trips.map(t => {
        const total = Number(t.total_seats);
        const booked = Number(t.booked_seats);
        const occupancyRate = total > 0 ? Math.round((booked / total) * 1000) / 10 : 0;

        return {
          ...t,
          occupancyRatePercentage: occupancyRate
        };
      });

      return res.json({
        success: true,
        count: report.length,
        report
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function getBookingSummary(db) {
  return (req, res) => {
    try {
      let operatorFilter = '';
      const params = [];

      if (req.user.role === 'OPERATOR') {
        operatorFilter = ' WHERE t.operator_id = ? ';
        params.push(req.user.operator_id);
      }

      // Confirmed bookings metric
      const confirmedStats = db.prepare(`
        SELECT
          COUNT(b.id) AS confirmed_bookings_count,
          COALESCE(SUM(b.total_passengers), 0) AS total_passengers_booked,
          COALESCE(SUM(b.total_amount), 0) AS gross_revenue
        FROM bookings b
        JOIN trips t ON b.trip_id = t.id
        ${operatorFilter ? operatorFilter + " AND b.status = 'CONFIRMED'" : "WHERE b.status = 'CONFIRMED'"}
      `).get(...params);

      // Cancelled bookings & refunds metric
      const cancelledStats = db.prepare(`
        SELECT
          COUNT(b.id) AS cancelled_bookings_count,
          COALESCE(SUM(rf.refund_amount), 0) AS total_refunds_processed,
          COALESCE(SUM(rf.cancellation_fee), 0) AS total_cancellation_fees_retained
        FROM bookings b
        JOIN trips t ON b.trip_id = t.id
        LEFT JOIN refunds rf ON rf.booking_id = b.id
        ${operatorFilter ? operatorFilter + " AND b.status = 'CANCELLED'" : "WHERE b.status = 'CANCELLED'"}
      `).get(...params);

      // Active trips count
      const tripStats = db.prepare(`
        SELECT
          COUNT(t.id) AS total_scheduled_trips,
          COALESCE(SUM(b.total_seats), 0) AS total_capacity_seats
        FROM trips t
        JOIN buses b ON t.bus_id = b.id
        ${operatorFilter ? operatorFilter : ''}
      `).get(...params);

      const gross = Number(confirmedStats.gross_revenue) || 0;
      const fees = Number(cancelledStats.total_cancellation_fees_retained) || 0;
      const netRevenue = Math.round((gross + fees) * 100) / 100;

      return res.json({
        success: true,
        summary: {
          confirmedBookingsCount: confirmedStats.confirmed_bookings_count,
          totalPassengersBooked: confirmedStats.total_passengers_booked,
          grossRevenue: gross,
          cancelledBookingsCount: cancelledStats.cancelled_bookings_count,
          totalRefundsProcessed: cancelledStats.total_refunds_processed,
          totalCancellationFeesRetained: fees,
          netRevenue,
          totalScheduledTrips: tripStats.total_scheduled_trips,
          totalCapacitySeats: tripStats.total_capacity_seats
        }
      });
    } catch (err) {
      console.error('Summary error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function getAuditLogs(db) {
  return (req, res) => {
    try {
      const logs = db.prepare(`
        SELECT
          a.*,
          u.name AS user_name,
          u.email AS user_email,
          u.role AS user_role
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 100
      `).all();

      const formatted = logs.map(l => {
        let details = l.details;
        try {
          details = JSON.parse(l.details);
        } catch {
          // keep as string
        }
        return {
          ...l,
          details
        };
      });

      return res.json({
        success: true,
        count: formatted.length,
        logs: formatted
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

module.exports = {
  getPassengerManifest,
  getOccupancyReport,
  getBookingSummary,
  getAuditLogs
};
