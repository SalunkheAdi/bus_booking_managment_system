import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, Lock, Mail, Phone } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  const { login, register, demoAccounts, quickSwitch } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register({ name, email, password, phone, role });
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  }

  function handleDemoClick(account) {
    quickSwitch(account.email).then(() => onClose());
  }

  return (
    <div className="seat-picker-modal">
      <div className="seat-picker-content" style={{ maxWidth: 460 }}>
        <div className="seat-picker-header">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {isRegister ? 'Create an Account' : 'Sign In to BusGo'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {error && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 6, fontSize: '0.85rem', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Quick Demo Login Shortcut */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 20 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
              ⚡ 1-CLICK DEMO ACCOUNTS (FOR REVIEWERS)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {demoAccounts.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleDemoClick(acc)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{acc.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{acc.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isRegister && (
              <>
                <div className="form-group">
                  <label className="form-label dark">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label dark">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1-555-000-0000"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label dark">Account Type</label>
                  <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="CUSTOMER">Passenger / Customer</option>
                    <option value="OPERATOR">Bus Operator Staff</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label dark">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label dark">Password</label>
              <input
                type="password"
                required
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Processing...' : (isRegister ? 'Register & Sign In' : 'Sign In')}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: '0.88rem' }}>
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Create one now
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
