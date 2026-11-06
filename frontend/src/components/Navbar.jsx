import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bus, User, LogOut, Shield, Briefcase, Ticket, Search, CheckCircle } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, openLoginModal }) {
  const { user, logout, quickSwitch, demoAccounts } = useAuth();

  return (
    <>
      {/* Reviewer Quick Switcher Banner */}
      <div className="reviewer-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600 }}>🎓 Reviewer Quick Switcher:</span>
          <span>Switch roles instantly with 1-click to test the journeys:</span>
        </div>
        <div className="btn-group">
          {demoAccounts.map(account => (
            <button
              key={account.email}
              onClick={() => quickSwitch(account.email)}
              className={`btn-demo-switch ${user?.email === account.email ? 'active' : ''}`}
              title={account.description}
            >
              {account.role === 'ADMIN' && '👑 '}
              {account.role === 'OPERATOR' && '🚌 '}
              {account.role === 'CUSTOMER' && '👤 '}
              {account.role}: {account.title.split(' ')[0]}
            </button>
          ))}
          {user && (
            <button onClick={logout} className="btn-demo-switch" style={{ background: '#7f1d1d' }}>
              <LogOut size={12} style={{ display: 'inline', marginRight: 2 }} /> Logout
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-logo" onClick={() => setCurrentView('search')}>
            <Bus size={28} />
            <span>BusGo <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>Express</span></span>
          </div>

          <nav className="nav-links">
            <button
              className={`nav-btn ${currentView === 'search' ? 'active' : ''}`}
              onClick={() => setCurrentView('search')}
            >
              <Search size={16} /> Search Trips
            </button>

            <button
              className={`nav-btn ${currentView === 'pnr' ? 'active' : ''}`}
              onClick={() => setCurrentView('pnr')}
            >
              <Ticket size={16} /> Check PNR
            </button>

            {user && (
              <button
                className={`nav-btn ${currentView === 'my-bookings' ? 'active' : ''}`}
                onClick={() => setCurrentView('my-bookings')}
              >
                <Ticket size={16} /> My Bookings
              </button>
            )}

            {(user?.role === 'OPERATOR' || user?.role === 'ADMIN') && (
              <button
                className={`nav-btn ${currentView === 'operator-portal' ? 'active' : ''}`}
                onClick={() => setCurrentView('operator-portal')}
              >
                <Briefcase size={16} /> Operator Portal
              </button>
            )}

            {user?.role === 'ADMIN' && (
              <button
                className={`nav-btn ${currentView === 'admin-portal' ? 'active' : ''}`}
                onClick={() => setCurrentView('admin-portal')}
              >
                <Shield size={16} /> Admin Settings
              </button>
            )}

            <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</div>
                    <span className={`badge-role ${user.role.toLowerCase()}`}>{user.role}</span>
                  </div>
                  <button onClick={logout} className="btn btn-outline btn-sm" title="Log Out">
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={openLoginModal} className="btn btn-primary btn-sm">
                  <User size={14} /> Sign In
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
