import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get current user (protected)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({ users });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'employee' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    const [users] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ user: users[0] });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name && !email && !password && !role) {
      return res.status(400).json({ error: 'At least one field is required' });
    }

    const updateFields = [];
    const values = [];

    if (name) {
      updateFields.push('name = ?');
      values.push(name);
    }
    if (email) {
      updateFields.push('email = ?');
      values.push(email);
    }
    if (password) {
      // Hash new password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      values.push(hashedPassword);
    }
    if (role) {
      updateFields.push('role = ?');
      values.push(role);
    }

    await db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    const [users] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
