import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
        // Get total orders count (only parent orders and standard orders, excluding sub-orders)
        const [orderCount] = await db.query(
            'SELECT COUNT(*) as total FROM orders WHERE parent_order_id IS NULL'
        );

        // Get pending orders count (only parent orders and standard orders)
        const [pendingCount] = await db.query(
            "SELECT COUNT(*) as total FROM orders WHERE status IN ('pending', 'waiting_for_previous') AND parent_order_id IS NULL"
        );

        // Get active drip feed count (only parent orders and standard orders)
        const [activeDripCount] = await db.query(
            "SELECT COUNT(*) as total FROM orders WHERE status IN ('processing', 'in_progress') AND parent_order_id IS NULL"
        );

        // Get completed orders count (only parent orders and standard orders)
        const [completedCount] = await db.query(
            "SELECT COUNT(*) as total FROM orders WHERE status = 'completed' AND parent_order_id IS NULL"
        );

        // Get status distribution (only parent orders and standard orders)
        const [statusDist] = await db.query(
            `SELECT status, COUNT(*) as count
             FROM orders
             WHERE parent_order_id IS NULL
             GROUP BY status
             ORDER BY count DESC`
        );

        const status_distribution = statusDist.map(row => ({
            status: row.status.charAt(0).toUpperCase() + row.status.slice(1).replace(/_/g, ' '),
            count: row.count
        }));

        res.json({
            total_orders: orderCount[0].total,
            pending_orders: pendingCount[0].total,
            active_drip: activeDripCount[0].total,
            completed_orders: completedCount[0].total,
            status_distribution
        });
    } catch (err) {
        console.error('Get dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Get recent orders for dashboard
router.get('/recent-orders', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const [orders] = await db.query(
            `SELECT o.id, o.service_id, o.quantity, o.status, o.created_at,
                    s.service_name, s.provider, o.link
             FROM orders o
             LEFT JOIN allowed_services s ON o.service_id = s.service_id
             WHERE o.parent_order_id IS NULL
             ORDER BY o.created_at DESC
             LIMIT ?`,
            [limit]
        );

        res.json({ orders });
    } catch (err) {
        console.error('Get recent orders error:', err);
        res.status(500).json({ error: 'Failed to fetch recent orders' });
    }
});

// Get chart data for dashboard (last 7 days orders)
router.get('/chart-data', authenticateToken, async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT DATE(created_at) as date, COUNT(*) as count
             FROM orders
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
               AND parent_order_id IS NULL
             GROUP BY DATE(created_at)
             ORDER BY date ASC`
        );

        // Fill missing days with 0
        const chartData = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const found = orders.find(o => o.date.toISOString().split('T')[0] === dateStr);
            chartData.push({
                date: dateStr,
                count: found ? found.count : 0
            });
        }

        res.json({ chartData });
    } catch (err) {
        console.error('Get chart data error:', err);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});

export default router;
