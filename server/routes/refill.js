import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get refill timers (placeholder for future implementation)
router.get('/timers', authenticateToken, async (req, res) => {
    try {
        // This would return active refill timers
        // For now, return empty array
        res.json({ timers: [] });
    } catch (err) {
        console.error('Get refill timers error:', err);
        res.status(500).json({ error: 'Failed to fetch refill timers' });
    }
});

// Refresh ongoing orders
router.post('/ongoing', authenticateToken, async (req, res) => {
    try {
        // Get orders that are in processing state
        const [orders] = await db.query(
            `SELECT * FROM orders
             WHERE status IN ('processing', 'in_progress')
             ORDER BY created_at ASC
             LIMIT 50`
        );

        // For now, just return the orders
        // In a real implementation, this would sync with SMM providers
        res.json({
            success: true,
            checked: orders.length,
            orders
        });
    } catch (err) {
        console.error('Refresh ongoing orders error:', err);
        res.status(500).json({ error: 'Failed to refresh ongoing orders' });
    }
});

// Refresh all orders
router.post('/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT * FROM orders
             WHERE status NOT IN ('completed', 'cancelled')
             ORDER BY created_at ASC`
        );

        res.json({
            success: true,
            checked: orders.length,
            orders
        });
    } catch (err) {
        console.error('Refresh all orders error:', err);
        res.status(500).json({ error: 'Failed to refresh all orders' });
    }
});

// Auto refill (placeholder)
router.post('/auto-refill', authenticateToken, async (req, res) => {
    try {
        // This would check for orders that need refilling and automatically submit refill requests
        res.json({
            success: true,
            message: 'Auto refill feature not yet implemented',
            refilled: 0
        });
    } catch (err) {
        console.error('Auto refill error:', err);
        res.status(500).json({ error: 'Failed to process auto refill' });
    }
});

export default router;
