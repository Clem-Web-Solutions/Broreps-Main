import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';
import axios from 'axios';
import { emitToUser, emitToAdmins } from '../lib/websocket.js';

const router = express.Router();

// Get all orders (admin) or user's own orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let query, params, countQuery, countParams;

    if (req.user.role === 'admin') {
      query = `
        SELECT 
          o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, o.remains, o.charge, o.notes,
          o.shopify_order_number, o.provider_order_id, o.status, o.created_at, o.updated_at, o.parent_order_id,
          o.dripfeed_runs as runs, 
          o.dripfeed_interval as run_interval,
          o.dripfeed_current_run,
          s.service_name, s.provider, 
          u.name as user_name
        FROM orders o
        LEFT JOIN allowed_services s ON o.service_id = s.service_id
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [limit, offset];
      countQuery = 'SELECT COUNT(*) as total FROM orders';
      countParams = [];
    } else {
      query = `
        SELECT 
          o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, o.remains, o.charge, o.notes,
          o.shopify_order_number, o.provider_order_id, o.status, o.created_at, o.updated_at, o.parent_order_id,
          o.dripfeed_runs as runs, 
          o.dripfeed_interval as run_interval,
          o.dripfeed_current_run,
          s.service_name, s.provider
        FROM orders o
        LEFT JOIN allowed_services s ON o.service_id = s.service_id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [req.user.id, limit, offset];
      countQuery = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
      countParams = [req.user.id];
    }

    const [orders] = await db.query(query, params);
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({ orders, total, page, totalPages, limit });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'admin') {
      query = `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
               o.remains, o.charge, o.notes, o.shopify_order_number, o.provider_order_id, o.status, 
               o.created_at, o.updated_at, o.parent_order_id,
               o.dripfeed_runs as runs, o.dripfeed_interval as run_interval, o.dripfeed_current_run,
               s.service_name, s.provider
               FROM orders o
               LEFT JOIN allowed_services s ON o.service_id = s.service_id
               WHERE o.id = ?`;
      params = [req.params.id];
    } else {
      query = `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
               o.remains, o.charge, o.notes, o.shopify_order_number, o.provider_order_id, o.status, 
               o.created_at, o.updated_at, o.parent_order_id,
               o.dripfeed_runs as runs, o.dripfeed_interval as run_interval, o.dripfeed_current_run,
               s.service_name, s.provider
               FROM orders o
               LEFT JOIN allowed_services s ON o.service_id = s.service_id
               WHERE o.id = ? AND o.user_id = ?`;
      params = [req.params.id, req.user.id];
    }

    const [orders] = await db.query(query, params);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: orders[0] });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { service_id, quantity = 1, notes } = req.body;

    const [result] = await db.query(
      'INSERT INTO orders (user_id, service_id, quantity, notes, status) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, service_id, quantity, notes, 'pending']
    );

    const [orders] = await db.query(
      `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
       o.remains, o.charge, o.notes, o.shopify_order_number, o.provider_order_id, o.status, 
       o.created_at, o.updated_at, o.parent_order_id,
       o.dripfeed_runs as runs, o.dripfeed_interval as run_interval, o.dripfeed_current_run,
       s.service_name, s.provider
       FROM orders o
       LEFT JOIN allowed_services s ON o.service_id = s.service_id
       WHERE o.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ order: orders[0] });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status (admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    const [orders] = await db.query(
      `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
       o.remains, o.charge, o.notes, o.shopify_order_number, o.provider_order_id, o.status, 
       o.created_at, o.updated_at, o.parent_order_id,
       o.dripfeed_runs as runs, o.dripfeed_interval as run_interval, o.dripfeed_current_run,
       s.service_name, s.provider
       FROM orders o
       LEFT JOIN allowed_services s ON o.service_id = s.service_id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: orders[0] });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Get recent orders
