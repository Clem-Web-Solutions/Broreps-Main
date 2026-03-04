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
    dripfeed_current_run?: number;
    retry_count?: number;
    error_message?: string;
    queue_status?: string;
}

interface Filters {
    status: string;
    service: string;
    link: string;
}

interface ImportResult {
    success: { orderId: string; service: string; link?: string; status: string; remains?: number }[];
    alreadyExists: string[];
    failed: { orderId: string; error: string }[];
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
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

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
            const data = await api.getOrders({ status: '', service: '', link: '' }, syncWithApi, currentPage, itemsPerPage);
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

            // Use parent's dripfeed_current_run as the reliable executed count
            // (sub-order counting can miss rows if provider_order_id is absent)
            const executedCount = parentOrder.dripfeed_current_run ?? subOrders.filter(o =>
                o.provider_order_id && o.status &&
                !['', 'scheduled', 'queued', 'pending'].includes(o.status?.toLowerCase() ?? '')
            ).length;
            const completedCount = subOrders.filter(o => o.status?.toLowerCase() === 'completed').length;
            const totalRuns = parentOrder.runs;
            const totalQuantity = parentOrder.quantity;
            const totalRemains = subOrders.reduce((sum, o) => sum + (o.remains || 0), 0);

            console.log(`   ✅ Exécutés: ${executedCount}/${totalRuns}`);
            console.log(`   ✅ Complétés: ${completedCount}/${totalRuns}`);

            // Determine overall status based on parent and sub-orders
            const parentStatusLower = parentOrder.status?.toLowerCase() ?? '';
            let overallStatus = 'Pending';
            if (completedCount === totalRuns || parentStatusLower === 'completed') {
                overallStatus = 'Completed';
            } else if (executedCount > 0 || parentStatusLower === 'processing' || parentStatusLower === 'in progress') {
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
                service_name: `💧 ${(parentOrder.service_name || 'Drip Feed').split('|')[0].trim()} (${executedCount}/${totalRuns} exécutés)`,
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
                if (order.status?.toLowerCase() !== filters.status?.toLowerCase()) {
                    return false;
                }
            }

            // Service filter (search in service name)
            if (filters.service) {
                const serviceLower = (order.service_name || '').toLowerCase();
                const filterLower = filters.service.toLowerCase();
                if (!serviceLower.includes(filterLower)) {
                    return false;
                }
            }

