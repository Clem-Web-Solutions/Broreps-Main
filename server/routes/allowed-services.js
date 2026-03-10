import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get all allowed services (any authenticated user)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [services] = await db.query(
      'SELECT id, service_id, service_name, provider, delivery_mode, dripfeed_quantity, is_pack, created_at FROM allowed_services ORDER BY created_at DESC'
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
    const { service_id, service_name, provider = 'BulkMedya', delivery_mode = 'standard', dripfeed_quantity, is_pack = false } = req.body;

    if (!service_id || !service_name) {
      return res.status(400).json({ error: 'Service ID and name are required' });
    }

    const [result] = await db.query(
      'INSERT INTO allowed_services (service_id, service_name, provider, delivery_mode, dripfeed_quantity, is_pack) VALUES (?, ?, ?, ?, ?, ?)',
      [service_id, service_name, provider, delivery_mode, dripfeed_quantity || null, is_pack ? 1 : 0]
    );

    const [services] = await db.query(
      'SELECT id, service_id, service_name, provider, delivery_mode, dripfeed_quantity, is_pack, created_at FROM allowed_services WHERE id = ?',
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

// ── Pack items ─────────────────────────────────────────────────────────────────

// GET /allowed-services/:id/pack-items — list sub-services in a pack
router.get('/:id/pack-items', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [items] = await db.query(
      `SELECT pi.id, pi.pack_id, pi.sub_service_id, pi.quantity_override, pi.sort_order,
              s.service_id, s.service_name, s.provider, s.delivery_mode, s.dripfeed_quantity
       FROM service_pack_items pi
       JOIN allowed_services s ON pi.sub_service_id = s.id
       WHERE pi.pack_id = ?
       ORDER BY pi.sort_order ASC, pi.id ASC`,
      [req.params.id]
    );
    res.json({ items });
  } catch (err) {
    console.error('Get pack items error:', err);
    res.status(500).json({ error: 'Failed to fetch pack items' });
  }
});

// POST /allowed-services/:id/pack-items — add sub-service to pack
router.post('/:id/pack-items', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const packId = req.params.id;
    const { sub_service_id, quantity_override } = req.body;

    if (!sub_service_id) {
      return res.status(400).json({ error: 'sub_service_id is required' });
    }
    if (parseInt(sub_service_id) === parseInt(packId)) {
      return res.status(400).json({ error: 'A pack cannot include itself' });
    }

    const [result] = await db.query(
      'INSERT INTO service_pack_items (pack_id, sub_service_id, quantity_override) VALUES (?, ?, ?)',
      [packId, sub_service_id, quantity_override || null]
    );

    const [items] = await db.query(
      `SELECT pi.id, pi.pack_id, pi.sub_service_id, pi.quantity_override, pi.sort_order,
              s.service_id, s.service_name, s.provider, s.delivery_mode, s.dripfeed_quantity
       FROM service_pack_items pi
       JOIN allowed_services s ON pi.sub_service_id = s.id
       WHERE pi.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ item: items[0] });
  } catch (err) {
    console.error('Add pack item error:', err);
    res.status(500).json({ error: 'Failed to add pack item' });
  }
});

// DELETE /allowed-services/pack-items/:itemId — remove a sub-service from pack
router.delete('/pack-items/:itemId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM service_pack_items WHERE id = ?', [req.params.itemId]);
    res.json({ message: 'Pack item removed' });
  } catch (err) {
    console.error('Delete pack item error:', err);
    res.status(500).json({ error: 'Failed to remove pack item' });
  }
});

export default router;
