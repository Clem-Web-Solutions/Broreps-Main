import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Rate limiting storage (in-memory, use Redis in production)
const verificationAttempts = new Map();

// Clean up old attempts every hour
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of verificationAttempts.entries()) {
        if (now - data.timestamp > 15 * 60 * 1000) { // 15 minutes
            verificationAttempts.delete(key);
        }
    }
}, 60 * 60 * 1000);

// POST endpoint to verify order with email (2-step verification)
router.post('/verify', async (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    try {
        const { orderNumber, email } = req.body;

        // Validation
        if (!orderNumber || !email) {
            return res.status(400).json({ 
                error: 'Numéro de commande et email requis' 
            });
        }

        // Rate limiting: max 5 attempts per IP per 15 minutes
        const attemptKey = clientIp;
        const attempts = verificationAttempts.get(attemptKey) || { count: 0, timestamp: Date.now() };
        
        if (attempts.count >= 5) {
            const timeLeft = Math.ceil((15 * 60 * 1000 - (Date.now() - attempts.timestamp)) / 1000 / 60);
            return res.status(429).json({ 
                error: `Trop de tentatives. Réessayez dans ${timeLeft} minutes.` 
            });
        }

        // Increment attempts
        attempts.count++;
        attempts.timestamp = attempts.timestamp || Date.now();
        verificationAttempts.set(attemptKey, attempts);

        // Search in Shopify orders first
        const [shopifyOrders] = await db.query(`
            SELECT 
                so.id,
                so.shopify_order_number,
                so.customer_email,
                so.customer_first_name,
                so.customer_last_name,
                so.product_title,
                so.social_link,
                so.financial_status,
                so.fulfillment_status,
                so.total_price,
                so.internal_order_id,
                so.shopify_created_at,
                o.id as order_id,
                o.service_id,
                o.link,
                o.username,
                o.quantity,
                o.remains,
                o.charge,
                o.status,
                o.created_at,
                o.updated_at,
                o.parent_order_id,
                o.dripfeed_runs as runs,
                o.dripfeed_interval as run_interval,
                o.dripfeed_current_run,
                s.service_name,
                s.provider
            FROM shopify_orders so
            LEFT JOIN orders o ON so.internal_order_id = o.id
            LEFT JOIN allowed_services s ON o.service_id = s.service_id
            WHERE so.shopify_order_number = ? AND LOWER(so.customer_email) = LOWER(?)
            LIMIT 1
        `, [orderNumber, email.trim()]);

        // Log verification attempt
        await db.query(`
            INSERT INTO verification_logs (order_number, email_attempted, ip_address, user_agent, success)
            VALUES (?, ?, ?, ?, ?)
        `, [orderNumber, email.toLowerCase(), clientIp, userAgent, shopifyOrders.length > 0]);

        if (shopifyOrders.length === 0) {
            return res.status(404).json({ 
                error: 'Commande introuvable ou email incorrect' 
            });
        }

        const order = shopifyOrders[0];

        // If no internal order linked, return basic Shopify info
        if (!order.internal_order_id) {
            const isPaid = order.financial_status === 'paid';
            
            return res.json({
                id: order.shopify_order_number,
                status: isPaid ? 'pending' : 'awaiting_payment',
                progress: isPaid ? 0 : -1,
                product: order.product_title || 'En cours de traitement',
                quantity: 0,
                delivered: 0,
                remains: 0,
                link: order.social_link || '',
                created_at: order.shopify_created_at || new Date().toISOString(),
                estimated: isPaid ? 'Commande en attente de traitement' : 'En attente du paiement',
                isDripFeed: false,
                runs: 0,
                executedRuns: 0,
                shopify: {
                    order_number: order.shopify_order_number,
                    customer_name: `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim(),
                    social_link: order.social_link || 'Non fourni',
                    financial_status: order.financial_status,
                    payment_validated: isPaid,
                    fulfillment_status: order.fulfillment_status,
                    total_price: order.total_price
                },
                raw: { shopify: true }
            });
        }

        // Reset rate limit on successful verification
        verificationAttempts.delete(attemptKey);

        // Continue with full order tracking (same as GET endpoint)
        // ... rest of the tracking logic
        const isDripFeed = order.parent_order_id === null && order.runs > 0;
        const isPaid = order.financial_status === 'paid';
        
        let orderResponse = {
            id: order.shopify_order_number || order.order_id,
            status: order.status || 'pending',
            progress: getProgressStep(order.status),
            product: order.service_name || order.product_title || 'Service inconnu',
            quantity: order.quantity || 0,
            delivered: order.quantity - (order.remains || 0),
            remains: order.remains || 0,
            link: order.link || order.username || order.social_link || '',
            created_at: order.created_at,
            estimated: calculateEstimatedCompletion(order),
            isDripFeed: isDripFeed,
            runs: order.runs || 0,
            executedRuns: order.dripfeed_current_run || 0,
            shopify: {
                order_number: order.shopify_order_number,
                customer_name: `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim(),
                social_link: order.social_link || 'Non fourni',
                financial_status: order.financial_status,
                payment_validated: isPaid,
                fulfillment_status: order.fulfillment_status,
                total_price: order.total_price
            },
            raw: {
                order: order,
                is_drip_feed: isDripFeed
            }
        };

        // If drip feed, get sub-orders
        if (isDripFeed) {
            const [subOrders] = await db.query(`
                SELECT id, order_id, quantity, remains, status, created_at, provider_order_id
                FROM orders
                WHERE parent_order_id = ?
                ORDER BY created_at ASC
            `, [order.order_id]);

            orderResponse.raw.drip_feed_info = {
                runs: order.runs,
                interval: order.run_interval,
                current_run: order.dripfeed_current_run || 0,
                sub_orders: subOrders.map(sub => ({
                    id: sub.id,
                    order_id: sub.order_id,
                    quantity: sub.quantity,
                    delivered: sub.quantity - sub.remains,
                    remains: sub.remains,
                    status: sub.status,
                    created_at: sub.created_at,
                    provider_order_id: sub.provider_order_id
                }))
            };
        }

        res.json(orderResponse);

    } catch (error) {
        console.error('[TRACK VERIFY] Error:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// Public endpoint to track order by order number (without verification)
router.get('/:orderNumber', async (req, res) => {
    try {
        const orderNumber = req.params.orderNumber;

        // Try to find order by:
        // 1. Numeric ID (e.g., "1000")
        // 2. Order ID string (e.g., "BM-12345")
        // 3. Shopify order number (e.g., "5678")
        const orderId = parseInt(orderNumber);
        let query;
        let params;

        if (!isNaN(orderId)) {
            // Search by numeric ID or shopify_order_number
            query = `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
                    o.remains, o.charge, o.notes, o.shopify_order_number, o.provider_order_id, o.status, 
                    o.created_at, o.updated_at, o.parent_order_id,
                    o.dripfeed_runs as runs, o.dripfeed_interval as run_interval, o.dripfeed_current_run,
                    s.service_name, s.provider,
                    u.name as created_by_name, u.email as created_by_email
             FROM orders o
             LEFT JOIN allowed_services s ON o.service_id = s.service_id
             LEFT JOIN users u ON o.user_id = u.id
             WHERE o.id = ? OR o.shopify_order_number = ?`;
            params = [orderId, orderNumber];
        } else {
            // Search by order_id string
            query = `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
                    o.remains, o.charge, o.notes, o.shopify_order_number, o.provider_order_id, o.status, 
                    o.created_at, o.updated_at, o.parent_order_id,
                    o.dripfeed_runs as runs, o.dripfeed_interval as run_interval, o.dripfeed_current_run,
                    s.service_name, s.provider,
                    u.name as created_by_name, u.email as created_by_email
             FROM orders o
             LEFT JOIN allowed_services s ON o.service_id = s.service_id
             LEFT JOIN users u ON o.user_id = u.id
             WHERE o.order_id = ? OR o.shopify_order_number = ?`;
            params = [orderNumber, orderNumber];
        }

        const [orders] = await db.query(query, params);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orders[0];

        // Check if this is a drip feed order (parent or sub-order)
        let isDripFeed = false;
        let parentOrder = null;
        let subOrders = [];

        if (order.parent_order_id) {
            // This is a sub-order, get parent
            isDripFeed = true;
            const [parents] = await db.query(
                `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
                        o.remains, o.charge, o.shopify_order_number, o.provider_order_id, o.status, 
                        o.created_at, o.updated_at, o.parent_order_id,
                        o.dripfeed_runs as runs, o.dripfeed_interval as run_interval,
                        s.service_name, s.provider
                 FROM orders o
                 LEFT JOIN allowed_services s ON o.service_id = s.service_id
                 WHERE o.id = ?`,
                [order.parent_order_id]
            );
            if (parents.length > 0) {
                parentOrder = parents[0];
            }

            // Get all sub-orders of this parent
            const [subs] = await db.query(
                `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
                        o.remains, o.charge, o.shopify_order_number, o.provider_order_id, o.status, 
                        o.created_at, o.updated_at, o.parent_order_id,
                        o.dripfeed_runs as runs, o.dripfeed_interval as run_interval,
                        s.service_name, s.provider
                 FROM orders o
                 LEFT JOIN allowed_services s ON o.service_id = s.service_id
                 WHERE o.parent_order_id = ?
                 ORDER BY o.created_at ASC`,
                [order.parent_order_id]
            );
            subOrders = subs;
        } else if (order.runs && order.runs > 0) {
            // This is a parent drip feed order
            isDripFeed = true;
            parentOrder = order;

            // Get all sub-orders
            const [subs] = await db.query(
                `SELECT o.id, o.id as order_id, o.user_id, o.service_id, o.link, o.username, o.quantity, 
                        o.remains, o.charge, o.shopify_order_number, o.provider_order_id, o.status, 
                        o.created_at, o.updated_at, o.parent_order_id,
                        o.dripfeed_runs as runs, o.dripfeed_interval as run_interval,
                        s.service_name, s.provider
                 FROM orders o
                 LEFT JOIN allowed_services s ON o.service_id = s.service_id
                 WHERE o.parent_order_id = ?
                 ORDER BY o.created_at ASC`,
                [order.id]
            );
            subOrders = subs;
        }

        // Calculate progress
        const delivered = order.quantity - (order.remains || 0);
        const percentComplete = order.quantity > 0 ? Math.round((delivered / order.quantity) * 100) : 0;

        // Map percentage to progress steps (0-4) for UI
        let progressStep = 0;
        if (percentComplete >= 100) progressStep = 4;        // Completed
        else if (percentComplete >= 76) progressStep = 3;     // Stabilization
        else if (percentComplete >= 26) progressStep = 2;     // In Progress
        else if (percentComplete >= 1) progressStep = 1;      // Planning
        else progressStep = 0;                                // Just Created

        // Calculate estimated completion
        const createdDate = new Date(order.created_at);
        const now = new Date();
        let estimatedDate = 'En cours de calcul';
        
        if (isDripFeed && parentOrder) {
            // For drip feed, calculate based on runs
            const totalRuns = parentOrder.runs || order.runs || 1;
            const runInterval = parentOrder.run_interval || order.run_interval || 1440; // minutes
            const estimatedEnd = new Date(createdDate.getTime() + ((totalRuns - 1) * runInterval * 60 * 1000));
            estimatedDate = estimatedEnd.toLocaleDateString('fr-FR', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            });
        } else if (delivered > 0) {
            // For regular orders, estimate based on current delivery rate
            const elapsedMs = now.getTime() - createdDate.getTime();
            const elapsedDays = Math.max(elapsedMs / (1000 * 60 * 60 * 24), 0.1);
            const dailyRate = delivered / elapsedDays;
            
            if (dailyRate > 0 && order.remains > 0) {
                const daysRemaining = order.remains / dailyRate;
                const estimatedEnd = new Date(now.getTime() + (daysRemaining * 24 * 60 * 60 * 1000));
                estimatedDate = estimatedEnd.toLocaleDateString('fr-FR', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                });
            } else if (order.remains === 0) {
                estimatedDate = 'Terminé';
            }
        }

        // Build response in format expected by suivis frontend
        const response = {
            id: order.shopify_order_number || order.id.toString(),
            status: order.status,
            progress: progressStep,
            steps: [], // Not used by new UI
            product: order.service_name || 'Service',
            quantity: order.quantity,
            delivered: delivered,
            remains: order.remains || 0,
            link: order.link || order.username || '',
            created_at: order.created_at,
            estimated: estimatedDate,
            isDripFeed: isDripFeed,
            runs: isDripFeed ? (parentOrder?.runs || order.runs || 0) : 0,
            executedRuns: isDripFeed ? subOrders.filter(s => s.provider_order_id).length : 0,
            raw: {
                order: {
                    id: order.id,
                    order_id: order.order_id,
                    service_id: order.service_id,
                    service_name: order.service_name || 'Service',
                    link: order.link,
                    quantity: order.quantity,
                    remains: order.remains || 0,
                    delivered: delivered,
                    percent: percentComplete,
                    charge: order.charge || 0,
                    status: order.status,
                    provider: order.provider || 'Unknown',
                    provider_order_id: order.provider_order_id,
                    shopify_order_number: order.shopify_order_number,
                    created_at: order.created_at,
                    updated_at: order.updated_at,
                    created_by: {
                        name: order.created_by_name,
                        email: order.created_by_email
                    }
                },
                is_drip_feed: isDripFeed,
                drip_feed_info: isDripFeed ? {
                    parent_order: parentOrder ? {
                        id: parentOrder.id,
                        quantity: parentOrder.quantity,
                        runs: parentOrder.runs,
                        run_interval: parentOrder.run_interval,
                        status: parentOrder.status,
                        created_at: parentOrder.created_at,
                        next_run_at: parentOrder.runs && parentOrder.run_interval ? 
                            new Date(new Date(parentOrder.created_at).getTime() + 
                                (subOrders.filter(s => s.provider_order_id).length * parentOrder.run_interval * 60 * 1000)
                            ).toISOString() : null
                    } : null,
                    sub_orders: subOrders.map((sub, index) => ({
                        id: sub.id,
                        order_number: index + 1,
                        quantity: sub.quantity,
                        remains: sub.remains || 0,
                        delivered: sub.quantity - (sub.remains || 0),
                        status: sub.status,
                        provider_order_id: sub.provider_order_id,
                        created_at: sub.created_at,
                        is_executed: !!sub.provider_order_id
                    })),
                    total_runs: parentOrder ? parentOrder.runs : order.runs,
                    executed_runs: subOrders.filter(s => s.provider_order_id).length,
                    completed_runs: subOrders.filter(s => s.status === 'Completed').length
                } : null,
                account: isDripFeed && parentOrder ? {
                    next_run_at: parentOrder.runs && parentOrder.run_interval ? 
                        new Date(new Date(parentOrder.created_at).getTime() + 
                            (subOrders.filter(s => s.provider_order_id).length * parentOrder.run_interval * 60 * 1000)
                        ).toISOString() : null
                } : null
            }
        };

        res.json(response);
    } catch (err) {
        console.error('Track order error:', err);
        res.status(500).json({ error: 'Failed to track order' });
    }
});

// Helper functions
function getProgressStep(status) {
    const statusMap = {
        'pending': 0,
        'processing': 1,
        'in progress': 2,
        'partial': 2,
        'completed': 4,
        'canceled': 0,
        'refunded': 0
    };
    return statusMap[status?.toLowerCase()] || 0;
}

function calculateEstimatedCompletion(order) {
    if (order.status === 'Completed') {
        return 'Terminé';
    }
    
    if (order.runs > 1) {
        // Drip feed: estimate based on interval
        const remainingRuns = order.runs - (order.dripfeed_current_run || 0);
        if (remainingRuns > 0 && order.run_interval) {
            const estimatedMinutes = remainingRuns * order.run_interval;
            const hours = Math.floor(estimatedMinutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return `~${days} jour${days > 1 ? 's' : ''}`;
            if (hours > 0) return `~${hours} heure${hours > 1 ? 's' : ''}`;
            return `~${estimatedMinutes} minute${estimatedMinutes > 1 ? 's' : ''}`;
        }
    }
    
    // Standard order: estimate based on quantity
    const remains = order.remains || 0;
    if (remains > 0) {
        const avgSpeed = 1000; // per hour (adjust based on your service)
        const hours = Math.ceil(remains / avgSpeed);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `~${days} jour${days > 1 ? 's' : ''}`;
        if (hours > 0) return `~${hours} heure${hours > 1 ? 's' : ''}`;
    }
    
    return 'Bientôt';
}

export default router;
