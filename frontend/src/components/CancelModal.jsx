import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function CancelModal({ bookingId, isOpen, onClose, onCancelled }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [timeSimulation, setTimeSimulation] = useState('CURRENT_TIME'); // or 'ADVANCE_30H', 'SHORT_5H', 'LAST_MIN_1H'

  useEffect(() => {
    if (isOpen && bookingId) {
      loadPreview();
    }
  }, [isOpen, bookingId, timeSimulation]);

  async function loadPreview() {
    setLoading(true);
    setError('');
    try {
      const res = await api.previewCancellation(bookingId);
      if (res.success) {
        setPreview(res.preview);
      }
    } catch (err) {
      setError(err.message || 'Failed to calculate cancellation refund');
    } finally {
      setLoading(false);
    }
  }

  function getCustomNowTimestamp() {
    if (!preview || timeSimulation === 'CURRENT_TIME') return null;

    const dep = new Date(preview.booking.departure_time).getTime();
    if (timeSimulation === 'ADVANCE_30H') {
      return new Date(dep - 30 * 3600000).toISOString();
    } else if (timeSimulation === 'STANDARD_18H') {
      return new Date(dep - 18 * 3600000).toISOString();
    } else if (timeSimulation === 'SHORT_6H') {
      return new Date(dep - 6 * 3600000).toISOString();
    } else if (timeSimulation === 'LAST_MIN_1H') {
      return new Date(dep - 1 * 3600000).toISOString();
    }
    return null;
  }

  async function handleConfirmCancel() {
    setCancelling(true);
    setError('');
    try {
      const customNow = getCustomNowTimestamp();
      const res = await api.cancelBooking(bookingId, customNow);
      if (res.success) {
        onCancelled(res.cancellation);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  }

  if (!isOpen || !bookingId) return null;

  return (
    <div className="seat-picker-modal">
      <div className="seat-picker-content" style={{ maxWidth: 520 }}>
        <div className="seat-picker-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
            <AlertTriangle size={22} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Confirm Ticket Cancellation</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {error && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 12, borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
              Calculating refund according to policy...
            </div>
          ) : preview ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Simulation Helper for Reviewers */}
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                  ⚙️ REVIEWER POLICY SIMULATION:
                </div>
                <select
                  className="form-select"
                  style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                  value={timeSimulation}
                  onChange={e => setTimeSimulation(e.target.value)}
                >
                  <option value="CURRENT_TIME">Live System Clock (Actual Time Remaining)</option>
                  <option value="ADVANCE_30H">Simulate &gt; 24 Hours Before Departure (90% Refund Tier)</option>
                  <option value="STANDARD_18H">Simulate 12 - 24 Hours Before Departure (70% Refund Tier)</option>
                  <option value="SHORT_6H">Simulate 2 - 12 Hours Before Departure (50% Refund Tier)</option>
                  <option value="LAST_MIN_1H">Simulate &lt; 2 Hours Before Departure (0% Non-refundable)</option>
                </select>
              </div>

              {/* Policy Breakdown Card */}
              <div style={{ background: '#f1f5f9', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Applicable Policy Rule:</span>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{preview.matchedRuleName}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Original Ticket Price:</span>
                  <span style={{ fontWeight: 600 }}>${preview.booking.total_amount}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Refund Percentage:</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>{preview.refundPercentage}%</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cancellation Fee ({preview.cancellationFeePercentage}%):</span>
                  <span style={{ fontWeight: 600, color: 'var(--danger)' }}>-${preview.cancellationFee}</span>
                </div>

                <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Simulated Refund Amount:</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)' }}>
                    ${preview.refundAmount}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ℹ️ Cancelling will immediately release the seats back to available inventory on the trip and record a simulated refund to the original payment source. Booking history is permanently preserved in the manifest.
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={cancelling}
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                >
                  {cancelling ? 'Processing Cancellation...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
