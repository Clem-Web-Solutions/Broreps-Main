import express from 'express';
import db from '../config/database.js';
import { requireSaasAuth } from './saas-auth.js';

const router = express.Router();

// ─── TagadaPay API helper ──────────────────────────────────────────────────────
async function tagadaPayRequest(method, path, body = null) {
  const apiKey = process.env.TAGADAPAY_API_KEY;
  if (!apiKey) throw new Error('TAGADAPAY_API_KEY non configuré');

  const baseUrl = process.env.TAGADAPAY_BASE_URL || 'https://app.tagadapay.com/api/public/v1';

  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${baseUrl}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data;
}

// ─── GET /api/saas/subscription ───────────────────────────────────────────────
// Returns current subscription info + full payment history for the auth'd user.
router.get('/', requireSaasAuth, async (req, res) => {
  const email = req.saasUser.email.toLowerCase();

  try {
    // Find latest subscription row for this user
    const [subRows] = await db.query(
      `SELECT * FROM tagadapay_orders
       WHERE LOWER(customer_email) = ? AND order_type = 'subscription'
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    if (subRows.length === 0) {
      return res.status(404).json({ error: 'Aucun abonnement trouvé', code: 'NO_SUBSCRIPTION' });
    }

    const sub = subRows[0];

    // All payments tied to this subscription (including the seed row)
    const [payments] = await db.query(
      `SELECT
          id, payment_id, amount, currency, payment_status,
          product_title, quantity, subscription_status,
          payment_created_at, created_at
       FROM tagadapay_orders
       WHERE subscription_id = ?
       ORDER BY created_at DESC`,
      [sub.subscription_id]
    );

    res.json({
      subscription: {
        subscription_id: sub.subscription_id,
        status: sub.subscription_status || 'active',
        product: sub.product_title,
        amount: sub.amount,           // in cents
        currency: sub.currency || 'EUR',
        interval: sub.subscription_interval,
        next_billing_at: sub.subscription_next_billing_date,
        started_at: sub.subscription_started_at || sub.created_at,
        cancelled_at: sub.subscription_cancelled_at,
      },
      payments,
    });
  } catch (err) {
    console.error('[SAAS SUBSCRIPTION] GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/saas/subscription/pause ────────────────────────────────────────
router.post('/pause', requireSaasAuth, async (req, res) => {
  const email = req.saasUser.email.toLowerCase();

  try {
    const [rows] = await db.query(
      `SELECT subscription_id FROM tagadapay_orders
       WHERE LOWER(customer_email) = ? AND order_type = 'subscription'
         AND subscription_status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    if (!rows[0]?.subscription_id) {
      return res.status(404).json({ error: 'Aucun abonnement actif à suspendre' });
    }

    const subId = rows[0].subscription_id;

    await tagadaPayRequest('POST', `/subscriptions/${subId}/pause`);

    await db.query(
      `UPDATE tagadapay_orders
       SET subscription_status = 'paused', updated_at = NOW()
       WHERE subscription_id = ?`,
      [subId]
    );
    await db.query(
      `UPDATE saas_users SET subscription_status = 'paused' WHERE LOWER(email) = ?`,
      [email]
    );

    res.json({ success: true, message: 'Abonnement mis en pause avec succès' });
  } catch (err) {
    console.error('[SAAS SUBSCRIPTION] PAUSE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/saas/subscription/resume ───────────────────────────────────────
router.post('/resume', requireSaasAuth, async (req, res) => {
  const email = req.saasUser.email.toLowerCase();

  try {
    const [rows] = await db.query(
      `SELECT subscription_id FROM tagadapay_orders
       WHERE LOWER(customer_email) = ? AND order_type = 'subscription'
         AND subscription_status = 'paused'
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    if (!rows[0]?.subscription_id) {
      return res.status(404).json({ error: 'Aucun abonnement en pause à reprendre' });
    }

    const subId = rows[0].subscription_id;

    await tagadaPayRequest('POST', `/subscriptions/${subId}/resume`);

    await db.query(
      `UPDATE tagadapay_orders
       SET subscription_status = 'active', updated_at = NOW()
       WHERE subscription_id = ?`,
      [subId]
    );
    await db.query(
      `UPDATE saas_users SET subscription_status = 'active' WHERE LOWER(email) = ?`,
      [email]
    );

    res.json({ success: true, message: 'Abonnement repris avec succès' });
  } catch (err) {
    console.error('[SAAS SUBSCRIPTION] RESUME error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/saas/subscription/cancel ───────────────────────────────────────
router.post('/cancel', requireSaasAuth, async (req, res) => {
  const email = req.saasUser.email.toLowerCase();

  try {
    const [rows] = await db.query(
      `SELECT subscription_id FROM tagadapay_orders
       WHERE LOWER(customer_email) = ? AND order_type = 'subscription'
         AND subscription_status NOT IN ('cancelled', 'canceled', 'expired')
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    if (!rows[0]?.subscription_id) {
      return res.status(404).json({ error: 'Aucun abonnement actif à annuler' });
    }

    const subId = rows[0].subscription_id;

    await tagadaPayRequest('DELETE', `/subscriptions/${subId}`);

    await db.query(
      `UPDATE tagadapay_orders
       SET subscription_status = 'cancelled',
           subscription_cancelled_at = NOW(),
           updated_at = NOW()
       WHERE subscription_id = ?`,
      [subId]
    );
    await db.query(
      `UPDATE saas_users SET subscription_status = 'cancelled' WHERE LOWER(email) = ?`,
      [email]
    );

    res.json({ success: true, message: 'Abonnement annulé. Ton accès reste actif jusqu\'à la fin de la période.' });
  } catch (err) {
    console.error('[SAAS SUBSCRIPTION] CANCEL error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
