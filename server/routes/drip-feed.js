import express from 'express';
import { authenticateToken, authenticateCron } from '../middleware/auth.js';
import db from '../config/database.js';
import { extractUsername } from '../lib/username-extractor.js';
import { smmRequest } from './smm.js';
import { notifyAdmins, createNotification } from './notifications.js';

const router = express.Router();

/**
 * Create a new order with immediate execution
 * - Standard orders: Execute immediately (1 run)
 * - Drip feed orders: Execute first run immediately, schedule remaining runs
 */
router.post('/create-order', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();

    try {
        console.log('=== POST /api/drip-feed/create-order ===');
        console.log('Request body:', JSON.stringify(req.body));
        console.log('User ID:', req.user?.id);

        await connection.beginTransaction();

        const { provider, service, link, quantity, service_name, dripfeed_quantity, dripfeed_enabled, shopify_order_number } = req.body;
        const userId = req.user.id;

        console.log('Parsed data:', { provider, service, link, quantity, service_name, dripfeed_quantity, dripfeed_enabled, shopify_order_number, userId });

        // Validate required fields
        if (!provider || !service || !link || !quantity) {
            console.error('Validation failed: Missing required fields');
            await connection.rollback();
            return res.status(400).json({ error: 'Provider, service, link, and quantity are required' });
        }

        // Get provider configuration
        const [providers] = await connection.query(
            'SELECT * FROM providers WHERE name = ? AND active = 1',
            [provider]
        );

        if (providers.length === 0) {
            console.error(`Provider ${provider} not found or inactive`);
            await connection.rollback();
            return res.status(400).json({ error: 'Provider not found or inactive' });
        }

        const providerData = providers[0];

        // Extract username from link
        const userInfo = extractUsername(link);
        const username = userInfo ? userInfo.username : null;

        // Get service details (for rate calculation)
        const [services] = await connection.query(
            'SELECT * FROM allowed_services WHERE service_id = ? AND provider = ?',
            [service, provider]
        );

        let serviceRate = 0;
        if (services.length > 0 && services[0].rate) {
            serviceRate = parseFloat(services[0].rate);
        }

        // Determine if drip feed is enabled
        const isDripFeed = dripfeed_enabled && dripfeed_quantity;

        if (isDripFeed) {
            // === DRIP FEED ORDER ===
            console.log('📦 Creating DRIP FEED order...');

            const totalQuantity = parseInt(quantity);
            const dailyQuantity = parseInt(dripfeed_quantity);
            const dripfeedRuns = Math.ceil(totalQuantity / dailyQuantity);
            const dripfeedInterval = 1440; // 24 hours in minutes

            // Calculate charge for the entire drip feed order
            const totalCharge = serviceRate > 0 ? (totalQuantity / 1000) * serviceRate : 0;

            // Create PARENT order (container, not sent to API)
            const [parentResult] = await connection.query(
                `INSERT INTO orders (
                    user_id, service_id, quantity, remains, charge, link, username, shopify_order_number,
                    status, dripfeed_runs, dripfeed_interval, dripfeed_current_run
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, service, totalQuantity, totalQuantity, totalCharge, link, username, shopify_order_number || null,
                    'processing', dripfeedRuns, dripfeedInterval, 0
                ]
            );

            const parentOrderId = parentResult.insertId;
            console.log(`✅ Parent order created: ID ${parentOrderId} (${dripfeedRuns} runs planned)`);

            // Create and execute FIRST SUB-ORDER immediately
            const firstRunQuantity = Math.min(dailyQuantity, totalQuantity);
            const firstRunCharge = serviceRate > 0 ? (firstRunQuantity / 1000) * serviceRate : 0;

            console.log(`🚀 Executing first run: ${firstRunQuantity} units...`);

            try {
                // Send to SMM API
                const smmResponse = await smmRequest(providerData, 'add', {
                    service: service,
                    link: link,
                    quantity: firstRunQuantity
                });

                const providerOrderId = smmResponse.order;
                console.log(`✅ SMM API Response: Order ID ${providerOrderId}`);

                // Create first sub-order in DB
                await connection.query(
                    `INSERT INTO orders (
                        user_id, service_id, quantity, remains, charge, link, username, shopify_order_number, provider_order_id,
                        status, parent_order_id, dripfeed_runs, dripfeed_interval, dripfeed_current_run
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId, service, firstRunQuantity, firstRunQuantity, firstRunCharge, link, username, shopify_order_number || null, providerOrderId,
                        'processing', parentOrderId, 1, dripfeedInterval, 1
                    ]
                );

                // Update parent order's current run count
                await connection.query(
                    'UPDATE orders SET dripfeed_current_run = 1 WHERE id = ?',
                    [parentOrderId]
                );

                console.log(`✅ First sub-order created and sent to API`);

            } catch (smmError) {
                console.error('❌ SMM API Error:', smmError);
                // Mark parent as failed
                await connection.query(
                    'UPDATE orders SET status = ? WHERE id = ?',
                    ['failed', parentOrderId]
                );
                throw smmError;
            }

            await connection.commit();

            // Return parent order info
            const [parentOrder] = await connection.query(
                'SELECT * FROM orders WHERE id = ?',
                [parentOrderId]
            );

            // Notify admins about new drip feed order
            await notifyAdmins({
                type: 'order_created',
                title: '💧 Nouvelle commande Drip Feed',
                message: `${service_name} - ${totalQuantity} unités en ${dripfeedRuns} exécutions`,
                data: { orderId, shopify_order_number, runs: dripfeedRuns },
                link: `/commandes`
            });

            res.json({
                success: true,
                order: parentOrder[0],
                drip_feed: true,
                runs: dripfeedRuns,
                message: `Drip feed order created. First run executed immediately, ${dripfeedRuns - 1} runs scheduled.`
            });

        } else {
            // === STANDARD ORDER ===
            console.log('📦 Creating STANDARD order...');

            const totalQuantity = parseInt(quantity);
            const totalCharge = serviceRate > 0 ? (totalQuantity / 1000) * serviceRate : 0;

            // Create order in DB first
            const [orderResult] = await connection.query(
                `INSERT INTO orders (
                    user_id, service_id, quantity, remains, charge, link, username, shopify_order_number,
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, service, totalQuantity, totalQuantity, totalCharge, link, username, shopify_order_number || null,
                    'pending'
                ]
            );

            const orderId = orderResult.insertId;
            console.log(`✅ Order created: ID ${orderId}`);

            try {
                // Send to SMM API immediately
                console.log(`🚀 Sending to SMM API...`);
                const smmResponse = await smmRequest(providerData, 'add', {
                    service: service,
                    link: link,
                    quantity: totalQuantity
                });

                const providerOrderId = smmResponse.order;
                console.log(`✅ SMM API Response: Order ID ${providerOrderId}`);

                // Update order with provider order ID and status
                await connection.query(
                    'UPDATE orders SET provider_order_id = ?, status = ? WHERE id = ?',
                    [providerOrderId, 'processing', orderId]
                );

                await connection.commit();

                // Return updated order
                const [newOrder] = await connection.query(
                    'SELECT * FROM orders WHERE id = ?',
                    [orderId]
                );

                // Notify admins about new standard order
                await notifyAdmins({
                    type: 'order_created',
                    title: '📦 Nouvelle commande',
                    message: `${service_name} - ${totalQuantity} unités`,
                    data: { orderId, shopify_order_number, provider_order_id: providerOrderId },
                    link: `/commandes`
                });

                res.json({
                    success: true,
                    order: newOrder[0],
                    provider_order_id: providerOrderId,
                    message: 'Order created and sent to provider successfully'
                });

            } catch (smmError) {
                console.error('❌ SMM API Error:', smmError);
                // Mark order as failed
                await connection.query(
                    'UPDATE orders SET status = ? WHERE id = ?',
                    ['failed', orderId]
                );
                await connection.commit();

                throw smmError;
            }
        }

    } catch (err) {
        await connection.rollback();
        console.error('Create order error:', err);
        res.status(500).json({ error: err.message || 'Failed to create order' });
    } finally {
        connection.release();
    }
});

/**
 * Process drip feed orders (run automatically by CRON)
 * Creates and executes the next sub-order for each parent drip feed order
 */
router.post('/process', authenticateCron, async (req, res) => {
    const connection = await db.getConnection();

    try {
        console.log('⏰ Processing drip feed orders...');
        await connection.beginTransaction();

        // Find parent drip feed orders that have runs remaining
        const [parentOrders] = await connection.query(
            `SELECT o.*, s.service_name
             FROM orders o
             LEFT JOIN allowed_services s ON o.service_id = s.service_id
             WHERE o.dripfeed_runs IS NOT NULL 
               AND o.dripfeed_runs > 0
               AND o.parent_order_id IS NULL
               AND o.dripfeed_current_run < o.dripfeed_runs
               AND o.status IN ('processing', 'pending')
             ORDER BY o.created_at ASC
             LIMIT 50`
        );

        if (parentOrders.length === 0) {
            await connection.rollback();
            console.log('✅ No drip feed orders to process');
            return res.json({ 
                success: true, 
                processed: 0, 
                message: 'No drip feed orders to process' 
            });
        }

        console.log(`📦 Found ${parentOrders.length} parent orders with remaining runs`);

        let processedCount = 0;
        let executedRuns = 0;
        let completedOrders = 0;
        const results = [];

        for (const parentOrder of parentOrders) {
            try {
                // Get provider configuration
                const [providers] = await connection.query(
                    'SELECT * FROM providers WHERE name = ? AND active = 1',
                    [parentOrder.provider || 'BulkMedya']
                );

                if (providers.length === 0) {
                    console.error(`❌ Provider not found for order ${parentOrder.id}`);
                    continue;
                }

                const provider = providers[0];

                // Get service details for quantity per run
                const [services] = await connection.query(
                    'SELECT * FROM allowed_services WHERE service_id = ?',
                    [parentOrder.service_id]
                );

                if (services.length === 0) {
                    console.error(`❌ Service ${parentOrder.service_id} not found`);
                    continue;
                }

                const service = services[0];
                const serviceRate = parseFloat(service.rate || 0);
                const quantityPerRun = parseInt(service.dripfeed_quantity || 250);

                // Check if it's time for the next run
                const lastSubOrder = await connection.query(
                    `SELECT created_at FROM orders 
                     WHERE parent_order_id = ? 
                     ORDER BY created_at DESC 
                     LIMIT 1`,
                    [parentOrder.id]
                );

                if (lastSubOrder[0].length > 0) {
                    const lastRunTime = new Date(lastSubOrder[0][0].created_at);
                    const intervalMs = parentOrder.dripfeed_interval * 60 * 1000;
                    const nextRunTime = new Date(lastRunTime.getTime() + intervalMs);
                    const now = new Date();

                    if (now < nextRunTime) {
                        console.log(`⏳ Order ${parentOrder.id}: Next run scheduled for ${nextRunTime.toISOString()}`);
                        continue; // Skip this order, not time yet
                    }
                }

                // Calculate quantity for this run
                const currentRun = parentOrder.dripfeed_current_run + 1;
                const totalQuantity = parentOrder.quantity;
                const remainingQuantity = totalQuantity - (parentOrder.dripfeed_current_run * quantityPerRun);
                const runQuantity = Math.min(quantityPerRun, remainingQuantity);
                const runCharge = serviceRate > 0 ? (runQuantity / 1000) * serviceRate : 0;

                console.log(`🚀 Order ${parentOrder.id}: Executing run ${currentRun}/${parentOrder.dripfeed_runs} (${runQuantity} units)`);

                // Send to SMM API
                const smmResponse = await smmRequest(provider, 'add', {
                    service: parentOrder.service_id,
                    link: parentOrder.link,
                    quantity: runQuantity
                });

                const providerOrderId = smmResponse.order;
                console.log(`✅ SMM API Response: Order ID ${providerOrderId}`);

                // Create sub-order in DB
                await connection.query(
                    `INSERT INTO orders (
                        user_id, service_id, quantity, remains, charge, link, username, shopify_order_number, provider_order_id,
                        status, parent_order_id, dripfeed_runs, dripfeed_interval, dripfeed_current_run
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        parentOrder.user_id, parentOrder.service_id, runQuantity, runQuantity, runCharge, 
                        parentOrder.link, parentOrder.username, parentOrder.shopify_order_number, providerOrderId,
                        'processing', parentOrder.id, 1, parentOrder.dripfeed_interval, currentRun
                    ]
                );

                // Update parent order's current run count
                const isComplete = currentRun >= parentOrder.dripfeed_runs;
                const newStatus = isComplete ? 'completed' : 'processing';

                await connection.query(
                    'UPDATE orders SET dripfeed_current_run = ?, status = ? WHERE id = ?',
                    [currentRun, newStatus, parentOrder.id]
                );

                processedCount++;
                executedRuns++;
                if (isComplete) {
                    completedOrders++;
                    console.log(`✅ Order ${parentOrder.id} COMPLETED (${currentRun}/${parentOrder.dripfeed_runs} runs)`);
                    
                    // Notify admins about drip feed completion
                    await notifyAdmins({
                        type: 'order_completed',
                        title: '✅ Commande Drip Feed terminée',
                        message: `Commande #${parentOrder.id} - ${parentOrder.dripfeed_runs} exécutions terminées`,
                        data: { orderId: parentOrder.id, runs: parentOrder.dripfeed_runs },
                        link: `/commandes`
                    });
                } else {
                    console.log(`✅ Order ${parentOrder.id} run ${currentRun}/${parentOrder.dripfeed_runs} executed`);
                    
                    // Notify admins about drip feed run execution
                    await notifyAdmins({
                        type: 'drip_executed',
                        title: `💧 Run ${currentRun}/${parentOrder.dripfeed_runs} exécuté`,
                        message: `Commande #${parentOrder.id} - ${runQuantity} unités livrées`,
                        data: { orderId: parentOrder.id, currentRun, totalRuns: parentOrder.dripfeed_runs, quantity: runQuantity },
                        link: `/commandes`
                    });
                }

                results.push({
                    orderId: parentOrder.id,
                    run: currentRun,
                    totalRuns: parentOrder.dripfeed_runs,
                    status: newStatus,
                    providerOrderId
                });

            } catch (orderErr) {
                console.error(`❌ Failed to process order ${parentOrder.id}:`, orderErr);
                // Mark parent as failed
                await connection.query(
                    'UPDATE orders SET status = ? WHERE id = ?',
                    ['failed', parentOrder.id]
                );
            }
        }

        await connection.commit();

        console.log(`✅ Drip feed processing complete: ${processedCount} orders processed, ${executedRuns} runs executed, ${completedOrders} completed`);

        res.json({
            success: true,
            processed: processedCount,
            executed: executedRuns,
            completed: completedOrders,
            results
        });

    } catch (err) {
        await connection.rollback();
        console.error('❌ Process drip feed error:', err);
        res.status(500).json({ error: err.message || 'Failed to process drip feed' });
    } finally {
        connection.release();
    }
});

