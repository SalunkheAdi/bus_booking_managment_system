const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

function register(db) {
  return (req, res) => {
    try {
      const { name, email, password, phone, role = 'CUSTOMER', operatorId = null } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'Name, email and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      }

      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
      if (existingUser) {
        return res.status(409).json({ success: false, error: 'Email already registered' });
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const userRole = ['CUSTOMER', 'OPERATOR', 'ADMIN'].includes(role) ? role : 'CUSTOMER';

      const result = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, operator_id, phone)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        name.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        userRole,
        operatorId || null,
        phone || null
      );

      const userId = result.lastInsertRowid;

      const token = jwt.sign(
        { id: userId, email: email.toLowerCase().trim(), role: userRole, operator_id: operatorId, name: name.trim() },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      logAudit(db, {
        userId,
        action: 'USER_REGISTER',
        entityType: 'USER',
        entityId: userId,
        details: { email, role: userRole }
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: userId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          role: userRole,
          operator_id: operatorId,
          phone
        }
      });
    } catch (err) {
      console.error('Register error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function login(db) {
  return (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }

      const user = db.prepare(`
        SELECT u.*, o.name AS operator_name, o.code AS operator_code
        FROM users u
        LEFT JOIN operators o ON u.operator_id = o.id
        WHERE u.email = ?
      `).get(email.toLowerCase().trim());

      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          operator_id: user.operator_id,
          name: user.name
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      logAudit(db, {
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id,
        details: { email: user.email, role: user.role }
      });

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          operator_id: user.operator_id,
          operator_name: user.operator_name,
          operator_code: user.operator_code,
          phone: user.phone
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function me(db) {
  return (req, res) => {
    try {
      const user = db.prepare(`
        SELECT u.id, u.name, u.email, u.role, u.operator_id, u.phone, u.created_at,
               o.name AS operator_name, o.code AS operator_code
        FROM users u
        LEFT JOIN operators o ON u.operator_id = o.id
        WHERE u.id = ?
      `).get(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      return res.json({ success: true, user });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

function getDemoAccounts(db) {
  return (req, res) => {
    return res.json({
      success: true,
      demoAccounts: [
        {
          role: 'ADMIN',
          title: 'Platform Administrator',
          email: 'admin@busbooking.com',
          password: 'Admin@123',
          description: 'Full system oversight: all operators, trips, cancellation rules, revenue & audit logs'
        },
        {
          role: 'OPERATOR',
          title: 'Royal Travels Manager',
          email: 'royal@operator.com',
          password: 'Operator@123',
          description: 'Operator portal: manage Royal Travels fleet, trips, passenger manifests & occupancy'
        },
        {
          role: 'OPERATOR',
          title: 'City Express Dispatcher',
          email: 'express@operator.com',
          password: 'Operator@123',
          description: 'Operator portal: manage City Express fleet & trip schedules'
        },
        {
          role: 'CUSTOMER',
          title: 'Passenger (John Doe)',
          email: 'john.doe@example.com',
          password: 'Customer@123',
          description: 'Customer portal: search trips, book interactive seats, view tickets & cancel bookings'
        }
      ]
    });
  };
}

module.exports = {
  register,
  login,
  me,
  getDemoAccounts
};
