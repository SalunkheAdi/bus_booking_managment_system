import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Check, AlertCircle, User, ShieldCheck } from 'lucide-react';

export default function SeatSelectorModal({ trip, isOpen, onClose, onBookingSuccess, openLoginModal }) {
  const { user } = useAuth();
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

    // Validate passengers
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
      // If seat was taken by someone else, reload seat layout!
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Select Seats & Passenger Details</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {trip.operator_name} • {trip.bus_type} • {trip.source_city} → {trip.destination_city} (${trip.base_fare} / seat)
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {error && (
          <div style={{ margin: '16px 24px 0', padding: '12px 16px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading seat layout...
          </div>
        ) : (
          <form onSubmit={handleConfirmBooking} className="seat-layout-grid-wrap">
            {/* Visual Bus Seat Map */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="bus-chassis">
                {/* Cockpit / Steering wheel */}
                <div className="cockpit">
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>FRONT / DRIVER</span>
                    <span style={{ fontSize: '1.1rem' }}>🛞</span>
                  </div>
                </div>

                {/* Seat Matrix */}
                <div className="bus-seat-grid-2x2">
                  {rowNumbers.map(rNum => {
                    const rowSeats = rowsMap[rNum] || [];
                    const seatA = rowSeats.find(s => s.col_num === 1);
                    const seatB = rowSeats.find(s => s.col_num === 2);
                    const seatC = rowSeats.find(s => s.col_num === 3);
                    const seatD = rowSeats.find(s => s.col_num === 4);

                    return (
                      <div key={rNum} className="bus-seat-row">
                        {/* Left pair (A, B) */}
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

                        {/* Aisle */}
                        <div className="aisle-gap">|</div>

                        {/* Right pair (C, D) */}
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

            {/* Booking & Passenger Form Sidebar */}
            <div className="booking-sidebar">
              {/* Selected Seats Banner */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>SELECTED SEATS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#15803d' }}>
                    {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None selected'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>TOTAL FARE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d' }}>
                    ${totalFare}
                  </div>
                </div>
              </div>

              {/* Boarding and Drop Points */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label dark">Boarding Point</label>
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
                  <label className="form-label dark">Dropping Point</label>
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
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
                  CONTACT INFORMATION
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
                    placeholder="Contact Phone"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                  />
                </div>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="Ticket Email Address"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                />
              </div>

              {/* Passenger Inputs for each selected seat */}
              {selectedSeats.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
                    PASSENGER DETAILS ({selectedSeats.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                    {selectedSeats.map((seatNum, idx) => (
                      <div key={seatNum} className="passenger-entry-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary)' }}>
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

              {/* Submit / Login Button */}
              {user ? (
                <button
                  type="submit"
                  disabled={submitting || selectedSeats.length === 0}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 'auto', padding: '12px' }}
                >
                  <ShieldCheck size={18} />
                  {submitting ? 'Confirming with Atomic Lock...' : `Confirm & Pay $${totalFare}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 'auto', padding: '12px' }}
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
