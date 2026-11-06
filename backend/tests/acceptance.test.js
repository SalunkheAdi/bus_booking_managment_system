const request = require('supertest');
const { getDatabase } = require('../src/db/database');
const { seedDatabase } = require('../src/db/seed');
const createApp = require('../src/app');

describe('Bus Booking Management System - Acceptance Criteria Test Suite', () => {
  let db;
  let app;
  let customerToken;
  let customer2Token;
  let operatorToken;
  let adminToken;
  let sampleTripId;

  beforeAll(async () => {
    // Initialize fresh in-memory database for clean, isolated test runs
    db = getDatabase(':memory:');
    seedDatabase(db);
    app = createApp(db);

    // 1. Login as customer (John Doe)
    const custRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john.doe@example.com', password: 'Customer@123' });
    customerToken = custRes.body.token;

    // 2. Login as second customer (Sarah Smith)
    const cust2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sarah.smith@example.com', password: 'Customer@123' });
    customer2Token = cust2Res.body.token;

    // 3. Login as Royal Travels Operator
    const opRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'royal@operator.com', password: 'Operator@123' });
    operatorToken = opRes.body.token;

    // 4. Login as Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@busbooking.com', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    // Find a scheduled trip id for testing
    const trip = db.prepare("SELECT id FROM trips WHERE status = 'SCHEDULED' LIMIT 1").get();
    sampleTripId = trip.id;
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  // Acceptance Test 1
  test('AC 1: A passenger can search a valid trip and book an available seat', async () => {
    // Step A: Search trips
    const searchRes = await request(app)
      .get('/api/trips/search')
      .query({ origin: 'New York', destination: 'Boston' });

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.trips.length).toBeGreaterThan(0);

    const testTrip = searchRes.body.trips.find(t => t.trip_id === sampleTripId) || searchRes.body.trips[0];
    expect(testTrip.available_seats).toBeGreaterThan(0);

    // Step B: Fetch seat layout and pick an available seat
    const seatsRes = await request(app).get(`/api/trips/${testTrip.trip_id}/seats`);
    expect(seatsRes.status).toBe(200);

    const availableSeat = seatsRes.body.seats.find(s => s.status === 'AVAILABLE');
    expect(availableSeat).toBeDefined();

    // Step C: Book the available seat
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        tripId: testTrip.trip_id,
        contactName: 'Alice Walker',
        contactEmail: 'alice@example.com',
        contactPhone: '+1-555-444-9999',
        passengers: [
          {
            seatNumber: availableSeat.seat_number,
            passengerName: 'Alice Walker',
            age: 26,
            gender: 'FEMALE'
          }
        ]
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.success).toBe(true);
    expect(bookRes.body.booking.pnr).toBeDefined();
    expect(bookRes.body.booking.seats).toContain(availableSeat.seat_number);

    // Verify seat is now BOOKED in trip_seats
    const checkSeat = db.prepare('SELECT status FROM trip_seats WHERE trip_id = ? AND seat_number = ?')
      .get(testTrip.trip_id, availableSeat.seat_number);
    expect(checkSeat.status).toBe('BOOKED');
  });

  // Acceptance Test 2: Concurrency & Duplicate Booking Prevention
  test('AC 2: Two users cannot confirm the same seat on one trip (simultaneous requests)', async () => {
    // Pick an available seat for this concurrency test
    const targetSeat = '5A';

    // Ensure the seat is currently available
    db.prepare("UPDATE trip_seats SET status = 'AVAILABLE', booking_id = NULL WHERE trip_id = ? AND seat_number = ?")
      .run(sampleTripId, targetSeat);

    // Fire TWO simultaneous booking requests for seat '5A' using Promise.all
    const request1 = request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        tripId: sampleTripId,
        contactName: 'User One',
        contactEmail: 'user1@example.com',
        contactPhone: '+1-555-111-0001',
        passengers: [{ seatNumber: targetSeat, passengerName: 'Passenger One', age: 30, gender: 'MALE' }]
      });

    const request2 = request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({
        tripId: sampleTripId,
        contactName: 'User Two',
        contactEmail: 'user2@example.com',
        contactPhone: '+1-555-222-0002',
        passengers: [{ seatNumber: targetSeat, passengerName: 'Passenger Two', age: 28, gender: 'FEMALE' }]
      });

    const [res1, res2] = await Promise.all([request1, request2]);

    // Check status codes: Exactly one must be 201 Created and the other must be 409 Conflict!
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.success).toBe(false);
    expect(conflictRes.body.error).toMatch(/already booked/i);
  });

  // Acceptance Test 3: PNR Ticket Verification
  test('AC 3: The PNR includes correct passenger, route, date and seat details', async () => {
    // Create a known booking to verify PNR retrieval
    const seatNumber = '6B';
    db.prepare("UPDATE trip_seats SET status = 'AVAILABLE', booking_id = NULL WHERE trip_id = ? AND seat_number = ?")
      .run(sampleTripId, seatNumber);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        tripId: sampleTripId,
        contactName: 'Michael Scott',
        contactEmail: 'michael@dunder.com',
        contactPhone: '+1-555-777-8888',
        passengers: [
          { seatNumber, passengerName: 'Michael Scott', age: 45, gender: 'MALE' }
        ]
      });

    const pnr = bookingRes.body.booking.pnr;
    expect(pnr).toBeDefined();

    // Query PNR lookup endpoint
    const pnrRes = await request(app).get(`/api/bookings/pnr/${pnr}`);
    expect(pnrRes.status).toBe(200);
    expect(pnrRes.body.success).toBe(true);

    const ticket = pnrRes.body.booking;
    expect(ticket.pnr).toBe(pnr);
    expect(ticket.status).toBe('CONFIRMED');
    expect(ticket.source_city).toBe('New York');
    expect(ticket.destination_city).toBe('Boston');
    expect(ticket.departure_time).toBeDefined();
    expect(ticket.passengers.length).toBe(1);
    expect(ticket.passengers[0].passenger_name).toBe('Michael Scott');
    expect(ticket.passengers[0].seat_number).toBe('6B');
    expect(ticket.operator_name).toBeDefined();
  });

  // Acceptance Test 4: Cancellation and Refund Rules
  test('AC 4: Cancellation changes seat availability and refund status according to the rule', async () => {
    // Step A: Create a booking to cancel
    const seatToCancel = '7C';
    db.prepare("UPDATE trip_seats SET status = 'AVAILABLE', booking_id = NULL WHERE trip_id = ? AND seat_number = ?")
      .run(sampleTripId, seatToCancel);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        tripId: sampleTripId,
        contactName: 'Pam Beesly',
        contactEmail: 'pam@dunder.com',
        contactPhone: '+1-555-999-1234',
        passengers: [
          { seatNumber: seatToCancel, passengerName: 'Pam Beesly', age: 29, gender: 'FEMALE' }
        ]
      });

    const bookingId = bookingRes.body.booking.bookingId;
    const pnr = bookingRes.body.booking.pnr;

    // Step B: Cancel booking simulating cancellation 30 hours before departure (> 24 hrs rule: 90% refund)
    const trip = db.prepare('SELECT departure_time FROM trips WHERE id = ?').get(sampleTripId);
    const simulatedNow = new Date(new Date(trip.departure_time).getTime() - 30 * 3600000).toISOString();

    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ customNow: simulatedNow });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.cancellation.status).toBe('CANCELLED');
    expect(cancelRes.body.cancellation.refundPercentage).toBe(90);
    expect(cancelRes.body.cancellation.refundAmount).toBeGreaterThan(0);
    expect(cancelRes.body.cancellation.refundReference).toMatch(/^REF-/);

    // Step C: Verify seat '7C' is now AVAILABLE again in trip_seats!
    const seatAfterCancel = db.prepare('SELECT status, booking_id FROM trip_seats WHERE trip_id = ? AND seat_number = ?')
      .get(sampleTripId, seatToCancel);
    expect(seatAfterCancel.status).toBe('AVAILABLE');
    expect(seatAfterCancel.booking_id).toBeNull();

    // Step D: Verify booking history is preserved in database
    const bookingRecord = db.prepare('SELECT status FROM bookings WHERE id = ?').get(bookingId);
    expect(bookingRecord.status).toBe('CANCELLED');

    const refundRecord = db.prepare('SELECT * FROM refunds WHERE booking_id = ?').get(bookingId);
    expect(refundRecord.refund_status).toBe('PROCESSED_SIMULATED');
    expect(refundRecord.refund_amount).toBe(cancelRes.body.cancellation.refundAmount);
  });

  // Acceptance Test 5: Operator Manifest and Occupancy Reconciliation
  test('AC 5: Operator manifest and occupancy summaries reconcile with confirmed tickets', async () => {
    // Query manifest for sampleTripId as Royal Travels operator
    const manifestRes = await request(app)
      .get(`/api/reports/manifest/${sampleTripId}`)
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(manifestRes.status).toBe(200);
    expect(manifestRes.body.success).toBe(true);

    const { trip, manifest } = manifestRes.body;
    expect(manifest.totalSeats).toBe(trip.total_seats);

    // Count confirmed tickets directly from database
    const dbConfirmedPassengers = db.prepare(`
      SELECT COUNT(bp.id) AS count, COALESCE(SUM(bp.fare), 0) AS total_fare
      FROM booking_passengers bp
      JOIN bookings b ON bp.booking_id = b.id
      WHERE b.trip_id = ? AND b.status = 'CONFIRMED'
    `).get(sampleTripId);

    // Assert manifest counts reconcile exactly
    expect(manifest.confirmedPassengersCount).toBe(dbConfirmedPassengers.count);
    expect(manifest.totalTripRevenue).toBe(Math.round(dbConfirmedPassengers.total_fare * 100) / 100);
    expect(manifest.totalSeats).toBe(manifest.confirmedPassengersCount + manifest.availableSeatsCount);

    // Verify occupancy report endpoint
    const occupancyRes = await request(app)
      .get('/api/reports/occupancy')
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(occupancyRes.status).toBe(200);
    const tripOccupancy = occupancyRes.body.report.find(r => r.trip_id === sampleTripId);
    expect(tripOccupancy).toBeDefined();
    expect(tripOccupancy.booked_seats).toBe(manifest.confirmedPassengersCount);
    expect(tripOccupancy.available_seats).toBe(manifest.availableSeatsCount);
  });

  // Security & Authorization Test
  test('RBAC: Customers cannot access operator reports, Operators cannot access other operators manifests', async () => {
    // Customer accessing manifest should be rejected (403)
    const custManifestRes = await request(app)
      .get(`/api/reports/manifest/${sampleTripId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(custManifestRes.status).toBe(403);

    // Operator 2 (City Express) accessing Royal Travels trip manifest should be rejected (403)
    const op2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'express@operator.com', password: 'Operator@123' });

    const op2ManifestRes = await request(app)
      .get(`/api/reports/manifest/${sampleTripId}`)
      .set('Authorization', `Bearer ${op2Login.body.token}`);
    expect(op2ManifestRes.status).toBe(403);
  });
});
