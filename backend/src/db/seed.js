const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

function seedDatabase(db) {
  console.log('--- Starting Database Seeding ---');

  // Clear existing data (in proper dependency order)
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM refunds;
    DELETE FROM booking_passengers;
    DELETE FROM bookings;
    DELETE FROM trip_seats;
    DELETE FROM trips;
    DELETE FROM route_stops;
    DELETE FROM routes;
    DELETE FROM bus_seats;
    DELETE FROM buses;
    DELETE FROM cancellation_rules;
    DELETE FROM users;
    DELETE FROM operators;
  `);

  // 1. Seed Operators
  const insertOperator = db.prepare(`
    INSERT INTO operators (name, code, contact_email, contact_phone, address)
    VALUES (?, ?, ?, ?, ?)
  `);

  const op1 = insertOperator.run('Royal Travels', 'ROYLT', 'support@royaltravels.com', '+1-800-555-0101', '100 Transport Way, New York, NY');
  const op2 = insertOperator.run('City Express Lines', 'CTEXP', 'help@cityexpress.com', '+1-800-555-0102', '45 Intercity Blvd, Boston, MA');
  const op3 = insertOperator.run('Greenline Intercity', 'GRNLN', 'contact@greenline.com', '+1-800-555-0103', '77 Highway Plaza, Philadelphia, PA');

  // 2. Seed Users with hashed passwords
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('Admin@123', salt);
  const operatorPass = bcrypt.hashSync('Operator@123', salt);
  const customerPass = bcrypt.hashSync('Customer@123', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, operator_id, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const adminUser = insertUser.run('Platform Administrator', 'admin@busbooking.com', adminPass, 'ADMIN', null, '+1-555-000-0001');
  const operatorUser1 = insertUser.run('Royal Operations Lead', 'royal@operator.com', operatorPass, 'OPERATOR', op1.lastInsertRowid, '+1-555-000-0002');
  const operatorUser2 = insertUser.run('City Express Dispatch', 'express@operator.com', operatorPass, 'OPERATOR', op2.lastInsertRowid, '+1-555-000-0003');
  const customerUser1 = insertUser.run('John Doe', 'john.doe@example.com', customerPass, 'CUSTOMER', null, '+1-555-111-2222');
  const customerUser2 = insertUser.run('Sarah Smith', 'sarah.smith@example.com', customerPass, 'CUSTOMER', null, '+1-555-333-4444');

  // 3. Seed Buses
  const insertBus = db.prepare(`
    INSERT INTO buses (operator_id, bus_number, bus_type, total_seats, seat_layout_type, amenities, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  const bus1 = insertBus.run(
    op1.lastInsertRowid,
    'BUS-ROY-101',
    'AC Seater 2+2',
    28,
    'SEATER_2X2',
    JSON.stringify(['High-Speed WiFi', 'USB Charging Port', 'Water Bottle', 'Air Conditioning', 'Emergency Exit'])
  );

  const bus2 = insertBus.run(
    op1.lastInsertRowid,
    'BUS-ROY-102',
    'AC Sleeper 2+1',
    21,
    'SLEEPER_2X1',
    JSON.stringify(['WiFi', 'Clean Bedding & Blanket', 'Reading Light', 'Charging Plug', 'Air Conditioning'])
  );

  const bus3 = insertBus.run(
    op2.lastInsertRowid,
    'BUS-CTX-201',
    'AC Seater 2+2',
    28,
    'SEATER_2X2',
    JSON.stringify(['WiFi', 'USB Port', 'Snacks', 'Air Conditioning'])
  );

  // 4. Seed Seat Templates for Bus 1 (28 seats, 7 rows x 4 seats: A, B aisle C, D)
  const insertSeat = db.prepare(`
    INSERT INTO bus_seats (bus_id, seat_number, deck, seat_type, row_num, col_num)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Bus 1: 28 Seater (Rows 1 to 7, cols A, B, C, D)
  const cols = ['A', 'B', 'C', 'D'];
  for (let r = 1; r <= 7; r++) {
    cols.forEach((c, idx) => {
      insertSeat.run(bus1.lastInsertRowid, `${r}${c}`, 'LOWER', 'SEATER', r, idx + 1);
    });
  }

  // Bus 2: 21 Sleeper (7 rows x 3 berths: Single sleeper S1..S7, Double sleeper D1A..D7B)
  for (let r = 1; r <= 7; r++) {
    insertSeat.run(bus2.lastInsertRowid, `L${r}A`, 'LOWER', 'SLEEPER', r, 1);
    insertSeat.run(bus2.lastInsertRowid, `L${r}B`, 'LOWER', 'SLEEPER', r, 2);
    insertSeat.run(bus2.lastInsertRowid, `S${r}`, 'LOWER', 'SLEEPER', r, 3);
  }

  // Bus 3: 28 Seater
  for (let r = 1; r <= 7; r++) {
    cols.forEach((c, idx) => {
      insertSeat.run(bus3.lastInsertRowid, `${r}${c}`, 'LOWER', 'SEATER', r, idx + 1);
    });
  }

  // 5. Seed Routes
  const insertRoute = db.prepare(`
    INSERT INTO routes (operator_id, source_city, destination_city, distance_km, estimated_duration_mins)
    VALUES (?, ?, ?, ?, ?)
  `);

  const route1 = insertRoute.run(op1.lastInsertRowid, 'New York', 'Boston', 350, 270);
  const route2 = insertRoute.run(op1.lastInsertRowid, 'Boston', 'New York', 350, 270);
  const route3 = insertRoute.run(op1.lastInsertRowid, 'New York', 'Washington DC', 360, 280);
  const route4 = insertRoute.run(op2.lastInsertRowid, 'New York', 'Boston', 350, 260);
  const route5 = insertRoute.run(op2.lastInsertRowid, 'Philadelphia', 'New York', 150, 120);

  // 6. Seed Route Stops (Boarding & Dropping)
  const insertStop = db.prepare(`
    INSERT INTO route_stops (route_id, stop_name, stop_type, stop_order, landmark, time_offset_mins)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Route 1 (NY -> Boston)
  const stop1 = insertStop.run(route1.lastInsertRowid, 'Port Authority Bus Terminal (Gate 14)', 'BOARDING', 1, '8th Ave & 42nd St', 0);
  const stop2 = insertStop.run(route1.lastInsertRowid, 'Queens Midtown Pick-up', 'BOARDING', 2, 'Near Queens Tunnel', 30);
  const stop3 = insertStop.run(route1.lastInsertRowid, 'South Station Intercity Bus Terminal', 'DROPPING', 3, 'Atlantic Ave', 255);
  const stop4 = insertStop.run(route1.lastInsertRowid, 'Alewife Station Cambridge', 'DROPPING', 4, 'Red Line Terminus', 270);

  // Route 3 (NY -> Washington DC)
  insertStop.run(route3.lastInsertRowid, 'Port Authority Terminal (Gate 21)', 'BOARDING', 1, '8th Ave NYC', 0);
  insertStop.run(route3.lastInsertRowid, 'Newark Penn Station Drop/Pick', 'BOARDING', 2, 'Raymond Plaza West', 35);
  insertStop.run(route3.lastInsertRowid, 'Union Station DC', 'DROPPING', 3, 'First St NE', 270);
  insertStop.run(route3.lastInsertRowid, 'Arlington Transit Center', 'DROPPING', 4, 'Near Rosslyn Metro', 285);

  // Route 4 (City Express NY -> Boston)
  insertStop.run(route4.lastInsertRowid, '34th St Penn Station Curb', 'BOARDING', 1, '7th Ave & 34th', 0);
  insertStop.run(route4.lastInsertRowid, 'Boston South Station', 'DROPPING', 2, 'Bus Deck Level 3', 260);

  // 7. Seed Dynamic Trips for Today and Upcoming Days
  const now = new Date();
  const formatIso = (d) => d.toISOString().slice(0, 19);

  const insertTrip = db.prepare(`
    INSERT INTO trips (route_id, bus_id, operator_id, departure_time, arrival_time, base_fare, status)
    VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED')
  `);

  const insertTripSeat = db.prepare(`
    INSERT INTO trip_seats (trip_id, seat_number, status)
    VALUES (?, ?, 'AVAILABLE')
  `);

  // Helper to create trip and initialize trip_seats from bus_seats
  function createTripWithSeats(routeId, busId, operatorId, depDate, arrDate, fare) {
    const trip = insertTrip.run(routeId, busId, operatorId, formatIso(depDate), formatIso(arrDate), fare);
    const busSeats = db.prepare('SELECT seat_number FROM bus_seats WHERE bus_id = ?').all(busId);
    busSeats.forEach(s => {
      insertTripSeat.run(trip.lastInsertRowid, s.seat_number);
    });
    return trip.lastInsertRowid;
  }

  // Trip 1: Tomorrow morning 08:00 AM (New York -> Boston) - Royal Travels
  const t1Dep = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0);
  const t1Arr = new Date(t1Dep.getTime() + 270 * 60000);
  const trip1Id = createTripWithSeats(route1.lastInsertRowid, bus1.lastInsertRowid, op1.lastInsertRowid, t1Dep, t1Arr, 38.50);

  // Trip 2: Tomorrow afternoon 02:00 PM (New York -> Boston) - City Express
  const t2Dep = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0, 0);
  const t2Arr = new Date(t2Dep.getTime() + 260 * 60000);
  const trip2Id = createTripWithSeats(route4.lastInsertRowid, bus3.lastInsertRowid, op2.lastInsertRowid, t2Dep, t2Arr, 34.00);

  // Trip 3: Tomorrow evening 06:30 PM (New York -> Boston Sleeper) - Royal Travels
  const t3Dep = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 18, 30, 0);
  const t3Arr = new Date(t3Dep.getTime() + 270 * 60000);
  const trip3Id = createTripWithSeats(route1.lastInsertRowid, bus2.lastInsertRowid, op1.lastInsertRowid, t3Dep, t3Arr, 49.00);

  // Trip 4: Day after tomorrow 09:00 AM (New York -> Washington DC) - Royal Travels
  const t4Dep = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 9, 0, 0);
  const t4Arr = new Date(t4Dep.getTime() + 280 * 60000);
  createTripWithSeats(route3.lastInsertRowid, bus1.lastInsertRowid, op1.lastInsertRowid, t4Dep, t4Arr, 45.00);

  // Trip 5: Today late evening (for cancellation testing within 12 hours)
  const t5Dep = new Date(now.getTime() + 5 * 3600000); // 5 hours from now
  const t5Arr = new Date(t5Dep.getTime() + 270 * 60000);
  const trip5Id = createTripWithSeats(route1.lastInsertRowid, bus1.lastInsertRowid, op1.lastInsertRowid, t5Dep, t5Arr, 38.50);

  // 8. Seed Configurable Cancellation Rules
  const insertRule = db.prepare(`
    INSERT INTO cancellation_rules (rule_name, min_hours_before, max_hours_before, refund_percentage, cancellation_fee_percentage, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  insertRule.run('Advance Cancellation (> 24 hrs)', 24, null, 90.0, 10.0);
  insertRule.run('Standard Cancellation (12 - 24 hrs)', 12, 24, 70.0, 30.0);
  insertRule.run('Short Notice Cancellation (2 - 12 hrs)', 2, 12, 50.0, 50.0);
  insertRule.run('Last Minute / No Show (< 2 hrs)', 0, 2, 0.0, 100.0);

  // 9. Seed Initial Confirmed Booking on Trip 1
  // Seat '1A' and '1B' booked for John Doe
  const insertBooking = db.prepare(`
    INSERT INTO bookings (pnr, user_id, trip_id, boarding_stop_id, drop_stop_id, total_passengers, total_amount, contact_name, contact_email, contact_phone, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')
  `);

  const initialPnr = 'ROY-NYC-88210';
  const bookingRes = insertBooking.run(
    initialPnr,
    customerUser1.lastInsertRowid,
    trip1Id,
    stop1.lastInsertRowid,
    stop3.lastInsertRowid,
    2,
    77.00,
    'John Doe',
    'john.doe@example.com',
    '+1-555-111-2222'
  );
  const bookingId = bookingRes.lastInsertRowid;

  const insertPassenger = db.prepare(`
    INSERT INTO booking_passengers (booking_id, seat_number, passenger_name, age, gender, fare)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertPassenger.run(bookingId, '1A', 'John Doe', 32, 'MALE', 38.50);
  insertPassenger.run(bookingId, '1B', 'Jane Doe', 29, 'FEMALE', 38.50);

  // Update trip_seats to BOOKED
  const updateSeat = db.prepare(`
    UPDATE trip_seats
    SET status = 'BOOKED', booking_id = ?
    WHERE trip_id = ? AND seat_number IN ('1A', '1B')
  `);
  updateSeat.run(bookingId, trip1Id);

  // Audit log for this booking
  db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (?, 'BOOKING_CREATED', 'BOOKING', ?, ?)
  `).run(
    customerUser1.lastInsertRowid,
    String(bookingId),
    JSON.stringify({ pnr: initialPnr, seats: ['1A', '1B'], amount: 77.00 })
  );

  console.log('--- Database Seeding Completed Successfully ---');
  console.log(`Operators: 3, Buses: 3, Routes: 5, Trips: 5, Users: 5`);
  console.log(`Sample PNR for reviewer: ${initialPnr}`);
}

// If run directly from terminal: `node backend/src/db/seed.js`
if (require.main === module) {
  const db = getDb();
  seedDatabase(db);
  process.exit(0);
}

module.exports = {
  seedDatabase
};
