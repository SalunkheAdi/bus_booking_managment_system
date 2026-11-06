import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Ticket, Calendar, Clock, AlertCircle, Printer, XCircle } from 'lucide-react';
import ETicketModal from '../components/ETicketModal';
import CancelModal from '../components/CancelModal';

export default function MyBookingsPage({ onOpenTicket }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketToView, setTicketToView] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const res = await api.getMyBookings();
      if (res.success) {
        setBookings(res.bookings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleViewTicket(pnr) {
    try {
      const res = await api.getBookingByPnr(pnr);
      if (res.success) {
        setTicketToView(res.booking);
      }
    } catch (err) {
      alert('Failed to load ticket details: ' + err.message);
    }
  }

  function handleCancelledSuccess(cancellation) {
    alert(`Booking ${cancellation.pnr} has been cancelled!\nRefund of $${cancellation.refundAmount} (${cancellation.refundPercentage}%) issued.\nRefund Reference: ${cancellation.refundReference}`);
    loadBookings();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>My Bookings & Travel History</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage your bus tickets, view boarding passes, or process cancellations with automated refunds
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading your travel bookings...
        </div>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Ticket size={40} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No bookings found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            You haven't booked any bus trips yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {bookings.map(booking => {
            const isConfirmed = booking.status === 'CONFIRMED';
            const depDate = new Date(booking.departure_time);

            return (
              <div key={booking.id} className="card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                        PNR: {booking.pnr}
                      </span>
                      <span className={`status-badge ${booking.status}`}>
                        {isConfirmed ? '✓ CONFIRMED' : '✕ CANCELLED'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: 4 }}>
                      {booking.source_city} → {booking.destination_city}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {booking.operator_name} • {booking.bus_type}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>${booking.total_amount}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {booking.total_passengers} Passenger(s) • Seats: {booking.passengers?.map(p => p.seat_number).join(', ')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: 14 }}>
                    <span>📅 Departs: {depDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {depDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleViewTicket(booking.pnr)}
                      className="btn btn-outline btn-sm"
                    >
                      <Ticket size={14} /> View Boarding Ticket
                    </button>

                    {isConfirmed && (
                      <button
                        onClick={() => setBookingToCancel(booking.id)}
                        className="btn btn-danger btn-sm"
                      >
                        <XCircle size={14} /> Cancel Ticket
                      </button>
                    )}
                  </div>
                </div>

                {booking.status === 'CANCELLED' && booking.refund_amount !== null && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 6, fontSize: '0.8rem', color: 'var(--danger)' }}>
                    Refund Processed: <strong>${booking.refund_amount}</strong> (Fee retained: ${booking.cancellation_fee})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Modal */}
      {ticketToView && (
        <ETicketModal
          booking={ticketToView}
          isOpen={!!ticketToView}
          onClose={() => setTicketToView(null)}
        />
      )}

      {/* Cancel Modal */}
      {bookingToCancel && (
        <CancelModal
          bookingId={bookingToCancel}
          isOpen={!!bookingToCancel}
          onClose={() => setBookingToCancel(null)}
          onCancelled={handleCancelledSuccess}
        />
      )}
    </div>
  );
}
