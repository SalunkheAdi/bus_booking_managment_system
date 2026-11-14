const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

function getDatabase(customPath) {
  let dbPath = customPath || process.env.DB_PATH;

  if (!dbPath) {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      dbPath = path.join('/tmp', 'bus_booking.db');
    } else {
      dbPath = path.join(__dirname, '../../../data/bus_booking.db');
    }
  }

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        // In case /tmp already exists or permissions
      }
    }
  }

  const db = new Database(dbPath);

  // Enable foreign keys and Write-Ahead Logging (WAL) for concurrency & performance
  db.pragma('foreign_keys = ON');
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }

  initSchema(db);
  return db;
}

function initSchema(db) {
  db.exec(`
    -- 1. Users Table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('CUSTOMER', 'OPERATOR', 'ADMIN')),
      operator_id INTEGER NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE SET NULL
    );

    -- 2. Operators Table
    CREATE TABLE IF NOT EXISTS operators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Buses Table
    CREATE TABLE IF NOT EXISTS buses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_id INTEGER NOT NULL,
      bus_number TEXT UNIQUE NOT NULL,
      bus_type TEXT NOT NULL, -- e.g. 'AC Sleeper 2+1', 'AC Seater 2+2'
      total_seats INTEGER NOT NULL,
      seat_layout_type TEXT DEFAULT 'SEATER_2X2',
      amenities TEXT DEFAULT '[]', -- JSON array of strings
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE
    );

    -- 4. Bus Seat Layout Templates
    CREATE TABLE IF NOT EXISTS bus_seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_id INTEGER NOT NULL,
      seat_number TEXT NOT NULL,
      deck TEXT DEFAULT 'LOWER', -- 'LOWER', 'UPPER'
      seat_type TEXT DEFAULT 'SEATER', -- 'SEATER', 'SLEEPER'
      row_num INTEGER NOT NULL,
      col_num INTEGER NOT NULL,
      UNIQUE(bus_id, seat_number),
      FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE
    );

    -- 5. Routes Table
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_id INTEGER NOT NULL,
      source_city TEXT NOT NULL,
      destination_city TEXT NOT NULL,
      distance_km REAL NOT NULL,
      estimated_duration_mins INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE
    );

    -- 6. Route Stops (Boarding & Dropping Points)
    CREATE TABLE IF NOT EXISTS route_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      stop_name TEXT NOT NULL,
      stop_type TEXT NOT NULL CHECK(stop_type IN ('BOARDING', 'DROPPING')),
      stop_order INTEGER NOT NULL,
      landmark TEXT,
      time_offset_mins INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
    );

    -- 7. Trip Schedules
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      bus_id INTEGER NOT NULL,
      operator_id INTEGER NOT NULL,
      departure_time TEXT NOT NULL, -- ISO 8601 string: YYYY-MM-DDTHH:mm:ss
      arrival_time TEXT NOT NULL,
      base_fare REAL NOT NULL,
      status TEXT DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE RESTRICT,
      FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE RESTRICT,
      FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE RESTRICT
    );

    -- 8. Trip Seat State (Explicit tracking of seat booking per trip)
    CREATE TABLE IF NOT EXISTS trip_seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      seat_number TEXT NOT NULL,
      status TEXT DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'BOOKED')),
      booking_id INTEGER NULL,
      UNIQUE(trip_id, seat_number),
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );

    -- 9. Bookings Table
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pnr TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      trip_id INTEGER NOT NULL,
      boarding_stop_id INTEGER,
      drop_stop_id INTEGER,
      total_passengers INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      status TEXT DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'CANCELLED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (boarding_stop_id) REFERENCES route_stops(id),
      FOREIGN KEY (drop_stop_id) REFERENCES route_stops(id)
    );

    -- 10. Booking Passengers
    CREATE TABLE IF NOT EXISTS booking_passengers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      seat_number TEXT NOT NULL,
      passenger_name TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('MALE', 'FEMALE', 'OTHER')),
      fare REAL NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    -- 11. Configurable Cancellation Rules
    CREATE TABLE IF NOT EXISTS cancellation_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_name TEXT NOT NULL,
      min_hours_before INTEGER NOT NULL,
      max_hours_before INTEGER NULL, -- NULL means unbounded (e.g. > 24 hours)
      refund_percentage REAL NOT NULL,
      cancellation_fee_percentage REAL NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    -- 12. Refunds Table
    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER UNIQUE NOT NULL,
      refund_amount REAL NOT NULL,
      cancellation_fee REAL NOT NULL,
      refund_percentage REAL NOT NULL,
      refund_status TEXT DEFAULT 'PROCESSED_SIMULATED',
      refund_reference TEXT NOT NULL,
      processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    );

    -- 13. Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_trips_route ON trips(route_id);
    CREATE INDEX IF NOT EXISTS idx_trips_departure ON trips(departure_time);
    CREATE INDEX IF NOT EXISTS idx_trip_seats_trip ON trip_seats(trip_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_pnr ON bookings(pnr);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);
}

// Global singleton instance for typical server run
let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = getDatabase();
  }
  return dbInstance;
}

module.exports = {
  getDatabase,
  getDb
};
