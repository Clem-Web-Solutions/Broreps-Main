import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Import orders from external source
router.post('/orders', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { orderIds, provider, defaultService, defaultLink } = req.body;

        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'orderIds array is required' });
        }

        const importedOrders = [];
        const errors = [];

        for (const orderId of orderIds) {
            try {
                const [existing] = await connection.query(
                    'SELECT id FROM orders WHERE id = ?',
                    [orderId]
                );

                if (existing.length > 0) {
                    errors.push({ orderId, error: 'Order already exists' });
                    continue;
                }

                // Create new order with defaults
                const [result] = await connection.query(
                    `INSERT INTO orders (
                        user_id, service_id, quantity, link, status, notes
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        req.user.id,
                        defaultService || null,
                        100, // default quantity
                        defaultLink || '#',
                        'pending',
                        JSON.stringify({ imported: true, provider: provider || 'BulkMedya' })
                    ]
                );

                importedOrders.push({ id: result.insertId, originalId: orderId });
            } catch (orderErr) {
                errors.push({ orderId, error: orderErr.message });
            }
        }

        await connection.commit();

        res.json({
            success: true,
            imported: importedOrders.length,
            failed: errors.length,
            orders: importedOrders,
            errors
        });
    } catch (err) {
        await connection.rollback();
        console.error('Import orders error:', err);
        res.status(500).json({ error: 'Failed to import orders' });
    } finally {
        connection.release();
    }
});

export default router;
