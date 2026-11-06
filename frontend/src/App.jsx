import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import ETicketModal from './components/ETicketModal';
import SearchTripsPage from './pages/SearchTripsPage';
import MyBookingsPage from './pages/MyBookingsPage';
import PnrLookupPage from './pages/PnrLookupPage';
import OperatorPortalPage from './pages/OperatorPortalPage';
import AdminPortalPage from './pages/AdminPortalPage';
import { api } from './services/api';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('search');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);

  async function handleBookingSuccess(booking) {
    try {
      const res = await api.getBookingByPnr(booking.pnr);
      if (res.success) {
        setActiveTicket(res.booking);
      }
    } catch {
      setActiveTicket(booking);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        openLoginModal={() => setIsLoginOpen(true)}
      />

      <main className="main-layout" style={{ flex: 1 }}>
        {currentView === 'search' && (
          <SearchTripsPage
            onBookingSuccess={handleBookingSuccess}
            openLoginModal={() => setIsLoginOpen(true)}
          />
        )}

        {currentView === 'my-bookings' && (
          <MyBookingsPage
            onOpenTicket={(ticket) => setActiveTicket(ticket)}
          />
        )}

        {currentView === 'pnr' && (
          <PnrLookupPage />
        )}

        {currentView === 'operator-portal' && (
          <OperatorPortalPage />
        )}

        {currentView === 'admin-portal' && (
          <AdminPortalPage />
        )}
      </main>

      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '24px 20px', fontSize: '0.82rem', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ fontWeight: 700, color: '#f8fafc' }}>Bus Booking Management System</span> — Full-stack Modular Monolith with RBAC, ACID Seat Integrity, Policy Engine & Manifest Reporting
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ color: '#4ade80' }}>● SQLite WAL Mode Active</span>
            <span>Zero External Dependencies</span>
            <span>Student Engineering Submission</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      {activeTicket && (
        <ETicketModal
          booking={activeTicket}
          isOpen={!!activeTicket}
          onClose={() => setActiveTicket(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
