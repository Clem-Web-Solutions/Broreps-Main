import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import db from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { normalizeSocialLink, extractUsername } from '../lib/username-extractor.js';

const router = express.Router();

// Middleware to verify TagadaPay webhook signature
const verifyTagadaPayWebhook = (req, res, next) => {
  const signature = req.headers['x-tagadapay-signature'];
  const secret = process.env.TAGADAPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[ERREUR] TAGADAPAY_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  if (!signature) {
    console.error('[ERREUR] No signature in headers');
    return res.status(401).send('No signature');
  }

  const body = req.rawBody;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');

  // TagadaPay signature format: "sha256=hash" or "t=timestamp,v1=signature"
  let expectedSignature = signature;
  
  // Remove "sha256=" prefix if present
  if (signature.startsWith('sha256=')) {
    expectedSignature = signature.replace('sha256=', '');
  } 
  // Or extract from "t=timestamp,v1=signature" format
  else if (signature.includes(',')) {
    const signatureParts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {});
    expectedSignature = signatureParts.v1 || signatureParts.sha256 || signature;
  }

  console.log('[DEBUG] Computed hash:', hash);
  console.log('[DEBUG] Expected signature:', expectedSignature);

  if (hash === expectedSignature) {
    console.log('[OK] TagadaPay webhook signature verified');
    
    // Parse JSON body manually
    try {
      req.body = JSON.parse(body);
    } catch (error) {
      console.error('[ERREUR] Failed to parse webhook JSON:', error);
      return res.status(400).send('Invalid JSON');
    }
    
    next();
  } else {
    console.error('[ERREUR] Invalid TagadaPay webhook signature');
    console.error('[DEBUG] Computed:', hash);
    console.error('[DEBUG] Received:', expectedSignature);
    res.status(401).send('Unauthorized');
  }
};