/**
 * Get orders waiting for previous orders to complete
 */
router.get('/waiting-orders', authenticateToken, async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT o.*, s.service_name, s.delivery_mode, s.dripfeed_quantity
             FROM orders o
             LEFT JOIN allowed_services s ON o.service_id = s.service_id
             WHERE o.user_id = ?
               AND o.status = 'waiting_for_previous'
             ORDER BY o.created_at DESC`,
            [req.user.id]
        );

        res.json({ orders });
    } catch (err) {
        console.error('Get waiting orders error:', err);
        res.status(500).json({ error: 'Failed to fetch waiting orders' });
    }
});

// Get drip accounts (orders with dripfeed enabled)
router.get('/accounts', authenticateToken, async (req, res) => {
    try {
        const [accounts] = await db.query(
            `SELECT o.*, s.service_name, s.delivery_mode, s.dripfeed_quantity,
                    u.name as user_name
             FROM orders o
             LEFT JOIN allowed_services s ON o.service_id = s.service_id
             LEFT JOIN users u ON o.user_id = u.id
             WHERE o.dripfeed_runs IS NOT NULL
               AND o.dripfeed_runs > 0
             ORDER BY o.created_at DESC`
        );

        res.json({ accounts });
    } catch (err) {
        console.error('Get drip accounts error:', err);
        res.status(500).json({ error: 'Failed to fetch drip accounts' });
    }
});

// Get single drip account
router.get('/accounts/:accountId', authenticateToken, async (req, res) => {
    try {
        const accountId = parseInt(req.params.accountId);
        if (isNaN(accountId)) {
            return res.status(400).json({ error: 'Invalid account ID' });
        }

        const [accounts] = await db.query(
            `SELECT o.*, s.service_name, s.delivery_mode, s.dripfeed_quantity,
                    u.name as user_name
             FROM orders o
             LEFT JOIN allowed_services s ON o.service_id = s.service_id
             LEFT JOIN users u ON o.user_id = u.id
             WHERE o.id = ? AND o.dripfeed_runs IS NOT NULL`,
            [accountId]
        );

        if (accounts.length === 0) {
            return res.status(404).json({ error: 'Drip account not found' });
        }

        res.json({ account: accounts[0] });
    } catch (err) {
        console.error('Get drip account error:', err);
        res.status(500).json({ error: 'Failed to fetch drip account' });
    }
});

// Create drip account (alias for creating order with dripfeed)
router.post('/accounts', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            provider, service, service_name, link, quantity,
            dripfeed_quantity: dailyQuantity
        } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!provider || !service || !link || !quantity || !dailyQuantity) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Provider, service, link, quantity, and dripfeed_quantity are required'
            });
        }

        // Extract username for duplicate detection
        const userInfo = extractUsername(link);
        const username = userInfo ? userInfo.username : null;

        // Check for existing active orders for this profile
        const [existingOrders] = await connection.query(
            `SELECT id, status
             FROM orders
             WHERE user_id = ? AND username = ?
               AND status IN ('pending', 'processing', 'waiting_for_previous')
             ORDER BY created_at ASC
             LIMIT 1`,
            [userId, username]
        );

        let status = 'pending';
        let parentId = null;

        if (existingOrders.length > 0) {
            status = 'waiting_for_previous';
            parentId = existingOrders[0].id;
        }

        // Calculate drip feed parameters
        const totalQuantity = parseInt(quantity);
        const dailyQty = parseInt(dailyQuantity);
        const dripfeedRuns = Math.ceil(totalQuantity / dailyQty);
        const dripfeedInterval = 1440; // 24 hours

        // Insert the order
        const [result] = await connection.query(
            `INSERT INTO orders (
                user_id, service_id, quantity, link, username,
                status, dripfeed_runs, dripfeed_interval, dripfeed_current_run,
                parent_order_id, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, service, quantity, link, username,
                status, dripfeedRuns, dripfeedInterval, 0,
                parentId,
                JSON.stringify({ service_name, provider })
            ]
        );

        await connection.commit();

        const [newOrder] = await connection.query(
            'SELECT * FROM orders WHERE id = ?',
            [result.insertId]
        );

        res.json({
            success: true,
            account: newOrder[0],
            queued: status === 'waiting_for_previous'
        });

    } catch (err) {
        await connection.rollback();
        console.error('Create drip account error:', err);
        res.status(500).json({ error: err.message || 'Failed to create drip account' });
    } finally {
        connection.release();
    }
});

