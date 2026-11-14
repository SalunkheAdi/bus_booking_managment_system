const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const createAuthRoutes = require('./routes/authRoutes');
const createTripRoutes = require('./routes/tripRoutes');
const createBookingRoutes = require('./routes/bookingRoutes');
const createOperatorRoutes = require('./routes/operatorRoutes');
const createReportRoutes = require('./routes/reportRoutes');
const createAdminRoutes = require('./routes/adminRoutes');

function createApp(db) {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'Bus Booking Management System API',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API endpoints
  app.use('/api/auth', createAuthRoutes(db));
  app.use('/api/trips', createTripRoutes(db));
  app.use('/api/bookings', createBookingRoutes(db));
  app.use('/api/operators', createOperatorRoutes(db));
  app.use('/api/reports', createReportRoutes(db));
  app.use('/api/admin', createAdminRoutes(db));

  // Serve static frontend build if present (checks root dist or frontend/dist)
  const rootDist = path.join(__dirname, '../../dist');
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  const distPath = fs.existsSync(rootDist) ? rootDist : frontendDist;

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
      }
      next();
    });
  }

  // 404 handler for API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  });

  return app;
}

module.exports = createApp;
