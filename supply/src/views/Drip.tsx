import { Activity, CheckCircle, Clock, Download, LayoutList, Lock, Play, RefreshCw, Trash2, TrendingUp, Zap } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useState, useEffect } from "react";
import api from "../libs/api";
import { cn } from "../libs/utils";

interface DripAccount {
    id: number;
    shopify_order_number: string;
    platform_username: string;
    platform: string;
    status: string;
    total_quantity: number;
    delivered_quantity: number;
    quantity_per_run: number;
    reserved_balance: string;
    next_run_at?: string;
}

interface DripRun {
    id: number;
    drip_account_id: number;
    planned_quantity: number;
    actual_quantity: number;
    status: string;
    created_at: string;
}

interface Order {
    id: number;
    order_id: string;
    service_name: string;
    link: string;
    quantity: number;
    remains?: number;
    charge?: number;
    status: string;
    provider: string;
    provider_order_id?: string;
    runs: number;
    run_interval: number;
    service_rate?: number;
    created_at: string;
    parent_order_id?: string;
    queue_status?: string;
    shopify_order_number?: string;
}

export function Drip() {
    const ITEMS_PER_PAGE = 15;
    const { isAdmin } = useAuth();
    const { on, off, isConnected } = useWebSocket();

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const [activeTab, setActiveTab] = useState<'shopify' | 'flux' | 'pending' | 'history'>('shopify');
    const [accounts, setAccounts] = useState<DripAccount[]>([]);
    const [runs, setRuns] = useState<DripRun[]>([]);
    const [dripOrders, setDripOrders] = useState<Order[]>([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery] = useState('');

    const [stats, setStats] = useState({
        // flux tab
        reservedBalance: 0,
        activeRuns: 0,
        successRate: 0,
        pending: 0,
        // shopify / shared
        total: 0,
        inProgress: 0,
        partialOrders: 0,
        // history tab
        completedStandard: 0,
        completedDrip: 0,
        totalDeliveredQty: 0,
        // pending tab
        pendingStandard: 0,
        pendingDrip: 0,
        pendingQueued: 0,
    });

    // WebSocket listeners for real-time updates without resetting filters
    useEffect(() => {
        if (!isConnected) return;

        const handleOrderUpdated = (data: any) => {
            console.log('🔄 Drip: Order updated via WebSocket', data);
            // Silently reload data without resetting filters
            loadData(true);
        };

        const handleDripExecuted = (data: any) => {
            console.log('💧 Drip: Drip executed via WebSocket', data);
            loadData(true);
        };

        const handleOrderCompleted = (data: any) => {
            console.log('✅ Drip: Order completed via WebSocket', data);
            loadData(true);
        };

        on('order:updated', handleOrderUpdated);
        on('drip:executed', handleDripExecuted);
        on('order:completed', handleOrderCompleted);

        return () => {
            off('order:updated', handleOrderUpdated);
            off('drip:executed', handleDripExecuted);
            off('order:completed', handleOrderCompleted);
        };
    }, [isConnected, on, off, activeTab]);

    const loadData = async (silent = false) => {
        // Only show loading spinner if not a silent background refresh
        if (!silent) {
            setLoading(true);
        }
        try {
            if (activeTab === 'shopify') {
                // Load standard (non-drip) orders - NO SYNC for faster loading
                // Exclude completed orders (they appear in 'Complétées' tab only)
                console.log('[STANDARD] Loading standard orders...');
                const ordersData = await api.getOrders({}, false, 1, 2000); // NO sync, load up to 2000 orders
                const standardOrders = ordersData.orders?.filter((order: Order) =>
                    !order.parent_order_id && (!order.runs || order.runs === 0) && order.status?.toLowerCase() !== 'completed'
                ) || [];
                console.log('[STANDARD] Standard orders loaded (excluding completed):', standardOrders.length);
                setAccounts(standardOrders as any);

                // Stats for shopify tab
                const stdTotal = standardOrders.length;
                const stdInProgress = standardOrders.filter((o: Order) =>
                    ['in progress', 'processing'].includes(o.status?.toLowerCase() ?? '')
                ).length;
                const stdPending = standardOrders.filter((o: Order) =>
                    o.status?.toLowerCase() === 'pending'
                ).length;
                const stdPartial = standardOrders.filter((o: Order) =>
                    o.status?.toLowerCase() === 'partial'
                ).length;
                setStats(s => ({ ...s, total: stdTotal, inProgress: stdInProgress, pending: stdPending, partialOrders: stdPartial }));
            } else if (activeTab === 'flux') {
                // Load active drip feed orders - NO SYNC for faster loading
                console.log('[DRIP] Loading drip feed orders...');
                const ordersData = await api.getOrders({}, false, 1, 3000); // NO sync, load up to 3000 orders
                // Include ALL drip feed orders for proper grouping (completed will be filtered after grouping)
                const dripFeedOrders = ordersData.orders?.filter((order: Order) =>
                    order.runs > 0 || order.parent_order_id
                ) || [];
                console.log('[DRIP] Drip feed orders loaded:', dripFeedOrders.length);
                console.log('[DRIP] Orders with parent_order_id:', dripFeedOrders.filter((o: Order) => o.parent_order_id).length);
                setDripOrders(dripFeedOrders);

                // Calculate stats from ALL drip feed orders (including sub-orders)
                // Group first to avoid counting sub-orders multiple times
                const groupedForStats = groupDripFeedOrders(dripFeedOrders);

                const activeOrders = groupedForStats.filter((o: Order) =>
                    ['pending', 'in progress', 'processing'].includes(o.status?.toLowerCase() ?? '')
                ).length;
                const completedOrders = groupedForStats.filter((o: Order) => o.status?.toLowerCase() === 'completed').length;
                // Count queued orders from grouped data (count each parent group once)
                const queuedOrders = groupedForStats.filter((o: Order) =>
                    o.status?.toLowerCase() === 'pending' || (o as any).totalRuns > (o as any).executedRuns
                ).length;
                // Calculate remaining cost — o.charge is already the remaining cost
                // (set in groupDripFeedOrders as (totalRemains / 1000) * serviceRate)
                const totalCost = groupedForStats.reduce((sum: number, o: Order) => {
                    return sum + (parseFloat(o.charge?.toString() || '0') || 0);
                }, 0);
                const totalOrders = groupedForStats.length;
                const successRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100) : 0;

                console.log('[DRIP] Stats calculated:', {
                    active: activeOrders,
                    completed: completedOrders,
                    queued: queuedOrders,
                    cost: totalCost,
                    successRate
                });

                setStats(s => ({
                    ...s,
                    reservedBalance: totalCost,
                    activeRuns: activeOrders,
                    successRate: successRate,
                    pending: queuedOrders
                }));
            } else if (activeTab === 'pending') {
                // Load orders waiting in queue (same link conflict)
                console.log('[PENDING] Loading waiting orders...');
                const ordersData = await api.getOrders({}, false, 1, 3000);
                // Filter orders that are waiting (status contains 'waiting' or queue_status is set)
                const waitingOrders = ordersData.orders?.filter((order: Order) => {
                    const isWaiting = order.status?.toLowerCase().includes('waiting') ||
                                    order.status === 'Queued' ||
                                    order.queue_status === 'waiting' ||
                                    order.queue_status === 'queued';
                    return isWaiting;
                }) || [];
                console.log('[PENDING] Waiting orders loaded:', waitingOrders.length);
                setRuns(waitingOrders as any);

                // Stats for pending tab
                const pendingTotal = waitingOrders.length;
                const pendingDrip = waitingOrders.filter((o: Order) => o.runs && o.runs > 0).length;
                const pendingStd = pendingTotal - pendingDrip;
                const pendingQueued = waitingOrders.filter((o: Order) =>
                    o.queue_status === 'waiting' || o.queue_status === 'queued'
                ).length;
                setStats(s => ({ ...s, total: pendingTotal, pending: pendingTotal, pendingStandard: pendingStd, pendingDrip: pendingDrip, pendingQueued: pendingQueued }));
            } else if (activeTab === 'history') {
                // Load ALL completed orders (standard + drip feed) - NO SYNC for faster loading
                console.log('[HISTORY] Loading completed orders...');
                const ordersData = await api.getOrders({}, false, 1, 3000); // NO sync, load up to 3000 orders
                
                // Load ALL orders to properly group drip feed orders
                const allOrders = ordersData.orders || [];
                
                // Separate standard and drip feed orders
                const standardCompleted = allOrders.filter((order: Order) =>
                    order.status?.toLowerCase() === 'completed' && !order.parent_order_id && (!order.runs || order.runs === 0)
                );
                
                const dripFeedOrders = allOrders.filter((order: Order) =>
                    order.runs > 0 || order.parent_order_id
                );
                
                // Group drip feed orders and keep only completed ones
                const groupedDripFeed = groupDripFeedOrders(dripFeedOrders, true); // includeCompleted = true
                const dripFeedCompleted = groupedDripFeed.filter((order: Order) => order.status?.toLowerCase() === 'completed');
                
                // Combine both types
                const completedOrders = [...standardCompleted, ...dripFeedCompleted]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                const totalDeliveredQty = completedOrders.reduce((sum: number, o: Order) => sum + (o.quantity || 0), 0);
                console.log('[HISTORY] Completed orders loaded:', {
                    standard: standardCompleted.length,
                    dripFeed: dripFeedCompleted.length,
                    total: completedOrders.length
                });
                
                setRuns(completedOrders as any);
                setStats(s => ({
                    ...s,
                    total: completedOrders.length,
                    completedStandard: standardCompleted.length,
                    completedDrip: dripFeedCompleted.length,
                    totalDeliveredQty,
                }));
            }
        } catch (error) {
            console.error('[DRIP] Failed to load drip data:', error);
        } finally {
            setLoading(false);
        }
    };

    const groupDripFeedOrders = (orders: Order[], includeCompleted: boolean = false) => {
        const grouped: Order[] = [];
        const parentGroups = new Map<number, Order[]>();
        const parentOrders = new Map<number, Order>();

        console.log('[DRIP GROUP] Début du regroupement de', orders.length, 'commandes (includeCompleted:', includeCompleted, ')');

        // First pass: identify parents and group sub-orders
        orders.forEach(order => {
            if (order.parent_order_id) {
                // This is a sub-order
                const parentId = parseInt(order.parent_order_id);
                if (!parentGroups.has(parentId)) {
                    parentGroups.set(parentId, []);
                }
                parentGroups.get(parentId)!.push(order);
            } else if (order.runs && order.runs > 0) {
                // This is a parent order
                parentOrders.set(order.id, order);
            } else {
                // Standard order (no drip feed)
                grouped.push(order);
            }
        });

        console.log('[DRIP GROUP] Parents trouvés:', parentOrders.size);
        console.log('[DRIP GROUP] Groupes de sous-ordres trouvés:', parentGroups.size);

        // Process each parent order
        parentOrders.forEach((parentOrder, parentId) => {
            const subOrders = parentGroups.get(parentId) || [];

            console.log(`\n========================================`);
            console.log(`[DRIP GROUP] 📦 Parent Order: ${parentId}`);
            console.log(`[DRIP GROUP] 📊 Nombre de sous-commandes: ${subOrders.length}`);

            if (subOrders.length === 0) {
                // Parent has no sub-orders yet (first run not created or failed)
                console.log(`[DRIP GROUP] ⚠️ Parent ${parentId} has no sub-orders yet`);
                grouped.push(parentOrder);
                return;
            }

            // Log each sub-order
            subOrders.forEach((o, idx) => {
                console.log(`  [${idx + 1}/${subOrders.length}] Order #${o.order_id || o.id}`);
                console.log(`    - Status: ${o.status || 'N/A'}`);
                console.log(`    - Queue Status: ${o.queue_status || 'N/A'}`);
                console.log(`    - Quantity: ${o.quantity}`);
                console.log(`    - Remains: ${o.remains ?? 'undefined'}`);
                console.log(`    - Charge: $${o.charge || 0}`);
                console.log(`    - Runs: ${o.runs}`);
                console.log(`    - Provider Order ID: ${(o as any).provider_order_id || 'N/A'}`);
                console.log(`    - Created: ${new Date(o.created_at).toLocaleString('fr-FR')}`);
            });

            // Count executed orders (vraiment exécutées = ont un provider_order_id)
            const executedOrders = subOrders.filter(o =>
                (o as any).provider_order_id && o.status &&
                !['', 'scheduled', 'queued', 'pending'].includes(o.status?.toLowerCase() ?? '')
            );
            const completedCount = subOrders.filter(o => o.status?.toLowerCase() === 'completed').length;
            const totalRuns = parentOrder.runs;
            const totalQuantity = parentOrder.quantity;

            console.log(`\n  📈 STATISTIQUES:`);
            console.log(`    - Total runs planned: ${totalRuns}`);
            console.log(`    - Sub-orders created: ${subOrders.length}`);
            console.log(`    - Executed runs: ${executedOrders.length}`);
            console.log(`    - Completed runs: ${completedCount}`);
            console.log(`    - Total quantity: ${totalQuantity}`);

            // Calculate totalDelivered: sum of all delivered quantities from executed orders
            const totalDelivered = subOrders.reduce((sum, o) => {
                const isExecuted = (o as any).provider_order_id && o.status &&
                    !['', 'scheduled', 'queued', 'pending'].includes(o.status?.toLowerCase() ?? '');
                if (!isExecuted) {
                    console.log(`    ⏸️  Order ${o.order_id || o.id}: NON EXÉCUTÉE (status: ${o.status || 'N/A'}) - 0 delivered`);
                    return sum;
                }
                let delivered = 0;
                if (o.status?.toLowerCase() === 'completed') {
                    // Completed = everything delivered
                    delivered = o.quantity;
                } else if (o.remains !== undefined && o.remains !== null) {
                    delivered = o.quantity - o.remains;
                } else {
                    // remains not synced yet but order was sent to provider — count as delivered
                    delivered = o.quantity;
                }
                console.log(`    ✅ Order ${o.order_id || o.id}: EXÉCUTÉE - quantity: ${o.quantity}, remains: ${o.remains ?? 'null'}, status: ${o.status}, delivered: ${delivered}`);
                return sum + delivered;
            }, 0);

            // Calculate totalRemains: sum of remains from all sub-orders
            const totalRemains = subOrders.reduce((sum, o) => {
                const isExecuted = (o as any).provider_order_id && o.status &&
                    !['', 'scheduled', 'queued', 'pending'].includes(o.status?.toLowerCase() ?? '');
                if (!isExecuted) {
                    return sum + o.quantity;
                }
                if (o.status?.toLowerCase() === 'completed') {
                    return sum; // 0 remains
                }
                // If remains is null, assume 0 (already counted as delivered above)
                return sum + (o.remains ?? 0);
            }, 0);

            // Calculate service rate from parent order or from executed sub-orders
            let serviceRate = 0;
            if (parentOrder.service_rate) {
                serviceRate = parentOrder.service_rate;
            } else {
                const executedOrdersWithCharge = subOrders.filter(o => {
                    const isExecuted = (o as any).provider_order_id && o.status && !['', 'Scheduled', 'Queued', 'Pending'].includes(o.status);
                    const hasCharge = parseFloat(o.charge?.toString() || '0') > 0;
                    return isExecuted && hasCharge;
                });

                if (executedOrdersWithCharge.length > 0) {
                    // Calculate average rate from executed orders (rate per 1000)
                    const totalRate = executedOrdersWithCharge.reduce((sum, o) => {
                        const charge = parseFloat(o.charge?.toString() || '0');
                        const quantity = o.quantity;
                        if (quantity > 0) {
                            const rate = (charge / quantity) * 1000; // Rate per 1000
                            return sum + rate;
                        }
                        return sum;
                    }, 0);
                    serviceRate = totalRate / executedOrdersWithCharge.length;
                    console.log(`    📊 Service rate calculé: $${serviceRate.toFixed(4)} per 1000 (depuis ${executedOrdersWithCharge.length} commandes)`);
                }
            }

            // Calculate totalCharge: cost to reserve based on remaining quantity to deliver
            const totalCharge = serviceRate > 0 ? (totalRemains / 1000) * serviceRate : 0;

            console.log(`\n  💰 TOTAUX CALCULÉS:`);
            console.log(`    - Total delivered: ${totalDelivered}`);
            console.log(`    - Total remains: ${totalRemains}`);
            console.log(`    - Total charge: $${totalCharge.toFixed(2)} ${serviceRate > 0 ? '(calculé depuis rate)' : '(non disponible)'}`);
            console.log(`========================================\n`);

            // Determine overall status based on parent and sub-orders
            let overallStatus = 'Pending';
            const parentStatusLower = parentOrder.status?.toLowerCase() ?? '';
            
            // Check if all sub-orders are completed (remains = 0)
            const allSubOrdersCompleted = subOrders.every(o => {
                const isExecuted = (o as any).provider_order_id && o.status;
                if (!isExecuted) return false;
                return o.status?.toLowerCase() === 'completed' || (o.remains !== undefined && o.remains === 0);
            });
            
            // Check if all runs are executed and delivered
            const allRunsExecuted = executedOrders.length === totalRuns;
            const allDelivered = totalRemains === 0;
            
            if (allSubOrdersCompleted || (allRunsExecuted && allDelivered) || completedCount === totalRuns || parentStatusLower === 'completed') {
                overallStatus = 'Completed';
                console.log(`[DRIP GROUP] ✅ Order ${parentId} marked as COMPLETED`);
            } else if (executedOrders.length > 0 || parentStatusLower === 'processing' || parentStatusLower === 'in progress') {
                overallStatus = 'In progress';
            }

            // Si complété, pas de solde à immobiliser
            const finalCharge = overallStatus === 'Completed' ? 0 : Math.max(0, totalCharge);

            // Force correct totals if order is fully completed (sub-orders may not be synced)
            const finalTotalDelivered = overallStatus === 'Completed' ? totalQuantity : totalDelivered;
            const finalTotalRemains   = overallStatus === 'Completed' ? 0 : totalRemains;

            // Create consolidated order using PARENT data
            const consolidatedOrder: Order = {
                ...parentOrder,
                id: parentOrder.id,
                order_id: parentOrder.order_id || parentOrder.id.toString(),
                quantity: totalQuantity,
                remains: finalTotalRemains,
                status: overallStatus,
                runs: totalRuns,
                charge: finalCharge,
                service_name: `💧 ${(parentOrder.service_name || 'Drip Feed').split('|')[0].trim()} (${executedOrders.length}/${totalRuns} exécutés)`,
                parent_order_id: undefined // Clear to show it's consolidated
            };

            (consolidatedOrder as any).executedRuns = executedOrders.length;
            (consolidatedOrder as any).totalRuns = totalRuns;
            (consolidatedOrder as any).totalDelivered = finalTotalDelivered;
            (consolidatedOrder as any).totalRemains = finalTotalRemains;

            console.log(`[DRIP GROUP] 📊 Order ${parentId} metadata:`, {
                executedRuns: executedOrders.length,
                totalRuns: totalRuns,
                totalDelivered: totalDelivered,
                totalQuantity: totalQuantity,
                totalRemains: totalRemains,
                status: overallStatus
            });

            grouped.push(consolidatedOrder);
        });

        // Filter completed orders based on includeCompleted parameter
        let result = grouped;
        if (!includeCompleted) {
            result = grouped.filter(order => order.status?.toLowerCase() !== 'completed');
            console.log('[DRIP GROUP] Commandes actives après filtrage des complétées:', result.length, '/', grouped.length);
        } else {
            console.log('[DRIP GROUP] Toutes les commandes conservées (incluant complétées):', result.length);
        }
        
        // Sort: Active orders first (by priority), then by date
        result = result.sort((a, b) => {
            // Priority: In progress > Pending > Processing > Partial > Completed
            const statusPriority: Record<string, number> = {
                'in progress': 1,
                'processing': 2,
                'pending': 3,
                'partial': 4,
                'completed': 10,
                'canceled': 11,
                'refunded': 12
            };
            
            const aPriority = statusPriority[a.status?.toLowerCase() ?? ''] ?? 5;
            const bPriority = statusPriority[b.status?.toLowerCase() ?? ''] ?? 5;
            
            // If different statuses, sort by priority
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            
            // Same status: sort by creation date (newest first)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        console.log('[DRIP GROUP] Résultat final:', result.length, includeCompleted ? 'commandes (incluant complétées)' : 'commandes actives');

        return result;
    };

    const processDripQueue = async () => {
        setSyncing(true);
        try {
            console.log('[DRIP QUEUE] Traitement de la queue...');
            const result = await api.processDripQueue();
            console.log('[DRIP QUEUE] Résultats:', result);

            // Reload data after processing
            await loadData();

            alert(`✅ ${result.message}`);
        } catch (error: any) {
            console.error('[DRIP QUEUE] Erreur:', error);
            alert(`❌ Erreur: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const syncDripOrderStatuses = async () => {
        if (dripOrders.length === 0) {
            alert('Aucune commande drip feed à synchroniser');
            return;
        }

        setSyncing(true);
        try {
            console.log('[DRIP SYNC] Synchronisation de', dripOrders.length, 'commandes drip feed...');
            const orderIds = dripOrders.map(order => order.order_id);

            const result = await api.syncOrders(orderIds);
            console.log('[DRIP SYNC] Résultats:', result);

            // Reload data after sync
            await loadData();

            alert(`✅ Synchronisation réussie!\n${result.synced} commandes mises à jour`);
        } catch (error: any) {
            console.error('[DRIP SYNC] Erreur:', error);
            alert(`❌ Erreur lors de la synchronisation: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const getOrderProgress = (order: Order) => {
        if (order.status?.toLowerCase() === 'completed') return 100;

        // For grouped drip feed orders, use REAL delivered/quantity (not executedRuns/totalRuns)
        // This ensures progress bar matches the displayed "X / Y envoyés" text
        if ((order as any).totalDelivered !== undefined) {
            const delivered = (order as any).totalDelivered;
            const total = order.quantity;
            if (total === 0) return 0;
            const progress = Math.round((delivered / total) * 100);
            // Only return if meaningful; if 0 fall through to runs-based calc below
            if (progress > 0) {
                console.log(`[PROGRESS] Order ${order.order_id}: ${delivered}/${total} = ${progress}%`);
                return Math.min(100, progress);
            }
        }

        // For grouped drip feed orders, extract progress from service name (FALLBACK)
        if (order.runs && order.runs > 1) {
            const match = order.service_name?.match(/(\d+)\/(\d+) exécutés/);
            if (match) {
                const executed = parseInt(match[1]);
                const total = parseInt(match[2]);
                console.log(`[PROGRESS FALLBACK] Order ${order.order_id}: Using executedRuns ${executed}/${total}`);
                return Math.round((executed / total) * 100);
            }
            // If drip feed but no execution data yet, return 0%
            console.log(`[PROGRESS] Order ${order.order_id}: Drip feed not yet started`);
            return 0;
        }

        // For single drip feed order not yet grouped
        if (order.runs && order.runs > 0 && !order.parent_order_id) {
            // This is a parent drip feed order - progress is 0 until first run completes
            return 0;
        }

        // For regular orders, use quantity-based calculation
        if (order.quantity === 0) return 0;
        const delivered = order.quantity - (order.remains || 0);
        return Math.round((delivered / order.quantity) * 100);
    };

    const deleteOrder = async (orderId: number, orderNumber: string) => {
        if (!confirm(`Supprimer la commande #${orderNumber} ?`)) {
            return;
        }

        setSyncing(true);
        try {
            await api.deleteOrder(orderId);
            alert('✅ Commande supprimée');
            await loadData();
        } catch (error: any) {
            console.error('[DELETE] Erreur:', error);
            alert(`❌ Erreur: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    // Load data on mount and when tab changes
    useEffect(() => {
        loadData(false);
        setCurrentPage(1); // Reset page when changing tabs
    }, [activeTab]);

    const runDripCycle = async () => {
        if (!confirm('Exécuter manuellement le cycle Drip Feed?\n\nTous les runs en attente qui ont dépassé leur heure d\'exécution seront traités.')) {
            return;
        }

        setSyncing(true);
        try {
            console.log('[DRIP CYCLE] Exécution manuelle du cycle drip feed...');
            const result = await api.runDripCycle();
            console.log('[DRIP CYCLE] Résultats:', result);

            // Reload data after cycle
            await loadData();

            const message = `✅ Cycle Drip Feed terminé!\n\n` +
                `• Comptes traités: ${result.processed || 0}\n` +
                `• Runs exécutés: ${result.executed || 0}\n` +
                `• Commandes complétées: ${result.completed || 0}\n` +
                `• Bloqués: ${result.blocked || 0}`;

            alert(message);
        } catch (error: any) {
            console.error('[DRIP CYCLE] Erreur:', error);
            alert(`❌ Erreur lors de l'exécution du cycle: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-12 h-screen-content overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Drip Control Center</h1>
                    <p className="text-slate-400 text-sm">Gestion centralisée des flux et des livraisons</p>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/5 text-slate-300 hover:text-white rounded-lg transition-colors text-sm font-medium">
                            <Download size={16} />
                            <span>Export</span>
                        </button>
                        <button
                            onClick={processDripQueue}
                            disabled={syncing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors text-sm"
                        >
                            <Play size={16} className={syncing ? "animate-spin" : ""} />
                            <span>Process Queue</span>
                        </button>
                        <button
                            onClick={syncDripOrderStatuses}
                            disabled={syncing || dripOrders.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(234,88,12,0.3)] text-sm"
                        >
                            <RefreshCw size={16} className={syncing ? "animate-spin" : "animate-spin-slow"} />
                            <span>Sync Orders ({dripOrders.length})</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs Navigation */}
            <div className="bg-surface/20 border border-white/5 rounded-2xl p-2 flex items-center gap-2">
                <button
                    onClick={() => setActiveTab('shopify')}
                    className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
                        activeTab === 'shopify'
                            ? "bg-primary text-black shadow-lg"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    Livraison Standard
                </button>
                <button
                    onClick={() => setActiveTab('flux')}
                    className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
                        activeTab === 'flux'
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-900/30"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    Livraison Drip Feed
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
                        activeTab === 'pending'
                            ? "bg-orange-500 text-white shadow-lg shadow-orange-900/30"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    En attente
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
                        activeTab === 'history'
                            ? "bg-green-500 text-white shadow-lg shadow-green-900/30"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    Complétées
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* ---- SHOPIFY TAB STATS ---- */}
                {activeTab === 'shopify' && <>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Total Commandes</div>
                            <div className="text-2xl font-black text-white">{stats.total}</div>
                            <div className="text-[10px] text-slate-500 mt-1">commandes standard actives</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                            <LayoutList size={20} />
                        </div>
                    </div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">En Cours</div>
                            <div className="text-2xl font-black text-white">{stats.inProgress}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <Activity size={20} />
                        </div>
                    </div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">En Attente</div>
                            <div className="text-2xl font-black text-orange-400">{stats.pending}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Partiels</div>
                            <div className="text-2xl font-black text-yellow-400">{stats.partialOrders}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </>}

                {/* ---- FLUX TAB STATS ---- */}
                {activeTab === 'flux' && <>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Solde à Mobiliser</div>
                            <div className="text-2xl font-black text-white">${stats.reservedBalance.toFixed(2)}</div>
                            <div className="text-[10px] text-slate-500 mt-1">pour les runs restants</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                            <Lock size={20} />
                        </div>
                    </div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">En Cours</div>
                            <div className="text-2xl font-black text-white">{stats.activeRuns}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <Activity size={20} />
                        </div>
                    </div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Taux de Succès</div>
                            <div className="text-2xl font-black text-green-400">{stats.successRate.toFixed(1)}%</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">En Attente</div>
                            <div className="text-2xl font-black text-yellow-400">{stats.pending}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </>}

                {/* ---- PENDING TAB STATS ---- */}
                {activeTab === 'pending' && <>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Total en Attente</div>
                            <div className="text-2xl font-black text-orange-400">{stats.total}</div>
                            <div className="text-[10px] text-slate-500 mt-1">commandes bloquées</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Standard</div>
                            <div className="text-2xl font-black text-white">{stats.pendingStandard}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-500/20 text-slate-400 flex items-center justify-center">
                            <LayoutList size={20} />
                        </div>
                    </div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Drip Feed</div>
                            <div className="text-2xl font-black text-blue-400">{stats.pendingDrip}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <Activity size={20} />
                        </div>
                    </div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">File d'attente</div>
                            <div className="text-2xl font-black text-yellow-400">{stats.pendingQueued}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </>}

                {/* ---- HISTORY TAB STATS ---- */}
                {activeTab === 'history' && <>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Total Complétées</div>
                            <div className="text-2xl font-black text-green-400">{stats.total}</div>
                            <div className="text-[10px] text-slate-500 mt-1">commandes terminées</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Standard</div>
                            <div className="text-2xl font-black text-white">{stats.completedStandard}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <LayoutList size={20} />
                        </div>
                    </div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Drip Feed</div>
                            <div className="text-2xl font-black text-purple-400">{stats.completedDrip}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                            <Activity size={20} />
                        </div>
                    </div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Total Livré</div>
                            <div className="text-2xl font-black text-yellow-400">{(stats.totalDeliveredQty || 0).toLocaleString('fr-FR')}</div>
                            <div className="text-[10px] text-slate-500 mt-1">unités livrées</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                            <Zap size={20} />
                        </div>
                    </div>
                </>}
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">

                {/* --- TAB: STANDARD ORDERS (Commandes standard) --- */}
                {activeTab === 'shopify' && (() => {
                    // Show standard orders (no grouping needed)
                    const standardOrders = accounts as any;

                    return (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="p-12 text-center text-slate-400">
                                    <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
                                    Chargement...
                                </div>
                            ) : (() => {
                                const filteredOrders = standardOrders.filter((order: Order) => {
                                    if (!searchQuery) return true;
                                    const query = searchQuery.toLowerCase();
                                    return (
                                        (order.order_id || '').toLowerCase().includes(query) ||
                                        (order.service_name || '').toLowerCase().includes(query) ||
                                        (order.link || '').toLowerCase().includes(query) ||
                                        (order.status || '').toLowerCase().includes(query)
                                    );
                                });

                                const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
                                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                const endIndex = startIndex + ITEMS_PER_PAGE;
                                const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

                                return filteredOrders.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400">
                                        <LayoutList size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>{searchQuery ? 'Aucun résultat trouvé' : 'Aucune commande standard'}</p>
                                        {searchQuery && (
                                            <p className="text-xs mt-2">Recherche: "{searchQuery}"</p>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 gap-4">
                                            {paginatedOrders.map((order: Order) => {
                                                const progress = getOrderProgress(order);
                                                const statusColor =
                                                    order.status?.toLowerCase() === 'completed' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                                                        order.status?.toLowerCase() === 'partial' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                                                        order.status?.toLowerCase() === 'in progress' || order.status?.toLowerCase() === 'processing' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                                                            order.status?.toLowerCase() === 'pending' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                                                                'text-red-400 bg-red-500/10 border-red-500/20';

                                                const delivered = order.quantity - (order.remains || 0);

                                                return (
                                                    <div key={order.id} className="bg-surface/40 border border-white/5 rounded-2xl p-6 relative overflow-hidden hover:border-white/20 transition-all">
                                                        <div className="flex flex-col gap-4 relative z-10">
                                                            <div className="flex items-start justify-between">
                                                                <div className="space-y-2 flex-1">
                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                        <h3 className="text-lg font-bold text-white">{order.service_name}</h3>
                                                                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border", statusColor)}>
                                                                            {order.status}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                        {(order as any).shopify_order_number && (
                                                                            <div className="text-xs text-primary font-mono bg-primary/10 w-fit px-2 py-1 rounded border border-primary/20 font-bold">
                                                                                🛍️ {(order as any).shopify_order_number}
                                                                            </div>
                                                                        )}
                                                                        <div className="text-xs text-slate-500 font-mono bg-black/30 w-fit px-2 py-1 rounded">Order #{order.order_id}</div>
                                                                        <div className="text-xs text-slate-500 font-mono bg-black/30 w-fit px-2 py-1 rounded">{order.provider}</div>
                                                                        <div className="text-xs text-slate-500 font-mono bg-black/30 w-fit px-2 py-1 rounded">
                                                                            {new Date(order.created_at).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-slate-400 truncate max-w-md">{order.link}</div>
                                                                </div>

                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={() => deleteOrder(order.id, order.order_id)}
                                                                        disabled={syncing}
                                                                        className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 flex items-center justify-center text-red-400 hover:text-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                                                        title="Supprimer la commande"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Envoyés / Restants</div>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className="text-green-400 font-bold text-lg">{delivered.toLocaleString()}</span>
                                                                        <span className="text-slate-500 text-xs">/</span>
                                                                        <span className="text-orange-400 font-bold text-sm">{(order.remains || 0).toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="text-[9px] text-slate-600 mt-1">Total: {order.quantity.toLocaleString()}</div>
                                                                </div>

                                                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Quantité</div>
                                                                    <div className="text-white font-bold text-lg">{order.quantity.toLocaleString()}</div>
                                                                </div>

                                                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Coût</div>
                                                                    <div className="text-green-400 font-bold text-lg">
                                                                        ${order.charge ? parseFloat(order.charge.toString()).toFixed(2) : '0.00'}
                                                                    </div>
                                                                </div>

                                                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Progression</div>
                                                                    <div className="text-white font-bold text-lg">{progress}%</div>
                                                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                                                                        <div className={cn(
                                                                            "h-full transition-all duration-1000 ease-out rounded-full",
                                                                            order.status?.toLowerCase() === 'completed' ? 'bg-green-500' :
                                                                                order.status?.toLowerCase() === 'in progress' || order.status?.toLowerCase() === 'processing' ? 'bg-blue-500' :
                                                                                    'bg-orange-500'
                                                                        )} style={{ width: `${progress}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                                                            <div className={cn(
                                                                "h-full transition-all duration-1000 ease-out",
                                                                order.status?.toLowerCase() === 'completed' ? 'bg-green-500' :
                                                                    order.status?.toLowerCase() === 'in progress' || order.status?.toLowerCase() === 'processing' ? 'bg-blue-500' :
                                                                        'bg-orange-500'
                                                            )} style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    );
                })()}

                {/* --- TAB: ACTIVE FLUX --- */}
                {activeTab === 'flux' && (() => {
                    // Group drip feed orders
                    const groupedOrders = groupDripFeedOrders(dripOrders);

                    return (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-slate-400">
                                        <span className="font-bold text-white">{groupedOrders.length}</span> commandes actives
                                    </div>
                                    <div className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md font-mono">
                                        {groupedOrders.filter(o => ['Pending', 'In progress', 'Processing'].includes(o.status)).length} en cours
                                    </div>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={runDripCycle}
                                        disabled={syncing}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-900/20 text-sm"
                                    >
                                        <Play size={14} fill="currentColor" className={syncing ? "animate-spin" : ""} />
                                        <span>Run Cycle</span>
                                    </button>
                                )}
                            </div>

                            {loading ? (
                                <div className="p-12 text-center text-slate-400">
                                    <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
                                    Chargement...
                                </div>
                            ) : (() => {
                                const filteredOrders = groupedOrders.filter(order => {
                                    if (!searchQuery) return true;
                                    const query = searchQuery.toLowerCase();
                                    return (
                                        (order.order_id || '').toLowerCase().includes(query) ||
                                        (order.service_name || '').toLowerCase().includes(query) ||
                                        (order.link || '').toLowerCase().includes(query) ||
                                        (order.status || '').toLowerCase().includes(query) ||
                                        (order.provider || '').toLowerCase().includes(query)
                                    );
                                });

                                const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
                                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                const endIndex = startIndex + ITEMS_PER_PAGE;
                                const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

                                return filteredOrders.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400">
                                        <Zap size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>{searchQuery ? 'Aucun résultat trouvé' : 'Aucune commande drip feed'}</p>
                                        {searchQuery && (
                                            <p className="text-xs mt-2">Recherche: "{searchQuery}"</p>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 gap-4">
                                            {paginatedOrders.map((order) => {
                                                const progress = getOrderProgress(order);
                                                const statusColor =
                                                    order.status?.toLowerCase() === 'completed' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                                                        order.status?.toLowerCase() === 'partial' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                                                        order.status?.toLowerCase() === 'in progress' || order.status?.toLowerCase() === 'processing' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                                                            order.status?.toLowerCase() === 'pending' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                                                                order.status?.toLowerCase() === 'queued' || order.status?.toLowerCase() === 'scheduled' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                                                                    'text-red-400 bg-red-500/10 border-red-500/20';

                                                const queueBadge =
                                                    order.status?.toLowerCase() === 'queued' ? '⏳ En attente' :
                                                        order.status?.toLowerCase() === 'scheduled' ? '📅 Programmée' :
                                                            null;

                                                const executedRuns = (order as any).executedRuns || 0;
                                                const totalRuns = (order as any).totalRuns || order.runs;

                                                // CRITICAL: Use consolidated totalDelivered/totalRemains with proper fallbacks
                                                // If metadata is missing, calculate from order.quantity and order.remains
                                                const delivered = (order as any).totalDelivered !== undefined 
                                                    ? (order as any).totalDelivered
                                                    : Math.max(0, order.quantity - (order.remains || 0));
                                                const remains = (order as any).totalRemains !== undefined
                                                    ? (order as any).totalRemains
                                                    : (order.remains || 0);

                                                // Detect if we're using fallback (metadata missing)
                                                const hasInconsistentData = (order as any).totalDelivered === undefined && order.runs > 0;
                                                if (hasInconsistentData) {
                                                    console.warn(`[DISPLAY] ⚠️ Order ${order.order_id}: Missing totalDelivered metadata, using fallback: ${delivered}/${order.quantity}`);
                                                }

                                                // Use the pre-calculated charge which already represents cost to reserve
                                                // Si complété ou négatif, afficher 0
                                                let costToReserve = parseFloat(order.charge?.toString() || '0') || 0;
                                                if (order.status?.toLowerCase() === 'completed' || costToReserve < 0) {
                                                    costToReserve = 0;
                                                }

                                                // Calculate next run date
                                                const createdDate = new Date(order.created_at);
                                                // Calcul théorique basé sur le planning initial
                                                const theoreticalNextRunDate = new Date(createdDate.getTime() + (executedRuns * order.run_interval * 60 * 1000));
                                                const now = Date.now();

                                                // Si le run théorique est dans le passé, la prochaine exécution est maintenant ou dans l'intervalle suivant
                                                let nextRunDate = theoreticalNextRunDate;
                                                if (executedRuns < totalRuns) {
                                                    if (theoreticalNextRunDate.getTime() < now) {
                                                        // Run en retard: afficher "En cours" ou la date actuelle + intervalle
                                                        // Pour un drip feed en retard, le prochain run est soit en cours, soit dans l'intervalle suivant
                                                        // La prochaine exécution devrait être dans order.run_interval minutes max
                                                        nextRunDate = new Date(now + (order.run_interval * 60 * 1000));
                                                    }
                                                }

                                                const isNextRunInFuture = nextRunDate.getTime() > now;
                                                const isOverdue = theoreticalNextRunDate.getTime() < now && executedRuns < totalRuns;

                                                // Determine next run display text
                                                let nextRunFormatted = 'Terminé';
                                                if (order.status?.toLowerCase() === 'completed' || remains === 0) {
                                                    nextRunFormatted = 'Terminé ✅';
                                                } else if (executedRuns >= totalRuns) {
                                                    nextRunFormatted = 'Dernière livraison en cours';
                                                } else if (isOverdue) {
                                                    nextRunFormatted = 'En cours / Sous peu';
                                                } else {
                                                    nextRunFormatted = nextRunDate.toLocaleDateString('fr-FR', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        timeZone: 'Europe/Paris'
                                                    });
                                                }

                                                return (
                                                    <div key={order.id} className="bg-surface/40 border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all">
                                                        <div className="flex flex-col gap-6 relative z-10">
                                                            {/* Header */}
                                                            <div className="flex items-start justify-between">
                                                                <div className="space-y-2 flex-1">
                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{order.service_name}</h3>
                                                                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border", statusColor)}>
                                                                            {order.status}
                                                                        </span>
                                                                        {queueBadge && (
                                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                                                {queueBadge}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                        {(order as any).shopify_order_number && (
                                                                            <div className="text-xs text-primary font-mono bg-primary/10 w-fit px-2 py-1 rounded border border-primary/20 font-bold">
                                                                                🛍️ {(order as any).shopify_order_number}
                                                                            </div>
                                                                        )}
                                                                        <div className="text-xs text-slate-500 font-mono bg-black/30 w-fit px-2 py-1 rounded">Order #{order.order_id}</div>
                                                                        <div className="text-xs text-blue-400 font-mono bg-blue-500/10 w-fit px-2 py-1 rounded border border-blue-500/20">
                                                                            💧 {order.run_interval}min intervals
                                                                        </div>
                                                                        <div className="text-xs text-slate-500 font-mono bg-black/30 w-fit px-2 py-1 rounded">
                                                                            {order.provider}
                                                                        </div>
                                                                        {/* Warning if consolidated metadata is missing */}
                                                                        {hasInconsistentData && (
                                                                            <div className="text-xs text-orange-400 font-mono bg-orange-500/10 w-fit px-2 py-1 rounded border border-orange-500/20 font-bold flex items-center gap-1"
                                                                                title="Métadonnées consolidées manquantes - utilise calcul de secours">
                                                                                ⚠️ Données partielles
                                                                            </div>
                                                                        )}
                                                                        {/* Warning if data seems outdated */}
                                                                        {(delivered + remains !== order.quantity) && order.status?.toLowerCase() !== 'completed' && !hasInconsistentData && (
                                                                            <div className="text-xs text-yellow-400 font-mono bg-yellow-500/10 w-fit px-2 py-1 rounded border border-yellow-500/20 font-bold flex items-center gap-1"
                                                                                title={`Données non synchronisées: ${delivered} + ${remains} ≠ ${order.quantity}`}>
                                                                                ⚠️ Sync requis
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-slate-400 truncate max-w-md">{order.link}</div>
                                                                </div>

                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={() => deleteOrder(order.id, order.order_id)}
                                                                        disabled={syncing}
                                                                        className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 flex items-center justify-center text-red-400 hover:text-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                                                        title="Supprimer la commande"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Stats Grid */}
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Envoyés / Restants</div>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className="text-green-400 font-bold text-lg">{delivered.toLocaleString()}</span>
                                                                        <span className="text-slate-500 text-xs">/</span>
                                                                        <span className="text-orange-400 font-bold text-sm">{remains.toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="text-[9px] text-slate-600 mt-1">Total: {order.quantity.toLocaleString()}</div>
                                                                </div>

                                                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Prochain Run</div>
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className={cn("font-bold text-sm",
                                                                            executedRuns >= totalRuns ? "text-slate-400" :
                                                                                isOverdue ? "text-orange-400" :
                                                                                    isNextRunInFuture ? "text-blue-400" : "text-slate-400")}>
                                                                            {nextRunFormatted}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-600">
                                                                            {executedRuns}/{totalRuns} exécutés
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">À Immobiliser</div>
                                                                    <div className="text-purple-400 font-bold text-lg">
                                                                        ${costToReserve.toFixed(2)}
                                                                    </div>
                                                                    <div className="text-[9px] text-slate-600 mt-1">pour livraisons</div>
                                                                </div>

                                                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Progression</div>
                                                                    <div className="text-white font-bold text-lg">{progress}%</div>
                                                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                                                                        <div className={cn(
                                                                            "h-full transition-all duration-1000 ease-out rounded-full",
                                                                            order.status?.toLowerCase() === 'completed' ? 'bg-green-500' :
                                                                                order.status?.toLowerCase() === 'in progress' || order.status?.toLowerCase() === 'processing' ? 'bg-blue-500' :
                                                                                    'bg-orange-500'
                                                                        )} style={{ width: `${progress}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                                                            <div className={cn(
                                                                "h-full transition-all duration-1000 ease-out",
                                                                order.status?.toLowerCase() === 'completed' ? 'bg-green-500' :
                                                                    order.status?.toLowerCase() === 'in progress' || order.status?.toLowerCase() === 'processing' ? 'bg-blue-500' :
                                                                        'bg-orange-500'
                                                            )} style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    );
                })()}

                {/* --- TAB: PENDING (Waiting Orders) --- */}
                {activeTab === 'pending' && (() => {
                    const waitingOrders = runs as any;

                    return (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="p-12 text-center text-slate-400">
                                    <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
                                    Chargement...
                                </div>
                            ) : (() => {
                                const filteredOrders = waitingOrders.filter((order: Order) => {
                                    if (!searchQuery) return true;
                                    const query = searchQuery.toLowerCase();
                                    return (
                                        order.order_id?.toLowerCase().includes(query) ||
                                        order.service_name?.toLowerCase().includes(query) ||
                                        order.link?.toLowerCase().includes(query) ||
                                        order.provider?.toLowerCase().includes(query)
                                    );
                                });

                                const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
                                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                const endIndex = startIndex + ITEMS_PER_PAGE;
                                const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

                                return filteredOrders.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400">
                                        <Clock size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>{searchQuery ? 'Aucun résultat trouvé' : 'Aucune commande en attente'}</p>
                                        {searchQuery && (
                                            <p className="text-xs mt-2">Recherche: "{searchQuery}"</p>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 gap-4">
                                            {paginatedOrders.map((order: Order) => {
                                                const statusColor = 'text-orange-400 bg-orange-500/10 border-orange-500/20';

                                                return (
                                                    <div key={order.id} className="bg-surface/40 border border-orange-500/20 rounded-2xl p-6 relative overflow-hidden hover:border-orange-500/40 transition-all">
                                                        <div className="flex flex-col gap-4 relative z-10">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <span className="text-xs font-mono text-slate-500">#{order.order_id || order.id}</span>
                                                                        {order.shopify_order_number && (
                                                                            <span className="text-xs font-mono text-slate-500 px-2 py-0.5 bg-white/5 rounded">
                                                                                Shopify: {order.shopify_order_number}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <h3 className="text-lg font-bold text-white mb-1 truncate">
                                                                        {order.service_name}
                                                                    </h3>
                                                                    <p className="text-sm text-slate-400 truncate">
                                                                        📍 {order.link}
                                                                    </p>
                                                                </div>

                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className={cn(
                                                                        "px-3 py-1 rounded-full text-xs font-bold border",
                                                                        statusColor
                                                                    )}>
                                                                        ⏳ {order.queue_status || order.status}
                                                                    </span>
                                                                    {isAdmin && (
                                                                        <button
                                                                            onClick={() => deleteOrder(order.id, order.order_id || order.shopify_order_number || order.id.toString())}
                                                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                            title="Supprimer"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                                <div className="bg-white/5 rounded-xl p-3">
                                                                    <div className="text-xs text-slate-500 mb-1">Quantité</div>
                                                                    <div className="text-lg font-bold text-white">{order.quantity.toLocaleString()}</div>
                                                                </div>
                                                                <div className="bg-white/5 rounded-xl p-3">
                                                                    <div className="text-xs text-slate-500 mb-1">Provider</div>
                                                                    <div className="text-sm font-semibold text-white truncate">{order.provider}</div>
                                                                </div>
                                                                <div className="bg-white/5 rounded-xl p-3">
                                                                    <div className="text-xs text-slate-500 mb-1">Coût</div>
                                                                    <div className="text-lg font-bold text-white">${parseFloat(order.charge?.toString() || '0').toFixed(2)}</div>
                                                                </div>
                                                                <div className="bg-white/5 rounded-xl p-3">
                                                                    <div className="text-xs text-slate-500 mb-1">Créée</div>
                                                                    <div className="text-sm font-medium text-white">
                                                                        {new Date(order.created_at).toLocaleDateString('fr-FR', {
                                                                            day: '2-digit',
                                                                            month: 'short',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                                                                <div className="flex items-center gap-2 text-orange-400 text-sm">
                                                                    <span className="font-bold">⚠️ Raison:</span>
                                                                    <span>Une autre commande sur ce lien est déjà en cours de traitement</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Orange waiting bar */}
                                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500/50"></div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    );
                })()}

                {/* --- TAB: HISTORY (Completed Orders) --- */}
                {activeTab === 'history' && (() => {
                    const completedOrders = runs as any;

                    return (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="p-12 text-center text-slate-400">
                                    <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
                                    Chargement...
                                </div>
                            ) : (() => {
                                const filteredOrders = completedOrders.filter((order: Order) => {
                                    if (!searchQuery) return true;
                                    const query = searchQuery.toLowerCase();
                                    return (
                                        order.order_id?.toLowerCase().includes(query) ||
                                        order.service_name?.toLowerCase().includes(query) ||
                                        order.link?.toLowerCase().includes(query) ||
                                        order.provider?.toLowerCase().includes(query)
                                    );
                                });

                                const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
                                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                const endIndex = startIndex + ITEMS_PER_PAGE;
                                const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

                                return filteredOrders.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400">
                                        <CheckCircle size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>{searchQuery ? 'Aucun résultat trouvé' : 'Aucune commande complétée'}</p>
                                        {searchQuery && (
                                            <p className="text-xs mt-2">Recherche: "{searchQuery}"</p>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 gap-4">
                                            {paginatedOrders.map((order: Order) => {
                                                const delivered = order.quantity - (order.remains || 0);

                                                return (
                                                    <div key={order.id} className="bg-surface/40 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                                                        <div className="flex flex-col gap-4 relative z-10">
                                                            <div className="flex items-start justify-between">
                                                                <div className="space-y-2 flex-1">
                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                        <h3 className="text-lg font-bold text-white">{order.service_name}</h3>
                                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border text-green-400 bg-green-500/10 border-green-500/20">
                                                                            Complété
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                        {(order as any).shopify_order_number && (
                                                                            <div className="text-xs text-primary font-mono bg-primary/10 w-fit px-2 py-1 rounded border border-primary/20 font-bold">
                                                                                🛍️ {(order as any).shopify_order_number}
                                                                            </div>
                                                                        )}
                                                                        {order.order_id && (
                                                                            <div className="text-xs text-slate-500 font-mono bg-black/30 w-fit px-2 py-1 rounded">Order #{order.order_id}</div>
                                                                        )}
                                                                        <div className="text-xs text-slate-500 font-mono bg-black/30 w-fit px-2 py-1 rounded">{order.provider}</div>
                                                                        <div className="text-xs text-slate-500 font-mono bg-black/30 w-fit px-2 py-1 rounded">
                                                                            {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' })}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-slate-400 truncate max-w-md">{order.link}</div>
                                                                </div>

                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={() => deleteOrder(order.id, order.order_id)}
                                                                        disabled={syncing}
                                                                        className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 flex items-center justify-center text-red-400 hover:text-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                                                        title="Supprimer la commande"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Quantité livrée</div>
                                                                    <div className="text-green-400 font-bold text-lg">{delivered.toLocaleString()}</div>
                                                                    <div className="text-[9px] text-slate-600 mt-1">sur {order.quantity.toLocaleString()}</div>
                                                                </div>

                                                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Coût total</div>
                                                                    <div className="text-white font-bold text-lg">
                                                                        ${order.charge ? parseFloat(order.charge.toString()).toFixed(2) : '0.00'}
                                                                    </div>
                                                                </div>

                                                                {order.runs > 0 && (
                                                                    <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                                                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Runs effectués</div>
                                                                        <div className="text-blue-400 font-bold text-lg">{order.runs}</div>
                                                                        <div className="text-[9px] text-slate-600 mt-1">drip feed</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Green completed bar */}
                                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500"></div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    );
                })()}

            </div>

            {/* Footer with Pagination */}
            <div className="border-t border-white/5 p-4 bg-surface/30 flex items-center justify-center">
                {(() => {
                    let filteredOrders: any[] = [];
                    if (activeTab === 'shopify') {
                        filteredOrders = (accounts as any).filter((order: Order) => {
                            if (!searchQuery) return true;
                            const query = searchQuery.toLowerCase();
                            return (
                                (order.order_id || '').toLowerCase().includes(query) ||
                                (order.service_name || '').toLowerCase().includes(query) ||
                                (order.link || '').toLowerCase().includes(query) ||
                                (order.status || '').toLowerCase().includes(query)
                            );
                        });
                    } else if (activeTab === 'flux') {
                        const groupedOrders = groupDripFeedOrders(dripOrders);
                        filteredOrders = groupedOrders.filter(order => {
                            if (!searchQuery) return true;
                            const query = searchQuery.toLowerCase();
                            return (
                                (order.order_id || '').toLowerCase().includes(query) ||
                                (order.service_name || '').toLowerCase().includes(query) ||
                                (order.link || '').toLowerCase().includes(query) ||
                                (order.status || '').toLowerCase().includes(query) ||
                                (order.provider || '').toLowerCase().includes(query)
                            );
                        });
                    } else if (activeTab === 'pending') {
                        const allPendingOrders = runs as any;
                        const groupedPending = groupDripFeedOrders(allPendingOrders);
                        filteredOrders = groupedPending.filter(order => {
                            if (!searchQuery) return true;
                            const query = searchQuery.toLowerCase();
                            return (
                                (order.order_id || '').toLowerCase().includes(query) ||
                                (order.service_name || '').toLowerCase().includes(query) ||
                                (order.link || '').toLowerCase().includes(query) ||
                                (order.provider || '').toLowerCase().includes(query)
                            );
                        });
                    } else if (activeTab === 'history') {
                        filteredOrders = (runs as any).filter((order: Order) => {
                            if (!searchQuery) return true;
                            const query = searchQuery.toLowerCase();
                            return (
                                (order.order_id || '').toLowerCase().includes(query) ||
                                (order.service_name || '').toLowerCase().includes(query) ||
                                (order.link || '').toLowerCase().includes(query) ||
                                (order.provider || '').toLowerCase().includes(query)
                            );
                        });
                    }

                    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

                    if (totalPages <= 1) return null;

                    return (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-surface border border-white/10 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                ← Précédent
                            </button>
                            <div className="flex items-center gap-2">
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={cn(
                                                "w-10 h-10 rounded-lg text-sm font-bold transition-all",
                                                currentPage === pageNum
                                                    ? activeTab === 'flux' ? "bg-blue-500 text-white" :
                                                        activeTab === 'pending' ? "bg-orange-500 text-white" :
                                                            "bg-primary text-black"
                                                    : "bg-surface border border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                                            )}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-surface border border-white/10 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                Suivant →
                            </button>
                        </div>
                    );
                })()}
            </div>
        </div>
    )
}