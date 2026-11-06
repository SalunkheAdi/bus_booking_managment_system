import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Check, AlertCircle, User, ShieldCheck, Sparkles, Scissors, Eye, RotateCw } from 'lucide-react';

export default function SeatSelectorModal({ trip, isOpen, onClose, onBookingSuccess, openLoginModal }) {
  const { user } = useAuth();
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Slicing / Cutaway animation state
  const [isCutaway, setIsCutaway] = useState(false);
  const [animatingSlice, setAnimatingSlice] = useState(false);

  // Form state
  const [boardingStopId, setBoardingStopId] = useState('');
  const [dropStopId, setDropStopId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [passengerDetails, setPassengerDetails] = useState({});

  useEffect(() => {
    if (isOpen && trip) {
      loadSeats();
      setSelectedSeats([]);
      setError('');
      setIsCutaway(false);
      setAnimatingSlice(true);

      // Trigger the dramatic bus slicing cutaway animation after 300ms
      const timer = setTimeout(() => {
        setIsCutaway(true);
        setAnimatingSlice(false);
      }, 500);

      if (user) {
        setContactName(user.name || '');
        setContactEmail(user.email || '');
        setContactPhone(user.phone || '');
      }
      if (trip.boarding_points && trip.boarding_points.length > 0) {
        setBoardingStopId(trip.boarding_points[0].id);
      }
      if (trip.drop_points && trip.drop_points.length > 0) {
        setDropStopId(trip.drop_points[0].id);
      }

      return () => clearTimeout(timer);
    }
  }, [isOpen, trip, user]);

  async function loadSeats() {
    setLoading(true);
    try {
      const res = await api.getTripSeats(trip.trip_id);
      if (res.success) {
        setSeats(res.seats);
      }
    } catch (err) {
      setError(err.message || 'Failed to load seat layout');
    } finally {
      setLoading(false);
    }
  }

  function replayCutawayAnimation() {
    setIsCutaway(false);
    setAnimatingSlice(true);
    setTimeout(() => {
      setIsCutaway(true);
      setAnimatingSlice(false);
    }, 450);
  }

  function toggleSeat(seatNumber, status) {
    if (status === 'BOOKED') return;

    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(prev => prev.filter(s => s !== seatNumber));
      setPassengerDetails(prev => {
        const copy = { ...prev };
        delete copy[seatNumber];
        return copy;
      });
    } else {
      if (selectedSeats.length >= 6) {
        setError('Maximum 6 seats can be selected per booking');
        return;
      }
      setSelectedSeats(prev => [...prev, seatNumber]);
      setPassengerDetails(prev => ({
        ...prev,
        [seatNumber]: {
          passengerName: user?.name && selectedSeats.length === 0 ? user.name : '',
          age: '',
          gender: 'MALE'
        }
      }));
      setError('');
    }
  }

  function handlePassengerChange(seatNum, field, value) {
    setPassengerDetails(prev => ({
      ...prev,
      [seatNum]: {
        ...(prev[seatNum] || {}),
        [field]: value
      }
    }));
  }

  async function handleConfirmBooking(e) {
    e.preventDefault();
    if (!user) {
      openLoginModal();
      return;
    }

    if (selectedSeats.length === 0) {
      setError('Please select at least one seat to book');
      return;
    }

    for (const seatNum of selectedSeats) {
      const p = passengerDetails[seatNum];
      if (!p || !p.passengerName || !p.passengerName.trim()) {
        setError(`Please enter the passenger name for seat ${seatNum}`);
        return;
      }
      if (!p.age || Number(p.age) <= 0 || Number(p.age) > 120) {
        setError(`Please enter a valid age for passenger in seat ${seatNum}`);
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const passengersPayload = selectedSeats.map(seatNum => ({
        seatNumber: seatNum,
        passengerName: passengerDetails[seatNum].passengerName.trim(),
        age: Number(passengerDetails[seatNum].age),
        gender: passengerDetails[seatNum].gender || 'MALE'
      }));

      const res = await api.createBooking({
        tripId: trip.trip_id,
        boardingStopId: boardingStopId ? Number(boardingStopId) : null,
        dropStopId: dropStopId ? Number(dropStopId) : null,
        contactName,
        contactEmail,
        contactPhone,
        passengers: passengersPayload
      });

      if (res.success) {
        onBookingSuccess(res.booking);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Booking failed');
      if (err.message.includes('already booked')) {
        loadSeats();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen || !trip) return null;

  const totalFare = Math.round(selectedSeats.length * Number(trip.base_fare) * 100) / 100;

  // Group seats by row
  const rowsMap = {};
  seats.forEach(s => {
    const r = s.row_num || 1;
    if (!rowsMap[r]) rowsMap[r] = [];
    rowsMap[r].push(s);
  });
  const rowNumbers = Object.keys(rowsMap).map(Number).sort((a, b) => a - b);

  return (
    <div className="seat-picker-modal">
      <div className="seat-picker-content">
        <div className="seat-picker-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Cabin Cutaway & Seat Selection</h3>
              <span className="badge-role customer" style={{ fontSize: '0.7rem' }}>
                X-Ray Cutaway
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {trip.operator_name} • Fleet #{trip.bus_number} • {trip.source_city} → {trip.destination_city} (${trip.base_fare}/seat)
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={replayCutawayAnimation}
              className="btn btn-outline btn-sm"
              title="Replay Bus Cutting Animation"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <RotateCw size={13} /> Replay Cutaway
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={22} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ margin: '16px 24px 0', padding: '12px 16px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading cabin floorplan...
          </div>
        ) : (
          <form onSubmit={handleConfirmBooking} className="seat-layout-grid-wrap">
            {/* Cutaway Animated Bus Chassis */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Cutaway Status Pill */}
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, background: 'var(--primary-light)', padding: '3px 10px', borderRadius: 9999 }}>
                <Scissors size={12} />
                <span>{isCutaway ? 'Roof Peeled Open — Cabin Interior Exposed' : 'Exterior Slicing In Progress...'}</span>
              </div>

              <div className={`cutaway-container ${isCutaway ? 'cutaway-active' : ''}`}>
                {/* Slicing Laser Sweep Line */}
                {animatingSlice && <div className="slicing-laser" />}

                {/* Splitting Exterior Body Shell Overlay */}
                <div className="exterior-shell-overlay">
                  <div className="shell-half-left">
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#38bdf8' }}>ROOF SHELL [L]</div>
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.8 }}>🚌 EXTERIOR</div>
                    <div style={{ fontSize: '0.65rem' }}>{trip.operator_name}</div>
                  </div>
                  <div className="shell-half-right">
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#38bdf8', textAlign: 'right' }}>ROOF SHELL [R]</div>
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.8 }}>AIR-CON UNIT</div>
                    <div style={{ fontSize: '0.65rem', textAlign: 'right' }}>FLEET #{trip.bus_number}</div>
                  </div>
                </div>

                {/* Interior Cabin Under Cutaway */}
                <div className="cabin-interior">
                  {/* Driver Cockpit */}
                  <div className="bus-cockpit-cutaway">
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>
                      FRONT CABIN / ENTRY
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                      <span>DRIVER</span>
                      <span style={{ fontSize: '1.1rem' }}>🛞</span>
                    </div>
                  </div>

                  {/* Seat Matrix with animated stagger */}
                  <div className="bus-seat-grid-2x2">
                    {rowNumbers.map(rNum => {
                      const rowSeats = rowsMap[rNum] || [];
                      const seatA = rowSeats.find(s => s.col_num === 1);
                      const seatB = rowSeats.find(s => s.col_num === 2);
                      const seatC = rowSeats.find(s => s.col_num === 3);
                      const seatD = rowSeats.find(s => s.col_num === 4);

                      return (
                        <div key={rNum} className="bus-seat-row">
                          {/* Left Seats (A, B) */}
                          {seatA ? (
                            <button
                              type="button"
                              onClick={() => toggleSeat(seatA.seat_number, seatA.status)}
                              className={`seat-btn ${seatA.status === 'BOOKED' ? 'booked' : ''} ${selectedSeats.includes(seatA.seat_number) ? 'selected' : ''}`}
                              title={`Seat ${seatA.seat_number} (${seatA.status})`}
                            >
                              {seatA.seat_number}
                            </button>
                          ) : <div />}

                          {seatB ? (
                            <button
                              type="button"
                              onClick={() => toggleSeat(seatB.seat_number, seatB.status)}
                              className={`seat-btn ${seatB.status === 'BOOKED' ? 'booked' : ''} ${selectedSeats.includes(seatB.seat_number) ? 'selected' : ''}`}
                              title={`Seat ${seatB.seat_number} (${seatB.status})`}
                            >
                              {seatB.seat_number}
                            </button>
                          ) : <div />}

                          {/* Center Aisle */}
                          <div className="aisle-gap">
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>|</span>
                          </div>

                          {/* Right Seats (C, D) */}
                          {seatC ? (
                            <button
                              type="button"
                              onClick={() => toggleSeat(seatC.seat_number, seatC.status)}
                              className={`seat-btn ${seatC.status === 'BOOKED' ? 'booked' : ''} ${selectedSeats.includes(seatC.seat_number) ? 'selected' : ''}`}
                              title={`Seat ${seatC.seat_number} (${seatC.status})`}
                            >
                              {seatC.seat_number}
                            </button>
                          ) : <div />}

                          {seatD ? (
                            <button
                              type="button"
                              onClick={() => toggleSeat(seatD.seat_number, seatD.status)}
                              className={`seat-btn ${seatD.status === 'BOOKED' ? 'booked' : ''} ${selectedSeats.includes(seatD.seat_number) ? 'selected' : ''}`}
                              title={`Seat ${seatD.seat_number} (${seatD.status})`}
                            >
                              {seatD.seat_number}
                            </button>
                          ) : <div />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Seat Legend */}
              <div className="seat-legend">
                <div className="legend-item">
                  <div className="legend-box available" />
                  <span>Available</span>
                </div>
                <div className="legend-item">
                  <div className="legend-box selected" />
                  <span>Selected</span>
                </div>
                <div className="legend-item">
                  <div className="legend-box booked" />
                  <span>Booked</span>
                </div>
              </div>
            </div>

            {/* Booking Sidebar Form */}
            <div className="booking-sidebar">
              {/* Fare Summary Box */}
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, letterSpacing: 0.5 }}>
                    SELECTED SEATS
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#065f46' }}>
                    {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None selected'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, letterSpacing: 0.5 }}>
                    TOTAL AMOUNT
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#065f46' }}>
                    ${totalFare}
                  </div>
                </div>
              </div>

              {/* Boarding and Drop Points */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label dark">Boarding Stop</label>
                  <select
                    className="form-select"
                    value={boardingStopId}
                    onChange={e => setBoardingStopId(e.target.value)}
                  >
                    {trip.boarding_points?.map(stop => (
                      <option key={stop.id} value={stop.id}>
                        {stop.stop_name} ({stop.time_offset_mins}m)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label dark">Dropping Stop</label>
                  <select
                    className="form-select"
                    value={dropStopId}
                    onChange={e => setDropStopId(e.target.value)}
                  >
                    {trip.drop_points?.map(stop => (
                      <option key={stop.id} value={stop.id}>
                        {stop.stop_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div style={{ background: '#fbfbf9', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-main)', letterSpacing: 0.5 }}>
                  CONTACT DETAILS (TICKET DELIVERY)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Contact Name"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                  />
                  <input
                    type="tel"
                    required
                    className="form-input"
                    placeholder="Phone Number"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                  />
                </div>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="Email Address"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                />
              </div>

              {/* Passenger Inputs for each selected seat */}
              {selectedSeats.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-main)', letterSpacing: 0.5 }}>
                    PASSENGER INFORMATION ({selectedSeats.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                    {selectedSeats.map((seatNum, idx) => (
                      <div key={seatNum} className="passenger-entry-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--primary)' }}>
                            Passenger {idx + 1} (Seat {seatNum})
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 6 }}>
                          <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="Full Name"
                            value={passengerDetails[seatNum]?.passengerName || ''}
                            onChange={e => handlePassengerChange(seatNum, 'passengerName', e.target.value)}
                          />
                          <input
                            type="number"
                            required
                            min="1"
                            max="120"
                            className="form-input"
                            placeholder="Age"
                            value={passengerDetails[seatNum]?.age || ''}
                            onChange={e => handlePassengerChange(seatNum, 'age', e.target.value)}
                          />
                          <select
                            className="form-select"
                            value={passengerDetails[seatNum]?.gender || 'MALE'}
                            onChange={e => handlePassengerChange(seatNum, 'gender', e.target.value)}
                          >
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {user ? (
                <button
                  type="submit"
                  disabled={submitting || selectedSeats.length === 0}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 'auto', padding: '13px', borderRadius: 10, fontWeight: 700 }}
                >
                  <ShieldCheck size={18} />
                  {submitting ? 'Confirming with Atomic Lock...' : `Confirm & Pay $${totalFare}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 'auto', padding: '13px', borderRadius: 10, fontWeight: 700 }}
                >
                  <User size={18} /> Sign In to Book Seats
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
