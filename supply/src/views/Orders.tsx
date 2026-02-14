import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, ExternalLink, Filter, RefreshCw, RotateCcw, Search, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../libs/api";
import { cn } from "../libs/utils";
import { useWebSocket } from "../contexts/WebSocketContext";

interface Order {
    id: number;
    order_id?: string;
    service_id: string;
    service_name: string;
    link: string;
    quantity: number;
    remains?: number;
    charge?: number;
    status: string;
    provider: string;
    created_at: string;
    shopify_order_number?: string;
    provider_order_id?: string;
    parent_order_id?: string;
    is_drip_feed?: boolean;
    runs?: number;
    run_interval?: number;
    retry_count?: number;
    error_message?: string;
    queue_status?: string;
}

interface Filters {
    status: string;
    service: string;
    link: string;
}

export function Orders() {
    const itemsPerPage = 50;

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const [orders, setOrders] = useState<Order[]>([]);
    const [, setTotalOrders] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showImportModal, setShowImportModal] = useState(false);

    const [filters, setFilters] = useState<Filters>({ status: '', service: '', link: '' });

    const [nextRefresh, setNextRefresh] = useState(300);

    const [importOrderIds, setImportOrderIds] = useState('');
    const [importService, setImportService] = useState('');
    const [importLink, setImportLink] = useState('');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);

    const { on, off, isConnected } = useWebSocket();

    const formatNextRefresh = () => {
        const minutes = Math.floor(nextRefresh / 60);
        const seconds = nextRefresh % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' }) + ' ' +
            date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
    };

    const loadOrders = async (syncWithApi = false) => {
        try {
            setLoading(true);
            if (syncWithApi) setSyncing(true);

            // Don't send filters to backend to allow proper grouping
            const data = await api.getOrders({status: '', service: '', link: ''}, syncWithApi, currentPage, itemsPerPage);
            setOrders(data.orders || []);
            setTotalPages(data.totalPages || 1);
            setTotalOrders(data.total || 0);

            // Reset the countdown when manually loading
            if (!syncWithApi) {
                setNextRefresh(300);
            }

            console.log(`📦 Page ${data.page}/${data.totalPages} - ${data.orders?.length || 0} commandes sur ${data.total} au total`);

            // Debug: Check for parent_order_id
            const dripOrders = (data.orders || []).filter((o: Order) => o.parent_order_id);
            console.log('🔍 Commandes drip feed (avec parent_order_id):', dripOrders.length);
            if (dripOrders.length > 0) {
                console.log('📝 Exemple:', dripOrders[0]);
            }

            if (data.synced) {
                console.log('✅ Commandes synchronisées avec les fournisseurs');
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des commandes:', error);
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    };

    const groupDripFeedOrders = (orders: Order[]) => {
        const grouped: Order[] = [];
        const parentGroups = new Map<number, Order[]>();
        const parentOrders = new Map<number, Order>();

        console.log('🔄 [GROUP] Début du regroupement de', orders.length, 'commandes');

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
                // This is a parent drip feed order
                parentOrders.set(order.id, order);
            } else {
                // Standard order (no drip feed)
                grouped.push(order);
            }
        });

        console.log('📦 [GROUP] Parents trouvés:', parentOrders.size);
        console.log('📦 [GROUP] Groupes de sous-ordres trouvés:', parentGroups.size);
        console.log('📦 [GROUP] Commandes standard:', grouped.length);

        // Process each parent order
        parentOrders.forEach((parentOrder, parentId) => {
            const subOrders = parentGroups.get(parentId) || [];

            console.log(`💧 [GROUP] Parent ${parentId}: ${subOrders.length} sous-commandes`);

            if (subOrders.length === 0) {
                // Parent has no sub-orders yet (first run not created or failed)
                console.log(`⚠️  [GROUP] Parent ${parentId} has no sub-orders yet`);
                grouped.push(parentOrder);
                return;
            }

            // Count executed orders (those with provider_order_id)
            const executedOrders = subOrders.filter(o =>
                (o as any).provider_order_id && o.status && !['', 'Scheduled', 'Queued', 'Pending'].includes(o.status)
            );
            const completedCount = subOrders.filter(o => o.status === 'Completed').length;
            const totalRuns = parentOrder.runs;
            const totalQuantity = parentOrder.quantity;
            const totalRemains = subOrders.reduce((sum, o) => sum + (o.remains || 0), 0);

            console.log(`   ✅ Exécutés: ${executedOrders.length}/${totalRuns}`);
            console.log(`   ✅ Complétés: ${completedCount}/${totalRuns}`);

            // Determine overall status based on parent and sub-orders
            let overallStatus = 'Pending';
            if (completedCount === totalRuns || parentOrder.status === 'Completed') {
                overallStatus = 'Completed';
            } else if (executedOrders.length > 0 || parentOrder.status === 'Processing' || parentOrder.status === 'In progress') {
                overallStatus = 'In progress';
            }

            // Create consolidated order using PARENT data
            const consolidatedOrder: Order = {
                ...parentOrder,
                id: parentOrder.id,
                order_id: parentOrder.order_id || parentOrder.id.toString(),
                quantity: totalQuantity,
                remains: totalRemains,
                status: overallStatus,
                runs: totalRuns,
                service_name: `💧 ${(parentOrder.service_name || 'Drip Feed').split('|')[0].trim()} (${executedOrders.length}/${totalRuns} exécutés)`,
                parent_order_id: undefined // Clear to show it's consolidated
            };

            grouped.push(consolidatedOrder);
        });

        const result = grouped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        console.log('✨ [GROUP] Résultat final:', result.length, 'commandes affichées');

        return result;
    };

    const applyFilters = (orders: Order[], filters: Filters): Order[] => {
        return orders.filter(order => {
            // Status filter
            if (filters.status) {
                if (order.status !== filters.status) {
                    return false;
                }
            }
            
            // Service filter (search in service name)
            if (filters.service) {
                const serviceLower = order.service_name.toLowerCase();
                const filterLower = filters.service.toLowerCase();
                if (!serviceLower.includes(filterLower)) {
                    return false;
                }
            }
            
            // Link filter
            if (filters.link) {
                const linkLower = order.link.toLowerCase();
                const filterLower = filters.link.toLowerCase();
                if (!linkLower.includes(filterLower)) {
                    return false;
                }
            }
            
            return true;
        });
    };

    const getStatusInfo = (status: string) => {
        const statusMap: Record<string, { label: string; color: string; icon: typeof Clock }> = {
            'Pending': { label: 'En attente', color: 'text-orange-400', icon: Clock },
            'Awaiting Launch': { label: 'En attente', color: 'text-orange-400', icon: Clock },
            'In progress': { label: 'En cours', color: 'text-blue-400', icon: RefreshCw },
            'Processing': { label: 'En cours', color: 'text-blue-400', icon: RefreshCw },
            'Completed': { label: 'Terminé', color: 'text-green-400', icon: CheckCircle2 },
            'Partial': { label: 'Partiel', color: 'text-yellow-400', icon: Clock },
            'Canceled': { label: 'Annulé', color: 'text-red-400', icon: XCircle },
            'Refunded': { label: 'Remboursé', color: 'text-red-400', icon: XCircle },
            'Error': { label: 'Erreur', color: 'text-red-400', icon: XCircle }
        };
        return statusMap[status] || { label: status, color: 'text-slate-400', icon: Clock };
    };

    const getPlatformFromService = (serviceName: string) => {
        if (serviceName.toLowerCase().includes('instagram')) return 'instagram';
        if (serviceName.toLowerCase().includes('tiktok')) return 'tiktok';
        return 'default';
    };

    const getProgress = (order: Order) => {
        if (order.status === 'Completed') return 100;

        // For grouped drip feed orders, extract progress from service name
        if (order.runs && order.runs > 1) {
            const match = order.service_name.match(/(\d+)\/(\d+) exécutés/);
            if (match) {
                const executed = parseInt(match[1]);
                const total = parseInt(match[2]);
                return Math.round((executed / total) * 100);
            }
            return 0;
        }

        // For regular orders, use quantity-based calculation
        if (order.quantity === 0) return 0;
        const delivered = order.quantity - (order.remains || 0);
        return Math.round((delivered / order.quantity) * 100);
    };

    const handleImport = async () => {
        if (!importOrderIds.trim()) {
            alert('Veuillez entrer au moins un Order ID');
            return;
        }

        if (!importService.trim() || !importLink.trim()) {
            alert('Veuillez renseigner le service et le lien');
            return;
        }

        try {
            setImporting(true);
            setImportResult(null);

            // Séparer les IDs par virgules, espaces, ou retours à la ligne
            const ids = importOrderIds
                .split(/[\s,\n]+/)
                .map(id => id.trim())
                .filter(id => id.length > 0);

            console.log('📥 Import de', ids.length, 'commandes:', ids);
            console.log('📝 Service:', importService, '| Link:', importLink);

            const result = await api.importOrders(ids, 'BulkMedya', importService, importLink);
            setImportResult(result.results);

            console.log('✅ Import terminé:', result.results);

            // Recharger les commandes si au moins une importation réussie
            if (result.results.success.length > 0) {
                await loadOrders();
            }

        } catch (error) {
            console.error('❌ Erreur lors de l\'import:', error);
            alert('Erreur lors de l\'import des commandes');
        } finally {
            setImporting(false);
        }
    };

    // Load orders on mount and when page changes (not filters, they're applied client-side)
    useEffect(() => {
        loadOrders(false);
    }, [currentPage]);

    // Auto-refresh countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setNextRefresh(prev => {
                if (prev <= 1) {
                    loadOrders(false);
                    return 300; // Reset to 5 minutes
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // WebSocket listeners for real-time order updates
    useEffect(() => {
        if (!isConnected) return;

        const handleOrderCreated = (data: any) => {
            console.log('📦 New order created via WebSocket:', data);
            // Reload orders to reflect the new order
            loadOrders(false);
        };

        const handleOrderUpdated = (data: any) => {
            console.log('🔄 Order updated via WebSocket:', data);
            // Reload orders to reflect the update
            loadOrders(false);
        };

        const handleDripExecuted = (data: any) => {
            console.log('💧 Drip executed via WebSocket:', data);
            // Reload orders to reflect the drip execution
            loadOrders(false);
        };

        on('order:created', handleOrderCreated);
        on('order:updated', handleOrderUpdated);
        on('drip:executed', handleDripExecuted);

        return () => {
            off('order:created', handleOrderCreated);
            off('order:updated', handleOrderUpdated);
            off('drip:executed', handleDripExecuted);
        };
    }, [isConnected, on, off]);

    const activeOrders = orders.filter(o =>
        ['Pending', 'Awaiting Launch', 'In progress', 'Processing'].includes(o.status)
    ).length;
    const groupedOrders = groupDripFeedOrders(orders);
    const filteredOrders = applyFilters(groupedOrders, filters);
    
    // Calculate real total (excluding sub-orders)
    const displayedTotal = orders.filter(o => !o.parent_order_id).length;

    return (
        <div className="flex flex-col gap-6 pb-12 h-screen-content overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 inline-flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-white font-bold text-sm">{activeOrders} Commandes actives</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Historique des commandes</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Affichage de {filteredOrders.length} commandes sur {displayedTotal.toLocaleString()} au total
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-slate-500 text-xs">
                            Actualisation automatique dans {formatNextRefresh()}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => loadOrders(false)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-900/20 text-sm"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        Actualiser
                    </button>
                    <button
                        onClick={() => loadOrders(true)}
                        disabled={syncing || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-900/20 text-sm"
                    >
                        <RotateCcw size={16} className={syncing ? "animate-spin" : ""} />
                        Sync API
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-purple-900/20 text-sm"
                    >
                        <Download size={16} />
                        Importer
                    </button>
                </div>
            </div>

            <div className="bg-surface/20 border border-white/5 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm appearance-none outline-none focus:border-white/20"
                    >
                        <option value="">Tous les statuts</option>
                        <option value="Pending">En attente</option>
                        <option value="In progress">En cours</option>
                        <option value="Completed">Terminé</option>
                        <option value="Canceled">Annulé</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input
                        type="text"
                        placeholder="Service..."
                        value={filters.service}
                        onChange={(e) => setFilters({ ...filters, service: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 py-2.5 text-white text-sm outline-none focus:border-white/20"
                    />
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input
                        type="text"
                        placeholder="Lien..."
                        value={filters.link}
                        onChange={(e) => setFilters({ ...filters, link: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 py-2.5 text-white text-sm outline-none focus:border-white/20"
                    />
                </div>

                <div className="flex items-center justify-center">
                    <span className="text-slate-400 text-xs font-bold">
                        {filteredOrders.length} / {displayedTotal.toLocaleString()} commandes
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-surface/20 border border-white/5 rounded-3xl flex flex-col">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-white/2 text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    <div className="col-span-1">ID</div>
                    <div className="col-span-1">Shopify</div>
                    <div className="col-span-4">Service</div>
                    <div className="col-span-2">Provider</div>
                    <div className="col-span-2">Lien</div>
                    <div className="col-span-2 text-right">Quantité</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">
                            <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                            Chargement...
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            Aucune commande trouvée
                        </div>
                    ) : (
                        filteredOrders.map((order, i) => {
                            const statusInfo = getStatusInfo(order.status);
                            const StatusIcon = statusInfo.icon;
                            const platform = getPlatformFromService(order.service_name);
                            const progress = getProgress(order);

                            return (
                                <div key={i} className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 items-center hover:bg-white/2 transition-colors group">

                                    <div className="col-span-1">
                                        <span className="font-mono text-green-400 font-bold text-sm">#{order.id}</span>
                                        <div className="text-[10px] text-slate-500 mt-1">{formatDate(order.created_at)}</div>
                                    </div>

                                    <div className="col-span-1">
                                        {order.shopify_order_number ? (
                                            <span className="font-mono text-orange-400 font-bold text-sm">{order.shopify_order_number}</span>
                                        ) : (
                                            <span className="text-slate-600 text-xs">-</span>
                                        )}
                                    </div>

                                    <div className="col-span-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-black relative">
                                                <div className={cn(
                                                    "absolute inset-0 flex items-center justify-center opacity-80",
                                                    platform === 'instagram' ? "bg-linear-to-tr from-yellow-400 via-red-500 to-purple-500" : "bg-black"
                                                )}>
                                                    <img
                                                        src={platform === 'instagram' ? '/logo_instagram.png' : '/logo_tiktok.png'}
                                                        alt={platform}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm line-clamp-1 group-hover:text-primary transition-colors">{order.service_name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-slate-400 border border-white/5">{order.service_id}</span>
                                                    <span className={cn("text-[10px] font-bold flex items-center gap-1", statusInfo.color)}>
                                                        <StatusIcon size={10} className={statusInfo.icon === RefreshCw ? "animate-spin-slow" : ""} />
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <span className="text-sm text-slate-300 font-medium">{order.provider}</span>
                                    </div>

                                    <div className="col-span-2">
                                        <a href={order.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors text-xs font-medium group/link">
                                            <span className="truncate max-w-30">{order.link}</span>
                                            <ExternalLink size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                        </a>
                                    </div>

                                    <div className="col-span-2 text-right">
                                        <div className="font-mono font-bold text-white text-lg">{order.quantity.toLocaleString()}</div>
                                        <div className="w-full h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-1000",
                                                    order.status === 'Completed' ? "bg-green-500" :
                                                        order.status === 'Canceled' || order.status === 'Error' ? "bg-red-500" :
                                                            ['Pending', 'Awaiting Launch'].includes(order.status) ? "bg-orange-500" : "bg-green-500"
                                                )}
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-slate-500 text-xs">
                        Page {currentPage} sur {totalPages} - Total: <strong className="text-white">{displayedTotal.toLocaleString()}</strong> commandes
                    </span>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 rounded-lg bg-surface/30 border border-white/5 text-slate-400 hover:text-white hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                // Show first page, last page, current page, and pages around current
                                if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-4 py-2 rounded-lg font-bold transition-colors ${currentPage === page
                                                ? 'bg-primary text-black'
                                                : 'bg-surface/30 border border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                } else if (
                                    page === currentPage - 2 ||
                                    page === currentPage + 2
                                ) {
                                    return <span key={page} className="text-slate-600">...</span>;
                                }
                                return null;
                            })}

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 rounded-lg bg-surface/30 border border-white/5 text-slate-400 hover:text-white hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white">Importer des commandes</h2>
                                <p className="text-slate-400 text-sm mt-1">
                                    Importez des commandes depuis BulkMedya en fournissant leurs Order IDs
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportOrderIds('');
                                    setImportService('');
                                    setImportLink('');
                                    setImportResult(null);
                                }}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Order IDs (un par ligne ou séparés par des virgules)
                                </label>
                                <textarea
                                    value={importOrderIds}
                                    onChange={(e) => setImportOrderIds(e.target.value)}
                                    placeholder="Exemple: 12345, 12346, 12347&#10;ou un ID par ligne"
                                    disabled={importing}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/20 min-h-25 resize-none disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Nom du service
                                </label>
                                <input
                                    type="text"
                                    value={importService}
                                    onChange={(e) => setImportService(e.target.value)}
                                    placeholder="Ex: Instagram Followers, TikTok Views..."
                                    disabled={importing}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/20 disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Lien / Username
                                </label>
                                <input
                                    type="text"
                                    value={importLink}
                                    onChange={(e) => setImportLink(e.target.value)}
                                    placeholder="Ex: https://instagram.com/username ou @username"
                                    disabled={importing}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/20 disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300">
                            💡 La quantité sera automatiquement calculée à partir des données BulkMedya (start_count + remains)
                        </div>

                        {importResult && (
                            <div className="mt-4 space-y-2">
                                {importResult.success.length > 0 && (
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                        <p className="text-green-400 text-sm font-semibold">
                                            ✅ {importResult.success.length} commande(s) importée(s) avec succès
                                        </p>
                                        <div className="mt-2 space-y-1">
                                            {importResult.success.map((item: any) => (
                                                <div key={item.orderId} className="text-xs text-green-300/70">
                                                    {item.orderId}: {item.service} - {item.link || 'N/A'} - {item.status}
                                                    {item.remains !== undefined && ` (Restant: ${item.remains})`}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {importResult.alreadyExists.length > 0 && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                        <p className="text-yellow-400 text-sm font-semibold">
                                            ⚠️  {importResult.alreadyExists.length} commande(s) déjà présente(s)
                                        </p>
                                        <div className="mt-1 text-xs text-yellow-300/70">
                                            {importResult.alreadyExists.join(', ')}
                                        </div>
                                    </div>
                                )}

                                {importResult.failed.length > 0 && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                        <p className="text-red-400 text-sm font-semibold">
                                            ❌ {importResult.failed.length} échec(s)
                                        </p>
                                        <div className="mt-2 space-y-1">
                                            {importResult.failed.map((item: any) => (
                                                <div key={item.orderId} className="text-xs text-red-300/70">
                                                    {item.orderId}: {item.error}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-3 mt-6">
                            <button
                                onClick={handleImport}
                                disabled={importing || !importOrderIds.trim() || !importService.trim() || !importLink.trim()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                            >
                                {importing ? (
                                    <>
                                        <RefreshCw size={18} className="animate-spin" />
                                        Import en cours...
                                    </>
                                ) : (
                                    <>
                                        <Download size={18} />
                                        Importer les commandes
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportOrderIds('');
                                    setImportService('');
                                    setImportLink('');
                                    setImportResult(null);
                                }}
                                className="px-4 py-3 bg-surface/50 hover:bg-surface border border-white/5 text-slate-400 hover:text-white font-bold rounded-xl transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}