router.get('/recent/:limit', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 10;

    let query, params;
    if (req.user.role === 'admin') {
      query = `
        SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
        o.remains, o.charge, o.notes, o.shopify_order_number, o.provider_order_id, o.status, 
        o.created_at, o.updated_at, o.parent_order_id,
        o.dripfeed_runs as runs, o.dripfeed_interval as run_interval, o.dripfeed_current_run,
        s.service_name, s.provider
        FROM orders o
        LEFT JOIN allowed_services s ON o.service_id = s.service_id
        ORDER BY o.created_at DESC
        LIMIT ?
      `;
      params = [limit];
    } else {
      query = `
        SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
        o.remains, o.charge, o.notes, o.shopify_order_number, o.provider_order_id, o.status, 
        o.created_at, o.updated_at, o.parent_order_id,
        o.dripfeed_runs as runs, o.dripfeed_interval as run_interval, o.dripfeed_current_run,
        s.service_name, s.provider
        FROM orders o
        LEFT JOIN allowed_services s ON o.service_id = s.service_id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
        LIMIT ?
      `;
      params = [req.user.id, limit];
    }

    const [orders] = await db.query(query, params);
    res.json({ orders });
  } catch (err) {
    console.error('Get recent orders error:', err);
    res.status(500).json({ error: 'Failed to fetch recent orders' });
  }
});

// Sync orders with provider
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { order_ids } = req.body;
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ error: 'order_ids array is required' });
    }

    // For now, just return success - the actual sync should be implemented with smmRequest
    const [orders] = await db.query(
      `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
       o.remains, o.charge, o.notes, o.shopify_order_number, o.provider_order_id, o.status, 
       o.created_at, o.updated_at, o.parent_order_id,
       o.dripfeed_runs as runs, o.dripfeed_interval as run_interval, o.dripfeed_current_run,
       s.service_name, s.provider
       FROM orders o
       LEFT JOIN allowed_services s ON o.service_id = s.service_id
       WHERE o.id IN (${order_ids.map(() => '?').join(',')})`,
      order_ids
    );

    res.json({ success: true, synced: orders.length, orders });
  } catch (err) {
    console.error('Sync orders error:', err);
    res.status(500).json({ error: 'Failed to sync orders' });
  }
});

