import express from 'express';
import OpenAI from 'openai';
import db from '../config/database.js';
import { requireSaasAuth } from './saas-auth.js';

const router = express.Router();

// ─── OpenAI Client ─────────────────────────────────────────────────────────────
let openai = null;
function getOpenAI() {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY non configuré dans .env');
        }
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
}

// ─── Rate Limiting (in-memory, resets at midnight) ────────────────────────────
const DAILY_LIMIT = 20; // messages per user per day
const rateLimitMap = new Map(); // userId -> { count, date }

function checkRateLimit(userId) {
    const today = new Date().toDateString();
    const entry = rateLimitMap.get(userId);

    if (!entry || entry.date !== today) {
        rateLimitMap.set(userId, { count: 0, date: today });
        return { allowed: true, remaining: DAILY_LIMIT };
    }

    if (entry.count >= DAILY_LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: DAILY_LIMIT - entry.count };
}

function incrementRateLimit(userId) {
    const today = new Date().toDateString();
    const entry = rateLimitMap.get(userId);
    if (entry && entry.date === today) {
        entry.count++;
    } else {
        rateLimitMap.set(userId, { count: 1, date: today });
    }
}

// ─── System Prompt (Bridage IA) ───────────────────────────────────────────────
function buildSystemPrompt(userContext) {
    const { name, modulesUnlocked, totalModules, completedModules, subscription } = userContext;

    return `Tu es le Coach IA de BroReps, une plateforme premium de formation pour créateurs de contenu sur les réseaux sociaux (TikTok, Instagram, YouTube, Shorts).

TON RÔLE EXCLUSIF :
- Coacher et guider les créateurs de contenu dans leur croissance sur les réseaux sociaux
- Donner des conseils sur la stratégie de contenu, le montage vidéo, la régularité, la croissance organique
- Aider à trouver des idées de contenu (shorts, vidéos, reels, lives)
- Expliquer les algorithmes TikTok, Instagram, YouTube
- Motiver et accompagner l'utilisateur dans son parcours BroReps

RESTRICTION ABSOLUE :
- Tu ne réponds QUE aux questions liées aux réseaux sociaux, à la création de contenu, au personal branding, à la croissance digitale, à la monétisation de contenu, ou à la plateforme BroReps.
- Si la question n'est PAS liée à ces thèmes (cuisine, politique, mathématiques, programmation, santé générale, etc.), réponds EXACTEMENT ceci :
  "Je suis exclusivement ton Coach BroReps 🎯 Je ne peux pas répondre à cette question. Pose-moi plutôt une question sur ta croissance, ton contenu ou ta stratégie sur les réseaux !"

CONTEXTE DE L'UTILISATEUR :
- Prénom : ${name}
- Abonnement : ${subscription}
- Modules déverrouillés : ${modulesUnlocked}/${totalModules}
- Modules complétés : ${completedModules}/${totalModules}
${completedModules < totalModules ? `- Progression : ${Math.round((completedModules / totalModules) * 100)}% du parcours` : '- Parcours entièrement complété 🎉'}

STYLE DE RÉPONSE :
- Parle en français, avec un ton dynamique, bienveillant et motivant
- Utilise des emojis pertinents (pas trop)
- Sois concis mais complet (max 250 mots sauf si question complexe)
- Personnalise tes réponses en fonction du profil de l'utilisateur quand c'est pertinent
- Encourage l'utilisateur à continuer son parcours BroReps si pas encore terminé`;
}

// ─── GET /api/saas/ai/status ───────────────────────────────────────────────────
// Returns rate limit info for the current user
router.get('/status', requireSaasAuth, (req, res) => {
    const userId = req.saasUser.id;
    const { allowed, remaining } = checkRateLimit(userId);
    const configured = !!process.env.OPENAI_API_KEY;

    res.json({
        configured,
        allowed,
        remaining,
        daily_limit: DAILY_LIMIT,
    });
});

// ─── POST /api/saas/ai/chat ────────────────────────────────────────────────────
// Main chat endpoint — streams response back with SSE
router.post('/chat', requireSaasAuth, async (req, res) => {
    const userId = req.saasUser.id;
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message requis' });
    }

    if (message.trim().length > 500) {
        return res.status(400).json({ error: 'Message trop long (max 500 caractères)' });
    }

    // Rate limit check
    const { allowed, remaining } = checkRateLimit(userId);
    if (!allowed) {
        return res.status(429).json({
            error: 'Limite quotidienne atteinte',
            message: `Tu as atteint ta limite de ${DAILY_LIMIT} messages par jour. Reviens demain ! 🌙`,
            remaining: 0,
        });
    }

    // OpenAI configured?
    if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ error: 'Coach IA non configuré. Contacte le support.' });
    }

    // Get user context from DB
    let userContext = {
        name: req.saasUser.name || 'Créateur',
        subscription: 'Premium',
        modulesUnlocked: 1,
        totalModules: 6,
        completedModules: 0,
    };

    try {
        const [users] = await db.query(
            'SELECT name, subscription_product, modules_unlocked FROM saas_users WHERE id = ?',
            [userId]
        );
        if (users.length > 0) {
            const u = users[0];
            userContext.name = u.name?.split(' ')[0] || 'Créateur';
            userContext.subscription = u.subscription_product || 'Premium';
            userContext.modulesUnlocked = u.modules_unlocked || 1;
        }

        const [progress] = await db.query(
            'SELECT COUNT(*) as completed FROM saas_module_progress WHERE user_id = ? AND completed = 1',
            [userId]
        );
        userContext.completedModules = progress[0]?.completed || 0;
    } catch (e) {
        console.error('[AI] Failed to get user context:', e.message);
    }

    // Build messages array
    const systemPrompt = buildSystemPrompt(userContext);

    // Keep last 10 history messages to avoid token overflow
    const trimmedHistory = history.slice(-10);

    const messages = [
        { role: 'system', content: systemPrompt },
        ...trimmedHistory.map(h => ({
            role: h.role,
            content: h.content,
        })),
        { role: 'user', content: message.trim() },
    ];

    // SSE streaming setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    try {
        const client = getOpenAI();

        const stream = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages,
            max_tokens: 500,
            temperature: 0.75,
            stream: true,
        });

        incrementRateLimit(userId);

        let fullContent = '';

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
                fullContent += delta;
                res.write(`data: ${JSON.stringify({ delta })}\n\n`);
            }
        }

        // Send final event with remaining count
        const { remaining: newRemaining } = checkRateLimit(userId);
        res.write(`data: ${JSON.stringify({ done: true, remaining: newRemaining })}\n\n`);
        res.end();

        console.log(`[AI] User ${userId} (${userContext.name}) — message processed. Remaining today: ${newRemaining}`);
    } catch (err) {
        console.error('[AI] OpenAI error:', err.message);

        // Send error through SSE
        res.write(`data: ${JSON.stringify({ error: 'Erreur lors de la génération. Réessaie dans un instant.' })}\n\n`);
        res.end();
    }
});

export default router;
