import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get all providers (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [providers] = await db.query(
      'SELECT id, name, api_url, active, created_at FROM providers ORDER BY name ASC'
    );
    res.json({ providers });
  } catch (err) {
    console.error('Get providers error:', err);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// Get provider by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [providers] = await db.query(
      'SELECT * FROM providers WHERE id = ?',
      [req.params.id]
    );

    if (providers.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({ provider: providers[0] });
  } catch (err) {
    console.error('Get provider error:', err);
    res.status(500).json({ error: 'Failed to fetch provider' });
  }
});

// Test provider connection (admin only)
router.post('/:id/test', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [providers] = await db.query(
      'SELECT * FROM providers WHERE id = ?',
      [req.params.id]
    );

    if (providers.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const provider = providers[0];

    const apiUrl = provider.api_url?.trim();
    const apiKey = provider.api_key?.trim();

    // Validate that we have the necessary credentials
    if (!apiUrl) {
      return res.status(400).json({
        success: false,
        message: 'API URL is not configured'
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API key is not configured'
      });
    }

    // Simple validation - check if URL is valid format
    let urlValid = false;
    try {
      new URL(apiUrl);
      urlValid = true;
    } catch {
      // Invalid URL
    }

    if (!urlValid) {
      return res.status(400).json({
        success: false,
        message: 'API URL is invalid'
      });
    }

    // Real API verification
    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('action', 'services');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const data = await response.json();

    if (data?.error) {
      return res.status(400).json({
        success: false,
        message: `Provider API error: ${data.error}`,
        url: apiUrl,
        hasKey: true
      });
    }

    const servicesCount = Array.isArray(data) ? data.length : 0;

    res.json({
      success: true,
      message: 'Provider API connection successful',
      url: apiUrl,
      hasKey: true,
      servicesCount
    });
  } catch (err) {
    console.error('Test provider error:', err);
    res.status(500).json({ error: 'Failed to test provider' });
  }
});

// Create provider (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, api_key, api_url, active = true } = req.body;
    const normalizedName = name?.trim();
    const normalizedApiKey = api_key?.trim();
    const normalizedApiUrl = api_url?.trim();

    if (!normalizedName || !normalizedApiKey) {
      return res.status(400).json({ error: 'Name and API key are required' });
    }

    const [result] = await db.query(
      'INSERT INTO providers (name, api_key, api_url, active) VALUES (?, ?, ?, ?)',
      [normalizedName, normalizedApiKey, normalizedApiUrl || null, active]
    );

    const [providers] = await db.query(
      'SELECT id, name, api_url, active, created_at FROM providers WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ provider: providers[0] });
  } catch (err) {
    console.error('Create provider error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Provider with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

// Update provider (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, api_key, api_url, active } = req.body;
    const normalizedName = name?.trim();
    const normalizedApiKey = api_key?.trim();
    const normalizedApiUrl = api_url?.trim();

    await db.query(
      'UPDATE providers SET name = ?, api_key = ?, api_url = ?, active = ? WHERE id = ?',
      [normalizedName, normalizedApiKey, normalizedApiUrl || null, active, req.params.id]
    );

    const [providers] = await db.query(
      'SELECT id, name, api_url, active, created_at FROM providers WHERE id = ?',
      [req.params.id]
    );

    if (providers.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({ provider: providers[0] });
  } catch (err) {
    console.error('Update provider error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Provider with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

// Delete provider (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM providers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Provider deleted successfully' });
  } catch (err) {
    console.error('Delete provider error:', err);
    res.status(500).json({ error: 'Failed to delete provider' });
  }
});

export default router;
