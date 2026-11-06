function logAudit(db, { userId, action, entityType, entityId, details }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId || null,
      action,
      entityType,
      String(entityId),
      typeof details === 'object' ? JSON.stringify(details) : details || null
    );
  } catch (err) {
    console.error('Audit log write error:', err.message);
  }
}

module.exports = {
  logAudit
};