// Cancel/delete drip account
router.delete('/accounts/:accountId', authenticateToken, async (req, res) => {
    try {
        const accountId = parseInt(req.params.accountId);
        if (isNaN(accountId)) {
            return res.status(400).json({ error: 'Invalid account ID' });
        }

        let query, params;
        if (req.user.role === 'admin') {
            query = 'UPDATE orders SET status = ? WHERE id = ?';
            params = ['cancelled', accountId];
        } else {
            query = 'UPDATE orders SET status = ? WHERE id = ? AND user_id = ?';
            params = ['cancelled', accountId, req.user.id];
        }

        await db.query(query, params);
        res.json({ success: true, message: 'Drip account cancelled' });
    } catch (err) {
        console.error('Cancel drip account error:', err);
        res.status(500).json({ error: 'Failed to cancel drip account' });
    }
});

// Get drip runs
router.get('/runs', authenticateToken, async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;

        let query = `
            SELECT o.*, s.service_name,
                    u.name as user_name
            FROM orders o
            LEFT JOIN allowed_services s ON o.service_id = s.service_id
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.dripfeed_runs IS NOT NULL AND o.dripfeed_runs > 0
        `;
        const params = [];

        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }

        query += ' ORDER BY o.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const [runs] = await db.query(query, params);

        res.json({ runs });
    } catch (err) {
        console.error('Get drip runs error:', err);
        res.status(500).json({ error: 'Failed to fetch drip runs' });
    }
});

