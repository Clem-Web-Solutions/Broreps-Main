import { AlertTriangle, Clock, DollarSign, RefreshCw, Package, AlertCircle, CheckCircle, Copy, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../libs/api";
import { cn } from "../libs/utils";
import { useWebSocket } from "../contexts/WebSocketContext";

interface Alert {
    id: string;
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    message: string;
    data: {
        order_number?: number | string;
        hours_stuck?: number;
        remains_percentage?: number;
        hours_overdue?: number;
        balance?: number;
        order_id?: number;
        [key: string]: unknown;
    };
    created_at: string;
}

interface Summary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    by_type: {
        stuck_order: number;
        high_remains: number;
        missed_drip: number;
        duplicate_order: number;
        no_provider_id: number;
        low_balance: number;
    };
}

export function Reports() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [retryingOrders, setRetryingOrders] = useState<Set<number>>(new Set());
    const { on, off, isConnected } = useWebSocket();

    const loadAlerts = async () => {
        try {
            setLoading(true);
            const response = await api.request('/reports/alerts');
            setAlerts(response.alerts);
            setSummary(response.summary);
        } catch (error) {
            console.error('Erreur lors du chargement des alertes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAlerts();
    }, []);

    // WebSocket listeners for real-time updates
    useEffect(() => {
        if (!isConnected) return;

        const handleOrderUpdated = () => {
            console.log('🔄 Reports: Order updated, refreshing alerts...');
            loadAlerts();
        };

        const handleDripExecuted = () => {
            console.log('💧 Reports: Drip executed, refreshing alerts...');
            loadAlerts();
        };

        const handleLowBalance = () => {
            console.log('💰 Reports: Low balance alert, refreshing...');
            loadAlerts();
        };

        on('order:updated', handleOrderUpdated);
        on('order:completed', handleOrderUpdated);
        on('drip:executed', handleDripExecuted);
        on('balance:low', handleLowBalance);

        return () => {
            off('order:updated', handleOrderUpdated);
            off('order:completed', handleOrderUpdated);
            off('drip:executed', handleDripExecuted);
            off('balance:low', handleLowBalance);
        };
    }, [isConnected, on, off]);

    const handleRetryOrder = async (orderId: number) => {
        try {
            setRetryingOrders(prev => new Set([...prev, orderId]));

            const result = await api.retryOrder(orderId);
            console.log(`✅ Order #${orderId} successfully retried:`, result);

            // Show success message
            alert(`✅ Commande #${orderId} envoyée avec succès au provider!\nProvider Order ID: ${result.provider_order_id}`);

            // Reload alerts to remove the resolved alert
            await loadAlerts();
        } catch (error: unknown) {
            console.error(`❌ Failed to retry order #${orderId}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`❌ Erreur lors du renvoi de la commande: ${errorMessage}`);
        } finally {
            setRetryingOrders(prev => {
                const next = new Set(prev);
                next.delete(orderId);
                return next;
            });
        }
    };

    const getSeverityConfig = (severity: string) => {
        switch (severity) {
            case 'critical':
                return {
                    color: 'text-red-500',
                    bg: 'bg-red-500/10',
                    border: 'border-red-500/20',
                    icon: AlertTriangle
                };
            case 'high':
                return {
                    color: 'text-orange-500',
                    bg: 'bg-orange-500/10',
                    border: 'border-orange-500/20',
                    icon: AlertCircle
                };
            case 'medium':
                return {
                    color: 'text-yellow-500',
                    bg: 'bg-yellow-500/10',
                    border: 'border-yellow-500/20',
                    icon: AlertCircle
                };
            case 'low':
                return {
                    color: 'text-blue-500',
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/20',
                    icon: AlertCircle
                };
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'stuck_order':
            case 'high_remains':
            case 'no_provider_id':
                return Package;
            case 'missed_drip':
                return Clock;
            case 'duplicate_order':
                return Copy;
            case 'low_balance':
                return DollarSign;
            default:
                return AlertCircle;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            return `Il y a ${diffMins} min`;
        } else if (diffHours < 24) {
            return `Il y a ${diffHours}h`;
        } else if (diffDays < 7) {
            return `Il y a ${diffDays}j`;
        } else {
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }
    };

    const filteredAlerts = activeFilter === 'all'
        ? alerts
        : alerts.filter(alert => alert.type === activeFilter);

    const filterOptions = [
        { value: 'all', label: 'Tous', count: summary?.total || 0 },
        { value: 'stuck_order', label: 'Commandes bloquées', count: summary?.by_type.stuck_order || 0 },
        { value: 'high_remains', label: 'Livraison lente', count: summary?.by_type.high_remains || 0 },
        { value: 'missed_drip', label: 'Drip en retard', count: summary?.by_type.missed_drip || 0 },
        { value: 'no_provider_id', label: 'Non envoyées', count: summary?.by_type.no_provider_id || 0 },
        { value: 'low_balance', label: 'Solde faible', count: summary?.by_type.low_balance || 0 },
        { value: 'duplicate_order', label: 'Doublons', count: summary?.by_type.duplicate_order || 0 }
    ];

    return (
        <div className="flex flex-col gap-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Rapports & Alertes</h1>
                        {isConnected && (
                            <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-lg border border-green-500/20 flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                Temps réel
                            </span>
                        )}
                    </div>
                    <p className="text-[#A1A1AA]">Surveillance des problèmes et anomalies du système</p>
                </div>
                <button
                    onClick={loadAlerts}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Actualiser
                </button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[#A1A1AA] text-sm font-medium">Total</span>
                            <AlertCircle size={20} className="text-[#A1A1AA]" />
                        </div>
                        <div className="text-3xl font-black text-white">{summary.total}</div>
                        <div className="text-xs text-[#A1A1AA] mt-1">Alertes actives</div>
                    </div>

                    <div className="bg-[#0A0A0A] border border-red-500/20 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[#A1A1AA] text-sm font-medium">Critique</span>
                            <AlertTriangle size={20} className="text-red-500" />
                        </div>
                        <div className="text-3xl font-black text-red-500">{summary.critical}</div>
                        <div className="text-xs text-[#A1A1AA] mt-1">Action immédiate</div>
                    </div>

                    <div className="bg-[#0A0A0A] border border-orange-500/20 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[#A1A1AA] text-sm font-medium">Haute</span>
                            <AlertCircle size={20} className="text-orange-500" />
                        </div>
                        <div className="text-3xl font-black text-orange-500">{summary.high}</div>
                        <div className="text-xs text-[#A1A1AA] mt-1">À traiter rapidement</div>
                    </div>

                    <div className="bg-[#0A0A0A] border border-yellow-500/20 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[#A1A1AA] text-sm font-medium">Moyenne</span>
                            <AlertCircle size={20} className="text-yellow-500" />
                        </div>
                        <div className="text-3xl font-black text-yellow-500">{summary.medium}</div>
                        <div className="text-xs text-[#A1A1AA] mt-1">Surveillance</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {filterOptions.map(option => (
                    <button
                        key={option.value}
                        onClick={() => setActiveFilter(option.value)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                            activeFilter === option.value
                                ? "bg-primary text-black"
                                : "bg-[#050505] text-[#A1A1AA] hover:bg-[#111] hover:text-white border border-white/10"
                        )}
                    >
                        {option.label}
                        <span className={cn(
                            "ml-2 px-2 py-0.5 rounded-full text-xs font-bold",
                            activeFilter === option.value
                                ? "bg-black/20 text-black"
                                : "bg-white/5 text-[#A1A1AA]"
                        )}>
                            {option.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Alerts List */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-12 text-center text-[#A1A1AA]">
                        <RefreshCw className="animate-spin mx-auto mb-3" size={32} />
                        Chargement des alertes...
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="p-12 text-center text-[#A1A1AA]">
                        <CheckCircle className="mx-auto mb-3 text-green-500" size={48} />
                        <div className="text-xl font-bold text-white mb-2">Aucune alerte</div>
                        <div className="text-sm">Tout fonctionne correctement !</div>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredAlerts.map(alert => {
                            const severityConfig = getSeverityConfig(alert.severity);
                            const TypeIcon = getTypeIcon(alert.type);
                            const SeverityIcon = severityConfig?.icon || AlertCircle;

                            return (
                                <div
                                    key={alert.id}
                                    className={cn(
                                        "p-6 hover:bg-white/2 transition-colors border-l-4",
                                        severityConfig?.border
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                                            severityConfig?.bg
                                        )}>
                                            <TypeIcon size={24} className={severityConfig?.color} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-white mb-1">
                                                        {alert.title}
                                                    </h3>
                                                    <p className="text-[#A1A1AA] text-sm">
                                                        {alert.message}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1",
                                                        severityConfig?.bg,
                                                        severityConfig?.color
                                                    )}>
                                                        <SeverityIcon size={14} />
                                                        {alert.severity.toUpperCase()}
                                                    </span>
                                                    <span className="text-[#A1A1AA] text-xs">
                                                        {formatDate(alert.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Additional Details */}
                                            <div className="mt-3 flex flex-wrap gap-2 items-center">
                                                {alert.data.order_number && (
                                                    <span className="px-2 py-1 bg-white/5 text-slate-300 rounded text-xs font-mono">
                                                        #{alert.data.order_number}
                                                    </span>
                                                )}
                                                {alert.data.hours_stuck && (
                                                    <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded text-xs">
                                                        ⏱️ {alert.data.hours_stuck}h bloqué
                                                    </span>
                                                )}
                                                {alert.data.remains_percentage && (
                                                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs">
                                                        📊 {alert.data.remains_percentage}% reste
                                                    </span>
                                                )}
                                                {alert.data.hours_overdue && (
                                                    <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs">
                                                        ⏰ {alert.data.hours_overdue}h retard
                                                    </span>
                                                )}
                                                {alert.data.balance !== undefined && (
                                                    <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs font-mono">
                                                        💰 ${alert.data.balance.toFixed(2)}
                                                    </span>
                                                )}

                                                {/* Retry Button for orders not sent to provider */}
                                                {alert.type === 'no_provider_id' && alert.data.order_id && (
                                                    <button
                                                        onClick={() => handleRetryOrder(alert.data.order_id!)}
                                                        disabled={retryingOrders.has(alert.data.order_id!)}
                                                        className={cn(
                                                            "ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all",
                                                            retryingOrders.has(alert.data.order_id!)
                                                                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                                                                : "bg-primary text-black hover:bg-primary/90 hover:scale-105"
                                                        )}
                                                    >
                                                        {retryingOrders.has(alert.data.order_id) ? (
                                                            <>
                                                                <RefreshCw size={12} className="animate-spin" />
                                                                Envoi...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Send size={12} />
                                                                Renvoyer au provider
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}