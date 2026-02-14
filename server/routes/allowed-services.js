import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get all allowed services (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [services] = await db.query(
      'SELECT id, service_id, service_name, provider, delivery_mode, dripfeed_quantity, created_at FROM allowed_services ORDER BY created_at DESC'
    );
    res.json({ services });
  } catch (err) {
    console.error('Get allowed services error:', err);
    res.status(500).json({ error: 'Failed to fetch allowed services' });
  }
});

// Add allowed service (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { service_id, service_name, provider = 'BulkMedya', delivery_mode = 'standard', dripfeed_quantity } = req.body;

    if (!service_id || !service_name) {
      return res.status(400).json({ error: 'Service ID and name are required' });
    }

    const [result] = await db.query(
      'INSERT INTO allowed_services (service_id, service_name, provider, delivery_mode, dripfeed_quantity) VALUES (?, ?, ?, ?, ?)',
      [service_id, service_name, provider, delivery_mode, dripfeed_quantity || null]
    );

    const [services] = await db.query(
      'SELECT id, service_id, service_name, provider, delivery_mode, dripfeed_quantity, created_at FROM allowed_services WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ service: services[0] });
  } catch (err) {
    console.error('Add allowed service error:', err);
    res.status(500).json({ error: 'Failed to add allowed service' });
  }
});

// Delete allowed service (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM allowed_services WHERE id = ?', [req.params.id]);
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error('Delete allowed service error:', err);
    res.status(500).json({ error: 'Failed to delete allowed service' });
  }
});

export default router;