// Delete order
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = 'DELETE FROM orders WHERE id = ?';
      params = [req.params.id];
    } else {
      query = 'DELETE FROM orders WHERE id = ? AND user_id = ?';
      params = [req.params.id, req.user.id];
    }

    await db.query(query, params);
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Sync order statuses with provider API (CRON job)
router.post('/sync-status', async (req, res) => {
  try {
    // Verify CRON secret
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-key';
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🔄 Starting order status synchronization...');

    // Get provider info (prefer 'default', fallback to first available)
    const [providers] = await db.query(`
      SELECT name, api_key, api_url 
      FROM providers 
      WHERE name = 'default'
      LIMIT 1
    `);
    
    if (providers.length === 0) {
      // Fallback: get first provider
      const [fallbackProviders] = await db.query(`
        SELECT name, api_key, api_url 
        FROM providers 
        ORDER BY id ASC
        LIMIT 1
      `);
      
      if (fallbackProviders.length === 0) {
        console.log('❌ No providers found in database!');
        return res.status(500).json({ error: 'No providers configured' });
      }
      
      providers.push(fallbackProviders[0]);
      console.log(`⚠️  Using provider: ${providers[0].name} (no "default" provider found)`);
    }
    
    const provider = providers[0];

    // Get all orders that need syncing (exclude only completed and cancelled)
    // Keep syncing 'partial' orders as they may still receive updates (especially Bulkmedya)
    const [orders] = await db.query(`
      SELECT 
        id,
        provider_order_id,
        quantity,
        remains,
        status
      FROM orders
      WHERE provider_order_id IS NOT NULL 
        AND status NOT IN ('completed', 'cancelled')
      ORDER BY created_at DESC
      LIMIT 100
    `);

    let syncedCount = 0;
    let errorCount = 0;

    for (const order of orders) {
      try {
        const apiUrl = provider.api_url || 'https://justanotherpanel.com/api/v2';
        
        const response = await axios.post(apiUrl, {
          key: provider.api_key,
          action: 'status',
          order: order.provider_order_id
        }, {
          timeout: 10000
        });

        if (response.data && typeof response.data === 'object') {
          const remains = parseInt(response.data.remains) || 0;
          const charge = parseFloat(response.data.charge) || order.charge;
          const providerStatus = response.data.status;

          // Map provider status to our status
          let newStatus = order.status;
          const previousStatus = order.status;
          
          if (providerStatus === 'Completed' || remains === 0) {
            newStatus = 'completed';
          } else if (providerStatus === 'Partial') {
            // Partial orders (especially from Bulkmedya) are considered terminal
            // They should not block other orders on the same link
            newStatus = 'partial';
          } else if (providerStatus === 'In progress' || providerStatus === 'Processing') {
            newStatus = 'processing';
          } else if (providerStatus === 'Pending') {
            newStatus = 'pending';
          } else if (providerStatus === 'Canceled' || providerStatus === 'Cancelled') {
            newStatus = 'cancelled';
          }

          // Update order
          await db.query(`
            UPDATE orders 
            SET remains = ?, 
                charge = ?,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [remains, charge, newStatus, order.id]);

          // If order became 'partial' or 'completed', release waiting orders for same link
          if ((newStatus === 'partial' || newStatus === 'completed') && 
              (previousStatus !== 'partial' && previousStatus !== 'completed')) {
            console.log(`🔓 Order #${order.id} is now ${newStatus} - releasing waiting orders...`);
            
            // Get the username/link from this order
            const [orderDetails] = await db.query(
              'SELECT username, link FROM orders WHERE id = ?',
              [order.id]
            );
            
            if (orderDetails.length > 0 && orderDetails[0].username) {
              const username = orderDetails[0].username;
              
              // Find and release orders waiting for this profile
              const [waitingOrders] = await db.query(
                `SELECT id FROM orders 
                 WHERE username = ? 
                   AND status = 'waiting_for_previous' 
                   AND parent_order_id = ?
                 ORDER BY created_at ASC
                 LIMIT 1`,
                [username, order.id]
              );
              
              if (waitingOrders.length > 0) {
                const nextOrderId = waitingOrders[0].id;
                await db.query(
                  `UPDATE orders 
                   SET status = 'pending', parent_order_id = NULL 
                   WHERE id = ?`,
                  [nextOrderId]
                );
                console.log(`✅ Released order #${nextOrderId} from waiting queue`);
              }
            }
          }

          // Get updated order with user_id for WebSocket emission
          const [updatedOrder] = await db.query(`
            SELECT id, user_id, quantity, remains, status 
            FROM orders 
            WHERE id = ?
          `, [order.id]);

          if (updatedOrder.length > 0) {
            const orderData = updatedOrder[0];
            const progress = orderData.quantity > 0 
              ? Math.round(((orderData.quantity - orderData.remains) / orderData.quantity) * 100)
              : 0;

            const wsPayload = {
              id: orderData.id,
              remains: orderData.remains,
              status: orderData.status,
              progress: progress
            };

            // Emit to specific user
            if (orderData.user_id) {
              emitToUser(orderData.user_id, 'order:updated', wsPayload);
            }

            // Also emit to admins
            emitToAdmins('order:updated', wsPayload);
          }

          console.log(`✅ Synced order #${order.id}: ${order.remains} → ${remains} remains, status: ${newStatus}`);
          syncedCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to sync order #${order.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`🔄 Sync complete: ${syncedCount} synced, ${errorCount} errors out of ${orders.length} orders`);

    res.json({ 
      success: true, 
      synced: syncedCount,
      errors: errorCount,
      total: orders.length
    });
  } catch (err) {
    console.error('Sync status error:', err);
    res.status(500).json({ error: 'Failed to sync statuses' });
  }
});

// Retry sending order to provider
router.post('/:orderId/retry', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);

    // Get order details
    const [orders] = await db.query(
      `SELECT o.*, s.provider, s.service_id as smm_service_id, s.service_name
       FROM orders o
       LEFT JOIN allowed_services s ON o.service_id = s.service_id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    if (!order.provider) {
      return res.status(400).json({ error: 'No provider configured for this service' });
    }

    // Get provider info (try specific provider first, fallback to 'default')
    let [providers] = await db.query(
      'SELECT * FROM providers WHERE name = ? AND active = TRUE',
      [order.provider]
    );

    // Fallback to 'default' provider if specific provider not found
    if (providers.length === 0) {
      console.log(`⚠️  Provider '${order.provider}' not found, trying 'default'...`);
      [providers] = await db.query(
        'SELECT * FROM providers WHERE name = ? AND active = TRUE',
        ['default']
      );
    }

    if (providers.length === 0) {
      return res.status(400).json({ error: `Provider ${order.provider} not found or inactive. Please configure a provider in Config page.` });
    }

    const provider = providers[0];
    console.log(`✅ Using provider: ${provider.name} (requested: ${order.provider})`);

    // Import smmRequest function
    const { smmRequest } = await import('./smm.js');

    // Send order to provider
    console.log(`🔄 Retrying order #${orderId} with provider ${provider.name}...`);
    const response = await smmRequest(provider, 'add', {
      service: order.smm_service_id,
      link: order.link,
      quantity: order.quantity
    });

    if (!response.order) {
      throw new Error('Provider did not return order ID');
    }

    const providerOrderId = response.order;

    // Update order with provider_order_id and set status to processing
    await db.query(
      `UPDATE orders 
       SET provider_order_id = ?, 
           status = 'processing', 
           updated_at = NOW()
       WHERE id = ?`,
      [providerOrderId, orderId]
    );

    console.log(`✅ Order #${orderId} successfully sent to provider. Provider Order ID: ${providerOrderId}`);

    // Mark Shopify order as fulfilled when retried order is dispatched
    if (order.shopify_order_number) {
      const { fulfillShopifyOrder } = await import('../lib/shopify.js');
      fulfillShopifyOrder(order.shopify_order_number).catch(e =>
        console.error('[Shopify] fulfillment error (order retry):', e.message)
      );
    }

    // Fetch updated order status from provider
    try {
      const statusResponse = await smmRequest(provider, 'status', {
        order: providerOrderId
      });

      let newStatus = 'processing';
      let remains = order.quantity;

      if (statusResponse.status === 'Completed') {
        newStatus = 'completed';
        remains = 0;
      } else if (statusResponse.status === 'In progress' || statusResponse.status === 'Processing') {
        newStatus = 'processing';
        remains = parseInt(statusResponse.remains) || order.quantity;
      } else if (statusResponse.status === 'Partial') {
        newStatus = 'processing';
        remains = parseInt(statusResponse.remains) || order.quantity;
      } else if (statusResponse.status === 'Cancelled' || statusResponse.status === 'Canceled') {
        newStatus = 'cancelled';
      }

      // Update with synced status
      await db.query(
        `UPDATE orders 
         SET status = ?, remains = ?, updated_at = NOW()
         WHERE id = ?`,
        [newStatus, remains, orderId]
      );

      console.log(`✅ Order #${orderId} synced: status=${newStatus}, remains=${remains}`);
    } catch (syncError) {
      console.error(`Failed to sync status for order #${orderId}:`, syncError.message);
    }

    // Get updated order for WebSocket emission
    const [updatedOrders] = await db.query(
      `SELECT o.*, s.service_name FROM orders o
       LEFT JOIN allowed_services s ON o.service_id = s.service_id
       WHERE o.id = ?`,
      [orderId]
    );

    const updatedOrder = updatedOrders[0];

    // Emit WebSocket events
    const wsPayload = {
      order_id: updatedOrder.id,
      status: updatedOrder.status,
      remains: updatedOrder.remains,
      provider_order_id: updatedOrder.provider_order_id
    };

    if (updatedOrder.user_id) {
      emitToUser(updatedOrder.user_id, 'order:updated', wsPayload);
    }
    emitToAdmins('order:updated', wsPayload);

    res.json({ 
      success: true, 
      message: 'Order successfully sent to provider',
      provider_order_id: providerOrderId,
      order: updatedOrder
    });
  } catch (err) {
    console.error(`❌ Failed to retry order #${req.params.orderId}:`, err);
    res.status(500).json({ error: err.message || 'Failed to retry order' });
  }
});

export default router;