            // Link filter
            if (filters.link) {
                const linkLower = (order.link || '').toLowerCase();
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
            'pending': { label: 'En attente', color: 'text-orange-400', icon: Clock },
            'awaiting launch': { label: 'En attente', color: 'text-orange-400', icon: Clock },
            'in progress': { label: 'En cours', color: 'text-blue-400', icon: RefreshCw },
            'processing': { label: 'En cours', color: 'text-blue-400', icon: RefreshCw },
            'completed': { label: 'Terminé', color: 'text-green-400', icon: CheckCircle2 },
            'partial': { label: 'Partiel', color: 'text-yellow-400', icon: Clock },
            'canceled': { label: 'Annulé', color: 'text-red-400', icon: XCircle },
            'refunded': { label: 'Remboursé', color: 'text-red-400', icon: XCircle },
            'error': { label: 'Erreur', color: 'text-red-400', icon: XCircle }
        };
        return statusMap[status?.toLowerCase()] || { label: status, color: 'text-slate-400', icon: Clock };
    };

    const getPlatformFromService = (serviceName: string | null | undefined) => {
        if (!serviceName) return 'default';
        if (serviceName.toLowerCase().includes('instagram')) return 'instagram';
        if (serviceName.toLowerCase().includes('tiktok')) return 'tiktok';
        return 'default';
    };

    const getProgress = (order: Order) => {
        if (order.status?.toLowerCase() === 'completed') return 100;

        // For grouped drip feed orders, extract progress from service name
        if (order.runs && order.runs > 1) {
            const match = order.service_name?.match(/(\d+)\/(\d+) exécutés/);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // WebSocket listeners for real-time order updates
    useEffect(() => {
        if (!isConnected) return;

        const handleOrderCreated = (data: unknown) => {
            console.log('📦 New order created via WebSocket:', data);
            // Reload orders to reflect the new order
            loadOrders(false);
        };

        const handleOrderUpdated = (data: unknown) => {
            console.log('🔄 Order updated via WebSocket:', data);
            // Reload orders to reflect the update
            loadOrders(false);
        };

        const handleDripExecuted = (data: unknown) => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, on, off]);

    const activeOrders = orders.filter(o =>
        ['Pending', 'Awaiting Launch', 'In progress', 'Processing'].includes(o.status)
    ).length;

    // activeOrders value is used in this component now, silencing the unused var err
    console.log(`Commandes actives: ${activeOrders}`);

    const groupedOrders = groupDripFeedOrders(orders);
    const filteredOrders = applyFilters(groupedOrders, filters);

    // Calculate real total (excluding sub-orders)
    const displayedTotal = orders.filter(o => !o.parent_order_id).length;

    return (
        <div className="flex flex-col gap-6 pb-12 h-screen-content overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-[28px] font-bold text-white tracking-tight flex items-center gap-3">
                        Commandes
                    </h1>
                    <p className="text-[#A1A1AA] text-sm mt-1">
                        Historique des commandes et synchronisation
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-slate-500 text-[11px] font-medium tracking-wide">
                            Actualisation dans {formatNextRefresh()}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => loadOrders(false)}
                        disabled={loading}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#111111]/80 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-sm cursor-pointer group disabled:opacity-50"
                        title="Actualiser"
                    >
                        <RefreshCw size={16} className={cn("group-hover:rotate-180 transition-transform duration-500 text-primary", loading && "animate-spin")} />
                    </button>
                    <button
                        onClick={() => loadOrders(true)}
                        disabled={syncing || loading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-[13px] hover:bg-white/10 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                        <RotateCcw size={16} className={cn("text-blue-400", syncing && "animate-spin")} />
                        Synchro fournisseur
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-black font-bold rounded-xl text-[13px] hover:bg-primary/90 transition-transform hover:scale-105 shadow-[0_0_20px_rgba(0,163,54,0.15)] cursor-pointer"
                    >
                        <Download size={16} />
                        Importer (ID)
                    </button>
                </div>
            </div>

            <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 mb-6 flex flex-wrap gap-4 items-center shadow-xl relative z-10 w-fit">
                <div className="relative">
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="bg-[#050505] border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-[13px] text-white font-medium appearance-none outline-none focus:border-primary/50 cursor-pointer shadow-inner min-w-[160px]"
                    >
                        <option value="">Tous les statuts</option>
                        <option value="Pending">En attente</option>
                        <option value="In progress">En cours</option>
                        <option value="Completed">Terminées</option>
                        <option value="Canceled">Annulées</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#A1A1AA]">
                        <Filter size={14} />
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" size={15} />
                    <input
                        type="text"
                        placeholder="Rechercher service..."
                        value={filters.service}
                        onChange={(e) => setFilters({ ...filters, service: e.target.value })}
                        className="w-[220px] bg-[#050505] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-white placeholder-[#A1A1AA] outline-none focus:border-primary/50 shadow-inner font-medium transition-colors"
                    />
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" size={15} />
                    <input
                        type="text"
                        placeholder="Rechercher lien..."
                        value={filters.link}
                        onChange={(e) => setFilters({ ...filters, link: e.target.value })}
                        className="w-[220px] bg-[#050505] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-white placeholder-[#A1A1AA] outline-none focus:border-primary/50 shadow-inner font-medium transition-colors"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-3xl flex flex-col shadow-xl">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-5 border-b border-white/5 bg-white/[0.02] text-[11px] uppercase tracking-wider font-bold text-[#A1A1AA]">
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
                                <div key={i} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-white/5 items-center hover:bg-white/[0.03] transition-colors group">

                                    <div className="col-span-1">
                                        <span className="font-mono text-primary font-bold text-[13px]">#{order.id}</span>
                                        <div className="text-[10px] text-[#A1A1AA] mt-1 font-medium">{formatDate(order.created_at)}</div>
                                    </div>

                                    <div className="col-span-1">
                                        {order.shopify_order_number ? (
                                            <span className="font-mono text-blue-400 font-bold text-[13px] bg-blue-500/10 px-2 py-0.5 rounded-md px-1.5 py-0.5">S_{order.shopify_order_number}</span>
                                        ) : (
                                            <span className="text-slate-600 text-xs">-</span>
                                        )}
                                    </div>

                                    <div className="col-span-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-black relative border border-white/10 shadow-sm">
                                                <div className={cn(
                                                    "absolute inset-0 flex items-center justify-center opacity-90",
                                                    platform === 'instagram' ? "bg-linear-to-tr from-yellow-400 via-red-500 to-purple-500" : "bg-black"
                                                )}>
                                                    <img
                                                        src={platform === 'instagram' ? '/logo_instagram.png' : '/logo_tiktok.png'}
                                                        alt={platform}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 pr-2">
                                                <div className="font-semibold text-white text-[13px] line-clamp-1 group-hover:text-primary transition-colors pr-2" title={order.service_name}>{order.service_name}</div>
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded-md text-[#A1A1AA] border border-white/5 shadow-inner">ID: {order.service_id}</span>
                                                    <span className={cn("text-[10px] font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5", statusInfo.color)}>
                                                        <StatusIcon size={12} className={statusInfo.icon === RefreshCw ? "animate-spin-slow" : ""} />
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <span className="text-[13px] text-[#A1A1AA] font-medium px-2.5 py-1 bg-[#050505] rounded-lg border border-white/5">{order.provider}</span>
                                    </div>

                                    <div className="col-span-2">
                                        <a href={order.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-[13px] font-medium group/link bg-blue-500/10 px-3 py-1.5 rounded-lg max-w-full">
                                            <span className="truncate max-w-[120px]">{order.link.replace(/https?:\/\/(www\.)?/, '')}</span>
                                            <ExternalLink size={12} className="opacity-50 group-hover/link:opacity-100 transition-opacity shrink-0" />
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
                <div className="p-5 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <span className="text-[#A1A1AA] text-xs font-medium">
                        Page {currentPage} sur {totalPages} <span className="mx-2 text-white/20">|</span> Total: <strong className="text-white bg-white/10 px-2 py-0.5 rounded-md">{displayedTotal.toLocaleString()}</strong> commandes
                    </span>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#050505] border border-white/10 text-[#A1A1AA] hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
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
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${currentPage === page
                                                ? 'bg-primary text-black shadow-md'
                                                : 'bg-[#050505] border border-white/10 text-[#A1A1AA] hover:text-white hover:border-white/20'
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
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#050505] border border-white/10 text-[#A1A1AA] hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showImportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-[#050505]/80 backdrop-blur-xl"
                        onClick={() => {
                            if (!importing) {
                                setShowImportModal(false);
                                setImportOrderIds('');
                                setImportService('');
                                setImportLink('');
                                setImportResult(null);
                            }
                        }}
                    />
                    <div className="relative w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#111111]/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                                    <Download size={20} className="text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-white font-bold text-lg tracking-tight">Importer des commandes</h2>
                                    <p className="text-[#A1A1AA] text-xs mt-0.5 font-medium">
                                        Importez des commandes depuis BulkMedya en fournissant leurs Order IDs
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportOrderIds('');
                                    setImportService('');
                                    setImportLink('');
                                    setImportResult(null);
                                }}
                                disabled={importing}
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#A1A1AA] hover:bg-white/10 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-5">
                            <div className="space-y-2">
                                <label className="text-white text-[13px] font-semibold flex items-center gap-1.5 focus-within:text-primary transition-colors">
                                    Order IDs <span className="text-[#A1A1AA] font-normal text-xs">(un par ligne ou séparés par virgules)</span>
                                </label>
                                <textarea
                                    value={importOrderIds}
                                    onChange={(e) => setImportOrderIds(e.target.value)}
                                    placeholder="Exemple: 12345, 12346, 12347&#10;ou un ID par ligne"
                                    disabled={importing}
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#A1A1AA]/50 outline-none focus:border-primary/50 transition-all min-h-[100px] resize-y disabled:opacity-50"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-white text-[13px] font-semibold flex items-center gap-1.5 focus-within:text-primary transition-colors">
                                        Nom du service
                                    </label>
                                    <input
                                        type="text"
                                        value={importService}
                                        onChange={(e) => setImportService(e.target.value)}
                                        placeholder="Ex: Instagram Followers..."
                                        disabled={importing}
                                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#A1A1AA]/50 outline-none focus:border-white/30 transition-all disabled:opacity-50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-white text-[13px] font-semibold flex items-center gap-1.5 focus-within:text-primary transition-colors">
                                        Lien / Username
                                    </label>
                                    <input
                                        type="text"
                                        value={importLink}
                                        onChange={(e) => setImportLink(e.target.value)}
                                        placeholder="Ex: https://instagram.com/u ou @u"
                                        disabled={importing}
                                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#A1A1AA]/50 outline-none focus:border-white/30 transition-all disabled:opacity-50"

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
                                                {importResult.success.map((item) => (
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
                                                {importResult.failed.map((item) => (
                                                    <div key={item.orderId} className="text-xs text-red-300/70">
                                                        {item.orderId}: {item.error}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-3 pt-6 border-t border-white/5 mt-6">
                                <button
                                    onClick={handleImport}
                                    disabled={importing || !importOrderIds.trim() || !importService.trim() || !importLink.trim()}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-transform hover:scale-[1.02] shadow-[0_0_20px_rgba(0,163,54,0.15)] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                                >
                                    {importing ? (
                                        <>
                                            <RefreshCw size={18} className="animate-spin" />
                                            Importation...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={18} />
                                            Lancer l'importation
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
                                    disabled={importing}
                                    className="px-6 py-3 bg-[#050505] border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}