function calculateCancellationRefund(db, bookingId, customNow = null) {
  const booking = db.prepare(`
    SELECT b.*, t.departure_time, t.status AS trip_status, r.source_city, r.destination_city
    FROM bookings b
    JOIN trips t ON b.trip_id = t.id
    JOIN routes r ON t.route_id = r.id
    WHERE b.id = ?
  `).get(bookingId);

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status === 'CANCELLED') {
    throw new Error('Booking is already cancelled');
  }

  const now = customNow ? new Date(customNow) : new Date();
  const departureDate = new Date(booking.departure_time);
  const diffMs = departureDate.getTime() - now.getTime();
  const hoursBeforeDeparture = diffMs / (1000 * 60 * 60);

  // Load cancellation rules ordered by min_hours_before DESC
  const rules = db.prepare(`
    SELECT * FROM cancellation_rules
    WHERE is_active = 1
    ORDER BY min_hours_before DESC
  `).all();

  let matchedRule = null;

  if (hoursBeforeDeparture <= 0) {
    // Bus has already departed or is departing right now
    matchedRule = {
      rule_name: 'Trip Already Departed (Non-Refundable)',
      refund_percentage: 0.0,
      cancellation_fee_percentage: 100.0
    };
  } else {
    for (const rule of rules) {
      const minOk = hoursBeforeDeparture >= rule.min_hours_before;
      const maxOk = rule.max_hours_before === null || hoursBeforeDeparture < rule.max_hours_before;
      if (minOk && maxOk) {
        matchedRule = rule;
        break;
      }
    }

    if (!matchedRule) {
      // Fallback rule if none matched
      matchedRule = {
        rule_name: 'Default Cancellation Policy',
        refund_percentage: 0.0,
        cancellation_fee_percentage: 100.0
      };
    }
  }

  const refundPercentage = Number(matchedRule.refund_percentage);
  const cancellationFeePercentage = Number(matchedRule.cancellation_fee_percentage);

  const rawRefund = booking.total_amount * (refundPercentage / 100);
  const refundAmount = Math.round(rawRefund * 100) / 100;
  const cancellationFee = Math.round((booking.total_amount - refundAmount) * 100) / 100;

  return {
    booking,
    hoursBeforeDeparture: Math.round(hoursBeforeDeparture * 10) / 10,
    matchedRuleName: matchedRule.rule_name,
    refundPercentage,
    cancellationFeePercentage,
    refundAmount,
    cancellationFee
  };
}

module.exports = {
  calculateCancellationRefund
};
