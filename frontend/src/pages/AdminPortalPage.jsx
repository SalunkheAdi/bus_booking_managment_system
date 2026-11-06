import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Shield, Settings, FileText, CheckCircle, Edit, Save, X } from 'lucide-react';

export default function AdminPortalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cancellation'); // 'cancellation', 'audit'
  const [rules, setRules] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  async function loadAdminData() {
    setLoading(true);
    try {
      if (activeTab === 'cancellation') {
        const res = await api.getCancellationRules();
        if (res.success) setRules(res.rules);
      } else if (activeTab === 'audit') {
        const res = await api.getAuditLogs();
        if (res.success) setAuditLogs(res.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateRule(e) {
    e.preventDefault();
    try {
      const res = await api.updateCancellationRule(editingRule.id, {
        ruleName: editingRule.rule_name,
        minHoursBefore: editingRule.min_hours_before,
        maxHoursBefore: editingRule.max_hours_before === '' ? null : editingRule.max_hours_before,
        refundPercentage: editingRule.refund_percentage,
        cancellationFeePercentage: 100 - Number(editingRule.refund_percentage)
      });
      if (res.success) {
        alert('Cancellation rule updated successfully!');
        setEditingRule(null);
        loadAdminData();
      }
    } catch (err) {
      alert('Failed to update rule: ' + err.message);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Platform Administration & Policies</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            System-wide configuration, configurable cancellation policies, and immutable business audit trails
          </p>
        </div>
      </div>

      <div className="portal-tabs">
        <button
          className={`tab-btn ${activeTab === 'cancellation' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancellation')}
        >
          <Settings size={15} style={{ display: 'inline', marginRight: 6 }} />
          Cancellation & Refund Policy Engine ({rules.length} Tiers)
        </button>

        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <FileText size={15} style={{ display: 'inline', marginRight: 6 }} />
          System Audit Trail Log ({auditLogs.length} Events)
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading administrative records...
        </div>
      ) : (
        <>
          {/* TAB 1: CANCELLATION RULES ENGINE */}
          {activeTab === 'cancellation' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Active Cancellation Rules</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Refund percentage is computed dynamically by calculating the time remaining until trip departure.
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Policy Tier Name</th>
                      <th>Time Window Before Departure</th>
                      <th>Refund %</th>
                      <th>Cancellation Fee %</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(rule => (
                      <tr key={rule.id}>
                        <td style={{ fontWeight: 700 }}>{rule.rule_name}</td>
                        <td>
                          {rule.max_hours_before !== null ? (
                            <span>{rule.min_hours_before} to {rule.max_hours_before} hours before departure</span>
                          ) : (
                            <span>More than {rule.min_hours_before} hours before departure</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                          {rule.refund_percentage}%
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>
                          {rule.cancellation_fee_percentage}%
                        </td>
                        <td>
                          <span className="status-badge CONFIRMED">ACTIVE</span>
                        </td>
                        <td>
                          <button
                            onClick={() => setEditingRule({ ...rule })}
                            className="btn btn-outline btn-sm"
                          >
                            <Edit size={13} /> Edit Tier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Immutable System Audit Trail</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Tracks all critical actions: bookings, cancellations, trip creation, and user auth.
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>User Account</th>
                      <th>Action Details / Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', padding: '3px 8px', borderRadius: 4, background: '#f1f5f9', color: 'var(--primary)' }}>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                            {log.entity_type} #{log.entity_id}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.user_name || 'System / Guest'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user_email || ''}</div>
                        </td>
                        <td style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* EDIT RULE MODAL */}
      {editingRule && (
        <div className="seat-picker-modal">
          <div className="seat-picker-content" style={{ maxWidth: 440 }}>
            <div className="seat-picker-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Edit Cancellation Tier</h3>
              <button onClick={() => setEditingRule(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleUpdateRule} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label dark">Tier Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editingRule.rule_name}
                  onChange={e => setEditingRule({ ...editingRule, rule_name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label dark">Min Hours Before</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={editingRule.min_hours_before}
                    onChange={e => setEditingRule({ ...editingRule, min_hours_before: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label dark">Max Hours (Empty if none)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editingRule.max_hours_before === null ? '' : editingRule.max_hours_before}
                    onChange={e => setEditingRule({ ...editingRule, max_hours_before: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label dark">Refund Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  className="form-input"
                  value={editingRule.refund_percentage}
                  onChange={e => setEditingRule({ ...editingRule, refund_percentage: e.target.value })}
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Cancellation fee will automatically adjust to {100 - Number(editingRule.refund_percentage)}%.
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
                Save Policy Rule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
