import React, { useState } from 'react';
import { api } from '../services/api';
import { Search, Ticket, AlertCircle } from 'lucide-react';
import ETicketModal from '../components/ETicketModal';

export default function PnrLookupPage() {
  const [pnrInput, setPnrInput] = useState('');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    if (!pnrInput.trim()) return;

    setLoading(true);
    setError('');
    setTicket(null);

    try {
      const res = await api.getBookingByPnr(pnrInput.trim());
      if (res.success) {
        setTicket(res.booking);
      }
    } catch (err) {
      setError(err.message || 'PNR not found or invalid');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Lookup E-Ticket by PNR</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: 4 }}>
          Enter your unique Passenger Name Record (PNR) code to view your boarding pass, seat allocation, and live status.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 540, margin: '0 auto 28px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            required
            className="form-input"
            placeholder="Enter PNR e.g. ROY-NYC-88210"
            value={pnrInput}
            onChange={e => setPnrInput(e.target.value.toUpperCase())}
            style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}
          />
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            <Search size={16} /> {loading ? 'Searching...' : 'Find Ticket'}
          </button>
        </form>

        <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>💡 Try seeded demo PNR:</span>
          <button
            type="button"
            onClick={() => setPnrInput('ROY-NYC-88210')}
            className="btn btn-outline btn-sm"
            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
          >
            ROY-NYC-88210
          </button>
        </div>
      </div>

      {error && (
        <div style={{ maxWidth: 540, margin: '0 auto 20px', padding: 14, background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {ticket && (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)' }}>
              ✓ Ticket Verified & Located
            </span>
          </div>
          <ETicketModal
            booking={ticket}
            isOpen={true}
            onClose={() => setTicket(null)}
          />
        </div>
      )}
    </div>
  );
}