// Webhook endpoint for payment events
router.post('/webhook', verifyTagadaPayWebhook, async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  try {
    const event = req.body;
    const eventType = event.type || event.event;
    
    console.log('[WEBHOOK] TagadaPay Event Received:', {
      type: eventType,
      id: event.id,
      payment_id: event.data?.id
    });
    
    // Debug: Log full payload for order/paid events
    if (eventType === 'order/paid') {
      console.log('[DEBUG] Full order/paid payload:', JSON.stringify(event, null, 2));
    }

    // Log webhook reception
    await db.query(`
      INSERT INTO tagadapay_webhook_logs (event_type, event_id, payload, ip_address, signature_valid)
      VALUES (?, ?, ?, ?, ?)
    `, [eventType, event.id, JSON.stringify(event), clientIp, true]);

    // Handle different event types
    switch (eventType) {
      // One-time payments
      case 'payment.succeeded':
      case 'checkout.completed':
      case 'order/paid':
        await processPaymentSuccess(event.data || event, 'one_time');
        break;
      
      case 'order/created':
        console.log('[INFO] Order created, waiting for payment');
        break;
      
      case 'order/paymentInitiated':
        console.log('[INFO] Payment initiated, waiting for completion');
        break;
      
      case 'payment.failed':
      case 'order/failed':
        await processPaymentFailed(event.data || event);
        break;
      
      case 'payment.refunded':
      case 'order/refunded':
        await processPaymentRefund(event.data || event);
        break;
      
      // Subscriptions
      case 'subscription.created':
        await processSubscriptionCreated(event.data);
        break;
      
      case 'subscription.payment_succeeded':
        await processSubscriptionPaymentSuccess(event.data);
        break;
      
      case 'subscription.payment_failed':
        await processSubscriptionPaymentFailed(event.data);
        break;
      
      case 'subscription.updated':
        await processSubscriptionUpdated(event.data);
        break;
      
      case 'subscription.cancelled':
      case 'subscription.canceled':
        await processSubscriptionCancelled(event.data);
        break;
      
      case 'subscription.paused':
        await processSubscriptionPaused(event.data);
        break;
      
      case 'subscription.resumed':
        await processSubscriptionResumed(event.data);
        break;
      
      case 'checkout.session.created':
        await processCheckoutCreated(event.data);
        break;
      
      case 'test.webhook':
        console.log('[TEST] TagadaPay test webhook received successfully');
        break;
      
      default:
        console.log('[INFO] Unhandled event type:', eventType);
    }

    // Mark webhook as processed
    await db.query(`
      UPDATE tagadapay_webhook_logs 
      SET processed = true
      WHERE event_id = ?
    `, [event.id]);

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('[ERREUR] TagadaPay webhook erro:', error);
    
    // Log error
    try {
      await db.query(`
        UPDATE tagadapay_webhook_logs 
        SET processed = false, error_message = ?
        WHERE event_id = ?
        ORDER BY created_at DESC LIMIT 1
      `, [error.message, req.body.id]);
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// Smart service matching function
async function findServiceByProductName(productName, variantName = '') {
  console.log('[SMART MATCH] Recherche du service pour:', { productName, variantName });
  
  const fullText = `${productName} ${variantName}`.toLowerCase();
  
  // Get all available services
  const [services] = await db.query('SELECT * FROM allowed_services');
  
  if (services.length === 0) {
    console.log('[WARN] Aucun service disponible dans la base de données');
    return null;
  }
  
  // Define keywords for matching
  const keywords = {
    // Platforms
    instagram: ['instagram', 'insta', 'ig'],
    tiktok: ['tiktok', 'tik tok'],
    youtube: ['youtube', 'yt'],
    facebook: ['facebook', 'fb'],
    twitter: ['twitter', 'x'],
    
    // Services
    followers: ['abonné', 'abonnés', 'follower', 'followers', 'sub', 'subscriber'],
    likes: ['like', 'likes', 'j\'aime', 'jaime'],
    views: ['vue', 'vues', 'view', 'views', 'visionnage'],
    comments: ['commentaire', 'commentaires', 'comment', 'comments'],
    shares: ['partage', 'partages', 'share', 'shares'],
    saves: ['save', 'saves', 'enregistrement'],
    reels: ['reel', 'reels'],
    story: ['story', 'stories', 'storie']
  };
  
  // Extract platform and service type from text
  let detectedPlatform = null;
  let detectedService = null;
  
  for (const [platform, terms] of Object.entries(keywords)) {
    for (const term of terms) {
      if (fullText.includes(term)) {
        if (['instagram', 'tiktok', 'youtube', 'facebook', 'twitter'].includes(platform)) {
          detectedPlatform = platform;
        } else {
          detectedService = platform;
        }
      }
    }
  }
  
  console.log('[SMART MATCH] Détection:', { 
    platform: detectedPlatform, 
    service: detectedService 
  });
  
  // Find matching service in database
  let bestMatch = null;
  let bestScore = 0;
  
  for (const service of services) {
    const serviceName = service.service_name.toLowerCase();
    let score = 0;
    
    // Check platform match
    if (detectedPlatform) {
      const platformTerms = keywords[detectedPlatform];
      if (platformTerms.some(term => serviceName.includes(term))) {
        score += 10;
      }
    }
    
    // Check service type match
    if (detectedService) {
      const serviceTerms = keywords[detectedService];
      if (serviceTerms.some(term => serviceName.includes(term))) {
        score += 10;
      }
    }
    
    // Bonus: Exact word match
    const productWords = fullText.split(/\s+/);
    const serviceWords = serviceName.split(/\s+/);
    const commonWords = productWords.filter(word => 
      word.length > 3 && serviceWords.some(sw => sw.includes(word))
    );
    score += commonWords.length * 2;
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = service;
    }
  }
  
  // Bonus points: if the product is a named pack AND the service in the DB is also a pack
  if (fullText.includes('pack')) {
    for (const service of services) {
      if (service.is_pack) {
        const serviceName = service.service_name.toLowerCase();
        let score = 0;
        // Platform match
        for (const [platform, terms] of Object.entries(keywords)) {
          if (!['instagram','tiktok','youtube','facebook','twitter'].includes(platform)) continue;
          if (terms.some(t => fullText.includes(t)) && terms.some(t => serviceName.includes(t))) score += 10;
        }
        // "pack" word in both
        if (serviceName.includes('pack')) score += 10;
        if (score > bestScore) { bestScore = score; bestMatch = service; }
      }
    }
  }

  // Score >= 20 requires BOTH platform AND service type to match — prevents false positives
  if (bestMatch && bestScore >= 20) {
    console.log('[SMART MATCH] ✅ Service trouvé:', {
      id: bestMatch.id,
      name: bestMatch.service_name,
      score: bestScore
    });
    return bestMatch;
  }
  
  console.log('[SMART MATCH] ❌ Aucun service correspondant trouvé (meilleur score:', bestScore, '— minimum requis: 20)');
  console.log('[SMART MATCH] → Vérifiez que le nom du service dans le catalogue contient la plateforme ET le type (ex: "Abonnés TikTok")');
  return null;
}

// ── Inline pack helpers ────────────────────────────────────────────────────
// Detect platform from arbitrary text
function detectPlatformFromText(text) {
  const t = text.toLowerCase();
  if (t.includes('tiktok') || t.includes('tik tok')) return 'tiktok';
  if (t.includes('instagram') || t.includes('insta')) return 'instagram';
  if (t.includes('youtube') || t.includes(' yt ')) return 'youtube';
  if (t.includes('facebook') || t.includes(' fb ')) return 'facebook';
  if (t.includes('twitch')) return 'twitch';
  return null;
}

// Detect service type from a short segment like "25k Vues" or "5000 Likes"
function detectServiceTypeFromText(text) {
  const t = text.toLowerCase();
  if (/vue|view|visibi/.test(t))            return 'views';
  if (/abonn|follower|subscriber/.test(t))  return 'followers';
  if (/like|j'aime|jaime/.test(t))          return 'likes';
  if (/partage|share/.test(t))              return 'shares';
  if (/favori|save|enregistr/.test(t))      return 'saves';
  if (/commentaire|comment/.test(t))        return 'comments';
  return null;
}

// Parse "25k Vues | 5000 Likes | 1000 Partages" into [{qty, serviceType, rawSegment}]
function parseInlinePackSegments(variantName, productName = '') {
  if (!variantName || !variantName.includes('|')) return null;
  const platform = detectPlatformFromText(`${productName} ${variantName}`);
  const segments = variantName.split('|').map(s => s.trim()).filter(Boolean);
  const parsed = [];
  for (const seg of segments) {
    // Normalise thousands
    const norm = seg
      .replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2')
      .replace(/(\d) (\d{3})(?!\d)/g, '$1$2');
    const kMatch = norm.match(/(\d+)k/i);
    const nMatch = norm.match(/(\d+)/);
    if (!kMatch && !nMatch) continue;
    const qty = kMatch ? parseInt(kMatch[1]) * 1000 : parseInt(nMatch[1]);
    const serviceType = detectServiceTypeFromText(seg);
    if (!serviceType || !qty) continue;
    parsed.push({ qty, serviceType, platform, rawSegment: seg });
  }
  return parsed.length > 0 ? { platform, segments: parsed } : null;
}

// Find the best non-pack service matching a platform + service type
async function findServiceForTypeAndPlatform(serviceType, platform) {
  const [services] = await db.query('SELECT * FROM allowed_services WHERE is_pack = 0 OR is_pack IS NULL');
  const typeKw = {
    views:     ['vue', 'vues', 'view', 'views', 'visib'],
    likes:     ['like', 'likes', "j'aime", 'jaime'],
    followers: ['abonn', 'follower', 'subscriber'],
    shares:    ['partage', 'partages', 'share', 'shares'],
    saves:     ['favori', 'favoris', 'save', 'saves', 'enregistr'],
    comments:  ['commentaire', 'comment'],
  };
  const platKw = {
    tiktok:    ['tiktok', 'tik tok'],
    instagram: ['instagram', 'insta'],
    youtube:   ['youtube'],
    twitch:    ['twitch'],
    facebook:  ['facebook', 'fb'],
  };
  let best = null, bestScore = 0;
  for (const svc of services) {
    const name = svc.service_name.toLowerCase();
    let score = 0;
    if (platform && platKw[platform]?.some(k => name.includes(k))) score += 10;
    if (serviceType && typeKw[serviceType]?.some(k => name.includes(k))) score += 10;
    if (score > bestScore) { bestScore = score; best = svc; }
  }
  return bestScore >= 20 ? best : null;
}
// ── /Inline pack helpers ─────────────────────────────────────────────────────

// Extract quantity from variant name
function extractQuantityFromVariant(variantName, fallbackQuantity = 1) {
  if (!variantName) return fallbackQuantity;
  // Inline pack variant ("25k Vues | 5000 Likes | ...") — each segment has its own qty
  // Return 1 here; quantities will be parsed per-segment in the pack fan-out logic
  if (variantName.includes('|')) return fallbackQuantity;

  // Normalize French thousand separators: "2.500" → "2500", "10 000" → "10000", "10.000" → "10000"
  const normalized = variantName
    .replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2')   // dot separator: 10.000 → 10000
    .replace(/(\d)\s(\d{3})(?!\d)/g, '$1$2');   // space separator: 10 000 → 10000

  // Match patterns like "1000 ›", "• 1000", "5k", "10K"
  const patterns = [
    /(\d+)k[\s›•·]?/i, // "5k " or "5K›" (k immediately after number)
    /(\d+)\s*[››]/, // "1000 ›"
    /[•·]\s*(\d+)/, // "• 1000"
    /(\d+)\s*abonné/, // "1000 abonnés"
    /(\d+)\s*like/, // "500 likes"
    /(\d+)\s*vue/, // "2000 vues"
    /(\d+)/ // Any number (last fallback)
  ];
  
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      let quantity = parseInt(match[1]);

      // Handle "k" suffix (thousands) - only if it's the first pattern
      if (pattern === patterns[0]) {
        quantity *= 1000;
      }

      console.log('[QUANTITY] Extracted from variant:', {
        variant: variantName,
        normalized,
        quantity
      });

      return quantity;
    }
  }

  return fallbackQuantity;
}

// ── SaaS account provisioning ──────────────────────────────────────────────────
// Called on every successful payment. Creates the member if new, or unlocks
// the next module if it's a renewal. Sends setup email on first subscription.
async function provisionSaasAccount(email, name, productName, paymentData) {
  const normalizedEmail = email.toLowerCase().trim();
  console.log('[SAAS] Provisioning account for:', normalizedEmail);

  // Determine next billing date (now + 30 days as default)
  const nextBilling = new Date();
  nextBilling.setDate(nextBilling.getDate() + 30);

  const [rows] = await db.query(
    'SELECT * FROM saas_users WHERE email = ?',
    [normalizedEmail]
  );

  if (rows.length === 0) {
    // ── New subscriber ─────────────────────────────────────────────────────
    const setupToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 48 * 3600_000); // 48h

    await db.query(
      `INSERT INTO saas_users
         (email, name, subscription_status, subscription_product,
          modules_unlocked, subscribed_at, next_billing_at,
          setup_token, setup_token_expires)
       VALUES (?, ?, 'active', ?, 1, NOW(), ?, ?, ?)`,
      [normalizedEmail, name || normalizedEmail.split('@')[0],
       productName || 'Abonnement BroReps',
       nextBilling, setupToken, expires]
    );

    console.log('[SAAS] ✅ New member created:', normalizedEmail);

    // Send setup email
    try {
      await sendSaasSetupEmail(normalizedEmail, name, setupToken);
      console.log('[SAAS MAIL] ✅ Setup email sent to:', normalizedEmail);
    } catch (err) {
      console.error('[SAAS MAIL] ❌ Failed to send setup email:', err.message);
    }
  } else {
    // ── Renewal ────────────────────────────────────────────────────────────
    const user = rows[0];
    const newModulesCount = user.modules_unlocked + 1;

    await db.query(
      `UPDATE saas_users SET
         subscription_status = 'active',
         modules_unlocked = LEAST(?, modules_unlocked + 1),
         next_billing_at = ?,
         is_active = 1
       WHERE id = ?`,
      [6, nextBilling, user.id] // max 6 modules
    );

    console.log('[SAAS] ✅ Renewal: modules unlocked →', Math.min(newModulesCount, 6), 'for', normalizedEmail);
  }
}

