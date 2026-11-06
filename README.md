# 🚌 Bus Booking Management System

A full-stack, modular-monolith web application that supports the complete end-to-end customer and staff operations of an intercity bus booking business.

Built with **Node.js, Express.js, SQLite (WAL mode with ACID transactions), and React (Vite)**. Features real-time visual seat selection, concurrent duplicate-booking prevention, configurable tiered cancellation policies, printable passenger boarding manifests, and role-based access control.

---

## 📋 Table of Contents
- [1. Key Features & Business Workflows](#1-key-features--business-workflows)
- [2. System Architecture](#2-system-architecture)
- [3. Demo Credentials & Reviewer Quick Switcher](#3-demo-credentials--reviewer-quick-switcher)
- [4. Quick Local Setup & Run](#4-quick-local-setup--run)
- [5. Automated Test Suite & Acceptance Verification](#5-automated-test-suite--acceptance-verification)
- [6. Step-by-Step Acceptance Criteria Walkthrough](#6-step-by-step-acceptance-criteria-walkthrough)
- [7. Concurrency & Seat Integrity Design](#7-concurrency--seat-integrity-design)
- [8. Configurable Cancellation & Refund Rules](#8-configurable-cancellation--refund-rules)
- [9. Project Structure](#9-project-structure)
- [10. Documentation Index](#10-documentation-index)

---

## 1. Key Features & Business Workflows

| Capability | Business Workflow & Implementation |
| :--- | :--- |
| **Operator & Route Setup** | Manage transport operators, vehicle fleet with seat layout geometry (2+2 Seater or 2+1 Sleeper), routes, boarding/dropping stops, trip schedules, and fares. |
| **Trip Search & Discovery** | Filter trips by origin, destination, and travel date; inspect boarding/dropping landmarks, departure/arrival schedules, amenities, and real-time available seat counts. |
| **Visual Seat Booking** | Interactive 2D bus layout with driver cabin orientation; multi-seat selection, passenger details capture (name, age, gender), and unique PNR/ticket creation. |
| **Seat Integrity & Concurrency** | Prevents duplicate confirmed bookings for the same trip seat, including simultaneous race-condition requests, via ACID database transactions and unique constraints. |
| **Configurable Cancellation** | Dynamic refund calculation based on hours remaining until departure (>24h: 90% refund, 12–24h: 70%, 2–12h: 50%, <2h: 0%). Releases seats back to inventory while preserving booking history. |
| **Operator Reporting** | Trip schedules, occupancy rate percentages, printable passenger manifests (reconciled with confirmed tickets), and revenue summaries. |
| **Security & RBAC** | Server-side role-based authorization for `CUSTOMER`, `OPERATOR`, and `ADMIN` roles. |
| **Audit Trail** | System-wide audit log tracking every material business event (bookings, cancellations, trip creations). |

---

## 2. System Architecture

```
+-------------------------------------------------------------+
|                       Web Browser                           |
|             React 19 + Vite Single-Page App                 |
|   (Interactive Seat Selector • E-Ticket • Staff Portals)    |
+------------------------------+------------------------------+
                               | HTTP / JSON REST
+------------------------------v------------------------------+
|                     Express.js Backend                      |
|                                                             |
|   +--------------------------+  +------------------------+  |
|   | Auth & RBAC Middleware   |  | API Routing Layer      |  |
|   +--------------------------+  +------------------------+  |
|   | Business Logic Domain    |  | Policy Engine          |  |
|   | - Booking Service        |  | - Refund Calculation   |  |
|   | - Seat Allocation        |  | - Manifest Generator   |  |
|   +--------------------------+  +------------------------+  |
+------------------------------+------------------------------+
                               | Synchronous ACID Queries
+------------------------------v------------------------------+
|                    SQLite 3 Database                        |
|        WAL Mode • Foreign Keys • Unique Constraints         |
+-------------------------------------------------------------+
```

---

## 3. Demo Credentials & Reviewer Quick Switcher

For reviewer convenience, the web interface includes a **1-Click Quick Switcher Bar** pinned at the very top of the screen to switch between roles instantly without typing passwords. Standard login forms also work:

| Role | Name | Email | Password | Pre-seeded Permissions & Access |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Administrator | `admin@busbooking.com` | `Admin@123` | Full access: cancellation rules engine, system audit logs, all operators, trips & finances. |
| **OPERATOR** | Royal Travels Lead | `royal@operator.com` | `Operator@123` | Royal Travels fleet, trip schedules, passenger manifests, and occupancy summaries. |
| **OPERATOR** | City Express Lead | `express@operator.com` | `Operator@123` | City Express fleet and trips. Cannot view Royal Travels manifests (enforced by RBAC). |
| **CUSTOMER** | John Doe | `john.doe@example.com` | `Customer@123` | Searches trips, books seats, views tickets, cancels own bookings. Has seeded PNR `ROY-NYC-88210`. |
| **CUSTOMER** | Sarah Smith | `sarah.smith@example.com` | `Customer@123` | Secondary customer used for concurrency and multi-user testing. |

---

## 4. Quick Local Setup & Run

### Prerequisites
- **Node.js**: v18.0.0 or later (v24 tested)
- **npm**: v9.0.0 or later

### Step 1: Install Dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### Step 2: Seed the Database
Initialize the SQLite schema, operators, buses, seat templates, routes, upcoming trips, and demo accounts:
```bash
npm run seed
```

### Step 3: Build the Frontend (Single-Port Production Mode)
```bash
npm run build
```

### Step 4: Start the Application
```bash
npm start
```
The application will launch on **`http://localhost:5000`**.  
*Open your browser to `http://localhost:5000` to interact with the full web app.*

> **Development Mode (Optional)**: If you prefer hot-reloading for frontend development, run:
> - Terminal 1: `npm start` (Backend API on port 5000)
> - Terminal 2: `cd frontend && npm run dev` (Vite dev server on `http://localhost:3000` proxying to 5000)

---

## 5. Automated Test Suite & Acceptance Verification

To run the automated acceptance test suite:
```bash
npm test
```

### Test Evidence Output:
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

## 6. Step-by-Step Acceptance Criteria Walkthrough

### Acceptance Test 1: Search Trip & Book Available Seat
1. Open `http://localhost:5000`.
2. On the home search bar, select or type Origin: **`New York`**, Destination: **`Boston`**, and click **Search**.
3. Locate the **Royal Travels** morning departure and click **Select Seats**.
4. The visual seat layout renders. Click an available seat (e.g., `2A`).
5. Fill in the passenger name (`Alice Walker`), age (`28`), and contact details.
6. Click **Confirm & Pay**. The booking confirms instantly and generates the Electronic Boarding Ticket with a unique PNR.

### Acceptance Test 2: Double-Booking Prevention (Simultaneous Requests)
1. Handled automatically via automated test `AC 2`: two concurrent requests targeting seat `5A` on the same trip are fired in parallel using `Promise.all`.
2. Exactly one succeeds with `201 Created` and the other receives `409 Conflict` with error message `"Seat 5A is already booked on this trip"`.

### Acceptance Test 3: PNR Ticket Verification
1. Click **Check PNR** in the navigation bar.
2. Enter the seeded PNR: `ROY-NYC-88210` (or click the quick-paste suggestion).
3. The electronic boarding pass displays the correct passenger details (`John Doe`, `Jane Doe`), seats (`1A`, `1B`), route (`New York → Boston`), departure time, and operator contact information.

### Acceptance Test 4: Configurable Cancellation & Refund Rule
1. Switch to the **Customer** role via the top Reviewer Quick Switcher.
2. Navigate to **My Bookings**.
3. Click **Cancel Ticket** on any confirmed booking.
4. The cancellation preview modal opens, displaying the time remaining until departure, the matched policy tier (e.g., `Advance Cancellation > 24 hrs = 90% refund`), the refund amount, and the retained fee.
5. Click **Confirm Cancellation**. The booking transitions to `CANCELLED`, the seat is freed back to inventory, and a simulated refund reference (`REF-...`) is recorded.

### Acceptance Test 5: Operator Manifest & Occupancy Reconciliation
1. Switch to the **Operator: Royal Travels** role via the Reviewer Quick Switcher.
2. Click **Operator Portal** in the navigation bar.
3. Under the **Passenger Manifest** tab, select the scheduled trip.
4. Verify the manifest reconciliation banner:
   $$\text{Total Bus Capacity (28)} = \text{Confirmed Passengers (2)} + \text{Available Seats (26)}$$
5. The passenger list reconciles with the confirmed tickets and shows seat numbers, boarding stops, and fares. A printable manifest view is available via the **Print / Export Manifest** button.

---

## 7. Concurrency & Seat Integrity Design

To guarantee zero double-bookings under high concurrency:
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
2. **Immediate Transaction Serialization**:
   All booking executions run inside `better-sqlite3` transactions:
   ```javascript
   const bookingTransaction = db.transaction(() => {
     // Verify seats are AVAILABLE
     // Insert booking record
     // Update trip_seats to BOOKED with booking_id
   });
   ```
3. SQLite WAL mode ensures serializable execution of write operations, eliminating stale-state bookings.

---

## 8. Configurable Cancellation & Refund Rules

Cancellation refunds are calculated dynamically against the `cancellation_rules` table:

```
[Now] -----------------------------------------------------> [Departure Time]
                 |                       |                 |
            > 24 hours               12 - 24 hrs        2 - 12 hrs       < 2 hrs
            90% Refund               70% Refund         50% Refund       0% Refund
            (10% fee)                (30% fee)          (50% fee)        (100% fee)
```

Administrators can modify these rule thresholds and percentages in real time from the **Admin Settings → Cancellation Policy Engine** tab.

---

## 9. Project Structure

```
bus-booking-management-system/
├── backend/
│   ├── src/
│   │   ├── controllers/         # Express controllers (auth, trips, bookings, operator, reports, admin)
│   │   ├── db/
│   │   │   ├── database.js      # SQLite schema creation, foreign keys & WAL pragma
│   │   │   └── seed.js          # Seed data (operators, buses, routes, trips, users, rules)
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT verification & RBAC role guards
│   │   ├── routes/              # Express API route definitions
│   │   ├── services/
│   │   │   ├── bookingService.js       # Atomic booking transaction & cancellation logic
│   │   │   ├── cancellationService.js  # Dynamic refund policy tier calculator
│   │   │   └── auditService.js         # Immutable business audit logging
│   │   ├── app.js               # Express app assembly & static asset serving
│   │   └── server.js            # Server entry point
│   └── tests/
│       └── acceptance.test.js   # Automated test suite covering AC 1-5 & RBAC
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components (Navbar, SeatSelector, ETicket, CancelModal)
│   │   ├── context/             # AuthContext with 1-click reviewer switcher
│   │   ├── pages/               # Views (SearchTrips, MyBookings, PnrLookup, OperatorPortal, AdminPortal)
│   │   ├── services/            # API client wrapper
│   │   ├── App.jsx              # Main router & layout assembly
│   │   └── index.css            # Clean, responsive CSS styling
│   ├── index.html
│   └── vite.config.js
├── docs/
│   ├── ER_DIAGRAM.md            # Mermaid entity-relationship diagram & table definitions
│   ├── API_DOCUMENTATION.md     # Complete REST API specification
│   ├── TECHNICAL_REPORT.md      # Architectural design report & evaluation analysis
│   └── SUBMISSION_FORM.md       # Pre-filled internship assignment submission form
├── .env.example                 # Environment variable templates
├── package.json                 # Project configuration & npm scripts
└── README.md                    # Main setup and documentation guide
```

---

## 10. Documentation Index

- 📊 **[ER Diagram & Schema Design](file:///d:/projects/Bus%20Booking%20Management%20System/docs/ER_DIAGRAM.md)**
- 📡 **[API Documentation](file:///d:/projects/Bus%20Booking%20Management%20System/docs/API_DOCUMENTATION.md)**
- 📑 **[Technical Report](file:///d:/projects/Bus%20Booking%20Management%20System/docs/TECHNICAL_REPORT.md)**
- 📝 **[Internship Submission Form](file:///d:/projects/Bus%20Booking%20Management%20System/docs/SUBMISSION_FORM.md)**
