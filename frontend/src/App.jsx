import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import ETicketModal from './components/ETicketModal';
import HomePage from './pages/HomePage';
import SearchTripsPage from './pages/SearchTripsPage';
import MyBookingsPage from './pages/MyBookingsPage';
import PnrLookupPage from './pages/PnrLookupPage';
import OperatorPortalPage from './pages/OperatorPortalPage';
import AdminPortalPage from './pages/AdminPortalPage';
import { api } from './services/api';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('home');
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
        {currentView === 'home' && (
          <HomePage
            onBookingSuccess={handleBookingSuccess}
            openLoginModal={() => setIsLoginOpen(true)}
            onNavigate={(view) => setCurrentView(view)}
          />
        )}

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

      <footer style={{ background: '#1c1917', color: '#a8a29e', padding: '32px 20px', fontSize: '0.85rem', borderTop: '1px solid #292524' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 800, color: '#f5f5f4', fontSize: '1rem', marginBottom: 4 }}>
              GreenTrail Express — Bus Booking Management System
            </div>
            <div style={{ color: '#78716c' }}>
              Full-Stack Modular Monolith with RBAC, ACID Seat Integrity, Policy Engine & Manifest Reporting
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>● SQLite WAL Mode Active</span>
            <span>Zero External Setup</span>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>Student Engineering Project</span>
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
