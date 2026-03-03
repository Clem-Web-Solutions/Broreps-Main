import express from 'express';
import db from '../config/database.js';
import { requireSaasAuth } from './saas-auth.js';

const router = express.Router();

// ─── Helper: validate username ─────────────────────────────────────────────────
function sanitizeUsername(raw) {
    if (!raw || typeof raw !== 'string') return null;
    // Strip leading @ and any URL part (e.g. https://tiktok.com/@user → user)
    let u = raw.trim();
    // Extract from URL if pasted
    const urlMatch = u.match(/(?:tiktok\.com\/@?|instagram\.com\/)([^/?&\s]+)/i);
    if (urlMatch) u = urlMatch[1];
    // Remove leading @
    u = u.replace(/^@+/, '');
    // Only alphanumeric, dots, underscores, hyphens
    if (!/^[\w.\-]{1,50}$/.test(u)) return null;
    return u;
}

// ─── GET /api/saas/social ──────────────────────────────────────────────────────
// Returns the current user's linked social accounts
router.get('/', requireSaasAuth, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT tiktok_username, tiktok_linked_at,
                    instagram_username, instagram_linked_at
             FROM saas_users WHERE id = ?`,
            [req.saasUser.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur introuvable' });
        }

        res.json({ accounts: rows[0] });
    } catch (e) {
        console.error('[SOCIAL] GET error:', e.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── POST /api/saas/social/:platform ──────────────────────────────────────────
// Link a social account — body: { username }
router.post('/:platform', requireSaasAuth, async (req, res) => {
    const { platform } = req.params;
    if (!['tiktok', 'instagram'].includes(platform)) {
        return res.status(400).json({ error: 'Plateforme invalide' });
    }

    const username = sanitizeUsername(req.body.username);
    if (!username) {
        return res.status(400).json({
            error: 'Nom d\'utilisateur invalide. Utilise uniquement lettres, chiffres, points, tirets ou underscores (max 50 caractères).'
        });
    }

    try {
        await db.query(
            `UPDATE saas_users
             SET ${platform}_username = ?, ${platform}_linked_at = NOW()
             WHERE id = ?`,
            [username, req.saasUser.id]
        );

        console.log(`[SOCIAL] User ${req.saasUser.id} linked ${platform}: @${username}`);

        res.json({
            success: true,
            username,
            linked_at: new Date().toISOString(),
            message: `Compte ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} @${username} connecté.`
        });
    } catch (e) {
        console.error('[SOCIAL] POST error:', e.message);
        res.status(500).json({ error: 'Erreur lors de la connexion du compte' });
    }
});

// ─── DELETE /api/saas/social/:platform ────────────────────────────────────────
// Unlink a social account
router.delete('/:platform', requireSaasAuth, async (req, res) => {
    const { platform } = req.params;
    if (!['tiktok', 'instagram'].includes(platform)) {
        return res.status(400).json({ error: 'Plateforme invalide' });
    }

    try {
        await db.query(
            `UPDATE saas_users
             SET ${platform}_username = NULL, ${platform}_linked_at = NULL
             WHERE id = ?`,
            [req.saasUser.id]
        );

        console.log(`[SOCIAL] User ${req.saasUser.id} unlinked ${platform}`);

        res.json({ success: true });
    } catch (e) {
        console.error('[SOCIAL] DELETE error:', e.message);
        res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
});

export default router;
