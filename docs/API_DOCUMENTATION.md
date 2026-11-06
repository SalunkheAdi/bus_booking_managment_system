# Bus Booking Management System — API Specification

Base URL: `http://localhost:5000/api`

---

## 1. Authentication Endpoints

### 1.1 Register New Account
- **Endpoint**: `POST /auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "password": "Password@123",
    "phone": "+1-555-888-9999",
    "role": "CUSTOMER"
  }
  ```
- **Responses**:
  - `201 Created`: `{ "success": true, "token": "jwt...", "user": { ... } }`
  - `400 Bad Request`: Validation failure.
  - `409 Conflict`: Email already registered.

### 1.2 User Login
- **Endpoint**: `POST /auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "john.doe@example.com",
    "password": "Customer@123"
  }
  ```
- **Responses**:
  - `200 OK`: `{ "success": true, "token": "jwt...", "user": { ... } }`
  - `401 Unauthorized`: Invalid credentials.

### 1.3 Get Current User Session
- **Endpoint**: `GET /auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`: `{ "success": true, "user": { "id": 4, "name": "John Doe", "role": "CUSTOMER" } }`

### 1.4 Get Demo Accounts (Reviewer Helper)
- **Endpoint**: `GET /auth/demo-accounts`
- **Access**: Public
- **Response**: List of pre-seeded accounts for ADMIN, OPERATOR, and CUSTOMER roles.

---

## 2. Trip Search & Discovery Endpoints

### 2.1 Search Trips
- **Endpoint**: `GET /trips/search`
- **Access**: Public
- **Query Parameters**:
  - `origin` (optional string, e.g. `New York`)
  - `destination` (optional string, e.g. `Boston`)
  - `date` (optional string, `YYYY-MM-DD`)
- **Response**: `200 OK`:
  ```json
  {
    "success": true,
    "count": 2,
    "trips": [
      {
        "trip_id": 1,
        "operator_name": "Royal Travels",
        "bus_number": "BUS-ROY-101",
        "bus_type": "AC Seater 2+2",
        "departure_time": "2026-11-08T08:00:00",
        "arrival_time": "2026-11-08T12:30:00",
        "base_fare": 38.50,
        "total_seats": 28,
        "available_seats": 26,
        "amenities": ["WiFi", "Water Bottle"],
        "boarding_points": [...],
        "drop_points": [...]
      }
    ]
  }
  ```

### 2.2 Get Trip Seats Layout & Availability
- **Endpoint**: `GET /trips/:id/seats`
- **Access**: Public
- **Response**: `200 OK`:
  ```json
  {
    "success": true,
    "tripId": 1,
    "totalSeats": 28,
    "availableCount": 26,
    "bookedCount": 2,
    "seats": [
      {
        "trip_seat_id": 1,
        "seat_number": "1A",
        "status": "BOOKED",
        "deck": "LOWER",
        "seat_type": "SEATER",
        "row_num": 1,
        "col_num": 1
      },
      {
        "trip_seat_id": 2,
        "seat_number": "1B",
        "status": "AVAILABLE",
        "deck": "LOWER",
        "seat_type": "SEATER",
        "row_num": 1,
        "col_num": 2
      }
    ]
  }
  ```

---

## 3. Booking & Ticketing Endpoints

### 3.1 Create Seat Booking (Atomic Lock)
- **Endpoint**: `POST /bookings`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "tripId": 1,
    "boardingStopId": 1,
    "dropStopId": 3,
    "contactName": "Alice Walker",
    "contactEmail": "alice@example.com",
    "contactPhone": "+1-555-444-9999",
    "passengers": [
      {
        "seatNumber": "2A",
        "passengerName": "Alice Walker",
        "age": 28,
        "gender": "FEMALE"
      }
    ]
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "Booking confirmed successfully",
      "booking": {
        "bookingId": 2,
        "pnr": "ROY-NYC-88211",
        "totalAmount": 38.50,
        "seats": ["2A"]
      }
    }
    ```
  - `409 Conflict`: Seat already booked (concurrency / race condition protection).
  - `400 Bad Request`: Validation failure.

### 3.2 Lookup Ticket by PNR (Public)
- **Endpoint**: `GET /bookings/pnr/:pnr`
- **Access**: Public
- **Response**: `200 OK` with full journey details, boarding/dropping landmarks, and passenger manifest.

### 3.3 List Customer Bookings
- **Endpoint**: `GET /bookings/my-bookings`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` with list of user bookings and refund statuses.

### 3.4 Preview Cancellation & Refund Calculation
- **Endpoint**: `GET /bookings/:id/cancellation-preview`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "preview": {
      "hoursBeforeDeparture": 28.5,
      "matchedRuleName": "Advance Cancellation (> 24 hrs)",
      "refundPercentage": 90.0,
      "cancellationFeePercentage": 10.0,
      "refundAmount": 69.30,
      "cancellationFee": 7.70
    }
  }
  ```

### 3.5 Cancel Booking
- **Endpoint**: `POST /bookings/:id/cancel`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: `{ "customNow": "2026-11-07T12:00:00Z" }` (optional simulation date)
- **Response**: `200 OK`:
  ```json
  {
    "success": true,
    "message": "Booking cancelled successfully",
    "cancellation": {
      "bookingId": 2,
      "pnr": "ROY-NYC-88211",
      "status": "CANCELLED",
      "refundReference": "REF-ABC123XYZ",
      "refundAmount": 69.30,
      "cancellationFee": 7.70,
      "refundPercentage": 90
    }
  }
  ```

---

## 4. Operator & Reporting Endpoints

### 4.1 Passenger Manifest for Trip
- **Endpoint**: `GET /reports/manifest/:tripId`
- **Headers**: `Authorization: Bearer <token>` (Role: `OPERATOR`, `ADMIN`)
- **Response**: `200 OK` with manifest passenger list, boarding stops, seat assignments, and reconciled occupancy/revenue totals.

### 4.2 Seat Occupancy Report
- **Endpoint**: `GET /reports/occupancy`
- **Headers**: `Authorization: Bearer <token>` (Role: `OPERATOR`, `ADMIN`)
- **Response**: `200 OK` list of trips with `total_seats`, `booked_seats`, and `occupancyRatePercentage`.

### 4.3 Revenue & Booking Summary
- **Endpoint**: `GET /reports/summary`
- **Headers**: `Authorization: Bearer <token>` (Role: `OPERATOR`, `ADMIN`)
- **Response**: `200 OK` containing gross revenue, total refunds, cancellation fees retained, and net revenue.

### 4.4 System Audit Trail
- **Endpoint**: `GET /reports/audit-logs`
- **Headers**: `Authorization: Bearer <token>` (Role: `ADMIN`)
- **Response**: `200 OK` list of all tracked business actions.

---

## 5. Admin & Policy Engine Endpoints

### 5.1 List Cancellation Rules
- **Endpoint**: `GET /admin/cancellation-rules`
- **Access**: Public / Staff

### 5.2 Update Cancellation Rule
- **Endpoint**: `PUT /admin/cancellation-rules/:id`
- **Headers**: `Authorization: Bearer <token>` (Role: `ADMIN`)
- **Request Body**:
  ```json
  {
    "ruleName": "Advance Cancellation (> 24 hrs)",
    "minHoursBefore": 24,
    "maxHoursBefore": null,
    "refundPercentage": 90,
    "cancellationFeePercentage": 10
  }
  ```
