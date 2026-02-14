import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Process drip queue (for scheduled orders)
router.post('/process-queue', authenticateToken, async (req, res) => {
    try {
        // Find orders that are ready to be processed
        const [orders] = await db.query(
            `SELECT * FROM orders
             WHERE status = 'pending'
               AND (parent_order_id IS NULL
                    OR parent_order_id IN (SELECT id FROM orders WHERE status = 'completed'))
             ORDER BY created_at ASC
             LIMIT 10`
        );

        res.json({
            success: true,
            found: orders.length,
            orders,
            message: 'Queue processed'
        });
    } catch (err) {
        console.error('Process queue error:', err);
        res.status(500).json({ error: 'Failed to process queue' });
    }
});

// Process completed orders (check and update status)
router.post('/process-completed', authenticateToken, async (req, res) => {
    try {
        // This would sync with SMM providers to check completed orders
        const [orders] = await db.query(
            `SELECT * FROM orders
             WHERE status IN ('processing', 'in_progress')
             LIMIT 50`
        );

        res.json({
            success: true,
            checked: orders.length,
            message: 'Completed orders processed'
        });
    } catch (err) {
        console.error('Process completed error:', err);
        res.status(500).json({ error: 'Failed to process completed orders' });
    }
});

// Process scheduled orders (time-based drip feed)
router.post('/process-scheduled', authenticateToken, async (req, res) => {
    try {
        // Find drip feed orders that are due for next run
        const now = new Date();
        const [orders] = await db.query(
            `SELECT * FROM orders
             WHERE dripfeed_runs IS NOT NULL
               AND dripfeed_current_run < dripfeed_runs
               AND status IN ('processing', 'in_progress')
               AND (
                   DATE_ADD(updated_at, INTERVAL dripfeed_interval MINUTE) <= ?
                   OR updated_at IS NULL
               )
             ORDER BY created_at ASC
             LIMIT 20`,
            [now]
        );

        res.json({
            success: true,
            scheduled: orders.length,
            orders,
            message: 'Scheduled orders processed'
        });
    } catch (err) {
        console.error('Process scheduled error:', err);
        res.status(500).json({ error: 'Failed to process scheduled orders' });
    }
});

export default router;
