import { AlertTriangle, CheckCircle, Clock, RefreshCw, Search, Server, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../libs/api";
import { cn } from "../libs/utils";

interface Service {
    id: number;
    service_id: string;
    service_name: string;
    provider: string;
    provider_name: string;
    provider_active: number;
    api_url: string;
    delivery_mode?: 'standard' | 'dripfeed';
    dripfeed_quantity?: number;
    created_at: string;
}

interface CheckResult {
    service_id: string;
    service_name: string;
    provider: string;
    available: boolean;
    checking?: boolean;
}

interface HistoryItem {
    id: number;
    type: string;
    title: string;
    message: string;
    enabled: boolean;
    created_at: string;
}

export function Refill() {
    const [services, setServices] = useState<Service[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [checkingAll, setCheckingAll] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [checkResults, setCheckResults] = useState<Map<number, CheckResult>>(new Map());
    const [activeTab, setActiveTab] = useState<'services' | 'history'>('services');

    useEffect(() => {
        loadServices();
        loadHistory();
    }, []);

    const loadServices = async () => {
        try {
            setLoading(true);
            const data = await api.getRefillServices();
            setServices(data.services || []);
        } catch (error) {
            console.error('Failed to load services:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        try {
            const data = await api.getRefillHistory();
            setHistory(data.history || []);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    };

    const checkService = async (service: Service) => {
        try {
            // Mark as checking
            const newResults = new Map(checkResults);
            newResults.set(service.id, {
                service_id: service.service_id,
                service_name: service.service_name,
                provider: service.provider,
                available: false,
                checking: true
            });
            setCheckResults(newResults);

            const result = await api.checkServiceAvailability(service.id.toString());
            
            // Update with result
            newResults.set(service.id, {
                service_id: result.service_id,
                service_name: result.service_name,
                provider: result.provider,
                available: result.available,
                checking: false
            });
            setCheckResults(newResults);

            // Reload history if service is unavailable
            if (!result.available) {
                loadHistory();
            }
        } catch (error: any) {
            console.error('Failed to check service:', error);
            const newResults = new Map(checkResults);
            newResults.set(service.id, {
                service_id: service.service_id,
                service_name: service.service_name,
                provider: service.provider,
                available: false,
                checking: false
            });
            setCheckResults(newResults);
        }
    };

    const checkAllServices = async () => {
        if (!confirm('Vérifier tous les services ? Cela peut prendre quelques minutes.')) return;

        try {
            setCheckingAll(true);
            setCheckResults(new Map());

            // Mark all as checking
            const newResults = new Map();
            services.forEach(service => {
                newResults.set(service.id, {
                    service_id: service.service_id,
                    service_name: service.service_name,
                    provider: service.provider,
                    available: false,
                    checking: true
                });
            });
            setCheckResults(newResults);

            const result = await api.checkAllServicesAvailability();
            
            // Update results
            if (result.results && Array.isArray(result.results)) {
                result.results.forEach((r: any) => {
                    const service = services.find(s => s.service_id === r.service_id);
                    if (service) {
                        newResults.set(service.id, {
                            service_id: r.service_id,
                            service_name: r.service_name,
                            provider: r.provider,
                            available: r.available,
                            checking: false
                        });
                    }
                });
                setCheckResults(newResults);
            }

            alert(`✅ Vérification terminée:\n- Vérifiés: ${result.checked}\n- Indisponibles: ${result.unavailable}\n- Erreurs: ${result.errors}`);
            
            // Reload history
            loadHistory();
        } catch (error: any) {
            console.error('Failed to check all services:', error);
            alert('Erreur lors de la vérification des services');
        } finally {
            setCheckingAll(false);
        }
    };

    const filteredServices = services.filter(service => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            service.service_id.toLowerCase().includes(query) ||
            service.service_name.toLowerCase().includes(query) ||
            service.provider.toLowerCase().includes(query)
        );
    });

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col gap-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Vérification des Services</h1>
                    <p className="text-slate-400 text-sm">Contrôle quotidien de disponibilité (00:00)</p>
                </div>
                <button
                    onClick={checkAllServices}
                    disabled={checkingAll || loading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-secondary text-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw size={18} className={checkingAll ? "animate-spin" : ""} />
                    {checkingAll ? 'Vérification...' : 'Vérifier Tout'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
                <button
                    onClick={() => setActiveTab('services')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                        activeTab === 'services'
                            ? "bg-primary text-black"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Server size={16} />
                    Services ({services.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                        activeTab === 'history'
                            ? "bg-primary text-black"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Clock size={16} />
                    Historique ({history.length})
                </button>
            </div>

            {/* Services Tab */}
            {activeTab === 'services' && (
                <div className="space-y-4">
                    {/* Search */}
                    <div className="bg-surface rounded-2xl p-4 border border-white/5">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="text"
                                placeholder="Rechercher par ID, nom ou provider..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>

                    {/* Services List */}
                    <div className="bg-surface rounded-2xl p-6 border border-white/5">
                        {loading ? (
                            <div className="text-center py-12">
                                <RefreshCw className="animate-spin mx-auto mb-4 text-primary" size={32} />
                                <p className="text-slate-400">Chargement des services...</p>
                            </div>
                        ) : filteredServices.length === 0 ? (
                            <div className="text-center py-12">
                                <Server className="mx-auto mb-4 text-slate-600" size={48} />
                                <p className="text-slate-400">Aucun service trouvé</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredServices.map((service) => {
                                    const checkResult = checkResults.get(service.id);
                                    const isChecking = checkResult?.checking;
                                    const isAvailable = checkResult?.available;
                                    const wasChecked = checkResult !== undefined;

                                    return (
                                        <div
                                            key={service.id}
                                            className={cn(
                                                "flex items-center justify-between p-4 bg-background rounded-xl border transition-all",
                                                wasChecked && !isChecking
                                                    ? isAvailable
                                                        ? "border-green-500/30 bg-green-500/5"
                                                        : "border-red-500/30 bg-red-500/5"
                                                    : "border-white/5 hover:border-white/10"
                                            )}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-mono text-sm text-slate-400">#{service.service_id}</span>
                                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400">
                                                        {service.provider}
                                                    </span>
                                                    {service.delivery_mode === 'dripfeed' && (
                                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-400">
                                                            💧 Drip
                                                        </span>
                                                    )}
                                                    {!service.provider_active && (
                                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-500/20 text-orange-400">
                                                            ⚠️ Provider inactif
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-white font-semibold">{service.service_name}</h3>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* Status Icon */}
                                                {wasChecked && !isChecking && (
                                                    <div className="flex items-center gap-2">
                                                        {isAvailable ? (
                                                            <div className="flex items-center gap-2 text-green-400">
                                                                <CheckCircle size={20} />
                                                                <span className="text-sm font-bold">Disponible</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-red-400">
                                                                <XCircle size={20} />
                                                                <span className="text-sm font-bold">Indisponible</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Check Button */}
                                                <button
                                                    onClick={() => checkService(service)}
                                                    disabled={isChecking || checkingAll}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Vérifier ce service"
                                                >
                                                    <RefreshCw size={18} className={isChecking ? "animate-spin" : ""} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="bg-surface rounded-2xl p-6 border border-white/5">
                    <h2 className="text-xl font-bold text-white mb-4">Historique des alertes</h2>
                    {history.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="mx-auto mb-4 text-slate-600" size={48} />
                            <p className="text-slate-400">Aucune alerte enregistrée</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-start gap-4 p-4 bg-background rounded-xl border border-red-500/20"
                                >
                                    <AlertTriangle className="text-red-400 shrink-0 mt-1" size={20} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-bold text-white">{item.title}</h3>
                                            <span className="text-xs text-slate-500">{formatDate(item.created_at)}</span>
                                        </div>
                                        <p className="text-sm text-slate-400">{item.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}