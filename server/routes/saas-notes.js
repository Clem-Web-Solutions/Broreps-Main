import express from 'express';
import db from '../config/database.js';
import { requireSaasAuth } from './saas-auth.js';

const router = express.Router();

router.use(requireSaasAuth);

const VALID_CATEGORIES = [
  'communication', 'creation', 'discipline',
  'productivite', 'strategie', 'energie', 'impact'
];

// ─── GET /api/saas/notes ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const userId = req.saasUser.id;

  const [scores] = await db.query(
    'SELECT category_id, score FROM saas_notes_scores WHERE user_id = ?',
    [userId]
  );

  const [userRows] = await db.query(
    'SELECT notes_reflection FROM saas_users WHERE id = ?',
    [userId]
  );

  const scoreMap = {};
  for (const s of scores) {
    scoreMap[s.category_id] = s.score;
  }

  res.json({
    scores: scoreMap,
    reflection: userRows[0]?.notes_reflection || '',
  });
});

// ─── PUT /api/saas/notes ───────────────────────────────────────────────────────
router.put('/', async (req, res) => {
  const userId = req.saasUser.id;
  const { scores, reflection } = req.body;

  if (scores && typeof scores === 'object') {
    for (const [catId, score] of Object.entries(scores)) {
      if (!VALID_CATEGORIES.includes(catId)) continue;
      const s = Math.max(0, Math.min(10, parseInt(score) || 0));
      await db.query(
        `INSERT INTO saas_notes_scores (user_id, category_id, score) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE score = VALUES(score)`,
        [userId, catId, s]
      );
    }
  }

  if (reflection !== undefined) {
    await db.query(
      'UPDATE saas_users SET notes_reflection = ? WHERE id = ?',
      [typeof reflection === 'string' ? reflection.slice(0, 5000) : '', userId]
    );
  }

  res.json({ success: true });
});

export default router;