function sendSaasSetupEmail(email, name, token) {
  const baseUrl = process.env.SAAS_URL || 'http://localhost:5175';
  const link = `${baseUrl}/setup-password?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  return transporter.sendMail({
    from: process.env.SMTP_FROM || `"BroReps" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🎉 Bienvenue sur BroReps – Crée ton mot de passe',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:16px">
        <img src="https://broreps.fr/logo.png" alt="BroReps" style="height:40px;margin-bottom:24px"/>
        <h2 style="color:#00A336;margin:0 0 8px">Salut ${name || ''} 👋</h2>
        <p style="color:#a1a1aa;line-height:1.6">
          Ton abonnement BroReps est actif.<br/>
          Il ne te reste plus qu'à créer ton mot de passe pour accéder à ton espace personnel.
        </p>
        <a href="${link}"
           style="display:inline-block;margin:24px 0;padding:14px 28px;background:#00A336;color:#fff;border-radius:10px;font-weight:700;text-decoration:none">
          Créer mon mot de passe →
        </a>
        <p style="color:#52525b;font-size:12px">Ce lien expire dans 48h.</p>
      </div>
    `,
  });
}

// Fetch full order details from TagadaPay API (enriches webhook with email + form fields)
// Tries multiple endpoints in cascade: GET /orders/{id} → POST /orders/list → GET /payments/{id}
async function fetchTagadaPayOrder({ orderId, paymentId, cartToken } = {}) {
  const apiKey = process.env.TAGADAPAY_API_KEY;
  const isDev = (process.env.TAGADAPAY_ENVIRONMENT || '').toLowerCase().includes('dev');
  const defaultBase = isDev
    ? 'https://app.tagadapay.dev/api/public/v1'
    : 'https://app.tagadapay.com/api/public/v1';
  const baseUrl = process.env.TAGADAPAY_BASE_URL || defaultBase;

  if (!apiKey) {
    console.warn('[TAGADAPAY API] TAGADAPAY_API_KEY non configurée — enrichissement ignoré');
    return null;
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // Helper: GET request
  const tryGet = async (label, url) => {
    try {
      const r = await fetch(url, { method: 'GET', headers });
      if (!r.ok) { console.warn(`[TAGADAPAY API] ${label} → ${r.status} ${r.statusText}`); return null; }
      const d = await r.json();
      console.log(`[TAGADAPAY API] ✅ Enrichissement via ${label}:`, JSON.stringify(d, null, 2));
      return d;
    } catch (e) { console.error(`[TAGADAPAY API] ❌ ${label}:`, e.message); return null; }
  };

  // Helper: POST /orders/list filtered by orderId
  const tryOrdersList = async () => {
    if (!orderId) return null;
    try {
      const r = await fetch(`${baseUrl}/orders/list`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filters: { 'orders.id': { condition: 'is-equal', value: orderId } },
          pagination: { page: 1, pageSize: 1 },
        }),
      });
      if (!r.ok) { console.warn(`[TAGADAPAY API] POST /orders/list → ${r.status} ${r.statusText}`); return null; }
      const d = await r.json();
      const item = d?.data?.[0] || d?.orders?.[0] || d?.items?.[0] || null;
      if (item) console.log(`[TAGADAPAY API] ✅ Enrichissement via POST /orders/list:`, JSON.stringify(item, null, 2));
      return item;
    } catch (e) { console.error('[TAGADAPAY API] ❌ POST /orders/list:', e.message); return null; }
  };

  // Cascade: GET by orderId → POST list → GET by paymentId
  const result =
    (orderId   ? await tryGet(`GET /orders/${orderId}`, `${baseUrl}/orders/${orderId}`) : null) ||
    await tryOrdersList() ||
    (paymentId ? await tryGet(`GET /payments/${paymentId}`, `${baseUrl}/payments/${paymentId}`) : null);

  if (!result) console.warn('[TAGADAPAY API] Aucun endpoint n\'a retourné de données — commande sans enrichissement');
  return result;
}

// Process successful payment (one-time)
async function processPaymentSuccess(payment, orderType = 'one_time') {
  console.log('[DEBUG] processPaymentSuccess called with:', JSON.stringify(payment, null, 2));
  
  // TagadaPay structure: payment has paymentId, orderId, lineItems, etc.
  const payment_id = payment.paymentId || payment.id || payment.payment_id || 'unknown';
  const order_id   = payment.orderId || payment.order_id;
  const cart_token = payment.cartToken || payment.cart_token;
  const timestamp  = payment.timestamp || payment.createdAt || payment.created_at;

  // ── Enrichissement via API TagadaPay ──────────────────────────────────────
  const orderDetails = await fetchTagadaPayOrder({
    paymentId: payment_id !== 'unknown' ? payment_id : null,
    orderId:   order_id,
    cartToken: cart_token,
  });
  // Unwrap response: { order: { ... } } or { data: { ... } } or direct
  const enriched = orderDetails?.order || orderDetails?.data || orderDetails || {};

  // Email + nom client depuis l'API
  const enrichedCustomer = enriched.customer || enriched.customerInfo || enriched.buyerInfo || {};
  const enrichedEmail = enrichedCustomer.email || enrichedCustomer.billingAddress?.email || enriched.email || enriched.customerEmail || null;
  const enrichedFirstName = enrichedCustomer.firstName || '';
  const enrichedLastName  = enrichedCustomer.lastName  || '';
  const enrichedName = enrichedCustomer.name || enrichedCustomer.fullName || enriched.customerName
    || ((enrichedFirstName || enrichedLastName) ? `${enrichedFirstName} ${enrichedLastName}`.trim() : null);

  // Shopify order number (stocké dans metadata.shopify_order_number)
  const shopifyOrderNumber = enriched.metadata?.shopify_order_number || enriched.metadata?.shopify_number || null;

  // Social link — TagadaPay stocke le lien dans metadata.cartCustomAttributes: [{name: "Nom D'utilisateur", value: "..."}]
  const isSocialFieldKey = (str) => ['link','url','lien','video','vidéo','instagram','tiktok','twitch','social','profil','compte','utilisateur','username'].some(k => str.toLowerCase().includes(k));
  const cartCustomAttrs = enriched.metadata?.cartCustomAttributes || [];
  const socialFromCart = Array.isArray(cartCustomAttrs)
    ? (cartCustomAttrs.find(a => isSocialFieldKey(a.name || ''))?.value || '')
    : '';
  const formFields = enriched.formFields || enriched.customFields || enriched.orderFields || enriched.fields || [];
  const socialFieldFromApi = Array.isArray(formFields)
    ? formFields.find(f => isSocialFieldKey(f.key || f.name || f.label || ''))
    : null;
  const socialLinkFromApi = socialFromCart || socialFieldFromApi?.value || socialFieldFromApi?.answer || '';
  // ─────────────────────────────────────────────────────────────────────────
  
  // Extract first line item for product info
  const lineItem = payment.lineItems?.[0] || {};
  const amount = lineItem.unitAmount || payment.amount || 0;
  const productName = lineItem.productName || lineItem.product_name || payment.product_title || 'Service';
  const variantName = lineItem.variantName || lineItem.variant_name || '';
  
  // Smart quantity extraction from variant name
  const baseQuantity = lineItem.quantity || payment.quantity || 1;
  const quantity = extractQuantityFromVariant(variantName, baseQuantity);
  
  // Extract metadata (optional - we can auto-detect service)
  const metadata = payment.metadata || {};
  // Priorité : API formFields > metadata webhook > vide
  const socialLink = socialLinkFromApi || metadata.social_link || metadata.instagram || metadata.tiktok || '';
  
  // Smart service matching - auto-detect if not provided
  let serviceId = metadata.service_id || null;
  let autoMatched = false;
  
  if (!serviceId && productName) {
    console.log('[AUTO-MATCH] service_id non fourni, recherche automatique...');
    const matchedService = await findServiceByProductName(productName, variantName);
    
    if (matchedService) {
      serviceId = matchedService.id;
      autoMatched = true;
      console.log('[AUTO-MATCH] ✅ Service détecté automatiquement:', {
        product: `${productName} - ${variantName}`,
        matched_service: matchedService.service_name,
        service_id: serviceId
      });
    } else {
      console.log('[AUTO-MATCH] ❌ Aucun service correspondant trouvé');
    }
  }
  
  // Extract customer info — priorise les données enrichies de l'API
  const customer = payment.customer || {};
  const customerEmail = enrichedEmail || customer.email || payment.email || payment.customerEmail || null;
  const customerName  = enrichedName  || customer.name  || customer.fullName || payment.customerName || null;

  const currency = payment.currency || 'EUR';
  const status = payment.status || 'succeeded';

  console.log(`[PAYMENT] Payment #${payment_id} succeeded`);
  console.log('[OK] Paiement validé:', {
    amount: `${amount / 100} ${currency}`,
    orderId: order_id,
    customer: customerEmail || 'unknown'
  });

  console.log('[DEBUG] Extracted data:', {
    payment_id,
    order_id,
    amount,
    currency,
    productName,
    variantName,
    quantity,
    socialLink: socialLink || 'MISSING',
    serviceId: serviceId ? `${serviceId} ${autoMatched ? '(auto-détecté)' : '(metadata)'}` : 'MISSING',
    customerEmail: customerEmail || 'MISSING',
    metadata,
    autoMatched
  });

  // Normalize: turn bare usernames into full profile URLs
  const normalizedSocialLink = socialLink ? normalizeSocialLink(socialLink, `${productName} ${variantName}`) : '';

  // Check if payment already processed
  const [existing] = await db.query(
    'SELECT id FROM tagadapay_orders WHERE payment_id = ?',
    [payment_id]
  );

  if (existing.length > 0) {
    console.log('[WARN] Payment already processed:', payment_id);
    return existing[0].id;
  }

  // Combine product name and variant for title
  const fullProductTitle = variantName ? `${productName} - ${variantName}` : productName;

  // Insert into tagadapay_orders table
  const [result] = await db.query(`
    INSERT INTO tagadapay_orders (
      payment_id,
      checkout_session_id,
      order_id,
      order_type,
      customer_email,
      customer_name,
      customer_phone,
      product_title,
      quantity,
      amount,
      currency,
      social_link,
      service_id,
      payment_status,
      metadata,
      payment_created_at,
      shopify_order_number,
      is_processed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    payment_id,
    null, // checkoutSessionId
    order_id,
    orderType,
    customerEmail?.toLowerCase() || null,
    customerName || null,
    null, // customer phone
    fullProductTitle,
    quantity,
    amount, // Amount in cents
    currency.toUpperCase(),
    normalizedSocialLink,
    serviceId,
    status,
    JSON.stringify(metadata),
    timestamp || new Date().toISOString(),
    shopifyOrderNumber || null,
    false
  ]);

  console.log('[OK] TagadaPay order saved:', {
    id: result.insertId,
    payment_id: payment_id,
    email: customerEmail || 'unknown',
    social_link: normalizedSocialLink || 'NON FOURNI',
    amount: `${amount / 100} ${currency}`,
    status: 'paid'
  });

  // Create internal order automatically
  // ── Inline pack: variant contains "25k Vues | 5000 Likes | ..." ─────────────
  const inlinePack = parseInlinePackSegments(variantName, productName);
  if (inlinePack && normalizedSocialLink) {
    console.log(`[INLINE-PACK] Détection d'un pack inline — ${inlinePack.segments.length} segment(s), plateforme: ${inlinePack.platform}`);
    let successCount = 0;
    let firstOrderId = null;
    for (const seg of inlinePack.segments) {
      try {
        const svc = await findServiceForTypeAndPlatform(seg.serviceType, seg.platform);
        if (!svc) {
          console.warn(`[INLINE-PACK] ⚠️  Aucun service trouvé pour ${seg.rawSegment} (type: ${seg.serviceType}, platform: ${seg.platform})`);
          continue;
        }
        const orderId = await createInternalOrder(result.insertId, {
          serviceId:          svc.id,
          socialLink:         normalizedSocialLink,
          quantity:           seg.qty,
          customerEmail,
          shopifyOrderNumber: shopifyOrderNumber || null,
          _skipPackCheck:     true,
        });
        console.log(`[INLINE-PACK] ✅ ${seg.rawSegment} → ${svc.service_name} (qty: ${seg.qty}, order: ${orderId})`);
        if (!firstOrderId && orderId) firstOrderId = orderId;
        successCount++;
      } catch (err) {
        console.error(`[INLINE-PACK] ❌ ${seg.rawSegment}:`, err.message);
      }
    }
    if (firstOrderId) {
      await db.query(
        `UPDATE tagadapay_orders SET internal_order_id = ?, is_processed = true WHERE id = ?`,
        [firstOrderId, result.insertId]
      );
    }
    console.log(`[INLINE-PACK] ✅ ${successCount}/${inlinePack.segments.length} commandes créées`);
  } else if (serviceId && normalizedSocialLink && quantity) {
    try {
      await createInternalOrder(result.insertId, {
        serviceId,
        socialLink: normalizedSocialLink,
        quantity,
        customerEmail: customerEmail,
        shopifyOrderNumber: shopifyOrderNumber || null,
      });
    } catch (error) {
      console.error('[ERREUR] Failed to create internal order:', error);
    }
  } else {
    console.log('[WARN] Missing required fields for auto-order creation:', {
      serviceId: serviceId ? `✓ ${autoMatched ? '(auto-détecté)' : '(metadata)'}` : '✗ MANQUANT',
      socialLink: normalizedSocialLink ? '✓' : '✗ MANQUANT',
      quantity: quantity ? '✓' : '✗'
    });
    
    if (!serviceId) {
      if (autoMatched === false) {
        console.log('[INFO] Service non trouvé automatiquement.');
        console.log('  → Produit:', productName, variantName);
        console.log('  → Vérifier que le nom du produit contient: plateforme (Instagram, TikTok...) + type (Abonnés, Vues, Likes...)');
        console.log('  → Ou configurer service_id dans les metadata du produit TagadaPay');
      }
    }
    
    if (!socialLink) {
      console.log('[INFO] social_link manquant - configurer dans les metadata TagadaPay:');
      console.log('  - social_link: Lien Instagram/TikTok/YouTube du client');
    }
    console.log('  - quantity: Number of followers/likes (optional, defaults to lineItem quantity)');
  }

  // ── SaaS account provisioning ──────────────────────────────────────────────
  if (customerEmail) {
    try {
      await provisionSaasAccount(customerEmail, customerName, productName, payment);
    } catch (err) {
      console.error('[SAAS PROVISION] Error:', err.message);
    }
  }

  return result.insertId;
}

