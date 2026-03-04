import { Calendar, CheckCircle2, Clock, ExternalLink, Package, RefreshCw, Search, TrendingUp, User, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../libs/api";
import { cn } from "../libs/utils";
import { useWebSocket } from "../contexts/WebSocketContext";

interface OrderDetails {
    id: string | number;
    order_id?: string;
    service_id?: string;
    service_name?: string;
    product?: string;
    link: string;
    quantity: number;
    remains: number;
    delivered: number;
    progress: number;
    charge?: number;
    status: string;
    provider?: string;
    provider_order_id?: string;
    shopify_order_number?: string;
    created_at: string;
    updated_at?: string;
    estimated?: string;
    created_by?: {
        name: string;
        email: string;
    };
}

interface SubOrder {
    id: number;
    order_number: number;
    quantity: number;
    remains: number;
    delivered: number;
    status: string;
    provider_order_id?: string;
    created_at: string;
    is_executed: boolean;
}

interface DripFeedInfo {
    parent_order: {
        id: number;
        quantity: number;
        runs: number;
        run_interval: number;
        status: string;
        created_at: string;
    } | null;
    sub_orders: SubOrder[];
    total_runs: number;
    executed_runs: number;
    completed_runs: number;
}

interface TrackResult extends OrderDetails {
    isDripFeed: boolean;
    runs?: number;
    executedRuns?: number;
    raw?: {
        order: {
            service_name?: string;
            provider?: string;
            service_id?: string;
            created_by?: { name?: string };
            [key: string]: unknown;
        };
        is_drip_feed: boolean;
        drip_feed_info?: DripFeedInfo;
        account?: Record<string, unknown>;
    };
}

export function Track() {
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const [orderNumber, setOrderNumber] = useState('');
    const [result, setResult] = useState<TrackResult | null>(null);
    const [nextRefresh, setNextRefresh] = useState(30);
    const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

    const { on, off, isConnected } = useWebSocket();

    const formatNextRefresh = () => {
        return `${nextRefresh}s`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Paris'
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
            'Canceled': { label: 'Annulé', color: 'text-red-400', icon: Clock },
        };
        return statusMap[status] || { label: status, color: 'text-slate-400', icon: Clock };
    };

    // Calculate real-time progress for drip feed orders
    const calculateDripProgress = () => {
        const dripInfo = result?.raw?.drip_feed_info;

        if (!result?.isDripFeed || !dripInfo) {
            return {
                delivered: result?.delivered || 0,
                remains: result?.remains || 0,
                progress: result?.progress || 0
            };
        }

        // Sum up all sub-orders
        const totalDelivered = dripInfo.sub_orders.reduce((sum, sub) => sum + sub.delivered, 0);
        const totalRemains = dripInfo.sub_orders.reduce((sum, sub) => sum + sub.remains, 0);
        const quantity = result.quantity;
        const progress = quantity > 0 ? Math.round((totalDelivered / quantity) * 100) : 0;

        return { delivered: totalDelivered, remains: totalRemains, progress };
    };

    const handleSearch = async () => {
        console.log('🔍 Track handleSearch called with:', orderNumber);

        if (!orderNumber.trim()) {
            console.log('⚠️ Empty order number');
            setError('Veuillez entrer un numéro de commande');
            return;
        }

        try {
            console.log('📡 Track: Starting API request for order:', orderNumber);
            setLoading(true);
            setError('');
            const data = await api.trackOrder(orderNumber.replace('#', ''));
            console.log('✅ Track: Order data received:', data);
            setResult(data);
            setLastRefreshTime(new Date());
            setNextRefresh(30); // Reset countdown when loading new order
        } catch (err: unknown) {
            console.error('❌ Track: Error fetching order:', err);
            setError('Commande introuvable');
            setResult(null);
            setLastRefreshTime(null);
        } finally {
            console.log('🏁 Track: Request completed');
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (!result || !orderNumber.trim()) return;

        try {
            setRefreshing(true);
            const data = await api.trackOrder(orderNumber.replace('#', ''));
            setResult(data);
            setLastRefreshTime(new Date());
            setNextRefresh(30); // Reset countdown after manual refresh
            console.log('🔄 Données rafraîchies à', new Date().toLocaleTimeString('fr-FR'));
        } catch (err) {
            console.error('Erreur lors du rafraîchissement:', err);
        } finally {
            setRefreshing(false);
        }
    };

    // Auto-refresh countdown
    useEffect(() => {
        if (!result) return; // Don't start countdown if no order displayed

        const timer = setInterval(() => {
            setNextRefresh(prev => {
                if (prev <= 1) {
                    handleRefresh();
                    return 30; // Reset to 30 seconds
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result, orderNumber]);

    // WebSocket listeners for real-time order tracking updates
    useEffect(() => {
        if (!isConnected || !result) return;

        const handleOrderUpdated = (data: { order_id?: string; id?: string | number }) => {
            // Only refresh if the updated order matches the currently tracked order
            if (data.order_id === orderNumber || data.id === result?.id) {
                console.log('🔄 Track: Order updated, refreshing...');
                handleRefresh();
            }
        };

        const handleDripExecuted = () => {
            if (result?.isDripFeed) {
                console.log('💧 Track: Drip executed, refreshing...');
                handleRefresh();
            }
        };

        on('order:updated', handleOrderUpdated);
        on('drip:executed', handleDripExecuted);

        return () => {
            off('order:updated', handleOrderUpdated);
            off('drip:executed', handleDripExecuted);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, on, off, result, orderNumber]);


    return (
        <div className="flex flex-col items-center gap-8 pb-12">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black text-white tracking-wide">TRACKING DE COMMANDE</h1>
                <p className="text-slate-400 text-lg">Suivez l'exécution complète de vos ordres</p>
            </div>

            <div className="w-full max-w-8xl bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Numéro de commande Shopify (ex: #1234)"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-6 py-4 text-white placeholder-[#A1A1AA] outline-none focus:border-white/20 transition-colors text-lg"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="bg-primary hover:bg-primary/90 text-black font-bold text-lg px-8 py-4 rounded-xl transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(0,163,54,0.3)] disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? <RefreshCw size={24} className="animate-spin" /> : <Search size={24} strokeWidth={3} />}
                        Rechercher
                    </button>
                </div>
                {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        {error}
                    </div>
                )}
            </div>

            {result && (
                <div className="w-full max-w-8xl space-y-6">
                    {/* Main Order Card */}
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Package className="text-primary" size={32} />
                                    <h2 className="text-3xl font-black text-white">Commande #{result.id}</h2>
                                    {result.isDripFeed && (
                                        <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold">DRIP FEED</span>
                                    )}
                                </div>
                                <p className="text-slate-400">{result.product || result.raw?.order?.service_name}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-slate-500 text-xs">
                                        Actualisation automatique dans {formatNextRefresh()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-lg"
                                    title="Rafraîchir les données"
                                >
                                    <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
                                </button>
                                <div className="text-right">
                                    {(() => {
                                        const statusInfo = getStatusInfo(result.status);
                                        const StatusIcon = statusInfo.icon;
                                        return (
                                            <div className={cn("flex items-center gap-2 text-lg font-bold", statusInfo.color)}>
                                                <StatusIcon size={24} className={statusInfo.icon === RefreshCw ? "animate-spin" : ""} />
                                                {statusInfo.label}
                                            </div>
                                        );
                                    })()}
                                    <div className="text-slate-500 text-sm mt-1">Créé le {formatDate(result.created_at)}</div>
                                    {lastRefreshTime && (
                                        <div className="text-green-400 text-xs mt-1 flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse"></div>
                                            Actualisé à {lastRefreshTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-400">PROGRESSION</span>
                                    {result.isDripFeed && (
                                        <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                                            Cumul des {result.executedRuns} runs
                                        </span>
                                    )}
                                </div>
                                <span className="text-2xl font-black text-primary">{calculateDripProgress().progress}%</span>
                            </div>
                            <div className="w-full h-4 bg-[#050505] rounded-full overflow-hidden border border-white/10">
                                <div
                                    className="h-full bg-primary transition-all duration-1000 rounded-full"
                                    style={{ width: `${calculateDripProgress().progress}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-2 text-sm">
                                <span className="text-slate-400">Livré: <strong className="text-white">{calculateDripProgress().delivered.toLocaleString()}</strong></span>
                                <span className="text-slate-400">Restant: <strong className="text-orange-400">{calculateDripProgress().remains.toLocaleString()}</strong></span>
                                <span className="text-slate-400">Total: <strong className="text-white">{result.quantity.toLocaleString()}</strong></span>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-[#050505] rounded-xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp size={16} className="text-primary" />
                                    <span className="text-xs text-[#A1A1AA] font-bold uppercase">Provider</span>
                                </div>
                                <div className="text-white font-bold">{result.provider || result.raw?.order?.provider || 'N/A'}</div>
                            </div>
                            <div className="bg-[#050505] rounded-xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={16} className="text-blue-400" />
                                    <span className="text-xs text-[#A1A1AA] font-bold uppercase">Service ID</span>
                                </div>
                                <div className="text-white font-mono text-sm">{result.service_id || result.raw?.order?.service_id || 'N/A'}</div>
                            </div>
                            <div className="bg-[#050505] rounded-xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar size={16} className="text-green-400" />
                                    <span className="text-xs text-[#A1A1AA] font-bold uppercase">Créé le</span>
                                </div>
                                <div className="text-white font-bold text-sm">{formatDate(result.created_at)}</div>
                            </div>
                            <div className="bg-[#050505] rounded-xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <User size={16} className="text-purple-400" />
                                    <span className="text-xs text-[#A1A1AA] font-bold uppercase">Créé par</span>
                                </div>
                                <div className="text-white font-bold text-sm">{result.created_by?.name || result.raw?.order?.created_by?.name || 'N/A'}</div>
                            </div>
                        </div>

                        {/* Link and Provider Order ID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#050505] rounded-xl p-4 border border-white/5">
                                <div className="text-xs text-[#A1A1AA] font-bold uppercase mb-2">LIEN CIBLE</div>
                                <a href={result.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 font-mono text-sm break-all">
                                    {result.link}
                                    <ExternalLink size={14} className="shrink-0" />
                                </a>
                            </div>
                            {result.provider_order_id && (
                                <div className="bg-[#050505] rounded-xl p-4 border border-white/5">
                                    <div className="text-xs text-[#A1A1AA] font-bold uppercase mb-2">PROVIDER ORDER ID</div>
                                    <div className="text-primary font-mono font-bold">{result.provider_order_id}</div>
                                </div>
                            )}
                            {result.shopify_order_number && (
                                <div className="bg-[#050505] rounded-xl p-4 border border-white/5">
                                    <div className="text-xs text-[#A1A1AA] font-bold uppercase mb-2">SHOPIFY ORDER</div>
                                    <div className="text-orange-400 font-mono font-bold">#{result.shopify_order_number}</div>
                                </div>
                            )}
                        </div>

                        {/* Charge */}
                        {result.charge && result.charge > 0 && (
                            <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-green-400 font-bold">Coût de la commande</span>
                                    <span className="text-green-400 text-2xl font-black">{Number(result.charge).toFixed(2)} €</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Drip Feed Details */}
                    {result.isDripFeed && result.raw?.drip_feed_info && (
                        <div className="bg-[#0A0A0A] border border-primary/20 rounded-2xl p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-primary">📊 Détails Drip Feed</h3>
                                <div className="text-right">
                                    <div className="text-sm text-slate-400">Exécutions</div>
                                    <div className="text-2xl font-black text-white">
                                        {result.raw.drip_feed_info.executed_runs} / {result.raw.drip_feed_info.total_runs}
                                    </div>
                                </div>
                            </div>

                            {result.raw.drip_feed_info.parent_order && (
                                <>
                                    <div className="bg-[#050505] rounded-xl p-4 border border-white/5">
                                        <div className="text-xs text-slate-500 font-bold uppercase mb-3">CONFIGURATION</div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <div className="text-slate-400 text-sm">Quantité totale</div>
                                                <div className="text-white font-bold text-lg">{result.raw.drip_feed_info.parent_order.quantity.toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-400 text-sm">Nombre de runs</div>
                                                <div className="text-white font-bold text-lg">{result.raw.drip_feed_info.parent_order.runs}</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-400 text-sm">Intervalle</div>
                                                <div className="text-white font-bold text-lg">{Math.round(result.raw.drip_feed_info.parent_order.run_interval / 1440)} jour{Math.round(result.raw.drip_feed_info.parent_order.run_interval / 1440) > 1 ? 's' : ''}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline & Dates */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Prochain Drip */}
                                        {result.raw.drip_feed_info.executed_runs < result.raw.drip_feed_info.total_runs && (
                                            <div className="bg-linear-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-5">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Clock className="text-blue-400" size={20} />
                                                    <span className="text-xs text-blue-300 font-bold uppercase">Prochain Drip</span>
                                                </div>
                                                <div className="text-white font-bold text-xl mb-1">
                                                    {(() => {
                                                        const createdDate = new Date(result.raw.drip_feed_info.parent_order.created_at);
                                                        const nextDripDate = new Date(createdDate.getTime() + (result.raw.drip_feed_info.executed_runs * result.raw.drip_feed_info.parent_order.run_interval * 60 * 1000));
                                                        return nextDripDate.toLocaleDateString('fr-FR', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            timeZone: 'Europe/Paris'
                                                        });
                                                    })()}
                                                </div>
                                                <div className="text-blue-300 text-sm">
                                                    Run #{result.raw.drip_feed_info.executed_runs + 1} sur {result.raw.drip_feed_info.total_runs}
                                                </div>
                                            </div>
                                        )}

                                        {/* Fin Estimée */}
                                        <div className="bg-linear-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <CheckCircle2 className="text-green-400" size={20} />
                                                <span className="text-xs text-green-300 font-bold uppercase">Fin Estimée</span>
                                            </div>
                                            <div className="text-white font-bold text-xl mb-1">
                                                {(() => {
                                                    const createdDate = new Date(result.raw.drip_feed_info.parent_order.created_at);
                                                    const endDate = new Date(createdDate.getTime() + ((result.raw.drip_feed_info.total_runs - 1) * result.raw.drip_feed_info.parent_order.run_interval * 60 * 1000));
                                                    return endDate.toLocaleDateString('fr-FR', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        timeZone: 'Europe/Paris'
                                                    });
                                                })()}
                                            </div>
                                            <div className="text-green-300 text-sm">
                                                {(() => {
                                                    const createdDate = new Date(result.raw.drip_feed_info.parent_order.created_at);
                                                    const endDate = new Date(createdDate.getTime() + ((result.raw.drip_feed_info.total_runs - 1) * result.raw.drip_feed_info.parent_order.run_interval * 60 * 1000));
                                                    const now = new Date();
                                                    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                                    return daysRemaining > 0 ? `Dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}` : 'Terminé';
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Sub Orders Timeline */}
                            {result.raw.drip_feed_info.sub_orders.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">HISTORIQUE DES EXÉCUTIONS</h4>
                                    <div className="space-y-2">
                                        {result.raw.drip_feed_info.sub_orders.map((subOrder, index) => {
                                            const statusInfo = getStatusInfo(subOrder.status);
                                            const StatusIcon = statusInfo.icon;
                                            return (
                                                <div key={index} className={cn(
                                                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                                                    subOrder.is_executed
                                                        ? "bg-black/30 border-white/10"
                                                        : "bg-black/10 border-white/5 opacity-50"
                                                )}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                                                            subOrder.status === 'Completed' ? "bg-green-500/20 text-green-400" :
                                                                subOrder.is_executed ? "bg-blue-500/20 text-blue-400" :
                                                                    "bg-slate-500/20 text-slate-400"
                                                        )}>
                                                            {subOrder.order_number}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-white font-bold">Run #{subOrder.order_number}</span>
                                                                <StatusIcon size={14} className={statusInfo.color} />
                                                                <span className={cn("text-xs font-bold", statusInfo.color)}>{statusInfo.label}</span>
                                                            </div>
                                                            <div className="text-slate-400 text-sm">{formatDate(subOrder.created_at)}</div>
                                                            {subOrder.provider_order_id && (
                                                                <div className="text-xs text-slate-500 font-mono mt-1">ID: {subOrder.provider_order_id}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {subOrder.is_executed && subOrder.delivered === 0 && subOrder.status !== 'Completed' ? (
                                                            // Aucune livraison encore (sync en attente ou traitement en cours)
                                                            <>
                                                                <div className="text-blue-400 font-bold text-lg">
                                                                    {subOrder.status === 'In progress' || subOrder.status === 'Processing' ? '🔄 En cours' : 'Envoyé'}
                                                                </div>
                                                                <div className="text-slate-400 text-sm">{subOrder.quantity.toLocaleString()} unités</div>
                                                                <div className="text-yellow-400 text-xs">
                                                                    {subOrder.status === 'In progress' || subOrder.status === 'Processing'
                                                                        ? 'Traitement par le provider...'
                                                                        : 'En attente de sync...'}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            // Livraison en cours ou terminée
                                                            <>
                                                                <div className="text-white font-bold text-lg">{subOrder.delivered.toLocaleString()}</div>
                                                                <div className="text-slate-400 text-sm">sur {subOrder.quantity.toLocaleString()}</div>
                                                                {subOrder.remains > 0 && subOrder.status !== 'Completed' && (
                                                                    <div className="text-orange-400 text-xs">Restant: {subOrder.remains}</div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Summary */}
                                    <div className="mt-4 grid grid-cols-3 gap-4">
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                                            <div className="text-blue-400 font-bold text-2xl">{result.raw.drip_feed_info.executed_runs}</div>
                                            <div className="text-slate-400 text-sm">Exécutés</div>
                                        </div>
                                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                                            <div className="text-green-400 font-bold text-2xl">{result.raw.drip_feed_info.completed_runs}</div>
                                            <div className="text-slate-400 text-sm">Terminés</div>
                                        </div>
                                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                                            <div className="text-orange-400 font-bold text-2xl">
                                                {result.raw.drip_feed_info.total_runs - result.raw.drip_feed_info.executed_runs}
                                            </div>
                                            <div className="text-slate-400 text-sm">En attente</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}