import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import db from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

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
  
  if (bestMatch && bestScore >= 10) {
    console.log('[SMART MATCH] Service trouvé:', {
      id: bestMatch.id,
      name: bestMatch.service_name,
      score: bestScore
    });
    return bestMatch;
  }
  
  console.log('[SMART MATCH] Aucun service correspondant trouvé (meilleur score:', bestScore, ')');
  return null;
}

// Extract quantity from variant name
function extractQuantityFromVariant(variantName, fallbackQuantity = 1) {
  if (!variantName) return fallbackQuantity;

  // Normalize French thousand separator: "2.500" → "2500", "10.000" → "10000"
  const normalized = variantName.replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2');

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

// Process successful payment (one-time)
async function processPaymentSuccess(payment, orderType = 'one_time') {
  console.log('[DEBUG] processPaymentSuccess called with:', JSON.stringify(payment, null, 2));
  
  // TagadaPay structure: payment has paymentId, orderId, lineItems, etc.
  const payment_id = payment.paymentId || payment.id || payment.payment_id || 'unknown';
  const order_id = payment.orderId || payment.order_id;
  const timestamp = payment.timestamp || payment.createdAt || payment.created_at;
  
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
  const socialLink = metadata.social_link || metadata.instagram || metadata.tiktok || '';
  
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
  
  // Extract customer info if available
  const customer = payment.customer || {};
  const customerEmail = customer.email || payment.email || payment.customerEmail || null;
  const customerName = customer.name || customer.fullName || payment.customerName || null;

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
      is_processed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    socialLink,
    serviceId,
    status,
    JSON.stringify(metadata),
    timestamp || new Date().toISOString(),
    false
  ]);

  console.log('[OK] TagadaPay order saved:', {
    id: result.insertId,
    payment_id: payment_id,
    email: customerEmail || 'unknown',
    social_link: socialLink || 'NON FOURNI',
    amount: `${amount / 100} ${currency}`,
    status: 'paid'
  });

  // Create internal order automatically
  if (serviceId && socialLink && quantity) {
    try {
      await createInternalOrder(result.insertId, {
        serviceId,
        socialLink,
        quantity,
        customerEmail: customerEmail
      });
    } catch (error) {
      console.error('[ERREUR] Failed to create internal order:', error);
    }
  } else {
    console.log('[WARN] Missing required fields for auto-order creation:', {
      serviceId: serviceId ? `✓ ${autoMatched ? '(auto-détecté)' : '(metadata)'}` : '✗ MANQUANT',
      socialLink: socialLink ? '✓' : '✗ MANQUANT',
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
  const { id: payment_id, orderId, customer } = payment;

  console.log(`[PAYMENT] Payment #${payment_id} failed`);

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
    orderId || null,
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

  // TODO: Create internal order automatically for this recurring payment
  if (serviceId && socialLink && quantity) {
    try {
      await createInternalOrder(result.insertId, {
        serviceId,
        socialLink,
        quantity,
        customerEmail: customer?.email || subscription?.customer_email
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
  const { serviceId, socialLink, quantity, customerEmail } = orderData;

  // Get TagadaPay default user
  const [users] = await db.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    ['tagadapay@broreps.com']
  );

  if (users.length === 0) {
    throw new Error('TagadaPay default user not found. Run: node setup-tagadapay-user.js');
  }

  const userId = users[0].id;

  // Get service details
  const [services] = await db.query(
    'SELECT * FROM allowed_services WHERE id = ? LIMIT 1',
    [serviceId]
  );

  if (services.length === 0) {
    throw new Error(`Service ${serviceId} not found`);
  }

  const service = services[0];

  // Calculate charge (assuming service has a rate)
  const charge = (quantity / 1000) * (service.rate || 0);

  // Create order
  const [orderResult] = await db.query(`
    INSERT INTO orders (
      user_id,
      service_id,
      link,
      quantity,
      charge,
      status,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
  `, [
    userId,
    service.service_id,
    socialLink,
    quantity,
    charge,
    'pending'
  ]);

  const internalOrderId = orderResult.insertId;

  // Link TagadaPay order to internal order
  await db.query(`
    UPDATE tagadapay_orders
    SET internal_order_id = ?, is_processed = true
    WHERE id = ?
  `, [internalOrderId, tagadapay_order_id]);

  console.log('[OK] Internal order created automatically:', {
    tagadapay_order_id,
    internal_order_id: internalOrderId,
    service: service.service_name,
    quantity
  });

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
              payment_created_at, created_at
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

export default router;
