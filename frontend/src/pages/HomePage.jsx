import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Search,
  MapPin,
  Calendar,
  ShieldCheck,
  Zap,
  RotateCcw,
  Users,
  CheckCircle2,
  ArrowRight,
  Bus,
  Sparkles,
  Compass,
  Award,
  Clock
} from 'lucide-react';
import SeatSelectorModal from '../components/SeatSelectorModal';

export default function HomePage({ onBookingSuccess, openLoginModal, onNavigate }) {
  const [cities, setCities] = useState([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  useEffect(() => {
    loadCities();
    // Pre-populate with tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);

    // Initial trip fetch
    fetchFeaturedTrips();
  }, []);

  async function loadCities() {
    try {
      const res = await api.getCities();
      if (res.success) setCities(res.cities);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchFeaturedTrips(from = '', to = '', d = '') {
    setLoading(true);
    try {
      const res = await api.searchTrips(from, to, d);
      if (res.success) {
        setTrips(res.trips);
      }
    } catch (err) {
      console.error('Fetch trips error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchFeaturedTrips(origin, destination, date);
    // Scroll down smoothly to trips section
    const el = document.getElementById('trips-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  function handleQuickRoute(from, to) {
    setOrigin(from);
    setDestination(to);
    fetchFeaturedTrips(from, to, date);
    const el = document.getElementById('trips-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div>
      {/* Natural Hero Section */}
      <section className="natural-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} style={{ color: '#f59e0b' }} />
            <span>Reliable & Verified Intercity Travel</span>
          </div>

          <h1 className="hero-heading">
            Travel Comfortably, <br />
            <span className="hero-accent">Book Your Seats Live</span>
          </h1>

          <p className="hero-subheading">
            Discover dependable bus operators, select your window or aisle seat in real time, and enjoy zero double-booking integrity with fair, transparent cancellation policies.
          </p>

          {/* Integrated Search Box */}
          <div className="hero-search-box">
            <form onSubmit={handleSearchSubmit} className="search-form-grid">
              <div className="form-group">
                <label className="form-label dark" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} style={{ color: 'var(--primary)' }} /> ORIGIN CITY
                </label>
                <input
                  type="text"
                  list="cities-list-home"
                  className="form-input"
                  placeholder="e.g. New York"
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label dark" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Compass size={14} style={{ color: 'var(--primary)' }} /> DESTINATION
                </label>
                <input
                  type="text"
                  list="cities-list-home"
                  className="form-input"
                  placeholder="e.g. Boston"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label dark" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} style={{ color: 'var(--primary)' }} /> TRAVEL DATE
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ height: 44, fontWeight: 700 }}>
                <Search size={18} /> Find Buses
              </button>
            </form>

            <datalist id="cities-list-home">
              {cities.map(c => <option key={c} value={c} />)}
            </datalist>

            {/* Quick Route Pills */}
            <div className="popular-routes-pills">
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Popular Journeys:
              </span>
              <button
                type="button"
                onClick={() => handleQuickRoute('New York', 'Boston')}
                className="route-pill"
              >
                New York → Boston
              </button>
              <button
                type="button"
                onClick={() => handleQuickRoute('New York', 'Washington DC')}
                className="route-pill"
              >
                New York → Washington DC
              </button>
              <button
                type="button"
                onClick={() => handleQuickRoute('Philadelphia', 'New York')}
                className="route-pill"
              >
                Philadelphia → New York
              </button>
              <button
                type="button"
                onClick={() => { setOrigin(''); setDestination(''); fetchFeaturedTrips('', '', ''); }}
                className="route-pill"
                style={{ background: '#f1f5f9', color: 'var(--text-main)' }}
              >
                Show All Trips
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="features-grid-section">
        <div className="feature-card">
          <div className="feature-icon-box" style={{ background: '#ecfdf5', color: '#047857' }}>
            <Zap size={22} />
          </div>
          <h3 className="feature-title">Live 2D Seat Selection</h3>
          <p className="feature-desc">
            Visual bus layout showing window, aisle, and sleeper berths with instant real-time availability.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box" style={{ background: '#f0fdfa', color: '#0f766e' }}>
            <ShieldCheck size={22} />
          </div>
          <h3 className="feature-title">Guaranteed Seat Integrity</h3>
          <p className="feature-desc">
            Multi-layered ACID database transactions and unique constraints eliminate double-booking risks.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <RotateCcw size={22} />
          </div>
          <h3 className="feature-title">Fair & Dynamic Refunds</h3>
          <p className="feature-desc">
            Transparent cancellation policies with automatic refund calculations based on time before departure.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box" style={{ background: '#f8fafc', color: '#334155' }}>
            <Users size={22} />
          </div>
          <h3 className="feature-title">Verified Manifests & Staff Portal</h3>
          <p className="feature-desc">
            Comprehensive passenger manifests, occupancy tracking, and scheduled fleet management for operators.
          </p>
        </div>
      </section>

      {/* Trips Section */}
      <section id="trips-section" style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Scheduled Departures & Available Seats
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {origin && destination ? `Showing departures for ${origin} → ${destination}` : 'Browse all upcoming routes and real-time seat inventories'}
            </p>
          </div>

          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
            {trips.length} Services Found
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            Loading available journeys...
          </div>
        ) : trips.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <Bus size={42} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No matching trips scheduled</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
              Try searching another city pair or clear the date filter.
            </p>
            <button
              onClick={() => { setOrigin(''); setDestination(''); fetchFeaturedTrips('', '', ''); }}
              className="btn btn-primary btn-sm"
              style={{ marginTop: 14 }}
            >
              Reset Search Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {trips.map(trip => {
              const avail = Number(trip.available_seats);
              const availClass = avail > 10 ? 'green' : (avail > 0 ? 'orange' : 'red');

              return (
                <div key={trip.trip_id} className="trip-card">
                  <div className="trip-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="operator-avatar">
                        <Bus size={20} />
                      </div>
                      <div>
                        <div className="trip-operator-name">{trip.operator_name}</div>
                        <div className="trip-bus-type">
                          {trip.bus_type} • Fleet #{trip.bus_number}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ${trip.base_fare}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>per passenger</div>
                    </div>
                  </div>

                  {/* Journey Departure / Arrival Display */}
                  <div className="trip-route-display">
                    <div>
                      <div className="trip-time">
                        {new Date(trip.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="trip-city">{trip.source_city}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(trip.departure_time).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div className="trip-duration-pill">
                        <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {Math.floor(trip.estimated_duration_mins / 60)}h {trip.estimated_duration_mins % 60}m
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                        {trip.distance_km} km direct
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="trip-time">
                        {new Date(trip.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="trip-city">{trip.destination_city}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(trip.arrival_time).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
                      </div>
                    </div>
                  </div>

                  {/* Amenities & Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                    <div>
                      {trip.amenities?.map((amenity, i) => (
                        <span key={i} className="amenity-tag">✓ {amenity}</span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div className={`seats-badge ${availClass}`}>
                        ● {avail > 0 ? `${avail} seats remaining` : 'Sold out'}
                      </div>

                      <button
                        disabled={avail === 0}
                        onClick={() => setSelectedTrip(trip)}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '8px 16px', borderRadius: 8 }}
                      >
                        Select Seats <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* How It Works 3-Step Journey */}
      <section className="how-it-works-section">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Simple Booking Process
          </span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4 }}>How It Works in 3 Easy Steps</h2>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h4 style={{ fontWeight: 700, marginBottom: 6 }}>Search Your Journey</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Choose your origin, destination, and travel date to browse live schedules and pricing.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <h4 style={{ fontWeight: 700, marginBottom: 6 }}>Select Your Seat</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Inspect the interactive 2D cabin map and pick your favorite window, aisle, or sleeper berth.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <h4 style={{ fontWeight: 700, marginBottom: 6 }}>Instant E-Ticket & PNR</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Confirm your booking with atomic locking and instantly download or print your official boarding pass.
            </p>
          </div>
        </div>
      </section>

      {/* Seat Selector Modal */}
      {selectedTrip && (
        <SeatSelectorModal
          trip={selectedTrip}
          isOpen={!!selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onBookingSuccess={(booking) => {
            onBookingSuccess(booking);
            fetchFeaturedTrips(origin, destination, date);
          }}
          openLoginModal={openLoginModal}
        />
      )}
    </div>
  );
}
