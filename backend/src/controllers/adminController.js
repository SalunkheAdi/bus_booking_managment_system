const { logAudit } = require('../services/auditService');

function listCancellationRules(db) {
  return (req, res) => {
    try {
      const rules = db.prepare(`
        SELECT * FROM cancellation_rules
        ORDER BY min_hours_before DESC
      `).all();

      return res.json({ success: true, count: rules.length, rules });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function updateCancellationRule(db) {
  return (req, res) => {
    try {
      const { id } = req.params;
      const { ruleName, minHoursBefore, maxHoursBefore, refundPercentage, cancellationFeePercentage, isActive } = req.body;

      const rule = db.prepare('SELECT * FROM cancellation_rules WHERE id = ?').get(id);
      if (!rule) {
        return res.status(404).json({ success: false, error: 'Rule not found' });
      }

      db.prepare(`
        UPDATE cancellation_rules
        SET
          rule_name = COALESCE(?, rule_name),
          min_hours_before = COALESCE(?, min_hours_before),
          max_hours_before = ?,
          refund_percentage = COALESCE(?, refund_percentage),
          cancellation_fee_percentage = COALESCE(?, cancellation_fee_percentage),
          is_active = COALESCE(?, is_active)
        WHERE id = ?
      `).run(
        ruleName,
        minHoursBefore !== undefined ? Number(minHoursBefore) : null,
        maxHoursBefore !== undefined ? (maxHoursBefore === null ? null : Number(maxHoursBefore)) : rule.max_hours_before,
        refundPercentage !== undefined ? Number(refundPercentage) : null,
        cancellationFeePercentage !== undefined ? Number(cancellationFeePercentage) : null,
        isActive !== undefined ? Number(isActive) : null,
        id
      );

      logAudit(db, {
        userId: req.user.id,
        action: 'CANCELLATION_RULE_UPDATED',
        entityType: 'CANCELLATION_RULE',
        entityId: id,
        details: { ruleName, refundPercentage }
      });

      return res.json({ success: true, message: 'Cancellation rule updated successfully' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

module.exports = {
  listCancellationRules,
  updateCancellationRule
};
