import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get all alerts/reports
router.get('/alerts', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const alerts = [];

        // 1. Check for stuck orders (pending for more than 24 hours)
        const [stuckOrders] = await db.query(
            `SELECT id, link, quantity, remains, status, created_at, shopify_order_number, user_id,
                    TIMESTAMPDIFF(HOUR, created_at, NOW()) as hours_stuck
             FROM orders 
             WHERE status IN ('Pending', 'Processing', 'In progress') 
             AND parent_order_id IS NULL
             AND TIMESTAMPDIFF(HOUR, created_at, NOW()) > 24
             ORDER BY created_at ASC
             LIMIT 50`
        );

        stuckOrders.forEach(order => {
            alerts.push({
                id: `stuck-order-${order.id}`,
                type: 'stuck_order',
                severity: order.hours_stuck > 72 ? 'critical' : order.hours_stuck > 48 ? 'high' : 'medium',
                title: `Commande bloquée (#${order.shopify_order_number || order.id})`,
                message: `En attente depuis ${order.hours_stuck}h`,
                data: {
                    order_id: order.id,
                    order_number: order.shopify_order_number || `ID-${order.id}`,
                    status: order.status,
                    hours_stuck: order.hours_stuck,
                    link: order.link,
                    quantity: order.quantity,
                    remains: order.remains,
                    user_id: order.user_id,
                    created_at: order.created_at
                },
                created_at: order.created_at
            });
        });

        // 2. Check for orders with high remains (> 50% after 12 hours)
        const [highRemainsOrders] = await db.query(
            `SELECT id, link, quantity, remains, status, created_at, shopify_order_number,
                    ROUND((remains / quantity) * 100) as remains_percentage,
                    TIMESTAMPDIFF(HOUR, created_at, NOW()) as hours_elapsed
             FROM orders 
             WHERE status IN ('Processing', 'In progress', 'Partial')
             AND parent_order_id IS NULL
             AND quantity > 0
             AND (remains / quantity) > 0.5
             AND TIMESTAMPDIFF(HOUR, created_at, NOW()) > 12
             ORDER BY remains_percentage DESC
             LIMIT 30`
        );

        highRemainsOrders.forEach(order => {
            alerts.push({
                id: `high-remains-${order.id}`,
                type: 'high_remains',
                severity: order.remains_percentage > 80 ? 'high' : 'medium',
                title: `Livraison lente (#${order.shopify_order_number || order.id})`,
                message: `${order.remains_percentage}% non livré après ${order.hours_elapsed}h`,
                data: {
                    order_id: order.id,
                    order_number: order.shopify_order_number || `ID-${order.id}`,
                    status: order.status,
                    remains: order.remains,
                    quantity: order.quantity,
                    remains_percentage: order.remains_percentage,
                    hours_elapsed: order.hours_elapsed,
                    created_at: order.created_at
                },
                created_at: order.created_at
            });
        });

        // 3. Check for drip feed orders that haven't executed on time
        // Since we don't have dripfeed_next_run column, we check orders that:
        // - Have incomplete drip runs (current_run < total_runs)
        // - Haven't been updated recently (based on interval + 2 hours buffer)
        const [missedDripRuns] = await db.query(
            `SELECT id, link, quantity, dripfeed_runs, dripfeed_current_run, dripfeed_interval,
                    shopify_order_number, status, updated_at,
                    TIMESTAMPDIFF(MINUTE, updated_at, NOW()) as minutes_since_update
             FROM orders 
             WHERE dripfeed_runs > 0 
             AND parent_order_id IS NULL
             AND status NOT IN ('Completed', 'Cancelled')
             AND dripfeed_current_run < dripfeed_runs
             AND dripfeed_interval IS NOT NULL
             AND TIMESTAMPDIFF(MINUTE, updated_at, NOW()) > (dripfeed_interval + 120)
             ORDER BY minutes_since_update DESC
             LIMIT 20`
        );

        missedDripRuns.forEach(order => {
            const hoursOverdue = Math.floor((order.minutes_since_update - order.dripfeed_interval) / 60);
            alerts.push({
                id: `missed-drip-${order.id}`,
                type: 'missed_drip',
                severity: hoursOverdue > 24 ? 'high' : 'medium',
                title: `Drip Feed en retard (#${order.shopify_order_number || order.id})`,
                message: `Pas d'exécution depuis ${Math.floor(order.minutes_since_update / 60)}h (intervalle: ${order.dripfeed_interval}min)`,
                data: {
                    order_id: order.id,
                    order_number: order.shopify_order_number || `ID-${order.id}`,
                    status: order.status,
                    current_run: order.dripfeed_current_run,
                    total_runs: order.dripfeed_runs,
                    interval: order.dripfeed_interval,
                    hours_overdue: hoursOverdue,
                    minutes_since_update: order.minutes_since_update
                },
                created_at: order.updated_at
            });
        });

        // 4. Check for duplicate orders (same link, created within 1 hour)
        const [duplicateOrders] = await db.query(
            `SELECT link, COUNT(*) as count, GROUP_CONCAT(id) as order_ids,
                    MIN(created_at) as first_created
             FROM orders 
             WHERE parent_order_id IS NULL
             AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY link 
             HAVING count > 1
             LIMIT 20`
        );

        duplicateOrders.forEach(dup => {
            alerts.push({
                id: `duplicate-${dup.link}`,
                type: 'duplicate_order',
                severity: 'low',
                title: `Commandes en double détectées`,
                message: `${dup.count} commandes pour le même lien`,
                data: {
                    link: dup.link,
                    count: dup.count,
                    order_ids: dup.order_ids,
                    first_created: dup.first_created
                },
                created_at: dup.first_created
            });
        });

        // 5. Check for orders without provider_order_id after 1 hour
        const [ordersWithoutProviderId] = await db.query(
            `SELECT id, link, quantity, status, created_at, shopify_order_number,
                    TIMESTAMPDIFF(HOUR, created_at, NOW()) as hours_elapsed
             FROM orders 
             WHERE status IN ('Pending', 'Processing')
             AND parent_order_id IS NULL
             AND (provider_order_id IS NULL OR provider_order_id = '')
             AND TIMESTAMPDIFF(HOUR, created_at, NOW()) > 1
             ORDER BY created_at ASC
             LIMIT 20`
        );

        ordersWithoutProviderId.forEach(order => {
            alerts.push({
                id: `no-provider-id-${order.id}`,
                type: 'no_provider_id',
                severity: order.hours_elapsed > 6 ? 'high' : 'medium',
                title: `Commande non envoyée au provider (#${order.shopify_order_number || order.id})`,
                message: `Pas d'ID provider après ${order.hours_elapsed}h`,
                data: {
                    order_id: order.id,
                    order_number: order.shopify_order_number || `ID-${order.id}`,
                    status: order.status,
                    hours_elapsed: order.hours_elapsed,
                    created_at: order.created_at
                },
                created_at: order.created_at
            });
        });

        // 6. Get recent low balance notifications
        const [lowBalanceNotifs] = await db.query(
            `SELECT id, title, message, data, created_at
             FROM notifications
             WHERE type = 'low_balance'
             AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY created_at DESC
             LIMIT 10`
        );

        lowBalanceNotifs.forEach(notif => {
            const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
            alerts.push({
                id: `low-balance-${notif.id}`,
                type: 'low_balance',
                severity: data.balance < 20 ? 'critical' : 'medium',
                title: notif.title,
                message: notif.message,
                data: data,
                created_at: notif.created_at
            });
        });

        // Sort by severity and date
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        alerts.sort((a, b) => {
            const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (severityDiff !== 0) return severityDiff;
            return new Date(b.created_at) - new Date(a.created_at);
        });

        // Calculate summary
        const summary = {
            total: alerts.length,
            critical: alerts.filter(a => a.severity === 'critical').length,
            high: alerts.filter(a => a.severity === 'high').length,
            medium: alerts.filter(a => a.severity === 'medium').length,
            low: alerts.filter(a => a.severity === 'low').length,
            by_type: {
                stuck_order: alerts.filter(a => a.type === 'stuck_order').length,
                high_remains: alerts.filter(a => a.type === 'high_remains').length,
                missed_drip: alerts.filter(a => a.type === 'missed_drip').length,
                duplicate_order: alerts.filter(a => a.type === 'duplicate_order').length,
                no_provider_id: alerts.filter(a => a.type === 'no_provider_id').length,
                low_balance: alerts.filter(a => a.type === 'low_balance').length
            }
        };

        res.json({ alerts, summary });
    } catch (error) {
        console.error('[REPORTS] Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

export default router;
