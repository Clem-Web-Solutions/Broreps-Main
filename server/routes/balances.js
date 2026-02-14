import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';
import { smmRequest } from './smm.js';
import { notifyAdmins } from './notifications.js';

const router = express.Router();

// Low balance threshold configuration
const LOW_BALANCE_THRESHOLD = parseFloat(process.env.LOW_BALANCE_THRESHOLD || '50');
const CRITICAL_BALANCE_THRESHOLD = parseFloat(process.env.CRITICAL_BALANCE_THRESHOLD || '20');

// Helper: Check for low balance and notify admins
async function checkLowBalance(provider, balance) {
    try {
        // Check if we already sent a notification recently (within last hour)
        const [recentNotifs] = await db.query(
            `SELECT id FROM notifications 
             WHERE type = 'low_balance' 
             AND JSON_EXTRACT(data, '$.provider') = ?
             AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
             LIMIT 1`,
            [provider]
        );

        if (recentNotifs.length > 0) {
            // Already notified recently, skip
            return;
        }

        let shouldNotify = false;
        let title = '';
        let message = '';
        let isCritical = false;

        if (balance <= CRITICAL_BALANCE_THRESHOLD) {
            shouldNotify = true;
            isCritical = true;
            title = '🚨 SOLDE CRITIQUE';
            message = `Provider ${provider}: ${balance.toFixed(2)} USD - Action immédiate requise!`;
        } else if (balance <= LOW_BALANCE_THRESHOLD) {
            shouldNotify = true;
            title = '⚠️ Solde faible';
            message = `Provider ${provider}: ${balance.toFixed(2)} USD - Rechargement recommandé`;
        }

        if (shouldNotify) {
            await notifyAdmins({
                type: 'low_balance',
                title,
                message,
                data: { provider, balance, threshold: isCritical ? CRITICAL_BALANCE_THRESHOLD : LOW_BALANCE_THRESHOLD },
                link: '/config'
            });
            console.log(`📢 Low balance notification sent for ${provider}: ${balance} USD`);
        }
    } catch (error) {
        console.error('Error checking low balance:', error);
    }
}

// Get balances from all providers
router.get('/all-balances', authenticateToken, async (req, res) => {
    try {
        const [providers] = await db.query(
            'SELECT name, api_key, api_url FROM providers WHERE active = 1'
        );

        const balances = [];

        for (const provider of providers) {
            try {
                const balanceData = await smmRequest(provider, 'balance');
                const balance = parseFloat(balanceData.balance || 0);

                balances.push({
                    provider: provider.name,
                    balance,
                    currency: balanceData.currency || 'USD',
                    status: 'active'
                });

                // Check for low balance
                await checkLowBalance(provider.name, balance);
            } catch (error) {
                console.error(`Failed to get balance for ${provider.name}:`, error.message);
                balances.push({
                    provider: provider.name,
                    balance: 0,
                    currency: 'USD',
                    status: 'error',
                    error: error.message
                });
            }
        }

        res.json({ balances: balances || [] });
    } catch (err) {
        console.error('Get all balances error:', err);
        res.status(500).json({ error: 'Failed to fetch provider balances' });
    }
});

export default router;
