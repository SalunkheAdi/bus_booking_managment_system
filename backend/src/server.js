require('dotenv').config();
const { getDb } = require('./db/database');
const createApp = require('./app');

const PORT = process.env.PORT || 5000;
const db = getDb();
const app = createApp(db);

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Bus Booking Management System API Server Running   `);
  console.log(` Local URL: http://localhost:${PORT}               `);
  console.log(` Database: SQLite initialized & verified           `);
  console.log(`====================================================`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    db.close();
    console.log('Database and server closed.');
    process.exit(0);
  });
});
