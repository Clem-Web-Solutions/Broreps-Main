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
      // Fallback: build from saas_users when tagadapay_orders has no row yet
      const [userRows] = await db.query(
        `SELECT subscription_status, subscription_product, next_billing_at, subscribed_at
         FROM saas_users WHERE LOWER(email) = ?`,
        [email]
      );
      if (userRows.length === 0 || !userRows[0].subscription_status) {
        return res.status(404).json({ error: 'Aucun abonnement trouvé', code: 'NO_SUBSCRIPTION' });
      }
      const u = userRows[0];
      return res.json({
        subscription: {
          subscription_id: null,
          status: u.subscription_status,
          product: u.subscription_product || 'BroReps Premium',
          amount: 0,
          currency: 'EUR',
          interval: 'month',
          next_billing_at: u.next_billing_at || null,
          started_at: u.subscribed_at || null,
          cancelled_at: null,
        },
        payments: [],
        _source: 'saas_users',
      });
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

// ─── POST /api/saas/subscription/sync ────────────────────────────────────────
// Forces a live fetch from TagadaPay API and refreshes DB + saas_users.
router.post('/sync', requireSaasAuth, async (req, res) => {
  const email = req.saasUser.email.toLowerCase();

  try {
    // Find existing subscription_id in DB
    const [rows] = await db.query(
      `SELECT subscription_id FROM tagadapay_orders
       WHERE LOWER(customer_email) = ? AND order_type = 'subscription'
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    const subId = rows[0]?.subscription_id;

    if (!subId) {
      // No local row — try to match via TagadaPay customer lookup
      const [userRows] = await db.query(
        `SELECT subscription_status, subscription_product, next_billing_at, subscribed_at
         FROM saas_users WHERE LOWER(email) = ?`,
        [email]
      );
      if (userRows.length === 0) {
        return res.status(404).json({ error: 'Aucun abonnement trouvé', code: 'NO_SUBSCRIPTION' });
      }
      const u = userRows[0];
      return res.json({
        subscription: {
          subscription_id: null,
          status: u.subscription_status,
          product: u.subscription_product || 'BroReps Premium',
          amount: 0,
          currency: 'EUR',
          interval: 'month',
          next_billing_at: u.next_billing_at || null,
          started_at: u.subscribed_at || null,
          cancelled_at: null,
        },
        payments: [],
        _source: 'saas_users',
        _synced: false,
      });
    }

    // Fetch live data from TagadaPay
    let liveData;
    try {
      liveData = await tagadaPayRequest('GET', `/subscriptions/${subId}`);
    } catch {
      // API unavailable — just return current DB state
      return res.redirect(307, '/');
    }

    const live = liveData?.subscription || liveData?.data || liveData;
    if (!live) return res.redirect(307, '/');

    const liveStatus = live.status || live.subscription_status;
    const liveNextBilling = live.nextBillingDate || live.next_billing_date || null;
    const liveCancelledAt = live.cancelledAt || live.cancelled_at || null;

    // Update tagadapay_orders row
    await db.query(
      `UPDATE tagadapay_orders
         SET subscription_status = ?,
             subscription_next_billing_date = ?,
             subscription_cancelled_at = ?,
             updated_at = NOW()
       WHERE subscription_id = ?`,
      [liveStatus, liveNextBilling, liveCancelledAt, subId]
    );

    // Sync saas_users too
    await db.query(
      `UPDATE saas_users SET subscription_status = ?, next_billing_at = ? WHERE LOWER(email) = ?`,
      [liveStatus, liveNextBilling, email]
    );

    // Return fresh data (reuse GET logic)
    const [subRows] = await db.query(
      `SELECT * FROM tagadapay_orders
       WHERE subscription_id = ? ORDER BY created_at DESC LIMIT 1`,
      [subId]
    );
    const [payments] = await db.query(
      `SELECT id, payment_id, amount, currency, payment_status,
              product_title, quantity, subscription_status,
              payment_created_at, created_at
       FROM tagadapay_orders WHERE subscription_id = ? ORDER BY created_at DESC`,
      [subId]
    );

    const sub = subRows[0];
    res.json({
      subscription: {
        subscription_id: sub.subscription_id,
        status: sub.subscription_status || 'active',
        product: sub.product_title,
        amount: sub.amount,
        currency: sub.currency || 'EUR',
        interval: sub.subscription_interval,
        next_billing_at: sub.subscription_next_billing_date,
        started_at: sub.subscription_started_at || sub.created_at,
        cancelled_at: sub.subscription_cancelled_at,
      },
      payments,
      _synced: true,
    });
  } catch (err) {
    console.error('[SAAS SUBSCRIPTION] SYNC error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
