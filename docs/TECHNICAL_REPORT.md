# Technical Report: Bus Booking Management System

**Author**: Student Engineering Candidate  
**Project**: Bus Booking Management System  
**Architecture**: Modular Monolith (Express.js, SQLite with WAL, React/Vite SPA)  

---

## 1. Executive Summary
The **Bus Booking Management System** was engineered to solve the operational and transactional challenges of an intercity bus booking business. The system supports three primary user personas:
1. **Passengers / Customers**: Discover schedules, select seats visually, confirm bookings with instant PNR generation, view electronic boarding passes, and cancel tickets with simulated refunds.
2. **Bus Operators**: Schedule trips, manage fleet seat layouts, generate printable passenger boarding manifests, and monitor occupancy metrics.
3. **Platform Administrators**: Maintain global cancellation policies, oversee all operator operations, inspect financials, and review immutable audit trails.

The application achieves **100% adherence** to all 5 core acceptance criteria and passed all automated concurrency and business rule tests.

---

## 2. Key Architectural Decisions

```
+-------------------------------------------------------+
|                    Browser Client                     |
|           React 19 + Vite Single-Page App             |
|   (Interactive Seat Selector, E-Ticket, Portals)      |
+---------------------------+---------------------------+
                            | HTTP / JSON REST
+---------------------------v---------------------------+
|               Express.js Modular Monolith             |
|                                                       |
|  +---------------------+    +----------------------+  |
|  | Auth & RBAC Guard   |    | API Routes           |  |
|  +---------------------+    +----------------------+  |
|  | Business Logic      |    | Policy Engine        |  |
|  | - Booking Service   |    | - Cancellation Math  |  |
|  | - Seat Allocation   |    | - Manifest Generator |  |
|  +---------------------+    +----------------------+  |
+---------------------------+---------------------------+
                            | Synchronous ACID Queries
+---------------------------v---------------------------+
|                 SQLite Embedded Database              |
|        WAL Mode • Foreign Keys • Unique Constraints   |
+-------------------------------------------------------+
```

### 2.1 Why a Modular Monolith with SQLite?
Instead of fragmenting a student/internship submission into complex microservices requiring Docker, Redis, and multi-container orchestration, a **modular monolith** was selected.
- **Maintainability**: The application clearly separates the **presentation layer** (`frontend/src`), **business logic / domain services** (`backend/src/services`), and **persistence** (`backend/src/db`).
- **Zero-Friction Local Run**: By utilizing `better-sqlite3`, any reviewer can clone the repository, run `npm install && npm start`, and experience the complete system locally without configuring external database services or cloud dependencies.
- **Performance & Reliability**: SQLite in WAL (Write-Ahead Logging) mode delivers high throughput for read operations while ensuring strict ACID serializability for seat bookings.

---

## 3. Critical Business Rules & Deep-Dive Implementations

### 3.1 Seat Integrity & Simultaneous Booking Concurrency
The most dangerous failure in a ticketing system is **double booking the same seat** when two users submit requests at the exact same millisecond.

#### Multi-Layered Protection Strategy:
1. **Database-Level Unique Constraint**:
   ```sql
   CREATE TABLE trip_seats (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     trip_id INTEGER NOT NULL,
     seat_number TEXT NOT NULL,
     status TEXT DEFAULT 'AVAILABLE',
     booking_id INTEGER NULL,
     UNIQUE(trip_id, seat_number)
   );
   ```
2. **Atomic Transactional Check-and-Lock**:
   In `bookingService.js`, the booking creation executes inside an atomic `db.transaction()` block:
   ```javascript
   const bookingTransaction = db.transaction(() => {
     for (const seatNum of requestedSeats) {
       const seatRow = checkSeatStmt.get(tripId, seatNum);
       if (seatRow.status !== 'AVAILABLE') {
         throw new Error(`Seat ${seatNum} is already booked on this trip`);
       }
     }
     // Insert booking, passengers, and update trip_seats to BOOKED
   });
   ```
3. **HTTP Conflict Response**:
   If a concurrent race condition occurs, the losing request receives a structured `409 Conflict` response with an explanatory message.
