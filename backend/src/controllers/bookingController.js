const { createBooking, cancelBooking } = require('../services/bookingService');
const { calculateCancellationRefund } = require('../services/cancellationService');

function handleCreateBooking(db) {
  return (req, res) => {
    try {
      const {
        tripId,
        boardingStopId,
        dropStopId,
        contactName,
        contactEmail,
        contactPhone,
        passengers
      } = req.body;

      if (!tripId || !contactName || !contactEmail || !contactPhone) {
        return res.status(400).json({
          success: false,
          error: 'tripId, contactName, contactEmail, and contactPhone are required'
        });
      }

      if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one passenger with seat number is required'
        });
      }

      const result = createBooking(db, {
        userId: req.user.id,
        tripId: Number(tripId),
        boardingStopId: boardingStopId ? Number(boardingStopId) : null,
        dropStopId: dropStopId ? Number(dropStopId) : null,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim().toLowerCase(),
        contactPhone: contactPhone.trim(),
        passengers
      });

      return res.status(201).json({
        success: true,
        message: 'Booking confirmed successfully',
        booking: result
      });
    } catch (err) {
      console.error('Booking creation error:', err.message);

      // Check if it's a seat collision/conflict
      if (err.message.includes('already booked') || err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({
          success: false,
          error: err.message
        });
      }

      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  };
}

function getMyBookings(db) {
  return (req, res) => {
    try {
      const bookings = db.prepare(`
        SELECT
          b.id,
          b.pnr,
          b.total_passengers,
          b.total_amount,
          b.status,
          b.created_at,
          t.departure_time,
          t.arrival_time,
          r.source_city,
          r.destination_city,
          o.name AS operator_name,
          o.code AS operator_code,
          bus.bus_number,
          bus.bus_type,
          rf.refund_amount,
          rf.cancellation_fee,
          rf.refund_status
        FROM bookings b
        JOIN trips t ON b.trip_id = t.id
        JOIN routes r ON t.route_id = r.id
        JOIN operators o ON t.operator_id = o.id
        JOIN buses bus ON t.bus_id = bus.id
        LEFT JOIN refunds rf ON rf.booking_id = b.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
      `).all(req.user.id);

      const getPassengersStmt = db.prepare(`
        SELECT seat_number, passenger_name, age, gender, fare
        FROM booking_passengers
        WHERE booking_id = ?
      `);

      const result = bookings.map(b => ({
        ...b,
        passengers: getPassengersStmt.all(b.id)
      }));

      return res.json({
        success: true,
        count: result.length,
        bookings: result
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function getBookingByPnr(db) {
  return (req, res) => {
    try {
      const { pnr } = req.params;

      const booking = db.prepare(`
        SELECT
          b.id,
          b.pnr,
          b.user_id,
          b.total_passengers,
          b.total_amount,
          b.contact_name,
          b.contact_email,
          b.contact_phone,
          b.status,
          b.created_at,
          t.id AS trip_id,
          t.departure_time,
          t.arrival_time,
          r.source_city,
          r.destination_city,
          r.distance_km,
          o.name AS operator_name,
          o.code AS operator_code,
          o.contact_phone AS operator_phone,
          o.contact_email AS operator_email,
          bus.bus_number,
          bus.bus_type,
          b_stop.stop_name AS boarding_stop_name,
          b_stop.landmark AS boarding_landmark,
          b_stop.time_offset_mins AS boarding_time_offset,
          d_stop.stop_name AS drop_stop_name,
          d_stop.landmark AS drop_landmark,
          d_stop.time_offset_mins AS drop_time_offset,
          rf.refund_amount,
          rf.cancellation_fee,
          rf.refund_percentage,
          rf.refund_status,
          rf.refund_reference,
          rf.processed_at AS refund_processed_at
        FROM bookings b
        JOIN trips t ON b.trip_id = t.id
        JOIN routes r ON t.route_id = r.id
        JOIN operators o ON t.operator_id = o.id
        JOIN buses bus ON t.bus_id = bus.id
        LEFT JOIN route_stops b_stop ON b.boarding_stop_id = b_stop.id
        LEFT JOIN route_stops d_stop ON b.drop_stop_id = d_stop.id
        LEFT JOIN refunds rf ON rf.booking_id = b.id
        WHERE UPPER(b.pnr) = ?
      `).get(pnr.trim().toUpperCase());

      if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking with specified PNR not found' });
      }

      const passengers = db.prepare(`
        SELECT id, seat_number, passenger_name, age, gender, fare
        FROM booking_passengers
        WHERE booking_id = ?
        ORDER BY seat_number ASC
      `).all(booking.id);

      return res.json({
        success: true,
        booking: {
          ...booking,
          passengers
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function previewCancellation(db) {
  return (req, res) => {
    try {
      const { id } = req.params;
      const preview = calculateCancellationRefund(db, Number(id));

      return res.json({
        success: true,
        preview
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  };
}

function handleCancelBooking(db) {
  return (req, res) => {
    try {
      const { id } = req.params;
      const { customNow } = req.body; // allows passing customNow for simulation/testing

      const result = cancelBooking(db, {
        bookingId: Number(id),
        userId: req.user.id,
        userRole: req.user.role,
        operatorId: req.user.operator_id,
        customNow
      });

      return res.json({
        success: true,
        message: 'Booking cancelled successfully',
        cancellation: result
      });
    } catch (err) {
      console.error('Cancellation error:', err.message);
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  };
}

module.exports = {
  handleCreateBooking,
  getMyBookings,
  getBookingByPnr,
  previewCancellation,
  handleCancelBooking
};
