const createApp = require('../backend/src/app');
const { getDb } = require('../backend/src/db/database');
const { seedDatabase } = require('../backend/src/db/seed');

let appInstance = null;

function initializeApp() {
  if (!appInstance) {
    const db = getDb();

    // In serverless environments like Vercel, auto-seed the demo database on cold start
    try {
      const userCheck = db.prepare('SELECT COUNT(*) as count FROM users').get();
      if (!userCheck || userCheck.count === 0) {
        console.log('[Vercel Serverless] Auto-seeding database for cold start...');
        seedDatabase(db);
      }
    } catch (err) {
      console.log('[Vercel Serverless] Initializing schema and seed:', err.message);
      try {
        seedDatabase(db);
      } catch (seedErr) {
        console.error('[Vercel Serverless] Seed error:', seedErr.message);
      }
    }

    appInstance = createApp(db);
  }
  return appInstance;
}

module.exports = (req, res) => {
  const app = initializeApp();
  return app(req, res);
};
