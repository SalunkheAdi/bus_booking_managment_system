const { calculateCancellationRefund } = require('./cancellationService');
const { logAudit } = require('./auditService');

function generatePnr(operatorCode) {
  const prefix = (operatorCode || 'BUS').toUpperCase().slice(0, 4);
  const timestampPart = Date.now().toString(36).toUpperCase().slice(-4);
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timestampPart}${randomPart}`;
}

function createBooking(db, {
  userId,
  tripId,
  boardingStopId,
  dropStopId,
  contactName,
  contactEmail,
  contactPhone,
  passengers
}) {
  if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
    throw new Error('At least one passenger must be provided');
  }

  // Validate passenger input
  const requestedSeats = passengers.map(p => String(p.seatNumber).trim().toUpperCase());
  const uniqueSeats = new Set(requestedSeats);
  if (uniqueSeats.size !== requestedSeats.length) {
    throw new Error('Duplicate seat numbers detected in the passenger list');
  }

  // Run atomic booking transaction
  const bookingTransaction = db.transaction(() => {
    // 1. Fetch trip and operator
    const trip = db.prepare(`
      SELECT t.*, o.code AS operator_code, o.name AS operator_name
      FROM trips t
      JOIN operators o ON t.operator_id = o.id
      WHERE t.id = ?
    `).get(tripId);

    if (!trip) {
      throw new Error('Trip not found');
    }

    if (trip.status !== 'SCHEDULED' && trip.status !== 'ACTIVE') {
      throw new Error(`Cannot book a trip with status: ${trip.status}`);
    }

    // 2. Check each requested seat status in trip_seats with immediate lock
    const checkSeatStmt = db.prepare(`
      SELECT seat_number, status
      FROM trip_seats
      WHERE trip_id = ? AND seat_number = ?
    `);

    for (const seatNum of requestedSeats) {
      const seatRow = checkSeatStmt.get(tripId, seatNum);
      if (!seatRow) {
        throw new Error(`Seat ${seatNum} does not exist on this bus`);
      }
      if (seatRow.status !== 'AVAILABLE') {
        throw new Error(`Seat ${seatNum} is already booked on this trip`);
      }
    }

    // 3. Calculate fare
    const baseFare = Number(trip.base_fare);
    const totalAmount = Math.round(baseFare * passengers.length * 100) / 100;

    // 4. Generate unique PNR
    const pnr = generatePnr(trip.operator_code);

    // 5. Insert booking
    const insertBookingStmt = db.prepare(`
      INSERT INTO bookings (
        pnr, user_id, trip_id, boarding_stop_id, drop_stop_id,
        total_passengers, total_amount, contact_name, contact_email, contact_phone, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')
    `);

    const bookingResult = insertBookingStmt.run(
      pnr,
      userId,
      tripId,
      boardingStopId || null,
      dropStopId || null,
      passengers.length,
      totalAmount,
      contactName,
      contactEmail,
      contactPhone
    );

    const bookingId = bookingResult.lastInsertRowid;

    // 6. Insert passengers
    const insertPassengerStmt = db.prepare(`
      INSERT INTO booking_passengers (booking_id, seat_number, passenger_name, age, gender, fare)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const p of passengers) {
      insertPassengerStmt.run(
        bookingId,
        String(p.seatNumber).trim().toUpperCase(),
        p.passengerName.trim(),
        Number(p.age),
        p.gender.toUpperCase(),
        baseFare
      );
    }

    // 7. Update trip_seats to BOOKED
    const updateSeatStmt = db.prepare(`
      UPDATE trip_seats
      SET status = 'BOOKED', booking_id = ?
      WHERE trip_id = ? AND seat_number = ?
    `);

    for (const seatNum of requestedSeats) {
      updateSeatStmt.run(bookingId, tripId, seatNum);
    }

    // 8. Log audit
    logAudit(db, {
      userId,
      action: 'BOOKING_CREATED',
      entityType: 'BOOKING',
      entityId: bookingId,
      details: {
        pnr,
        tripId,
        seats: requestedSeats,
        totalAmount
      }
    });

    return {
      bookingId,
      pnr,
      totalAmount,
      passengersCount: passengers.length,
      seats: requestedSeats
    };
  });

  return bookingTransaction();
}

function cancelBooking(db, { bookingId, userId, userRole, operatorId, customNow }) {
  // Check authorization & fetch booking
  const booking = db.prepare(`
    SELECT b.*, t.operator_id AS trip_operator_id
    FROM bookings b
    JOIN trips t ON b.trip_id = t.id
    WHERE b.id = ?
  `).get(bookingId);

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Authorization rule:
  // Customer can only cancel their own booking.
  // Operator can only cancel bookings for trips operated by their company.
  // Admin can cancel any booking.
  if (userRole === 'CUSTOMER' && booking.user_id !== userId) {
    throw new Error('You are not authorized to cancel this booking');
  }
  if (userRole === 'OPERATOR' && booking.trip_operator_id !== operatorId) {
    throw new Error('You are not authorized to cancel bookings for another operator');
  }

  // Compute refund
  const refundCalculation = calculateCancellationRefund(db, bookingId, customNow);

  // Execute cancellation atomically
  const cancelTransaction = db.transaction(() => {
    // 1. Update booking status
    db.prepare(`
      UPDATE bookings
      SET status = 'CANCELLED'
      WHERE id = ?
    `).run(bookingId);

    // 2. Release trip seats back to AVAILABLE
    db.prepare(`
      UPDATE trip_seats
      SET status = 'AVAILABLE', booking_id = NULL
      WHERE booking_id = ?
    `).run(bookingId);

    // 3. Record refund
    const refundRef = `REF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    db.prepare(`
      INSERT INTO refunds (booking_id, refund_amount, cancellation_fee, refund_percentage, refund_status, refund_reference)
      VALUES (?, ?, ?, ?, 'PROCESSED_SIMULATED', ?)
    `).run(
      bookingId,
      refundCalculation.refundAmount,
      refundCalculation.cancellationFee,
      refundCalculation.refundPercentage,
      refundRef
    );

    // 4. Log audit
    logAudit(db, {
      userId,
      action: 'BOOKING_CANCELLED',
      entityType: 'BOOKING',
      entityId: bookingId,
      details: {
        pnr: booking.pnr,
        refundAmount: refundCalculation.refundAmount,
        cancellationFee: refundCalculation.cancellationFee,
        rule: refundCalculation.matchedRuleName
      }
    });

    return {
      bookingId,
      pnr: booking.pnr,
      status: 'CANCELLED',
      refundReference: refundRef,
      refundAmount: refundCalculation.refundAmount,
      cancellationFee: refundCalculation.cancellationFee,
      refundPercentage: refundCalculation.refundPercentage,
      matchedRule: refundCalculation.matchedRuleName,
      hoursBeforeDeparture: refundCalculation.hoursBeforeDeparture
    };
  });

  return cancelTransaction();
}

module.exports = {
  createBooking,
  cancelBooking
};
