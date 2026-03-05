import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Helper function to fetch provider from database
async function getProvider(name) {
  const [providers] = await db.query(
    'SELECT * FROM providers WHERE name = ?',
    [name]
  );

  if (providers.length === 0) {
    return null;
  }

  return providers[0];
}

// Helper function to make SMM API requests
export async function smmRequest(provider, action, params = {}) {
  if (!provider || !provider.api_url || !provider.api_key) {
    throw new Error('Provider not configured properly');
  }

  const apiUrl = String(provider.api_url).trim();
  const apiKey = String(provider.api_key).trim();

  const formData = new URLSearchParams();
  formData.append('key', apiKey);
  formData.append('action', action);

  for (const [key, value] of Object.entries(params)) {
    formData.append(key, String(value));
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

// Get services from provider
router.get('/services/:provider', authenticateToken, async (req, res) => {
  try {
    const provider = await getProvider(req.params.provider);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const data = await smmRequest(provider, 'services');
    res.json({ services: data });
  } catch (err) {
    console.error('Get SMM services error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch services' });
  }
});

// Get balance from provider
router.get('/balance/:provider', authenticateToken, async (req, res) => {
  try {
    const provider = await getProvider(req.params.provider);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const data = await smmRequest(provider, 'balance');
    res.json({ balance: data });
  } catch (err) {
    console.error('Get SMM balance error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch balance' });
  }
});

// Create order with provider
router.post('/order', authenticateToken, async (req, res) => {
  try {
    const { provider, service, link, quantity } = req.body;

    if (!provider || !service || !link || !quantity) {
      return res.status(400).json({ error: 'Provider, service, link, and quantity are required' });
    }

    const providerData = await getProvider(provider);

    if (!providerData) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const data = await smmRequest(providerData, 'add', {
      service,
      link,
      quantity
    });

    res.json(data);
  } catch (err) {
    console.error('Create SMM order error:', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

// Get order status from provider
router.get('/status/:provider/:orderId', authenticateToken, async (req, res) => {
  try {
    const provider = await getProvider(req.params.provider);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const data = await smmRequest(provider, 'status', {
      order: req.params.orderId
    });

    res.json({ status: data });
  } catch (err) {
    console.error('Get SMM order status error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch order status' });
  }
});

// Refill order
router.post('/refill', authenticateToken, async (req, res) => {
  try {
    const { provider, order_id } = req.body;

    if (!provider || !order_id) {
      return res.status(400).json({ error: 'Provider and order_id are required' });
    }

    const providerData = await getProvider(provider);

    if (!providerData) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const data = await smmRequest(providerData, 'refill', {
      order: order_id
    });

    res.json({ refill: data });
  } catch (err) {
    console.error('Refill SMM order error:', err);
    res.status(500).json({ error: err.message || 'Failed to refill order' });
  }
});

// Cancel order
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const { provider, order_id } = req.body;

    if (!provider || !order_id) {
      return res.status(400).json({ error: 'Provider and order_id are required' });
    }

    const providerData = await getProvider(provider);

    if (!providerData) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const data = await smmRequest(providerData, 'cancel', {
      order: order_id
    });

    res.json({ cancel: data });
  } catch (err) {
    console.error('Cancel SMM order error:', err);
    res.status(500).json({ error: err.message || 'Failed to cancel order' });
  }
});

export default router;
