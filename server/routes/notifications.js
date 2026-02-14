import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import db from '../config/database.js';
import { emitToUser, emitToAdmins } from '../lib/websocket.js';

const router = express.Router();

// Helper function to create notification
export async function createNotification({ userId, type, title, message, data = null, link = null }) {
    try {
        const [result] = await db.query(
            'INSERT INTO notifications (user_id, type, title, message, data, link) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, type, title, message, data ? JSON.stringify(data) : null, link]
        );
        
        const notificationId = result.insertId;
        console.log(`📢 Notification créée: ${title} (${type}) pour user ${userId || 'ALL'}`);
        
        // Emit WebSocket event
        const notification = {
            id: notificationId,
            user_id: userId,
            type,
            title,
            message,
            data,
            link,
            is_read: false,
            created_at: new Date().toISOString()
        };
        
        if (userId) {
            emitToUser(userId, 'notification:new', notification);
        }
        
        return notification;
    } catch (error) {
        console.error('Erreur création notification:', error);
    }
}

// Helper: Create notification for all admins
export async function notifyAdmins({ type, title, message, data = null, link = null }) {
    try {
        const [admins] = await db.query("SELECT id FROM users WHERE role = 'admin' AND status = 'approved'");
        
        const notifications = [];
        for (const admin of admins) {
            const notification = await createNotification({
                userId: admin.id,
                type,
                title,
                message,
                data,
                link
            });
            notifications.push(notification);
        }
        
        // Also emit to admin room for real-time update
        emitToAdmins('notification:new', {
            type,
            title,
            message,
            data,
            link
        });
        
        console.log(`📢 ${admins.length} admin(s) notifié(s): ${title}`);
        return notifications;
    } catch (error) {
        console.error('Erreur notification admins:', error);
    }
}

// Get user notifications (with unread count)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;
        const unreadOnly = req.query.unread === 'true';

        let query = `
            SELECT id, type, title, message, data, is_read, link, created_at
            FROM notifications
            WHERE user_id = ? OR user_id IS NULL
        `;

        if (unreadOnly) {
            query += ' AND is_read = FALSE';
        }

        query += ' ORDER BY created_at DESC LIMIT ?';

        const [notifications] = await db.query(query, [userId, limit]);

        // Get unread count
        const [unreadCount] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = FALSE',
            [userId]
        );

        res.json({
            notifications: notifications.map(n => ({
                ...n,
                data: n.data ? JSON.parse(n.data) : null
            })),
            unread_count: unreadCount[0].count
        });
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);
        const userId = req.user.id;

        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
            [notificationId, userId]
        );

        // Emit WebSocket event
        emitToUser(userId, 'notification:update', { id: notificationId, is_read: true });

        res.json({ success: true });
    } catch (err) {
        console.error('Mark notification read error:', err);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
router.post('/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE (user_id = ? OR user_id IS NULL) AND is_read = FALSE',
            [userId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Mark all notifications read error:', err);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);
        const userId = req.user.id;

        await db.query(
            'DELETE FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
            [notificationId, userId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Delete notification error:', err);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// Clear all read notifications
router.delete('/clear/read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        await db.query(
            'DELETE FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = TRUE',
            [userId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Clear read notifications error:', err);
        res.status(500).json({ error: 'Failed to clear read notifications' });
    }
});

export default router;
