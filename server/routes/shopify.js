import express from 'express';
import crypto from 'crypto';
import db from '../config/database.js';
import { normalizeSocialLink } from '../lib/username-extractor.js';

// Extract real quantity from Shopify variant title (handles French "2.500" → 2500)
function extractQuantityFromVariant(variantTitle, fallback = 1) {
  if (!variantTitle) return fallback;

  // Normalize French thousand separator: "2.500" → "2500"
  const normalized = variantTitle.replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2');

  const patterns = [
    /(\d+)k[\s›•·]?/i, // "5k"
    /(\d+)\s*[›>]/, // "1000 ›"
    /[•·]\s*(\d+)/, // "• 1000"
    /(\d+)\s*abonné/i,
    /(\d+)\s*like/i,
    /(\d+)\s*vue/i,
    /(\d+)/ // last fallback: any number
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      let qty = parseInt(match[1]);
      if (pattern === patterns[0]) qty *= 1000; // k suffix
      console.log('[QUANTITY] Shopify variant parsed:', { variantTitle, normalized, qty });
      return qty;
    }
  }

  return fallback;
}

const router = express.Router();

// Middleware to verify Shopify webhook signature
const verifyShopifyWebhook = (req, res, next) => {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[ERREUR] SHOPIFY_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  if (!hmac) {
    console.error('[ERREUR] No HMAC signature in headers');
    return res.status(401).send('No signature');
  }

  const body = req.rawBody;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  if (hash === hmac) {
    console.log('[OK] Shopify webhook signature verified');
    
    // Parse JSON body manually (since we used express.raw())
    try {
      req.body = JSON.parse(body);
    } catch (error) {
      console.error('[ERREUR] Failed to parse webhook JSON:', error);
      return res.status(400).send('Invalid JSON');
    }
    
    next();
  } else {
    console.error('[ERREUR] Invalid Shopify webhook signature');
    res.status(401).send('Unauthorized');
  }
};

