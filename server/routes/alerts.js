import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get all alerts (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [alerts] = await db.query(
      'SELECT id, type, title, message, enabled, created_at FROM alerts ORDER BY created_at DESC'
    );
    res.json({ alerts });
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get alert by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [alerts] = await db.query(
      'SELECT * FROM alerts WHERE id = ?',
      [req.params.id]
    );

    if (alerts.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ alert: alerts[0] });
  } catch (err) {
    console.error('Get alert error:', err);
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

// Create alert (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, title, message, enabled = true } = req.body;

    if (!type || !title) {
      return res.status(400).json({ error: 'Type and title are required' });
    }

    const [result] = await db.query(
      'INSERT INTO alerts (type, title, message, enabled, created_at) VALUES (?, ?, ?, ?, NOW())',
      [type, title, message, enabled ? 1 : 0]
    );

    const [alerts] = await db.query(
      'SELECT * FROM alerts WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ alert: alerts[0] });
  } catch (err) {
    console.error('Create alert error:', err);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Update alert (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, title, message, enabled } = req.body;

    if (!type && !title && !message) {
      return res.status(400).json({ error: 'Type, title, and message are required' });
    }

    await db.query(
      'UPDATE alerts SET type = ?, title = ?, message = ?, enabled = ? WHERE id = ?',
      [type, title, message, enabled ? 1 : 0, req.params.id]
    );

    const [alerts] = await db.query(
      'SELECT * FROM alerts WHERE id = ?',
      [req.params.id]
    );

    if (alerts.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ alert: alerts[0] });
  } catch (err) {
    console.error('Update alert error:', err);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// Delete alert (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM alerts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Alert deleted successfully' });
  } catch (err) {
    console.error('Delete alert error:', err);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;
