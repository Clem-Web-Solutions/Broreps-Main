import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Public endpoint to track order by order number
router.get('/:orderNumber', async (req, res) => {
    try {
        const orderNumber = req.params.orderNumber;

        // Try to find order by:
        // 1. Numeric ID (e.g., "1000")
        // 2. Order ID string (e.g., "BM-12345")
        // 3. Shopify order number (e.g., "5678")
        const orderId = parseInt(orderNumber);
        let query;
        let params;

        if (!isNaN(orderId)) {
            // Search by numeric ID or shopify_order_number
            query = `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
                    o.remains, o.charge, o.notes, o.shopify_order_number, o.provider_order_id, o.status, 
                    o.created_at, o.updated_at, o.parent_order_id,
                    o.dripfeed_runs as runs, o.dripfeed_interval as run_interval, o.dripfeed_current_run,
                    s.service_name, s.provider,
                    u.name as created_by_name, u.email as created_by_email
             FROM orders o
             LEFT JOIN allowed_services s ON o.service_id = s.service_id
             LEFT JOIN users u ON o.user_id = u.id
             WHERE o.id = ? OR o.shopify_order_number = ?`;
            params = [orderId, orderNumber];
        } else {
            // Search by order_id string
            query = `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
                    o.remains, o.charge, o.notes, o.shopify_order_number, o.provider_order_id, o.status, 
                    o.created_at, o.updated_at, o.parent_order_id,
                    o.dripfeed_runs as runs, o.dripfeed_interval as run_interval, o.dripfeed_current_run,
                    s.service_name, s.provider,
                    u.name as created_by_name, u.email as created_by_email
             FROM orders o
             LEFT JOIN allowed_services s ON o.service_id = s.service_id
             LEFT JOIN users u ON o.user_id = u.id
             WHERE o.order_id = ? OR o.shopify_order_number = ?`;
            params = [orderNumber, orderNumber];
        }

        const [orders] = await db.query(query, params);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orders[0];

        // Check if this is a drip feed order (parent or sub-order)
        let isDripFeed = false;
        let parentOrder = null;
        let subOrders = [];

        if (order.parent_order_id) {
            // This is a sub-order, get parent
            isDripFeed = true;
            const [parents] = await db.query(
                `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
                        o.remains, o.charge, o.shopify_order_number, o.provider_order_id, o.status, 
                        o.created_at, o.updated_at, o.parent_order_id,
                        o.dripfeed_runs as runs, o.dripfeed_interval as run_interval,
                        s.service_name, s.provider
                 FROM orders o
                 LEFT JOIN allowed_services s ON o.service_id = s.service_id
                 WHERE o.id = ?`,
                [order.parent_order_id]
            );
            if (parents.length > 0) {
                parentOrder = parents[0];
            }

            // Get all sub-orders of this parent
            const [subs] = await db.query(
                `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
                        o.remains, o.charge, o.shopify_order_number, o.provider_order_id, o.status, 
                        o.created_at, o.updated_at, o.parent_order_id,
                        o.dripfeed_runs as runs, o.dripfeed_interval as run_interval,
                        s.service_name, s.provider
                 FROM orders o
                 LEFT JOIN allowed_services s ON o.service_id = s.service_id
                 WHERE o.parent_order_id = ?
                 ORDER BY o.created_at ASC`,
                [order.parent_order_id]
            );
            subOrders = subs;
        } else if (order.runs && order.runs > 0) {
            // This is a parent drip feed order
            isDripFeed = true;
            parentOrder = order;

            // Get all sub-orders
            const [subs] = await db.query(
                `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
                        o.remains, o.charge, o.shopify_order_number, o.provider_order_id, o.status, 
                        o.created_at, o.updated_at, o.parent_order_id,
                        o.dripfeed_runs as runs, o.dripfeed_interval as run_interval,
                        s.service_name, s.provider
                 FROM orders o
                 LEFT JOIN allowed_services s ON o.service_id = s.service_id
                 WHERE o.parent_order_id = ?
                 ORDER BY o.created_at ASC`,
                [order.id]
            );
            subOrders = subs;
        }

        // Calculate progress
        const delivered = order.quantity - (order.remains || 0);
        const progress = order.quantity > 0 ? Math.round((delivered / order.quantity) * 100) : 0;

        // Build detailed response
        const response = {
            order: {
                id: order.id,
                order_id: order.order_id,
                service_id: order.service_id,
                service_name: order.service_name || 'Service',
                link: order.link,
                quantity: order.quantity,
                remains: order.remains || 0,
                delivered: delivered,
                progress: progress,
                charge: order.charge || 0,
                status: order.status,
                provider: order.provider || 'Unknown',
                provider_order_id: order.provider_order_id,
                shopify_order_number: order.shopify_order_number,
                created_at: order.created_at,
                updated_at: order.updated_at,
                created_by: {
                    name: order.created_by_name,
                    email: order.created_by_email
                }
            },
            is_drip_feed: isDripFeed,
            drip_feed_info: isDripFeed ? {
                parent_order: parentOrder ? {
                    id: parentOrder.id,
                    quantity: parentOrder.quantity,
                    runs: parentOrder.runs,
                    run_interval: parentOrder.run_interval,
                    status: parentOrder.status,
                    created_at: parentOrder.created_at
                } : null,
                sub_orders: subOrders.map((sub, index) => ({
                    id: sub.id,
                    order_number: index + 1,
                    quantity: sub.quantity,
                    remains: sub.remains || 0,
                    delivered: sub.quantity - (sub.remains || 0),
                    status: sub.status,
                    provider_order_id: sub.provider_order_id,
                    created_at: sub.created_at,
                    is_executed: !!sub.provider_order_id
                })),
                total_runs: parentOrder ? parentOrder.runs : order.runs,
                executed_runs: subOrders.filter(s => s.provider_order_id).length,
                completed_runs: subOrders.filter(s => s.status === 'Completed').length
            } : null
        };

        res.json(response);
    } catch (err) {
        console.error('Track order error:', err);
        res.status(500).json({ error: 'Failed to track order' });
    }
});

export default router;