// Webhook endpoint for order creation
router.post('/webhook/orders/create', verifyShopifyWebhook, async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  try {
    const order = req.body;
    console.log('[WEBHOOK] Shopify Order Received:', {
      id: order.id,
      order_number: order.order_number,
      email: order.email,
      financial_status: order.financial_status,
      total_price: order.total_price
    });

    // Log webhook reception
    await db.query(`
      INSERT INTO shopify_webhook_logs (topic, shopify_order_id, payload, ip_address, signature_valid)
      VALUES (?, ?, ?, ?, ?)
    `, ['orders/create', order.id, JSON.stringify(order), clientIp, true]);

    // Process the order
    await processShopifyOrder(order);

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('[ERREUR] Shopify webhook error:', error);
    
    // Log error
    try {
      await db.query(`
        UPDATE shopify_webhook_logs 
        SET processed = false, error_message = ?
        WHERE shopify_order_id = ?
        ORDER BY created_at DESC LIMIT 1
      `, [error.message, req.body.id]);
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook endpoint for order updates
router.post('/webhook/orders/updated', verifyShopifyWebhook, async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  try {
    const order = req.body;
    console.log('[UPDATE] Shopify Order Update:', order.order_number);

    await db.query(`
      INSERT INTO shopify_webhook_logs (topic, shopify_order_id, payload, ip_address, signature_valid)
      VALUES (?, ?, ?, ?, ?)
    `, ['orders/updated', order.id, JSON.stringify(order), clientIp, true]);

    await updateShopifyOrder(order);

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('[ERREUR] Shopify update webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process new Shopify order
async function processShopifyOrder(order) {
  const {
    id: shopify_order_id,
    order_number,
    email,
    phone,
    customer,
    line_items,
    total_price,
    note,
    note_attributes,
    created_at,
    financial_status,
    fulfillment_status
  } = order;

  // Log payment status
  console.log(`[PAYMENT] Order #${order_number} - Status: ${financial_status || 'unknown'}`);
  if (financial_status === 'paid') {
    console.log('[OK] Paiement valide pour commande #' + order_number);
  } else {
    console.log(`[WARN] Paiement NON valide pour commande #${order_number}: ${financial_status}`);
  }

  // Extract first line item (assuming one product per order)
  const lineItem = line_items[0];

  // --- Real quantity from variant title (e.g. "• 2.500 ›" → 2500) ---
  // lineItem.quantity is the cart count (almost always 1); the real follower/like
  // count lives in the variant title.
  const realQuantity = extractQuantityFromVariant(
    lineItem.variant_title || '',
    lineItem.quantity || 1
  );

  // Log what we received for debugging
  console.log('[DEBUG] Order data received:', {
    note,
    note_attributes,
    line_item_properties: lineItem.properties,
    line_item_title: lineItem.title,
    variant_title: lineItem.variant_title,
    cart_quantity: lineItem.quantity,
    real_quantity: realQuantity
  });

  // --- Extract social link / username from multiple sources ---
  let socialLink = '';

  // Keywords that indicate the field contains a social URL or username
  const socialKeywords = [
    'link', 'url', 'instagram', 'tiktok', 'twitch', 'youtube',
    'compte', 'profil', 'username', 'utilisateur', 'nom'
  ];
  const isSocialKey = (name) => socialKeywords.some(k => name.toLowerCase().includes(k));

  // 1. Check note field
  if (note && note.trim()) {
    socialLink = note.trim();
    console.log('[FOUND] Social link in note:', socialLink);
  }

  // 2. Check note_attributes (custom form fields — includes "Nom D'utilisateur")
  if (!socialLink && note_attributes && note_attributes.length > 0) {
    const linkAttr = note_attributes.find(attr => isSocialKey(attr.name) && attr.value);
    if (linkAttr) {
      socialLink = linkAttr.value.trim();
      console.log('[FOUND] Social link in note_attributes:', { key: linkAttr.name, value: socialLink });
    }
  }

  // 3. Check line item properties
  if (!socialLink && lineItem.properties && lineItem.properties.length > 0) {
    const linkProp = lineItem.properties.find(p => isSocialKey(p.name) && p.value);
    if (linkProp) {
      socialLink = linkProp.value.trim();
      console.log('[FOUND] Social link in line item properties:', { key: linkProp.name, value: socialLink });
    }
  }

  if (!socialLink) {
    console.log('[WARN] Aucun lien/username social trouvé pour commande #' + order_number);
  }

  // Normalize: turn bare usernames into full profile URLs
  if (socialLink) {
    const fullTitle = `${lineItem.title} ${lineItem.variant_title || ''}`;
    socialLink = normalizeSocialLink(socialLink, fullTitle);
  }

  // Check if order already exists
  const [existing] = await db.query(
    'SELECT id FROM shopify_orders WHERE shopify_order_id = ?',
    [shopify_order_id]
  );

  if (existing.length > 0) {
    console.log('[WARN] Order already exists:', order_number);
    return existing[0].id;
  }

  // Insert into shopify_orders table
  const [result] = await db.query(`
    INSERT INTO shopify_orders (
      shopify_order_id,
      shopify_order_number,
      customer_email,
      customer_phone,
      customer_first_name,
      customer_last_name,
      product_title,
      variant_title,
      quantity,
      price,
      total_price,
      social_link,
      shopify_status,
      fulfillment_status,
      financial_status,
      shopify_created_at,
      is_processed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    shopify_order_id,
    order_number,
    email.toLowerCase(),
    phone || null,
    customer?.first_name || null,
    customer?.last_name || null,
    lineItem.title,
    lineItem.variant_title || null,
    realQuantity,
    parseFloat(lineItem.price),
    parseFloat(total_price),
    socialLink,
    'pending',
    fulfillment_status || 'pending',
    financial_status || 'pending',
    created_at,
    false
  ]);

  console.log('[OK] Shopify order saved:', {
    id: result.insertId,
    order_number,
    email,
    social_link: socialLink || 'NON FOURNI',
    financial_status: financial_status,
    paid: financial_status === 'paid' ? 'OUI' : 'NON'
  });

  // TODO: Create internal order automatically if needed
  // await createInternalOrder(result.insertId);

  return result.insertId;
}

// Update existing Shopify order
async function updateShopifyOrder(order) {
  const {
    id: shopify_order_id,
    financial_status,
    fulfillment_status
  } = order;

  await db.query(`
    UPDATE shopify_orders
    SET 
      fulfillment_status = ?,
      financial_status = ?,
      updated_at = NOW()
    WHERE shopify_order_id = ?
  `, [fulfillment_status, financial_status, shopify_order_id]);

  console.log('[OK] Shopify order updated:', order.order_number);
}

// Manual endpoint to link Shopify order to internal order
router.post('/link-order', async (req, res) => {
  try {
    const { shopify_order_id, internal_order_id } = req.body;

    if (!shopify_order_id || !internal_order_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await db.query(`
      UPDATE shopify_orders
      SET internal_order_id = ?, is_processed = true
      WHERE shopify_order_id = ?
    `, [internal_order_id, shopify_order_id]);

    res.json({ success: true, message: 'Orders linked successfully' });
  } catch (error) {
    console.error('[ERREUR] Link order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Shopify order details
router.get('/order/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const [orders] = await db.query(`
      SELECT 
        so.*,
        o.id as internal_id,
        o.status as internal_status,
        o.delivered,
        o.start_count,
        o.remains
      FROM shopify_orders so
      LEFT JOIN orders o ON so.internal_order_id = o.id
      WHERE so.shopify_order_number = ?
      LIMIT 1
    `, [orderNumber]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(orders[0]);
  } catch (error) {
    console.error('[ERREUR] Get order error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