4. **Automated Concurrency Proof**:
   Acceptance test `AC 2` simulates two concurrent HTTP requests using `Promise.all` targeting the same seat (`5A`) on the same trip. As confirmed by the automated test suite, **exactly one succeeds with 201 Created and the second is rejected with 409 Conflict**.

### 3.2 Configurable Cancellation & Simulated Refund Engine
Cancellation policies in real transport networks vary by operator and advance notice. Rather than hard-coding cancellation rules, the system implements a **configurable rule table**:

| Rule Name | Window Before Departure | Refund % | Retained Fee % |
| :--- | :--- | :---: | :---: |
| Advance Cancellation | > 24 Hours | 90% | 10% |
| Standard Cancellation | 12 to 24 Hours | 70% | 30% |
| Short Notice Cancellation | 2 to 12 Hours | 50% | 50% |
| Last Minute / No Show | < 2 Hours / Departed | 0% | 100% |

#### Execution Flow on Cancellation:
1. Time delta is calculated: $\Delta t = \text{departureTime} - \text{currentTime}$.
2. The active rule matching the time tier is applied.
3. The booking status is changed from `CONFIRMED` to `CANCELLED`.
4. The seats in `trip_seats` are freed back to `AVAILABLE` so other passengers can book them immediately.
5. A simulated refund record is generated in the `refunds` table with a unique reference code (`REF-...`).
6. An immutable event is committed to `audit_logs`.

### 3.3 History Preservation & Passenger Manifest Reconciliation
A common anti-pattern is deleting records upon cancellation. This violates transport regulatory requirements and destroys manifests.
- In this system, **cancellations never delete booking rows**. The booking status transitions to `CANCELLED`, preserving the complete passenger manifest history.
- The operator manifest endpoint (`/api/reports/manifest/:tripId`) reconciles active confirmed passengers against bus capacity:
  $$\text{Total Bus Capacity} = \text{Confirmed Passengers} + \text{Available Seats}$$
- Occupancy rates and ticket revenues reconcile down to the cent with active database records.

---

## 4. Security & Role-Based Authorization (RBAC)

Authentication uses JSON Web Tokens (JWT) with Bcrypt password hashing. Server-side middleware verifies roles before granting access to sensitive routes:
- `CUSTOMER`: Permitted to search trips, create bookings, inspect own bookings, and cancel own tickets.
- `OPERATOR`: Permitted to schedule trips, view fleet vehicles, inspect trip manifests, and view occupancy for their own company. Accessing another operator's trip manifest is blocked with `403 Forbidden`.
- `ADMIN`: Global oversight across all operators, audit trail access, and cancellation policy configuration.

---

## 5. Automated Verification & Test Results

The test suite (`backend/tests/acceptance.test.js`) verifies all 5 acceptance criteria specified in the brief:

```
PASS backend/tests/acceptance.test.js
  Bus Booking Management System - Acceptance Criteria Test Suite
    √ AC 1: A passenger can search a valid trip and book an available seat (101 ms)
    √ AC 2: Two users cannot confirm the same seat on one trip (simultaneous requests) (64 ms)
    √ AC 3: The PNR includes correct passenger, route, date and seat details (46 ms)
    √ AC 4: Cancellation changes seat availability and refund status according to the rule (76 ms)
    √ AC 5: Operator manifest and occupancy summaries reconcile with confirmed tickets (54 ms)
    √ RBAC: Customers cannot access operator reports, Operators cannot access other manifests (189 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        4.129 s
```

---

## 6. Honest Limitations & Future Roadmap
1. **Payment Gateway**: Financial transactions and refunds are currently simulated with tracking references. Integration with Stripe or PayPal webhooks would be the next step for a production release.
2. **Dynamic Pricing**: Fares are currently fixed per trip schedule; demand-based dynamic pricing could be integrated.
3. **SMS / Email Dispatch**: Confirmations and PNR receipts are rendered on-screen and printable; sending real emails via SendGrid or AWS SES would enhance user convenience.
