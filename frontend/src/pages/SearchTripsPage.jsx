import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, Calendar, MapPin, Bus, Clock, ShieldCheck, ArrowRight, Check } from 'lucide-react';
import SeatSelectorModal from '../components/SeatSelectorModal';
import RouteJourneyAnimation from '../components/RouteJourneyAnimation';

export default function SearchTripsPage({ onBookingSuccess, openLoginModal }) {
  const [cities, setCities] = useState([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  useEffect(() => {
    loadCities();
    // Pre-populate with tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setDate(dateStr);

    // Initial search
    performSearch('', '', '');
  }, []);

  async function loadCities() {
    try {
      const res = await api.getCities();
      if (res.success) {
        setCities(res.cities);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function performSearch(fromCity, toCity, travelDate) {
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.searchTrips(fromCity, toCity, travelDate);
      if (res.success) {
        setTrips(res.trips);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    performSearch(origin, destination, date);
  }

  function handleQuickRoute(from, to) {
    setOrigin(from);
    setDestination(to);
    performSearch(from, to, date);
  }

  return (
    <div>
      {/* Search Hero Card */}
      <div className="search-card">
        <h1 className="search-title">Book Intercity Bus Tickets</h1>
        <p className="search-subtitle">
          Real-time seat selection, instant PNR confirmation, and fair cancellation policies
        </p>

        <form onSubmit={handleSearchSubmit} className="search-form-grid">
          <div className="form-group">
            <label className="form-label">ORIGIN CITY</label>
            <input
              type="text"
              list="cities-list"
              className="form-input"
              placeholder="e.g. New York"
              value={origin}
              onChange={e => setOrigin(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">DESTINATION CITY</label>
            <input
              type="text"
              list="cities-list"
              className="form-input"
              placeholder="e.g. Boston"
              value={destination}
              onChange={e => setDestination(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">TRAVEL DATE</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-success" style={{ height: 42 }}>
            <Search size={18} /> Search
          </button>
        </form>

        <datalist id="cities-list">
          {cities.map(c => <option key={c} value={c} />)}
        </datalist>

        {/* Popular Quick Route Chips */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.82rem' }}>
          <span style={{ color: '#bfdbfe', fontWeight: 600 }}>Popular Routes:</span>
          <button
            type="button"
            onClick={() => handleQuickRoute('New York', 'Boston')}
            className="btn btn-outline btn-sm"
            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', padding: '2px 10px' }}
          >
            New York → Boston
          </button>
          <button
            type="button"
            onClick={() => handleQuickRoute('New York', 'Washington DC')}
            className="btn btn-outline btn-sm"
            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', padding: '2px 10px' }}
          >
            New York → Washington DC
          </button>
          <button
            type="button"
            onClick={() => handleQuickRoute('Philadelphia', 'New York')}
            className="btn btn-outline btn-sm"
            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', padding: '2px 10px' }}
          >
            Philadelphia → New York
          </button>
          <button
            type="button"
            onClick={() => { setOrigin(''); setDestination(''); performSearch('', '', ''); }}
            className="btn btn-outline btn-sm"
            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', padding: '2px 10px' }}
          >
            Show All Available
          </button>
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Available Departures
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Found {trips.length} scheduled services {origin && destination ? `between ${origin} and ${destination}` : ''}
          </span>
        </div>
      </div>

      {/* Results List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          Searching live schedules & seat inventories...
        </div>
      ) : trips.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Bus size={40} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No matching trips found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Try searching without a date filter or check another city pair.
          </p>
          <button
            onClick={() => { setOrigin(''); setDestination(''); performSearch('', '', ''); }}
            className="btn btn-primary btn-sm"
            style={{ marginTop: 14 }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        trips.map(trip => {
          const avail = Number(trip.available_seats);
          const availClass = avail > 10 ? 'green' : (avail > 0 ? 'orange' : 'red');

          return (
            <div key={trip.trip_id} className="trip-card">
              <div className="trip-header">
                <div>
                  <div className="trip-operator-name">{trip.operator_name}</div>
                  <div className="trip-bus-type">
                    {trip.bus_type} • Bus #{trip.bus_number}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    ${trip.base_fare}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>per seat</div>
                </div>
              </div>

              {/* Origin, Time, Duration & Destination */}
              <div className="trip-route-display">
                <div>
                  <div className="trip-time">
                    {new Date(trip.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="trip-city">{trip.source_city}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(trip.departure_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                {/* Animated Bus Transit Line: Bus drives left-to-right, then displays duration & distance */}
                <div style={{ textAlign: 'center', width: '100%', minWidth: 160, maxWidth: 260 }}>
                  <RouteJourneyAnimation
                    durationMins={trip.estimated_duration_mins}
                    distanceKm={trip.distance_km}
                  />
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="trip-time">
                    {new Date(trip.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="trip-city">{trip.destination_city}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(trip.arrival_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Stops Preview & Amenities */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                <div>
                  {trip.amenities?.map((amenity, i) => (
                    <span key={i} className="amenity-tag">✓ {amenity}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className={`seats-badge ${availClass}`}>
                    {avail > 0 ? `${avail} seats remaining` : 'Sold out'}
                  </div>

                  <button
                    disabled={avail === 0}
                    onClick={() => setSelectedTrip(trip)}
                    className="btn btn-primary btn-sm"
                  >
                    Select Seats <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Seat Picker & Booking Modal */}
      {selectedTrip && (
        <SeatSelectorModal
          trip={selectedTrip}
          isOpen={!!selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onBookingSuccess={(booking) => {
            onBookingSuccess(booking);
            // Refresh trip inventory after booking
            performSearch(origin, destination, date);
          }}
          openLoginModal={openLoginModal}
        />
      )}
    </div>
  );
}