// Process payment failure
async function processPaymentFailed(payment) {
  const payment_id = payment.paymentId || payment.id || payment.payment_id || null;
  const order_id   = payment.orderId   || payment.order_id || null;
  const customer   = payment.customer || {};

  console.log(`[PAYMENT] Payment #${payment_id || order_id || 'unknown'} failed`);

  // Can't INSERT with null payment_id (NOT NULL constraint) — update by order_id if possible
  if (!payment_id) {
    if (order_id) {
      await db.query(`
        UPDATE tagadapay_orders
        SET payment_status = 'failed', updated_at = NOW()
        WHERE order_id = ?
      `, [order_id]);
      console.log('[WARN] Payment failed (no payment_id) — updated by order_id:', order_id);
    } else {
      console.warn('[WARN] Payment failed event with no payment_id nor order_id — ignored');
    }
    return;
  }

  await db.query(`
    INSERT INTO tagadapay_orders (
      payment_id,
      order_id,
      customer_email,
      payment_status,
      is_processed
    ) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      payment_status = 'failed',
      updated_at = NOW()
  `, [
    payment_id,
    order_id,
    customer?.email?.toLowerCase() || null,
    'failed',
    false
  ]);

  console.log('[WARN] Payment failed logged:', payment_id);
}

// Process payment refund
async function processPaymentRefund(payment) {
  const { id: payment_id } = payment;

  console.log(`[REFUND] Payment #${payment_id} refunded`);

  await db.query(`
    UPDATE tagadapay_orders
    SET 
      payment_status = 'refunded',
      updated_at = NOW()
    WHERE payment_id = ?
  `, [payment_id]);

  console.log('[OK] Payment refund processed:', payment_id);
}

