import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Bot intelligence: analyse la question et retourne les données appropriées
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.id; // Get from authenticated user
        const userMessage = message.toLowerCase().trim();

        console.log(`🤖 [BOT] Question de user_id=${userId}: "${message}"`);

        let botResponse = '';
        let data = null;

        // === COMMANDES ===
        if (userMessage.includes('commande') || userMessage.includes('order')) {
            
            // Combien de commandes
            if (userMessage.includes('combien') || userMessage.includes('nombre') || userMessage.includes('total')) {
                const [result] = await db.query(
                    'SELECT COUNT(*) as total FROM orders WHERE user_id = ? AND parent_order_id IS NULL',
                    [userId]
                );
                const total = result[0].total;
                botResponse = `📦 Vous avez **${total} commandes** au total.`;

                // Détails par statut
                const [statusBreakdown] = await db.query(
                    `SELECT status, COUNT(*) as count FROM orders 
                     WHERE user_id = ? AND parent_order_id IS NULL GROUP BY status`,
                    [userId]
                );
                if (statusBreakdown.length > 0) {
                    botResponse += '\n\n**Répartition par statut:**\n';
                    statusBreakdown.forEach(s => {
                        const emoji = s.status === 'Completed' ? '✅' : 
                                     s.status === 'Pending' ? '⏳' : 
                                     s.status === 'Processing' ? '🔄' : 
                                     s.status === 'Partial' ? '⚠️' : '❌';
                        botResponse += `${emoji} ${s.status}: ${s.count}\n`;
                    });
                }
                data = { total, breakdown: statusBreakdown };
            }
            
            // Dernières commandes
            else if (userMessage.includes('dernière') || userMessage.includes('récent') || userMessage.includes('latest')) {
                const [orders] = await db.query(
                    `SELECT id, link, quantity, remains, status, charge, created_at, shopify_order_number, dripfeed_runs 
                     FROM orders WHERE user_id = ? AND parent_order_id IS NULL 
                     ORDER BY created_at DESC LIMIT 5`,
                    [userId]
                );
                
                if (orders.length > 0) {
                    botResponse = `📋 Vos **${orders.length} dernières commandes:**\n\n`;
                    orders.forEach((order, i) => {
                        const progress = order.quantity > 0 
                            ? Math.round(((order.quantity - order.remains) / order.quantity) * 100) 
                            : 0;
                        const emoji = order.status === 'Completed' ? '✅' : 
                                     order.status === 'Pending' ? '⏳' : '🔄';
                        const orderNum = order.shopify_order_number || `ID-${order.id}`;
                        const isDrip = order.dripfeed_runs > 0 ? ' 💧' : '';
                        botResponse += `${i + 1}. ${emoji} **#${orderNum}**${isDrip}\n`;
                        botResponse += `   • Statut: ${order.status} (${progress}%)\n`;
                        botResponse += `   • Quantité: ${order.quantity - order.remains}/${order.quantity}\n`;
                        botResponse += `   • Coût: $${parseFloat(order.charge || 0).toFixed(3)}\n`;
                        botResponse += `   • Date: ${new Date(order.created_at).toLocaleDateString('fr-FR')}\n\n`;
                    });
                } else {
                    botResponse = `Aucune commande trouvée.`;
                }
                data = { orders };
            }
            
            // Commandes en cours
            else if (userMessage.includes('en cours') || userMessage.includes('processing') || userMessage.includes('actif')) {
                const [orders] = await db.query(
                    `SELECT id, link, quantity, remains, status, created_at, shopify_order_number, dripfeed_runs 
                     FROM orders WHERE user_id = ? AND status IN ('Pending', 'Processing', 'In progress') AND parent_order_id IS NULL 
                     ORDER BY created_at DESC`,
                    [userId]
                );
                
                if (orders.length > 0) {
                    botResponse = `🔄 Vous avez **${orders.length} commandes en cours:**\n\n`;
                    orders.forEach((order, i) => {
                        const progress = order.quantity > 0 
                            ? Math.round(((order.quantity - order.remains) / order.quantity) * 100) 
                            : 0;
                        const orderNum = order.shopify_order_number || `ID-${order.id}`;
                        const isDrip = order.dripfeed_runs > 0 ? ' 💧' : '';
                        botResponse += `${i + 1}. **#${orderNum}**${isDrip} - ${order.status} (${progress}%)\n`;
                        botResponse += `   • Progression: ${order.quantity - order.remains}/${order.quantity}\n\n`;
                    });
                } else {
                    botResponse = `✅ Aucune commande en cours. Toutes vos commandes sont terminées ou annulées.`;
                }
                data = { orders };
            }
            
            // Total dépensé
            else if (userMessage.includes('dépensé') || userMessage.includes('coût') || userMessage.includes('spent')) {
                const [result] = await db.query(
                    `SELECT SUM(CAST(charge AS DECIMAL(10,4))) as total_spent FROM orders WHERE user_id = ? AND parent_order_id IS NULL`,
                    [userId]
                );
                const totalSpent = parseFloat(result[0].total_spent || 0);
                botResponse = `💰 Vous avez dépensé un total de **$${totalSpent.toFixed(2)}** sur toutes vos commandes.`;
                
                // Dépenses du mois
                const [monthResult] = await db.query(
                    `SELECT SUM(CAST(charge AS DECIMAL(10,4))) as month_spent FROM orders 
                     WHERE user_id = ? AND parent_order_id IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
                    [userId]
                );
                const monthSpent = parseFloat(monthResult[0].month_spent || 0);
                if (monthSpent > 0) {
                    botResponse += `\n\n📅 Ce mois-ci: **$${monthSpent.toFixed(2)}**`;
                }
                data = { total: totalSpent, month: monthSpent };
            }
            
            else {
                botResponse = `📦 **Commandes disponibles:**\n\n` +
                    `Posez-moi des questions comme:\n` +
                    `• "Combien de commandes j'ai?"\n` +
                    `• "Montre mes dernières commandes"\n` +
                    `• "Quelles sont mes commandes en cours?"\n` +
                    `• "Combien j'ai dépensé?"`;
            }
        }

        // === SERVICES ===
        else if (userMessage.includes('service') || userMessage.includes('categor')) {
            
            if (userMessage.includes('combien') || userMessage.includes('nombre') || userMessage.includes('list')) {
                const [services] = await db.query(
                    `SELECT COUNT(*) as total FROM services`
                );
                const total = services[0].total;
                
                const [categories] = await db.query(
                    `SELECT category, COUNT(*) as count FROM services GROUP BY category ORDER BY count DESC`
                );
                
                botResponse = `🎯 Il y a **${total} services** disponibles.\n\n**Par catégorie:**\n`;
                categories.forEach(cat => {
                    botResponse += `• ${cat.category}: ${cat.count} services\n`;
                });
                data = { total, categories };
            }
            
            // Services populaires
            else if (userMessage.includes('populaire') || userMessage.includes('plus utilisé') || userMessage.includes('top')) {
                const [topServices] = await db.query(
                    `SELECT s.name, s.category, COUNT(o.id) as order_count 
                     FROM services s 
                     LEFT JOIN orders o ON s.id = o.service_id 
                     WHERE o.user_id = ?
                     GROUP BY s.id 
                     ORDER BY order_count DESC 
                     LIMIT 5`,
                    [userId]
                );
                
                if (topServices.length > 0) {
                    botResponse = `🔥 Vos **services les plus utilisés:**\n\n`;
                    topServices.forEach((svc, i) => {
                        botResponse += `${i + 1}. **${svc.name}**\n`;
                        botResponse += `   • Catégorie: ${svc.category}\n`;
                        botResponse += `   • Utilisé ${svc.order_count} fois\n\n`;
                    });
                } else {
                    botResponse = `Aucun service utilisé pour le moment.`;
                }
                data = { services: topServices };
            }
            
            else {
                botResponse = `🎯 **Services disponibles:**\n\n` +
                    `Posez-moi des questions comme:\n` +
                    `• "Combien de services disponibles?"\n` +
                    `• "Quels sont mes services les plus utilisés?"\n` +
                    `• "Liste des catégories"`;
            }
        }

        // === DRIP FEED ===
        else if (userMessage.includes('drip') || userMessage.includes('flux')) {
            const [dripOrders] = await db.query(
                `SELECT COUNT(*) as total, 
                 SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                 SUM(CASE WHEN status IN ('Pending', 'Processing') THEN 1 ELSE 0 END) as active
                 FROM orders 
                 WHERE user_id = ? AND dripfeed_runs > 0 AND parent_order_id IS NULL`,
                [userId]
            );
            
            const stats = dripOrders[0];
            botResponse = `💧 **Drip Feed:**\n\n`;
            botResponse += `• Total: ${stats.total} commandes\n`;
            botResponse += `• Actives: ${stats.active}\n`;
            botResponse += `• Complétées: ${stats.completed}\n`;
            
            // Prochaine exécution
            const [nextRun] = await db.query(
                `SELECT MIN(dripfeed_next_run) as next_execution 
                 FROM orders 
                 WHERE user_id = ? AND parent_order_id IS NULL AND dripfeed_next_run IS NOT NULL AND status != 'Completed'`,
                [userId]
            );
            
            if (nextRun[0].next_execution) {
                const nextDate = new Date(nextRun[0].next_execution);
                const now = new Date();
                const diffMs = nextDate - now;
                const diffMins = Math.round(diffMs / 60000);
                
                if (diffMins > 0) {
                    const hours = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;
                    botResponse += `\n⏰ Prochaine exécution: ${hours}h${mins}min`;
                }
            }
            data = stats;
        }

        // === DÉPENSES / COÛTS ===
        else if (userMessage.includes('solde') || userMessage.includes('balance') || userMessage.includes('argent') || userMessage.includes('dépens')) {
            // Calcul des dépenses totales
            const [totalSpent] = await db.query(
                `SELECT SUM(CAST(charge AS DECIMAL(10,4))) as total 
                 FROM orders 
                 WHERE user_id = ? AND parent_order_id IS NULL`,
                [userId]
            );
            
            const total = parseFloat(totalSpent[0].total || 0);
            botResponse = `💰 **Vos dépenses:**\n\n`;
            botResponse += `• Total dépensé: **$${total.toFixed(2)}**\n`;
            
            // Calcul des commandes en cours
            const [pending] = await db.query(
                `SELECT SUM(CAST(charge AS DECIMAL(10,4))) as pending_cost 
                 FROM orders 
                 WHERE user_id = ? AND parent_order_id IS NULL AND status IN ('Pending', 'Processing')`,
                [userId]
            );
            const pendingCost = parseFloat(pending[0].pending_cost || 0);
            
            if (pendingCost > 0) {
                botResponse += `• Réservé (en cours): **$${pendingCost.toFixed(2)}**\n`;
            }
            
            // Dépenses complétées
            const [completed] = await db.query(
                `SELECT SUM(CAST(charge AS DECIMAL(10,4))) as completed_cost 
                 FROM orders 
                 WHERE user_id = ? AND parent_order_id IS NULL AND status = 'Completed'`,
                [userId]
            );
            const completedCost = parseFloat(completed[0].completed_cost || 0);
            botResponse += `• Commandes terminées: **$${completedCost.toFixed(2)}**`;
            
            // Dépenses du mois
            const [monthSpent] = await db.query(
                `SELECT SUM(CAST(charge AS DECIMAL(10,4))) as month_cost 
                 FROM orders 
                 WHERE user_id = ? AND parent_order_id IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
                [userId]
            );
            const monthCost = parseFloat(monthSpent[0].month_cost || 0);
            if (monthCost > 0) {
                botResponse += `\n\n📅 **Ce mois-ci:** $${monthCost.toFixed(2)}`;
            }
            
            data = { total, pending: pendingCost, completed: completedCost, month: monthCost };
        }

        // === STATISTIQUES ===
        else if (userMessage.includes('stat') || userMessage.includes('résumé') || userMessage.includes('overview')) {
            const [orderStats] = await db.query(
                `SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status IN ('Pending', 'Processing', 'In progress') THEN 1 ELSE 0 END) as active,
                    SUM(CAST(charge AS DECIMAL(10,4))) as total_spent
                 FROM orders WHERE user_id = ? AND parent_order_id IS NULL`,
                [userId]
            );
            
            const [user] = await db.query('SELECT created_at FROM users WHERE id = ?', [userId]);
            
            const stats = orderStats[0];
            const successRate = stats.total_orders > 0 
                ? Math.round((stats.completed / stats.total_orders) * 100) 
                : 0;
            
            botResponse = `📊 **Vos statistiques:**\n\n`;
            botResponse += `📦 Commandes totales: ${stats.total_orders}\n`;
            botResponse += `✅ Complétées: ${stats.completed} (${successRate}%)\n`;
            botResponse += `🔄 Actives: ${stats.active}\n`;
            botResponse += `💵 Total dépensé: $${parseFloat(stats.total_spent || 0).toFixed(2)}\n`;
            
            const memberSince = new Date(user[0].created_at);
            const daysSince = Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24));
            botResponse += `\n👤 Membre depuis ${daysSince} jours`;
            
            data = { ...stats, successRate };
        }

        // === AIDE ===
        else if (userMessage.includes('aide') || userMessage.includes('help') || userMessage.includes('quoi') || userMessage.includes('?')) {
            botResponse = `🤖 **Je peux vous aider avec:**\n\n` +
                `📦 **Commandes**\n` +
                `• "Combien de commandes j'ai?"\n` +
                `• "Mes dernières commandes"\n` +
                `• "Commandes en cours"\n` +
                `• "Combien j'ai dépensé?"\n\n` +
                `🎯 **Services**\n` +
                `• "Combien de services?"\n` +
                `• "Services les plus utilisés"\n\n` +
                `💧 **Drip Feed**\n` +
                `• "Mes commandes drip feed"\n\n` +
                `💰 **Finance**\n` +
                `• "Mes dépenses"\n` +
                `• "Mes statistiques"`;
        }

        // === DÉFAUT ===
        else {
            botResponse = `🤔 Je n'ai pas bien compris votre question.\n\n` +
                `Essayez des questions comme:\n` +
                `• "Combien de commandes j'ai?"\n` +
                `• "Mes dernières commandes"\n` +
                `• "Mes dépenses"\n` +
                `• "Mes statistiques"\n\n` +
                `Ou tapez "aide" pour voir toutes les commandes disponibles.`;
        }

        res.json({
            success: true,
            response: botResponse,
            data,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('[BOT] Erreur:', error);
        res.status(500).json({
            success: false,
            response: `❌ Une erreur s'est produite. Veuillez réessayer.`,
            error: error.message
        });
    }
});

export default router;
