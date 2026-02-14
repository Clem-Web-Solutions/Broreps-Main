import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get all services
router.get('/', async (req, res) => {
  try {
    const [services] = await db.query(
      'SELECT * FROM services ORDER BY name ASC'
    );
    res.json({ services });
  } catch (err) {
    console.error('Get services error:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get service by ID
router.get('/:id', async (req, res) => {
  try {
    const [services] = await db.query(
      'SELECT * FROM services WHERE id = ?',
      [req.params.id]
    );

    if (services.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ service: services[0] });
  } catch (err) {
    console.error('Get service error:', err);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// Create service (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, category } = req.body;

    const [result] = await db.query(
      'INSERT INTO services (name, description, price, category) VALUES (?, ?, ?, ?)',
      [name, description, price, category]
    );

    const [services] = await db.query(
      'SELECT * FROM services WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ service: services[0] });
  } catch (err) {
    console.error('Create service error:', err);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Update service (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, category } = req.body;

    await db.query(
      'UPDATE services SET name = ?, description = ?, price = ?, category = ? WHERE id = ?',
      [name, description, price, category, req.params.id]
    );

    const [services] = await db.query(
      'SELECT * FROM services WHERE id = ?',
      [req.params.id]
    );

    if (services.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ service: services[0] });
  } catch (err) {
    console.error('Update service error:', err);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Delete service (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error('Delete service error:', err);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

export default router;