// Process checkout session creation
async function processCheckoutCreated(checkout) {
  console.log('[CHECKOUT] Session created:', checkout.id);
  // Log for tracking if needed
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

// Process subscription creation
async function processSubscriptionCreated(subscription) {
  const {
    id: subscription_id,
    customer,
    plan,
    status,
    interval,
    nextBillingDate,
    startDate,
    metadata,
    amount,
    currency
  } = subscription;

  console.log(`[SUBSCRIPTION] Subscription #${subscription_id} created`);
  console.log('[OK] Subscription créée:', {
    subscription_id,
    customer: customer?.email,
    interval,
    status,
    amount: `${amount / 100} ${currency}`
  });

  // Extract metadata
  const socialLink = metadata?.social_link || metadata?.instagram || metadata?.tiktok || '';
  const productTitle = metadata?.product_title || plan?.name || 'Subscription Service';
  const quantity = parseInt(metadata?.quantity || '1');
  const serviceId = metadata?.service_id || null;

  // Check if subscription already exists
  const [existing] = await db.query(
    'SELECT id FROM tagadapay_orders WHERE subscription_id = ?',
    [subscription_id]
  );

  if (existing.length > 0) {
    console.log('[WARN] Subscription already exists:', subscription_id);
    return existing[0].id;
  }

  // Insert subscription into tagadapay_orders
  const [result] = await db.query(`
    INSERT INTO tagadapay_orders (
      payment_id,
      order_type,
      subscription_id,
      subscription_status,
      subscription_interval,
      subscription_next_billing_date,
      subscription_started_at,
      customer_email,
      customer_name,
      customer_phone,
      product_title,
      quantity,
      amount,
      currency,
      social_link,
      service_id,
      payment_status,
      metadata,
      payment_created_at,
      is_processed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    subscription_id, // Use subscription_id as payment_id for initial entry
    'subscription',
    subscription_id,
    status,
    interval,
    nextBillingDate || null,
    startDate || new Date().toISOString(),
    customer?.email?.toLowerCase() || null,
    customer?.fullName || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || null,
    customer?.phone || null,
    productTitle,
    quantity,
    amount || 0,
    currency?.toUpperCase() || 'EUR',
    socialLink,
    serviceId,
    'active', // Subscription created = active
    JSON.stringify(metadata || {}),
    startDate || new Date().toISOString(),
    false
  ]);

  console.log('[OK] Subscription saved:', {
    id: result.insertId,
    subscription_id,
    email: customer?.email,
    interval,
    status: 'active'
  });

  return result.insertId;
}

// Process subscription payment success (recurring payment)
async function processSubscriptionPaymentSuccess(payment) {
  const {
    id: payment_id,
    subscriptionId,
    amount,
    currency,
    customer,
    metadata,
    createdAt
  } = payment;

  console.log(`[SUBSCRIPTION PAYMENT] Payment #${payment_id} succeeded for subscription #${subscriptionId}`);

  // Get subscription info from DB
  const [subscriptions] = await db.query(
    'SELECT * FROM tagadapay_orders WHERE subscription_id = ? AND order_type = "subscription" ORDER BY created_at DESC LIMIT 1',
    [subscriptionId]
  );

  if (subscriptions.length === 0) {
    console.warn('[WARN] Subscription not found, creating new entry');
    // Create subscription entry if not exists
    await processSubscriptionCreated(payment);
  }

  const subscription = subscriptions[0];
  const socialLink = subscription?.social_link || metadata?.social_link || '';
  const productTitle = subscription?.product_title || metadata?.product_title || 'Subscription';
  const quantity = subscription?.quantity || parseInt(metadata?.quantity || '1');
  const serviceId = subscription?.service_id || metadata?.service_id || null;

  // Save this specific payment (OBLIGATOIRE)
  const [result] = await db.query(`
    INSERT INTO tagadapay_orders (
      payment_id,
      order_type,
      subscription_id,
      subscription_status,
      customer_email,
      customer_name,
      customer_phone,
      product_title,
      quantity,
      amount,
      currency,
      social_link,
      service_id,
      payment_status,
      metadata,
      payment_created_at,
      is_processed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      payment_status = 'succeeded',
      updated_at = NOW()
  `, [
    payment_id,
    'subscription',
    subscriptionId,
    'active',
    customer?.email?.toLowerCase() || subscription?.customer_email,
    customer?.fullName || subscription?.customer_name,
    customer?.phone || subscription?.customer_phone,
    productTitle,
    quantity,
    amount,
    currency?.toUpperCase() || 'EUR',
    socialLink,
    serviceId,
    'succeeded',
    JSON.stringify(metadata || {}),
    createdAt || new Date().toISOString(),
    false
  ]);

  console.log('[OK] Subscription payment saved:', {
    id: result.insertId,
    payment_id,
    subscription_id: subscriptionId,
    amount: `${amount / 100} ${currency}`,
    status: 'succeeded'
  });

  // Create internal order automatically for this recurring payment
  if (serviceId && socialLink && quantity) {
    try {
      await createInternalOrder(result.insertId, {
        serviceId,
        socialLink,
        quantity,
        customerEmail: customer?.email || subscription?.customer_email,
        shopifyOrderNumber: null,
      });
    } catch (error) {
      console.error('[ERREUR] Failed to create internal order for subscription payment:', error);
    }
  }

  return result.insertId;
}

// Process subscription payment failure
async function processSubscriptionPaymentFailed(payment) {
  const { id: payment_id, subscriptionId } = payment;

  console.log(`[SUBSCRIPTION PAYMENT] Payment #${payment_id} failed for subscription #${subscriptionId}`);

  // Save failed payment
  await db.query(`
    INSERT INTO tagadapay_orders (
      payment_id,
      order_type,
      subscription_id,
      payment_status,
      is_processed
    ) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      payment_status = 'failed',
      updated_at = NOW()
  `, [payment_id, 'subscription', subscriptionId, 'failed', false]);

  console.log('[WARN] Subscription payment failure logged:', payment_id);
}

// Process subscription update
async function processSubscriptionUpdated(subscription) {
  const {
    id: subscription_id,
    status,
    interval,
    nextBillingDate,
    metadata
  } = subscription;

  console.log(`[SUBSCRIPTION] Subscription #${subscription_id} updated`);

  // Update subscription info
  await db.query(`
    UPDATE tagadapay_orders
    SET 
      subscription_status = ?,
      subscription_interval = ?,
      subscription_next_billing_date = ?,
      metadata = ?,
      updated_at = NOW()
    WHERE subscription_id = ? AND order_type = 'subscription'
    ORDER BY created_at DESC LIMIT 1
  `, [
    status,
    interval || null,
    nextBillingDate || null,
    JSON.stringify(metadata || {}),
    subscription_id
  ]);

  console.log('[OK] Subscription updated:', subscription_id);
}

// Process subscription cancellation
async function processSubscriptionCancelled(subscription) {
  const { id: subscription_id, cancelledAt } = subscription;

  console.log(`[SUBSCRIPTION] Subscription #${subscription_id} cancelled`);

  // Update subscription status
  await db.query(`
    UPDATE tagadapay_orders
    SET 
      subscription_status = 'cancelled',
      subscription_cancelled_at = ?,
      updated_at = NOW()
    WHERE subscription_id = ?
  `, [
    cancelledAt || new Date().toISOString(),
    subscription_id
  ]);

  console.log('[OK] Subscription cancelled:', subscription_id);
}

// Process subscription pause
async function processSubscriptionPaused(subscription) {
  const { id: subscription_id } = subscription;

  console.log(`[SUBSCRIPTION] Subscription #${subscription_id} paused`);

  await db.query(`
    UPDATE tagadapay_orders
    SET 
      subscription_status = 'paused',
      updated_at = NOW()
    WHERE subscription_id = ?
  `, [subscription_id]);

  console.log('[OK] Subscription paused:', subscription_id);
}

// Process subscription resume
async function processSubscriptionResumed(subscription) {
  const { id: subscription_id } = subscription;

  console.log(`[SUBSCRIPTION] Subscription #${subscription_id} resumed`);

  await db.query(`
    UPDATE tagadapay_orders
    SET 
      subscription_status = 'active',
      updated_at = NOW()
    WHERE subscription_id = ?
  `, [subscription_id]);

  console.log('[OK] Subscription resumed:', subscription_id);
}

// Create internal order automatically
async function createInternalOrder(tagadapay_order_id, orderData) {
  const { serviceId, socialLink, quantity, customerEmail, shopifyOrderNumber, _skipPackCheck } = orderData;

  // Get TagadaPay default user
  const [users] = await db.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    ['tagadapay@broreps.com']
  );

  if (users.length === 0) {
    throw new Error('TagadaPay default user not found. Run: node setup-tagadapay-user.js');
  }

  const userId = users[0].id;

  // Get service details — includes delivery_mode and dripfeed_quantity
  const [services] = await db.query(
    'SELECT * FROM allowed_services WHERE id = ? LIMIT 1',
    [serviceId]
  );

  if (services.length === 0) {
    throw new Error(`Service id=${serviceId} introuvable dans le catalogue — vérifiez la configuration`);
  }

  const service      = services[0];
  const deliveryMode = service.delivery_mode || 'standard';
  const dripfeedQty  = service.dripfeed_quantity && service.dripfeed_quantity > 0
    ? service.dripfeed_quantity
    : 250;

  // ── Pack: launch one order per sub-service in parallel ────────────────────
  if (service.is_pack && !_skipPackCheck) {
    const [packItems] = await db.query(
      `SELECT pi.id, pi.sub_service_id, pi.quantity_override,
              s.service_id, s.service_name, s.delivery_mode, s.dripfeed_quantity
       FROM service_pack_items pi
       JOIN allowed_services s ON pi.sub_service_id = s.id
       WHERE pi.pack_id = ?
       ORDER BY pi.sort_order ASC, pi.id ASC`,
      [serviceId]
    );

    if (packItems.length === 0) {
      throw new Error(`Le pack id=${serviceId} ne contient aucun sous-service — configurez-le dans le catalogue`);
    }

    console.log(`[PACK] Lancement de ${packItems.length} commandes simultanées pour le pack "${service.service_name}"`);

    const subOrderIds = await Promise.all(packItems.map((item, idx) =>
      createInternalOrder(tagadapay_order_id, {
        serviceId:          item.sub_service_id,
        socialLink,
        quantity:           item.quantity_override || quantity,
        customerEmail,
        shopifyOrderNumber,
        _skipPackCheck:     true, // prevent recursive pack resolution
      }).catch(err => {
        console.error(`[PACK] ❌ Sous-commande #${idx + 1} (${item.service_name}) échouée:`, err.message);
        return null;
      })
    ));

    const firstValid = subOrderIds.find(id => id !== null);

    // Link tagadapay order to the first sub-order created
    if (firstValid) {
      await db.query(
        `UPDATE tagadapay_orders SET internal_order_id = ?, is_processed = true WHERE id = ?`,
        [firstValid, tagadapay_order_id]
      );
    } else {
      await db.query(
        `UPDATE tagadapay_orders SET is_processed = false WHERE id = ?`,
        [tagadapay_order_id]
      );
      throw new Error('Toutes les sous-commandes du pack ont échoué');
    }

    console.log(`[PACK] ✅ ${subOrderIds.filter(Boolean).length}/${packItems.length} sous-commandes créées:`, subOrderIds);
    return firstValid;
  }
  // ── /Pack ──────────────────────────────────────────────────────────────────

  // Extract username from social link for duplicate detection
  const userInfo = extractUsername(socialLink);
  const username = userInfo ? userInfo.username : null;

  // Calculate charge
  const charge = (quantity / 1000) * (service.rate || 0);

  let internalOrderId;

  if (deliveryMode === 'dripfeed') {
    // ── Drip-feed parent order ─────────────────────────────────────────────
    const dripfeedRuns     = Math.ceil(quantity / dripfeedQty);
    const dripfeedInterval = 1440; // 24h in minutes

    const [orderResult] = await db.query(`
      INSERT INTO orders (
        user_id, service_id, link, username, quantity, remains, charge,
        shopify_order_number, status,
        dripfeed_runs, dripfeed_interval, dripfeed_current_run
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?, 0)
    `, [
      userId, service.service_id, socialLink, username,
      quantity, quantity, charge,
      shopifyOrderNumber || null,
      dripfeedRuns, dripfeedInterval,
    ]);

    internalOrderId = orderResult.insertId;
    console.log('[OK] Drip-feed parent order created:', {
      tagadapay_order_id, internal_order_id: internalOrderId,
      service: service.service_name, quantity,
      dripfeed_qty: dripfeedQty, runs: dripfeedRuns,
    });
  } else {
    // ── Standard order ─────────────────────────────────────────────────────
    const [orderResult] = await db.query(`
      INSERT INTO orders (
        user_id, service_id, link, username, quantity, remains, charge,
        shopify_order_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      userId, service.service_id, socialLink, username,
      quantity, quantity, charge,
      shopifyOrderNumber || null,
    ]);

    internalOrderId = orderResult.insertId;
    console.log('[OK] Standard order created (pending):', {
      tagadapay_order_id, internal_order_id: internalOrderId,
      service: service.service_name, quantity,
    });
  }

  // Link TagadaPay order to internal order (skipped for pack sub-orders — the pack handler links)
  if (!_skipPackCheck) {
    await db.query(`
      UPDATE tagadapay_orders
      SET internal_order_id = ?, is_processed = true
      WHERE id = ?
    `, [internalOrderId, tagadapay_order_id]);
  }

  return internalOrderId;
}

// Manual endpoint to link TagadaPay order to internal order
router.post('/link-order', async (req, res) => {
  try {
    const { payment_id, internal_order_id } = req.body;

    if (!payment_id || !internal_order_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await db.query(`
      UPDATE tagadapay_orders
      SET internal_order_id = ?, is_processed = true
      WHERE payment_id = ?
    `, [internal_order_id, payment_id]);

    res.json({ success: true, message: 'Orders linked successfully' });
  } catch (error) {
    console.error('[ERREUR] Link order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get TagadaPay order details
router.get('/order/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const [orders] = await db.query(`
      SELECT 
        tp.*,
        o.id as internal_id,
        o.status as internal_status,
        o.delivered,
        o.start_count,
        o.remains
      FROM tagadapay_orders tp
      LEFT JOIN orders o ON tp.internal_order_id = o.id
      WHERE tp.payment_id = ? OR tp.order_id = ?
      LIMIT 1
    `, [paymentId, paymentId]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(orders[0]);
  } catch (error) {
    console.error('[ERREUR] Get order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subscription details and all related payments
router.get('/subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    // Get all payments for this subscription
    const [payments] = await db.query(`
      SELECT 
        tp.*,
        o.id as internal_id,
        o.status as internal_status,
        o.delivered,
        o.start_count,
        o.remains
      FROM tagadapay_orders tp
      LEFT JOIN orders o ON tp.internal_order_id = o.id
      WHERE tp.subscription_id = ?
      ORDER BY tp.created_at DESC
    `, [subscriptionId]);

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // First entry is the subscription itself
    const subscription = payments.find(p => p.order_type === 'subscription') || payments[0];
    const recurringPayments = payments.filter(p => p.payment_id !== subscription.subscription_id);

    res.json({
      subscription: subscription,
      payments: recurringPayments,
      total_payments: recurringPayments.length,
      total_amount: recurringPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    });
  } catch (error) {
    console.error('[ERREUR] Get subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all subscriptions for a customer
router.get('/customer/:email/subscriptions', async (req, res) => {
  try {
    const { email } = req.params;

    const [subscriptions] = await db.query(`
      SELECT 
        tp.*,
        COUNT(DISTINCT CASE WHEN tp2.payment_id != tp.subscription_id THEN tp2.id END) as payment_count,
        SUM(CASE WHEN tp2.payment_id != tp.subscription_id THEN tp2.amount ELSE 0 END) as total_paid
      FROM tagadapay_orders tp
      LEFT JOIN tagadapay_orders tp2 ON tp2.subscription_id = tp.subscription_id
      WHERE tp.customer_email = ? 
        AND tp.order_type = 'subscription'
      GROUP BY tp.id
      ORDER BY tp.created_at DESC
    `, [email.toLowerCase()]);

    res.json({
      customer_email: email,
      subscriptions: subscriptions,
      total_subscriptions: subscriptions.length
    });
  } catch (error) {
    console.error('[ERREUR] Get customer subscriptions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'TagadaPay Integration',
    timestamp: new Date().toISOString()
  });
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /api/tagadapay/admin/stats
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(*) AS total_payments,
        COALESCE(SUM(amount), 0) AS total_revenue,
        (SELECT COUNT(DISTINCT subscription_id)
         FROM tagadapay_orders
         WHERE order_type = 'subscription' AND subscription_id IS NOT NULL) AS total_subscriptions,
        (SELECT COUNT(DISTINCT subscription_id)
         FROM tagadapay_orders
         WHERE order_type = 'subscription' AND subscription_id IS NOT NULL
           AND subscription_status = 'active') AS active_subscriptions
      FROM tagadapay_orders
      WHERE payment_status IN ('paid', 'succeeded', 'success')
    `);
    res.json(stats);
  } catch (error) {
    console.error('[ERREUR] Admin stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tagadapay/admin/payments — paginated one-time payments
router.get('/admin/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : null;
    const status = req.query.status || null;

    let where = `WHERE order_type = 'one_time'`;
    const params = [];
    if (search) {
      where += ` AND (customer_email LIKE ? OR customer_name LIKE ? OR product_title LIKE ? OR social_link LIKE ? OR payment_id LIKE ?)`;
      params.push(search, search, search, search, search);
    }
    if (status) {
      where += ` AND payment_status = ?`;
      params.push(status);
    }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM tagadapay_orders ${where}`, params);
    const [payments] = await db.query(
      `SELECT id, payment_id, order_id, order_type, customer_email, customer_name, customer_phone,
              product_title, quantity, amount, currency, payment_status, social_link,
              shopify_order_number, payment_created_at, created_at
       FROM tagadapay_orders ${where}
       ORDER BY payment_created_at DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      payments,
      total,
      page,
      total_pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[ERREUR] Admin payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tagadapay/admin/subscriptions — paginated subscriptions (latest row per subscription_id)
router.get('/admin/subscriptions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : null;
    const status = req.query.status || null;

    let having = ``;
    const params = [];
    const havingParams = [];
    if (search) {
      having += ` HAVING (customer_email LIKE ? OR customer_name LIKE ? OR product_title LIKE ? OR social_link LIKE ?)`;
      havingParams.push(search, search, search, search);
    }
    if (status) {
      having += (having ? ' AND' : ' HAVING') + ` subscription_status = ?`;
      havingParams.push(status);
    }

    const countQuery = await db.query(
      `SELECT COUNT(*) AS total FROM (
         SELECT subscription_id
         FROM tagadapay_orders
         WHERE order_type = 'subscription' AND subscription_id IS NOT NULL
         GROUP BY subscription_id
         ${having}
       ) AS sub`,
      havingParams
    );
    const total = countQuery[0][0].total;

    const [subscriptions] = await db.query(
      `SELECT
         MAX(id) AS id,
         subscription_id,
         subscription_status,
         subscription_interval,
         subscription_next_billing_date,
         subscription_started_at,
         customer_email,
         customer_name,
         customer_phone,
         product_title,
         amount,
         currency,
         social_link,
         COUNT(*) AS payment_count,
         SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END) AS total_paid,
         MIN(created_at) AS created_at
       FROM tagadapay_orders
       WHERE order_type = 'subscription' AND subscription_id IS NOT NULL
       GROUP BY subscription_id, subscription_status, subscription_interval,
                subscription_next_billing_date, subscription_started_at,
                customer_email, customer_name, customer_phone, product_title,
                amount, currency, social_link
       ${having}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...havingParams, limit, offset]
    );

    res.json({
      subscriptions,
      total,
      page,
      total_pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[ERREUR] Admin subscriptions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tagadapay/admin/complete-order/:id
// Manually set social_link (+ optional email) and trigger internal order creation
router.post('/admin/complete-order/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { social_link, customer_email, service_id } = req.body;

    if (!social_link) {
      return res.status(400).json({ error: 'social_link requis' });
    }

    // Fetch the existing order
    const [rows] = await db.query(
      'SELECT * FROM tagadapay_orders WHERE id = ? LIMIT 1',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Commande introuvable' });
    const order = rows[0];

    if (order.is_processed) {
      return res.status(409).json({ error: 'Cette commande a déjà été traitée' });
    }

    // Normalize the social link
    const normalizedLink = normalizeSocialLink(social_link, order.product_title || '');

    // Update DB
    await db.query(
      `UPDATE tagadapay_orders
       SET social_link = ?,
           customer_email = COALESCE(NULLIF(?, ''), customer_email),
           updated_at = NOW()
       WHERE id = ?`,
      [normalizedLink, customer_email || null, id]
    );

    // Determine service
    const resolvedServiceId = service_id || order.service_id;
    if (!resolvedServiceId) {
      return res.status(400).json({
        error: 'service_id introuvable — précisez-le dans le body',
        saved: true,
        social_link: normalizedLink
      });
    }

    // Create internal order
    const internalOrderId = await createInternalOrder(order.id, {
      serviceId:           resolvedServiceId,
      socialLink:          normalizedLink,
      quantity:            order.quantity,
      customerEmail:       customer_email || order.customer_email,
      shopifyOrderNumber:  order.shopify_order_number || null,
    });

    console.log('[ADMIN] ✅ Commande complétée manuellement:', {
      tagadapay_order_id: order.id,
      internal_order_id: internalOrderId,
      social_link: normalizedLink,
    });

    res.json({
      success: true,
      tagadapay_order_id: order.id,
      internal_order_id: internalOrderId,
      social_link: normalizedLink,
    });
  } catch (error) {
    console.error('[ERREUR] Admin complete-order:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
