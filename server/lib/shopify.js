import axios from 'axios';

const SHOPIFY_DOMAIN       = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION          = '2024-01';

/**
 * Fulfill a Shopify order once the first SMM batch has been dispatched.
 * @param {number|string|null} shopifyOrderNumber  e.g. 1234
 * @returns {Promise<boolean>}  true if fulfilled, false if skipped / not configured
 */
export async function fulfillShopifyOrder(shopifyOrderNumber) {
    if (!shopifyOrderNumber) return false;
    if (!SHOPIFY_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
        console.warn('[Shopify] SHOPIFY_SHOP_DOMAIN / SHOPIFY_ACCESS_TOKEN non configurés — fulfillment ignoré');
        return false;
    }

    const headers = {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
    };
    const base = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}`;

    try {
        // ── 1. Find Shopify order by order number ────────────────────────────
        const search = await axios.get(`${base}/orders.json`, {
            params: { name: `#${shopifyOrderNumber}`, fields: 'id,name,fulfillment_status', status: 'any' },
            headers,
            timeout: 10000,
        });

        const orders = search.data?.orders ?? [];
        if (orders.length === 0) {
            console.warn(`[Shopify] Commande #${shopifyOrderNumber} introuvable`);
            return false;
        }

        const shopifyOrder = orders[0];
        if (shopifyOrder.fulfillment_status === 'fulfilled') {
            console.log(`[Shopify] Commande #${shopifyOrderNumber} déjà traitée — skip`);
            return true;
        }

        // ── 2. Get open fulfillment orders ───────────────────────────────────
        const foResp = await axios.get(`${base}/orders/${shopifyOrder.id}/fulfillment_orders.json`, {
            headers,
            timeout: 10000,
        });

        const openFOs = (foResp.data?.fulfillment_orders ?? []).filter(fo => fo.status === 'open');
        if (openFOs.length === 0) {
            console.warn(`[Shopify] Aucun fulfillment_order ouvert pour la commande #${shopifyOrderNumber}`);
            return false;
        }

        // ── 3. Create fulfillment ─────────────────────────────────────────────
        const fulfillResp = await axios.post(`${base}/fulfillments.json`, {
            fulfillment: {
                line_items_by_fulfillment_order: openFOs.map(fo => ({
                    fulfillment_order_id: fo.id,
                })),
                notify_customer: false,
            },
        }, { headers, timeout: 15000 });

        const created = fulfillResp.data?.fulfillment;
        console.log(`[Shopify] ✅ Commande #${shopifyOrderNumber} marquée comme traitée (fulfillment id: ${created?.id})`);
        return true;

    } catch (err) {
        const status = err.response?.status;
        const body   = err.response?.data;
        console.error(`[Shopify] ❌ Erreur fulfillment commande #${shopifyOrderNumber}:`, status || err.message, body || '');
        return false;
    }
}
