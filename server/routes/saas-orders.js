import express from 'express';
import db from '../config/database.js';
import { requireSaasAuth } from './saas-auth.js';

const router = express.Router();

// ─── GET /api/saas/orders ──────────────────────────────────────────────────────
// Returns all orders associated with the authenticated SaaS user's email.
// Merges results from shopify_orders and tagadapay_orders.
router.get('/', requireSaasAuth, async (req, res) => {
  const email = req.saasUser.email;

  try {
    // 1. Shopify orders linked to this email
    const [shopifyRows] = await db.query(
      `SELECT
          so.id                    AS source_id,
          'shopify'                AS source,
          so.shopify_order_number  AS order_number,
          so.product_title,
          so.social_link,
          so.financial_status,
          so.fulfillment_status,
          so.total_price,
          so.shopify_created_at    AS placed_at,
          so.internal_order_id,
          o.id                     AS internal_id,
          o.status,
          o.quantity,
          o.remains,
          o.charge,
          o.link,
          o.username,
          o.created_at,
          o.updated_at,
          o.parent_order_id,
          o.dripfeed_runs          AS runs,
          o.dripfeed_interval      AS run_interval,
          o.dripfeed_current_run,
          s.service_name,
          s.provider
       FROM shopify_orders so
       LEFT JOIN orders o              ON so.internal_order_id = o.id
       LEFT JOIN allowed_services s    ON o.service_id = s.service_id
       WHERE LOWER(so.customer_email) = LOWER(?)
         AND (o.parent_order_id IS NULL OR so.internal_order_id IS NULL)
       ORDER BY so.shopify_created_at DESC`,
      [email]
    );

    // 2. TagadaPay orders linked to this email
    const [tagadapayRows] = await db.query(
      `SELECT
          tp.id                    AS source_id,
          'tagadapay'              AS source,
          COALESCE(tp.shopify_order_number, tp.order_id) AS order_number,
          tp.product_title,
          tp.social_link,
          tp.payment_status        AS financial_status,
          NULL                     AS fulfillment_status,
          tp.amount                AS total_price,
          tp.payment_created_at    AS placed_at,
          tp.internal_order_id,
          o.id                     AS internal_id,
          o.status,
          o.quantity,
          o.remains,
          o.charge,
          o.link,
          o.username,
          o.created_at,
          o.updated_at,
          o.parent_order_id,
          o.dripfeed_runs          AS runs,
          o.dripfeed_interval      AS run_interval,
          o.dripfeed_current_run,
          s.service_name,
          s.provider
       FROM tagadapay_orders tp
       LEFT JOIN orders o              ON tp.internal_order_id = o.id
       LEFT JOIN allowed_services s    ON o.service_id = s.service_id
       WHERE LOWER(tp.customer_email) = LOWER(?)
         AND tp.order_type != 'subscription'
         AND (o.parent_order_id IS NULL OR tp.internal_order_id IS NULL)
       ORDER BY tp.payment_created_at DESC`,
      [email]
    );

    // Merge and de-duplicate by internal_order_id (Shopify takes priority)
    const seen = new Set();
    const combined = [];

    for (const row of [...shopifyRows, ...tagadapayRows]) {
      const key = row.internal_id ? `order-${row.internal_id}` : `${row.source}-${row.source_id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const isPaymentOk = ['paid', 'succeeded', 'success'].includes(
        (row.financial_status || '').toLowerCase()
      );
      const isDripFeed = (row.runs || 0) > 0 && !row.parent_order_id;
      const quantity = row.quantity || 0;
      const remains = row.remains ?? quantity;
      const delivered = quantity - remains;

      combined.push({
        id: row.source_id,
        order_number: row.order_number,
        source: row.source,
        internal_id: row.internal_id,
        status: row.status || (isPaymentOk ? 'pending' : 'awaiting_payment'),
        product: row.service_name || row.product_title || 'Service',
        quantity,
        delivered,
        remains,
        link: row.link || row.username || row.social_link || '',
        placed_at: row.placed_at || row.created_at,
        updated_at: row.updated_at,
        is_drip_feed: isDripFeed,
        runs: row.runs || 0,
        executed_runs: row.dripfeed_current_run || 0,
        payment_validated: isPaymentOk,
        charge: row.charge,
      });
    }

    // Sort newest first
    combined.sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime());

    res.json({ orders: combined });
  } catch (err) {
    console.error('[SAAS ORDERS] Error:', err);
    res.status(500).json({ error: 'Erreur lors du chargement des commandes' });
  }
});

// ─── GET /api/saas/orders/:id ──────────────────────────────────────────────────
// Tracking detail for one order (by internal_order_id or shopify_order_number).
// User must own the order (matched by email).
router.get('/:id', requireSaasAuth, async (req, res) => {
  const email = req.saasUser.email;
  const orderId = req.params.id;

  try {
    // Find the source row that belongs to this user
    const [shopifyRows] = await db.query(
      `SELECT
          so.shopify_order_number  AS order_number,
          so.product_title,
          so.social_link,
          so.financial_status,
          so.total_price,
          so.shopify_created_at    AS placed_at,
          'shopify'                AS source,
          o.id                     AS internal_id,
          o.status, o.quantity, o.remains, o.charge, o.link, o.username,
          o.created_at, o.updated_at, o.parent_order_id,
          o.dripfeed_runs AS runs, o.dripfeed_interval AS run_interval, o.dripfeed_current_run,
          s.service_name, s.provider
       FROM shopify_orders so
       LEFT JOIN orders o           ON so.internal_order_id = o.id
       LEFT JOIN allowed_services s ON o.service_id = s.service_id
       WHERE LOWER(so.customer_email) = LOWER(?)
         AND (so.shopify_order_number = ? OR so.internal_order_id = ?)
       LIMIT 1`,
      [email, orderId, orderId]
    );

    const [tagadapayRows] = await db.query(
      `SELECT
          COALESCE(tp.shopify_order_number, tp.order_id) AS order_number,
          tp.product_title,
          tp.social_link,
          tp.payment_status AS financial_status,
          tp.amount AS total_price,
          tp.payment_created_at AS placed_at,
          'tagadapay' AS source,
          o.id AS internal_id,
          o.status, o.quantity, o.remains, o.charge, o.link, o.username,
          o.created_at, o.updated_at, o.parent_order_id,
          o.dripfeed_runs AS runs, o.dripfeed_interval AS run_interval, o.dripfeed_current_run,
          s.service_name, s.provider
       FROM tagadapay_orders tp
       LEFT JOIN orders o           ON tp.internal_order_id = o.id
       LEFT JOIN allowed_services s ON o.service_id = s.service_id
       WHERE LOWER(tp.customer_email) = LOWER(?)
         AND (tp.order_id = ? OR tp.shopify_order_number = ? OR tp.internal_order_id = ?)
       LIMIT 1`,
      [email, orderId, orderId, orderId]
    );

    const row = shopifyRows[0] || tagadapayRows[0];

    if (!row) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    const isPaymentOk = ['paid', 'succeeded', 'success'].includes(
      (row.financial_status || '').toLowerCase()
    );
    const isDripFeed = (row.runs || 0) > 0;
    const quantity = row.quantity || 0;
    const remains = row.remains ?? quantity;
    const delivered = quantity - remains;
    const pct = quantity > 0 ? Math.round((delivered / quantity) * 100) : 0;

    const detail = {
      order_number: row.order_number,
      source: row.source,
      internal_id: row.internal_id,
      status: row.status || (isPaymentOk ? 'pending' : 'awaiting_payment'),
      product: row.service_name || row.product_title || 'Service',
      quantity,
      delivered,
      remains,
      progress_pct: pct,
      link: row.link || row.username || row.social_link || '',
      placed_at: row.placed_at || row.created_at,
      updated_at: row.updated_at,
      is_drip_feed: isDripFeed,
      runs: row.runs || 0,
      executed_runs: row.dripfeed_current_run || 0,
      run_interval: row.run_interval || 0,
      payment_validated: isPaymentOk,
      charge: row.charge,
      drip_sub_orders: [],
    };

    // Fetch sub-orders for drip feed
    if (isDripFeed && row.internal_id) {
      const [subs] = await db.query(
        `SELECT id, quantity, remains, status, created_at, provider_order_id
         FROM orders WHERE parent_order_id = ? ORDER BY created_at ASC`,
        [row.internal_id]
      );
      detail.drip_sub_orders = subs.map(s => ({
        id: s.id,
        quantity: s.quantity,
        delivered: s.quantity - (s.remains || 0),
        remains: s.remains || 0,
        status: s.status,
        created_at: s.created_at,
        has_provider_id: !!s.provider_order_id,
      }));
    }

    res.json({ order: detail });
  } catch (err) {
    console.error('[SAAS ORDERS DETAIL] Error:', err);
    res.status(500).json({ error: 'Erreur lors du chargement de la commande' });
  }
});

export default router;
