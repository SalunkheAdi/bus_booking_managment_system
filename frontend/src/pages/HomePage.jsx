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
  Clock,
  Wifi,
  Coffee,
  Check
} from 'lucide-react';
import SeatSelectorModal from '../components/SeatSelectorModal';
import RouteJourneyAnimation from '../components/RouteJourneyAnimation';

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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
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
      {/* Natural Hero Section with Real Luxury Bus Image */}
      <section className="natural-hero">
        <div className="hero-content" style={{ maxWidth: 1140 }}>
          <div className="hero-two-column">
            {/* Left Column: Heading, Subheading & Form */}
            <div style={{ textAlign: 'left' }}>
              <div className="hero-badge">
                <Sparkles size={14} style={{ color: '#f59e0b' }} />
                <span>Verified Intercity Luxury Coach Fleet</span>
              </div>

              <h1 className="hero-heading" style={{ fontSize: '2.4rem', textAlign: 'left' }}>
                Travel Safely, <br />
                <span className="hero-accent">Book Seats with Cutaway View</span>
              </h1>

              <p className="hero-subheading" style={{ textAlign: 'left', margin: '0 0 20px 0', fontSize: '0.98rem' }}>
                Real-time 2D visual bus cabin cutaways, zero double-booking concurrency guarantees, and instant electronic PNR boarding tickets.
              </p>

              {/* Quick Route Pills */}
              <div className="popular-routes-pills" style={{ marginTop: 0, marginBottom: 12 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ccfbf1' }}>
                  Popular Journeys:
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickRoute('New York', 'Boston')}
                  className="route-pill"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.25)' }}
                >
                  New York → Boston
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRoute('New York', 'Washington DC')}
                  className="route-pill"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.25)' }}
                >
                  New York → Washington DC
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRoute('Philadelphia', 'New York')}
                  className="route-pill"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.25)' }}
                >
                  Philadelphia → New York
                </button>
              </div>
            </div>

            {/* Right Column: Real Luxury Coach Photo */}
            <div className="hero-bus-image-wrapper">
              <img
                src="/images/luxury-bus-hero.jpg"
                alt="Luxury Intercity Bus"
                className="hero-bus-img"
              />
              <div className="hero-floating-tag">
                <ShieldCheck size={14} /> 100% Verified Fleet
              </div>
              <div className="hero-bus-overlay-badge">
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Luxury Air-Conditioned Coach</div>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>High-Speed WiFi • USB Charging • Reclining Seats</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>From</div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#38bdf8' }}>$34.00</div>
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Search Box */}
          <div className="hero-search-box" style={{ marginTop: 24 }}>
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
                <Search size={18} /> Find Departures
              </button>
            </form>

            <datalist id="cities-list-home">
              {cities.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="features-grid-section">
        <div className="feature-card">
          <div className="feature-icon-box" style={{ background: '#ecfdf5', color: '#047857' }}>
            <Zap size={22} />
          </div>
          <h3 className="feature-title">Bus Cutaway Seat Animation</h3>
          <p className="feature-desc">
            Click any trip to see the exterior bus body slice open into an internal cabin floorplan with real-time seat availability.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box" style={{ background: '#f0fdfa', color: '#0f766e' }}>
            <ShieldCheck size={22} />
          </div>
          <h3 className="feature-title">Guaranteed Seat Integrity</h3>
          <p className="feature-desc">
            Atomic database locks and unique constraints prevent duplicate tickets even under simultaneous customer requests.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <RotateCcw size={22} />
          </div>
          <h3 className="feature-title">Fair & Dynamic Refunds</h3>
          <p className="feature-desc">
            Configurable cancellation policy tiers with instant simulated refunds based on exact time remaining before departure.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box" style={{ background: '#f8fafc', color: '#334155' }}>
            <Users size={22} />
          </div>
          <h3 className="feature-title">Verified Operator Portals</h3>
          <p className="feature-desc">
            Staff manifests, route occupancy tracking, and real-time reconciliation for bus operators and ticket conductors.
          </p>
        </div>
      </section>

      {/* Trips Section */}
      <section id="trips-section" style={{ marginTop: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Scheduled Departures & Available Seats
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {origin && destination ? `Showing services for ${origin} → ${destination}` : 'Click "Select Seats" to view the animated cabin cutaway'}
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

                    {/* Animated Journey Track: Bus drives across, then reveals duration & distance */}
                    <div style={{ textAlign: 'center', width: '100%', minWidth: 160, maxWidth: 260 }}>
                      <RouteJourneyAnimation
                        durationMins={trip.estimated_duration_mins}
                        distanceKm={trip.distance_km}
                        delay={0}
                      />
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
                        style={{ padding: '8px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <span>Select Seats</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Seat Selector Modal with Animated Cutaway */}
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