// Run drip engine (process pending drip feed orders)
router.post('/run-engine', authenticateToken, async (req, res) => {
    try {
        // This would typically be called by a cron job
        // For now, we'll just return a placeholder response
        res.json({
            success: true,
            message: 'Drip engine triggered',
            processed: 0
        });
    } catch (err) {
        console.error('Run drip engine error:', err);
        res.status(500).json({ error: 'Failed to run drip engine' });
    }
});

// Fix blocked runs
router.post('/fix-blocked', authenticateToken, async (req, res) => {
    try {
        // Find and fix orders that might be stuck
        const [updated] = await db.query(
            `UPDATE orders
             SET status = 'pending'
             WHERE status = 'waiting_for_previous'
               AND parent_order_id NOT IN (SELECT id FROM orders WHERE id IN (
                   SELECT parent_order_id FROM orders WHERE status = 'waiting_for_previous'
               ))`
        );

        res.json({
            success: true,
            fixed: updated.affectedRows || 0,
            message: `Fixed ${updated.affectedRows || 0} blocked orders`
        });
    } catch (err) {
        console.error('Fix blocked runs error:', err);
        res.status(500).json({ error: 'Failed to fix blocked runs' });
    }
});

// Force run a drip account
router.post('/accounts/:accountId/force-run', authenticateToken, async (req, res) => {
    try {
        const accountId = parseInt(req.params.accountId);
        if (isNaN(accountId)) {
            return res.status(400).json({ error: 'Invalid account ID' });
        }

        // Reset status to pending to force processing
        await db.query(
            "UPDATE orders SET status = 'pending' WHERE id = ?",
            [accountId]
        );

        res.json({
            success: true,
            message: 'Drip account will be reprocessed',
            accountId
        });
    } catch (err) {
        console.error('Force run drip account error:', err);
        res.status(500).json({ error: 'Failed to force run drip account' });
    }
});

// Update drip account status
router.put('/accounts/:accountId/status', authenticateToken, async (req, res) => {
    try {
        const accountId = parseInt(req.params.accountId);
        const { status } = req.body;

        if (isNaN(accountId)) {
            return res.status(400).json({ error: 'Invalid account ID' });
        }

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        await db.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, accountId]
        );

        res.json({
            success: true,
            message: 'Status updated',
            accountId,
            status
        });
    } catch (err) {
        console.error('Update drip account status error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Get Shopify orders (placeholder for future Shopify integration)
router.get('/shopify-orders', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            orders: [],
            message: 'Shopify integration not yet implemented'
        });
    } catch (err) {
        console.error('Get Shopify orders error:', err);
        res.status(500).json({ error: 'Failed to fetch Shopify orders' });
    }
});

export default router;
