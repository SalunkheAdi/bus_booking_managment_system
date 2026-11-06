import React from 'react';
import { X, Printer, CheckCircle, AlertTriangle, Bus, MapPin, Calendar, Clock, DollarSign } from 'lucide-react';

export default function ETicketModal({ booking, isOpen, onClose }) {
  if (!isOpen || !booking) return null;

  return (
    <div className="seat-picker-modal">
      <div className="seat-picker-content" style={{ maxWidth: 680 }}>
        <div className="seat-picker-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bus className="text-primary" size={24} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Electronic Boarding Ticket</h3>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => window.print()}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Printer size={15} /> Print Ticket
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={22} />
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <div className="ticket-card">
            {/* Header / PNR Banner */}
            <div className="ticket-pnr-banner">
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1 }}>
                  BOOKING REFERENCE (PNR)
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: 1 }}>
                  {booking.pnr}
                </div>
              </div>
              <div>
                <span className={`status-badge ${booking.status}`}>
                  {booking.status === 'CONFIRMED' ? '✓ CONFIRMED' : '✕ CANCELLED'}
                </span>
              </div>
            </div>

            {/* Operator and Journey Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{booking.operator_name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {booking.bus_type} • Bus #{booking.bus_number}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <div>Booked on: {new Date(booking.created_at || Date.now()).toLocaleDateString()}</div>
                <div>Contact: {booking.contact_phone}</div>
              </div>
            </div>

            {/* Departure / Arrival Journey Details */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 18, border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>DEPARTURE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{booking.source_city}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                    {new Date(booking.departure_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  {booking.boarding_stop_name && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      📍 {booking.boarding_stop_name} {booking.boarding_landmark ? `(${booking.boarding_landmark})` : ''}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                  →
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ARRIVAL</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{booking.destination_city}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                    {new Date(booking.arrival_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  {booking.drop_stop_name && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      📍 {booking.drop_stop_name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Passenger Manifest Table */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                PASSENGERS & SEAT ASSIGNMENTS
              </div>
              <table className="data-table" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>Seat</th>
                    <th>Passenger Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th style={{ textAlign: 'right' }}>Fare</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.passengers?.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.seat_number}</td>
                      <td style={{ fontWeight: 600 }}>{p.passenger_name}</td>
                      <td>{p.age} yrs</td>
                      <td>{p.gender}</td>
                      <td style={{ textAlign: 'right' }}>${p.fare || (booking.total_amount / booking.passengers.length).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Fare & Refund status if cancelled */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #f1f5f9', paddingTop: 12 }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Passenger Count: </span>
                <span style={{ fontWeight: 700 }}>{booking.total_passengers}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Paid: </span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  ${booking.total_amount}
                </span>
              </div>
            </div>

            {booking.status === 'CANCELLED' && (
              <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontWeight: 700, fontSize: '0.88rem' }}>
                  <AlertTriangle size={16} /> Cancellation & Refund Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6, fontSize: '0.82rem' }}>
                  <div>Refund Amount: <strong style={{ color: 'var(--success)' }}>${booking.refund_amount}</strong></div>
                  <div>Cancellation Fee: <strong>${booking.cancellation_fee}</strong></div>
                  <div>Refund Reference: <code>{booking.refund_reference}</code></div>
                  <div>Status: <span style={{ color: 'var(--success)', fontWeight: 600 }}>Processed (Simulated)</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
