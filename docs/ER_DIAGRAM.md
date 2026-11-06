# Entity-Relationship (ER) Diagram & Schema Specification

## 1. Overview
The **Bus Booking Management System** uses a normalized relational schema designed for SQLite (with foreign keys and WAL mode enabled). The schema ensures:
1. **Referential Integrity**: Cascading and restrictive foreign key relations.
2. **Seat Integrity**: Physical seat coordinate templates (`bus_seats`) mapped dynamically to scheduled trip seat inventories (`trip_seats`) with strict unique constraints (`UNIQUE(trip_id, seat_number)`).
3. **Auditability & History Preservation**: Booking history and passenger manifests are preserved even when bookings are cancelled.
4. **Configurable Policies**: Time-tiered cancellation rules calculated on demand.

---

## 2. Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    OPERATORS ||--o{ BUSES : owns
    OPERATORS ||--o{ ROUTES : operates
    OPERATORS ||--o{ TRIPS : manages
    OPERATORS ||--o{ USERS : employs
    
    BUSES ||--o{ BUS_SEATS : contains
    BUSES ||--o{ TRIPS : assigned_to

    ROUTES ||--o{ ROUTE_STOPS : has
    ROUTES ||--o{ TRIPS : scheduled_on

    TRIPS ||--o{ TRIP_SEATS : allocates
    TRIPS ||--o{ BOOKINGS : receives

    USERS ||--o{ BOOKINGS : creates
    USERS ||--o{ AUDIT_LOGS : performs

    BOOKINGS ||--o{ BOOKING_PASSENGERS : includes
    BOOKINGS ||--o{ TRIP_SEATS : reserves
    BOOKINGS ||--o| REFUNDS : issues

    CANCELLATION_RULES {
        int id PK
        string rule_name
        int min_hours_before
        int max_hours_before
        float refund_percentage
        float cancellation_fee_percentage
        int is_active
    }

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string role
        int operator_id FK
        string phone
        datetime created_at
    }

    OPERATORS {
        int id PK
        string name
        string code UK
        string contact_email
        string contact_phone
        string address
        datetime created_at
    }

    BUSES {
        int id PK
        int operator_id FK
        string bus_number UK
        string bus_type
        int total_seats
        string seat_layout_type
        string amenities
        int is_active
        datetime created_at
    }

    BUS_SEATS {
        int id PK
        int bus_id FK
        string seat_number
        string deck
        string seat_type
        int row_num
        int col_num
    }

    ROUTES {
        int id PK
        int operator_id FK
        string source_city
        string destination_city
        float distance_km
        int estimated_duration_mins
        datetime created_at
    }

    ROUTE_STOPS {
        int id PK
        int route_id FK
        string stop_name
        string stop_type
        int stop_order
        string landmark
        int time_offset_mins
    }

    TRIPS {
        int id PK
        int route_id FK
        int bus_id FK
        int operator_id FK
        string departure_time
        string arrival_time
        float base_fare
        string status
        datetime created_at
    }

    TRIP_SEATS {
        int id PK
        int trip_id FK
        string seat_number
        string status
        int booking_id FK
    }

    BOOKINGS {
        int id PK
        string pnr UK
        int user_id FK
        int trip_id FK
        int boarding_stop_id FK
        int drop_stop_id FK
        int total_passengers
        float total_amount
        string contact_name
        string contact_email
        string contact_phone
        string status
        datetime created_at
    }

    BOOKING_PASSENGERS {
        int id PK
        int booking_id FK
        string seat_number
        string passenger_name
        int age
        string gender
        float fare
    }

    REFUNDS {
        int id PK
        int booking_id FK,UK
        float refund_amount
        float cancellation_fee
        float refund_percentage
        string refund_status
        string refund_reference
        datetime processed_at
    }

    AUDIT_LOGS {
        int id PK
        int user_id FK
        string action
        string entity_type
        string entity_id
        string details
        datetime created_at
    }
```

---

## 3. Data Dictionary & Table Definitions

### 1. `users`
Stores user accounts for authentication and role-based access control.
- `id` (INTEGER, PK, AUTOINCREMENT)
- `name` (TEXT, NOT NULL)
- `email` (TEXT, NOT NULL, UNIQUE)
- `password_hash` (TEXT, NOT NULL) - Bcrypt hash
- `role` (TEXT, CHECK: `CUSTOMER`, `OPERATOR`, `ADMIN`)
- `operator_id` (INTEGER, NULL, FK -> `operators.id`)
- `phone` (TEXT)
- `created_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)

### 2. `operators`
Bus transport agencies operating routes and vehicles.
- `id` (INTEGER, PK, AUTOINCREMENT)
- `name` (TEXT, NOT NULL)
- `code` (TEXT, NOT NULL, UNIQUE) - e.g. `ROYLT`, `CTEXP`
- `contact_email` (TEXT, NOT NULL)
- `contact_phone` (TEXT, NOT NULL)
- `address` (TEXT)
- `created_at` (DATETIME)

### 3. `buses`
Vehicles in fleet inventory with seating capacity and amenities.
- `id` (INTEGER, PK, AUTOINCREMENT)
- `operator_id` (INTEGER, FK -> `operators.id`)
- `bus_number` (TEXT, NOT NULL, UNIQUE)
- `bus_type` (TEXT, NOT NULL) - e.g., 'AC Seater 2+2', 'AC Sleeper 2+1'
- `total_seats` (INTEGER, NOT NULL)
- `seat_layout_type` (TEXT) - `SEATER_2X2` or `SLEEPER_2X1`
- `amenities` (TEXT) - JSON array of amenities (WiFi, Charging, etc.)
- `is_active` (INTEGER, DEFAULT 1)

### 4. `bus_seats`
Template seats representing physical geometry in the bus cabin.
- `id` (INTEGER, PK)
- `bus_id` (INTEGER, FK -> `buses.id`)
- `seat_number` (TEXT) - e.g., '1A', 'L1A'
- `deck` (TEXT, DEFAULT 'LOWER')
- `seat_type` (TEXT, DEFAULT 'SEATER')
- `row_num` (INTEGER)
- `col_num` (INTEGER)
- `UNIQUE(bus_id, seat_number)`

### 5. `routes` & `route_stops`
Geographic transit corridors and designated boarding/dropping points.
- `routes`: `id`, `operator_id`, `source_city`, `destination_city`, `distance_km`, `estimated_duration_mins`.
- `route_stops`: `id`, `route_id`, `stop_name`, `stop_type` (`BOARDING` / `DROPPING`), `stop_order`, `landmark`, `time_offset_mins`.

### 6. `trips` & `trip_seats`
Concrete scheduled runs and real-time seat inventory.
- `trips`: `id`, `route_id`, `bus_id`, `operator_id`, `departure_time`, `arrival_time`, `base_fare`, `status` (`SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELLED`).
- `trip_seats`: `id`, `trip_id`, `seat_number`, `status` (`AVAILABLE`, `BOOKED`), `booking_id`.
- **Constraint**: `UNIQUE(trip_id, seat_number)` prevents duplicate seat records per trip.

### 7. `bookings` & `booking_passengers`
Ticket reservations and passenger manifest entries.
- `bookings`: `id`, `pnr` (UNIQUE), `user_id`, `trip_id`, `boarding_stop_id`, `drop_stop_id`, `total_passengers`, `total_amount`, `contact_name`, `contact_email`, `contact_phone`, `status` (`CONFIRMED`, `CANCELLED`).
- `booking_passengers`: `id`, `booking_id`, `seat_number`, `passenger_name`, `age`, `gender`, `fare`.

### 8. `cancellation_rules` & `refunds`
Policy configuration and simulated financial refunds.
- `cancellation_rules`: `id`, `rule_name`, `min_hours_before`, `max_hours_before`, `refund_percentage`, `cancellation_fee_percentage`, `is_active`.
- `refunds`: `id`, `booking_id` (UNIQUE), `refund_amount`, `cancellation_fee`, `refund_percentage`, `refund_status`, `refund_reference`, `processed_at`.

### 9. `audit_logs`
Immutable record of material business actions.
- `id` (INTEGER, PK)
- `user_id` (INTEGER, FK -> `users.id`)
- `action` (TEXT) - e.g. `BOOKING_CREATED`, `BOOKING_CANCELLED`, `TRIP_SCHEDULED`
- `entity_type` (TEXT)
- `entity_id` (TEXT)
- `details` (TEXT / JSON)
- `created_at` (DATETIME)
