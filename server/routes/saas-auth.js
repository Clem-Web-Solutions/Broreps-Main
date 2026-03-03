import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import db from '../config/database.js';

const router = express.Router();

// ─── Email transporter ────────────────────────────────────────────────────────
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendSetupEmail(email, name, token) {
  const baseUrl = process.env.SAAS_URL || 'http://localhost:5175';
  const link = `${baseUrl}/setup-password?token=${token}`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"BroReps" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🎉 Bienvenue sur BroReps – Crée ton mot de passe',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:16px">
        <img src="https://broreps.fr/logo.png" alt="BroReps" style="height:40px;margin-bottom:24px"/>
        <h2 style="color:#00A336;margin:0 0 8px">Salut ${name || ''} 👋</h2>
        <p style="color:#a1a1aa;line-height:1.6">
          Ton abonnement BroReps est actif. Il ne te reste plus qu'à créer ton mot de passe pour accéder à ton espace personnel.
        </p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#00A336;color:#fff;border-radius:10px;font-weight:700;text-decoration:none">
          Créer mon mot de passe →
        </a>
        <p style="color:#52525b;font-size:12px">Ce lien expire dans 48h. Si tu n'as pas souscrit à BroReps, ignore cet email.</p>
      </div>
    `,
  });
}

async function sendResetEmail(email, name, token) {
  const baseUrl = process.env.SAAS_URL || 'http://localhost:5175';
  const link = `${baseUrl}/setup-password?token=${token}&reset=1`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"BroReps" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🔑 BroReps – Réinitialisation de ton mot de passe',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:16px">
        <img src="https://broreps.fr/logo.png" alt="BroReps" style="height:40px;margin-bottom:24px"/>
        <h2 style="color:#00A336;margin:0 0 8px">Réinitialisation de mot de passe</h2>
        <p style="color:#a1a1aa">Salut ${name || ''}. Tu as demandé à réinitialiser ton mot de passe BroReps.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#00A336;color:#fff;border-radius:10px;font-weight:700;text-decoration:none">
          Réinitialiser mon mot de passe →
        </a>
        <p style="color:#52525b;font-size:12px">Ce lien expire dans 1h. Si tu n'as pas fait cette demande, ignore cet email.</p>
      </div>
    `,
  });
}

// ─── JWT middleware ────────────────────────────────────────────────────────────
export function requireSaasAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié', code: 'UNAUTHORIZED' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    req.saasUser = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide', code: 'INVALID_TOKEN' });
  }
}

// ─── POST /api/saas/auth/login ─────────────────────────────────────────────────
// Login with email + password
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const [rows] = await db.query('SELECT * FROM saas_users WHERE email = ?', [email]);
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Aucun compte trouvé avec cet email', code: 'NO_ACCOUNT' });
  }
  const user = rows[0];

  if (!user.password) {
    return res.status(403).json({ error: 'Mot de passe non encore défini. Vérifie tes emails.', code: 'NO_PASSWORD' });
  }

  // Block suspended / expired subscriptions
  if (!user.is_active || ['cancelled', 'expired'].includes(user.subscription_status)) {
    return res.status(403).json({ error: 'Ton abonnement est inactif ou expiré', code: 'SUBSCRIPTION_INACTIVE' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Mot de passe incorrect', code: 'INVALID_PASSWORD' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, type: 'saas' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      subscription_status: user.subscription_status,
      subscription_product: user.subscription_product,
      modules_unlocked: user.modules_unlocked,
      next_billing_at: user.next_billing_at,
    },
  });
});

// ─── POST /api/saas/auth/forgot-password ──────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  const [rows] = await db.query('SELECT * FROM saas_users WHERE email = ?', [email]);
  // Always return success to avoid email enumeration
  if (rows.length === 0) return res.json({ success: true });

  const user = rows[0];
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600_000); // 1h

  await db.query(
    'UPDATE saas_users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
    [token, expires, user.id]
  );

  try {
    await sendResetEmail(user.email, user.name, token);
  } catch (e) {
    console.error('[SAAS MAIL] Reset email failed:', e.message);
  }

  res.json({ success: true });
});

// ─── POST /api/saas/auth/setup-password ───────────────────────────────────────
// Handle both first-time setup and password reset
router.post('/setup-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token et mot de passe requis' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
  }

  // Check setup token
  let [rows] = await db.query(
    'SELECT * FROM saas_users WHERE setup_token = ? AND setup_token_expires > NOW()',
    [token]
  );
  let isSetup = rows.length > 0;

  if (!isSetup) {
    // Check reset token
    [rows] = await db.query(
      'SELECT * FROM saas_users WHERE password_reset_token = ? AND password_reset_expires > NOW()',
      [token]
    );
  }

  if (rows.length === 0) {
    return res.status(400).json({ error: 'Lien invalide ou expiré', code: 'INVALID_TOKEN' });
  }

  const user = rows[0];
  const hashed = await bcrypt.hash(password, 10);

  await db.query(
    `UPDATE saas_users SET
      password = ?,
      setup_token = NULL, setup_token_expires = NULL,
      password_reset_token = NULL, password_reset_expires = NULL,
      is_active = 1
     WHERE id = ?`,
    [hashed, user.id]
  );

  const jwtToken = jwt.sign(
    { id: user.id, email: user.email, type: 'saas' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token: jwtToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      subscription_status: user.subscription_status,
      modules_unlocked: user.modules_unlocked,
    },
  });
});

// ─── GET /api/saas/auth/me ─────────────────────────────────────────────────────
router.get('/me', requireSaasAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, email, name, subscription_status, subscription_product,
            modules_unlocked, subscribed_at, next_billing_at, notes_reflection
     FROM saas_users WHERE id = ? AND is_active = 1`,
    [req.saasUser.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  const user = rows[0];

  // Fetch the freshest next billing date from tagadapay_orders (set by webhooks)
  try {
    const [orderRows] = await db.query(
      `SELECT subscription_next_billing_date
       FROM tagadapay_orders
       WHERE customer_email = ? AND order_type = 'subscription'
         AND subscription_next_billing_date IS NOT NULL
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 1`,
      [user.email.toLowerCase()]
    );
    if (orderRows.length > 0 && orderRows[0].subscription_next_billing_date) {
      user.next_billing_at = orderRows[0].subscription_next_billing_date;
    }
  } catch (_) {
    // fallback: keep next_billing_at from saas_users
  }

  // Block if subscription expired
  if (['cancelled', 'expired'].includes(user.subscription_status)) {
    return res.status(403).json({ error: 'Abonnement inactif', code: 'SUBSCRIPTION_INACTIVE', user });
  }

  res.json({ user });
});

export default router;
