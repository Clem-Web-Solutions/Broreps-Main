import express from 'express';
import db from '../config/database.js';
import { requireSaasAuth } from './saas-auth.js';

const router = express.Router();

router.use(requireSaasAuth);

// ─── GET /api/saas/hub ─────────────────────────────────────────────────────────
// ?filter=recent|populaire|collab
router.get('/', async (req, res) => {
  const userId = req.saasUser.id;
  const { filter = 'recent' } = req.query;

  let orderBy = 'hp.created_at DESC';
  if (filter === 'populaire') orderBy = 'hp.likes_count DESC, hp.created_at DESC';

  let whereExtra = '';
  if (filter === 'collab') whereExtra = "AND hp.post_type = 'collab'";

  const [posts] = await db.query(
    `SELECT hp.id, hp.content, hp.post_type, hp.likes_count, hp.created_at,
            u.name AS author_name, u.id AS author_id,
            EXISTS(
              SELECT 1 FROM saas_hub_likes l WHERE l.post_id = hp.id AND l.user_id = ?
            ) AS liked_by_me
     FROM saas_hub_posts hp
     JOIN saas_users u ON u.id = hp.user_id
     WHERE 1=1 ${whereExtra}
     ORDER BY ${orderBy}
     LIMIT 50`,
    [userId]
  );

  res.json({ posts });
});

// ─── POST /api/saas/hub ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const userId = req.saasUser.id;
  const { content, post_type = 'recent' } = req.body;

  if (!content || content.trim().length < 2) {
    return res.status(400).json({ error: 'Contenu requis' });
  }
  if (content.length > 1000) {
    return res.status(400).json({ error: 'Contenu trop long (max 1000 caractères)' });
  }

  const validTypes = ['recent', 'collab'];
  const type = validTypes.includes(post_type) ? post_type : 'recent';

  const [result] = await db.query(
    'INSERT INTO saas_hub_posts (user_id, content, post_type) VALUES (?, ?, ?)',
    [userId, content.trim(), type]
  );

  const [rows] = await db.query(
    `SELECT hp.id, hp.content, hp.post_type, hp.likes_count, hp.created_at,
            u.name AS author_name, u.id AS author_id, 0 AS liked_by_me
     FROM saas_hub_posts hp JOIN saas_users u ON u.id = hp.user_id
     WHERE hp.id = ?`,
    [result.insertId]
  );

  res.status(201).json({ post: rows[0] });
});

// ─── POST /api/saas/hub/:id/like ──────────────────────────────────────────────
router.post('/:id/like', async (req, res) => {
  const userId = req.saasUser.id;
  const postId = parseInt(req.params.id);

  const [existing] = await db.query(
    'SELECT id FROM saas_hub_likes WHERE post_id = ? AND user_id = ?',
    [postId, userId]
  );

  if (existing.length > 0) {
    // Unlike
    await db.query('DELETE FROM saas_hub_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    await db.query('UPDATE saas_hub_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', [postId]);
    const [[updated]] = await db.query('SELECT likes_count FROM saas_hub_posts WHERE id = ?', [postId]);
    return res.json({ liked: false, likes_count: updated?.likes_count ?? 0 });
  }

  // Like
  await db.query('INSERT INTO saas_hub_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  await db.query('UPDATE saas_hub_posts SET likes_count = likes_count + 1 WHERE id = ?', [postId]);
  const [[updated]] = await db.query('SELECT likes_count FROM saas_hub_posts WHERE id = ?', [postId]);
  res.json({ liked: true, likes_count: updated?.likes_count ?? 0 });
});

// ─── DELETE /api/saas/hub/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const userId = req.saasUser.id;
  const postId = parseInt(req.params.id);

  const [rows] = await db.query('SELECT user_id FROM saas_hub_posts WHERE id = ?', [postId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Post introuvable' });
  if (rows[0].user_id !== userId) return res.status(403).json({ error: 'Non autorisé' });

  await db.query('DELETE FROM saas_hub_posts WHERE id = ?', [postId]);
  res.json({ success: true });
});

export default router;
