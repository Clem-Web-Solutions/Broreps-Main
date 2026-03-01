import express from 'express';
import db from '../config/database.js';
import { requireSaasAuth } from './saas-auth.js';

const router = express.Router();

// All routes require auth
router.use(requireSaasAuth);

// ─── GET /api/saas/modules ─────────────────────────────────────────────────────
// Returns the list of modules with progress for current user
router.get('/', async (req, res) => {
  const userId = req.saasUser.id;

  const [user] = await db.query(
    'SELECT modules_unlocked FROM saas_users WHERE id = ?',
    [userId]
  );
  const unlockedCount = user[0]?.modules_unlocked || 1;

  const [progress] = await db.query(
    'SELECT module_id, watched_seconds, total_seconds, completed FROM saas_module_progress WHERE user_id = ?',
    [userId]
  );

  const progressMap = {};
  for (const p of progress) {
    progressMap[p.module_id] = p;
  }

  // Static module list (extend later from DB if needed)
  const TOTAL_MODULES = 6;
  const modules = Array.from({ length: TOTAL_MODULES }, (_, i) => {
    const id = i + 1;
    const p = progressMap[id];
    return {
      id,
      unlocked: id <= unlockedCount,
      watched_seconds: p?.watched_seconds || 0,
      total_seconds: p?.total_seconds || 0,
      completed: !!p?.completed,
      progress_pct: p?.total_seconds > 0
        ? Math.round((p.watched_seconds / p.total_seconds) * 100)
        : 0,
    };
  });

  res.json({ modules, modules_unlocked: unlockedCount });
});

// ─── PUT /api/saas/modules/:id/progress ───────────────────────────────────────
// Save watch progress (called periodically from the video player)
router.put('/:id/progress', async (req, res) => {
  const userId = req.saasUser.id;
  const moduleId = parseInt(req.params.id);
  const { watched_seconds, total_seconds } = req.body;

  if (!moduleId || watched_seconds == null) {
    return res.status(400).json({ error: 'watched_seconds requis' });
  }

  // Check module is unlocked for this user
  const [user] = await db.query(
    'SELECT modules_unlocked FROM saas_users WHERE id = ?',
    [userId]
  );
  if (moduleId > (user[0]?.modules_unlocked || 1)) {
    return res.status(403).json({ error: 'Module non débloqué' });
  }

  const completed = total_seconds > 0 && watched_seconds / total_seconds >= 0.9 ? 1 : 0;

  await db.query(
    `INSERT INTO saas_module_progress (user_id, module_id, watched_seconds, total_seconds, completed)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       watched_seconds = GREATEST(watched_seconds, VALUES(watched_seconds)),
       total_seconds = IF(VALUES(total_seconds) > 0, VALUES(total_seconds), total_seconds),
       completed = IF(completed = 1, 1, VALUES(completed)),
       last_watched_at = NOW()`,
    [userId, moduleId, watched_seconds, total_seconds || 0, completed]
  );

  res.json({ success: true, completed: !!completed });
});

export default router;
