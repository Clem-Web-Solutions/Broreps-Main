import express from 'express';
import db from '../config/database.js';
import { requireSaasAuth } from './saas-auth.js';

const router = express.Router();

router.use(requireSaasAuth);

const VALID_CATEGORIES = ['debutants', 'tiktok', 'instagram', 'strategie', 'resultats', 'general'];

// ─── GET /api/saas/forum/:category ────────────────────────────────────────────
router.get('/:category', async (req, res) => {
  const { category } = req.params;
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Catégorie invalide' });
  }

  const [messages] = await db.query(
    `SELECT fm.id, fm.content, fm.created_at,
            u.name AS author_name, u.id AS author_id
     FROM saas_forum_messages fm
     JOIN saas_users u ON u.id = fm.user_id
     WHERE fm.category_id = ?
     ORDER BY fm.created_at DESC
     LIMIT 100`,
    [category]
  );

  res.json({ messages, total: messages.length });
});

// ─── POST /api/saas/forum/:category ───────────────────────────────────────────
router.post('/:category', async (req, res) => {
  const { category } = req.params;
  const { content } = req.body;
  const userId = req.saasUser.id;

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Catégorie invalide' });
  }
  if (!content || content.trim().length < 2) {
    return res.status(400).json({ error: 'Message trop court' });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: 'Message trop long (max 2000 caractères)' });
  }

  const [result] = await db.query(
    'INSERT INTO saas_forum_messages (category_id, user_id, content) VALUES (?, ?, ?)',
    [category, userId, content.trim()]
  );

  const [rows] = await db.query(
    `SELECT fm.id, fm.content, fm.created_at,
            u.name AS author_name, u.id AS author_id
     FROM saas_forum_messages fm
     JOIN saas_users u ON u.id = fm.user_id
     WHERE fm.id = ?`,
    [result.insertId]
  );

  res.status(201).json({ message: rows[0] });
});

// ─── DELETE /api/saas/forum/message/:id ───────────────────────────────────────
// Only the author can delete their own message
router.delete('/message/:id', async (req, res) => {
  const userId = req.saasUser.id;
  const msgId = parseInt(req.params.id);

  const [rows] = await db.query('SELECT user_id FROM saas_forum_messages WHERE id = ?', [msgId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Message introuvable' });
  if (rows[0].user_id !== userId) return res.status(403).json({ error: 'Non autorisé' });

  await db.query('DELETE FROM saas_forum_messages WHERE id = ?', [msgId]);
  res.json({ success: true });
});

export default router;
