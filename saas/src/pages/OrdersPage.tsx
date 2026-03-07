import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Package, RefreshCw, ChevronRight, CheckCircle, Clock, AlertCircle, Zap, TrendingUp, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ordersApi, type SaasOrder, type SaasOrderDetail } from '../lib/api';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusLabel(s: string): { label: string; color: string; icon: React.ReactNode } {
    const lower = s.toLowerCase();
    if (lower === 'completed') return { label: 'Terminé', color: 'text-brand-primary bg-[#00A336]/10 border-[#00A336]/20', icon: <CheckCircle className="w-3 h-3" /> };
    if (lower === 'in progress' || lower === 'processing') return { label: 'En cours', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: <RefreshCw className="w-3 h-3 animate-spin" /> };
    if (lower === 'partial') return { label: 'Partiel', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: <TrendingUp className="w-3 h-3" /> };
    if (lower === 'pending') return { label: 'En attente', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: <Clock className="w-3 h-3" /> };
    if (lower === 'awaiting_payment') return { label: 'Paiement en attente', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: <AlertCircle className="w-3 h-3" /> };
    if (lower === 'canceled' || lower === 'cancelled') return { label: 'Annulé', color: 'text-[#71717a] bg-white/5 border-white/10', icon: <X className="w-3 h-3" /> };
    return { label: s, color: 'text-[#a1a1aa] bg-white/5 border-white/10', icon: <Clock className="w-3 h-3" /> };
}

function subStatusDot(s: string): string {
    const l = s.toLowerCase();
    if (l === 'completed') return 'bg-[#00A336]';
    if (l === 'in progress' || l === 'processing') return 'bg-blue-400';
    if (l === 'partial') return 'bg-yellow-400';
    return 'bg-[#3f3f46]';
}

function progressColor(pct: number): string {
    if (pct >= 100) return 'bg-[#00A336]';
    if (pct >= 50) return 'bg-blue-500';
    if (pct >= 10) return 'bg-orange-500';
    return 'bg-[#3f3f46]';
}

// ── Detail modal ──────────────────────────────────────────────────────────────

interface DetailModalProps {
    orderId: string;
    onClose: () => void;
}

function DetailModal({ orderId, onClose }: DetailModalProps) {
    const [detail, setDetail] = useState<SaasOrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        ordersApi.get(orderId)
            .then(r => setDetail(r.order))
            .catch(e => setError(e.message || 'Erreur de chargement'))
            .finally(() => setLoading(false));
    }, [orderId]);

    const st = detail ? statusLabel(detail.status) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.18 }}
                className="relative w-full max-w-135 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-white/5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Package className="w-4 h-4 text-[#a1a1aa]" />
                            <span className="text-[13px] text-[#a1a1aa] font-medium">Commande #{detail?.order_number || orderId}</span>
                        </div>
                        <h2 className="text-white text-[18px] font-semibold leading-snug">
                            {loading ? 'Chargement…' : (detail?.product || '—')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-[#71717a] hover:text-white transition-colors mt-1 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    {loading && (
                        <div className="flex items-center justify-center py-8 text-[#a1a1aa] gap-3">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span className="text-[14px]">Chargement du suivi…</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-[14px]">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {detail && st && (
                        <>
                            {/* Status + date */}
                            <div className="flex items-center justify-between">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold border ${st.color}`}>
                                    {st.icon} {st.label}
                                </span>
                                <span className="text-[12px] text-[#71717a]">{fmtDate(detail.placed_at)}</span>
                            </div>

                            {/* Link */}
                            {detail.link && (
                                <div className="flex items-center gap-2 bg-white/3 border border-white/5 rounded-xl px-4 py-3">
                                    <ExternalLink className="w-4 h-4 text-[#71717a] shrink-0" />
                                    <a href={detail.link.startsWith('http') ? detail.link : `https://${detail.link}`} target="_blank" rel="noopener noreferrer"
                                        className="text-[#a1a1aa] hover:text-white text-[13px] truncate transition-colors">
                                        {detail.link}
                                    </a>
                                </div>
                            )}

                            {/* Progress bar */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-[12px] font-medium">
                                    <span className="text-[#a1a1aa]">Progression</span>
                                    <span className="text-white">{detail.progress_pct}%</span>
                                </div>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${progressColor(detail.progress_pct)}`}
                                        style={{ width: `${detail.progress_pct}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[11px] text-[#71717a]">
                                    <span>{detail.delivered.toLocaleString('fr-FR')} livrés</span>
                                    <span>{detail.quantity.toLocaleString('fr-FR')} total</span>
                                </div>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white/3 border border-white/5 rounded-xl p-3 text-center">
                                    <div className="text-[18px] font-bold text-white">{detail.quantity.toLocaleString('fr-FR')}</div>
                                    <div className="text-[11px] text-[#71717a] mt-0.5">Commandé</div>
                                </div>
                                <div className="bg-white/3 border border-white/5 rounded-xl p-3 text-center">
                                    <div className="text-[18px] font-bold text-brand-primary">{detail.delivered.toLocaleString('fr-FR')}</div>
                                    <div className="text-[11px] text-[#71717a] mt-0.5">Livré</div>
                                </div>
                                <div className="bg-white/3 border border-white/5 rounded-xl p-3 text-center">
                                    <div className="text-[18px] font-bold text-orange-400">{detail.remains.toLocaleString('fr-FR')}</div>
                                    <div className="text-[11px] text-[#71717a] mt-0.5">Restant</div>
                                </div>
                            </div>

                            {/* Drip feed runs */}
                            {detail.is_drip_feed && detail.runs > 0 && (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-blue-400" />
                                        <span className="text-white text-[14px] font-semibold">Drip Feed — {detail.executed_runs}/{detail.runs} runs</span>
                                    </div>
                                    {detail.drip_sub_orders.length > 0 ? (
                                        <div className="flex flex-col gap-1.5">
                                            {detail.drip_sub_orders.map((sub, i) => {
                                                const subPct = sub.quantity > 0 ? Math.round((sub.delivered / sub.quantity) * 100) : 0;
                                                return (
                                                    <div key={sub.id} className="flex items-center gap-3 bg-white/2 border border-white/5 rounded-xl px-4 py-2.5">
                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${subStatusDot(sub.status)}`} />
                                                        <span className="text-[12px] text-[#a1a1aa] w-14 shrink-0">Run {i + 1}</span>
                                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${progressColor(subPct)}`} style={{ width: `${subPct}%` }} />
                                                        </div>
                                                        <span className="text-[11px] text-[#71717a] shrink-0 w-24 text-right">
                                                            {sub.delivered}/{sub.quantity}
                                                        </span>
                                                        <span className="text-[11px] text-[#52525b] shrink-0 w-20 text-right hidden sm:block">
                                                            {fmtDate(sub.created_at)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-[13px] text-[#71717a]">Premier run pas encore démarré.</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// ── Orders list ───────────────────────────────────────────────────────────────

export default function OrdersPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<SaasOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        setError(null);
        ordersApi.list()
            .then(r => setOrders(r.orders))
            .catch(e => setError(e.message || 'Erreur de chargement'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const openDetail = (order: SaasOrder) => {
        const id = order.internal_id?.toString() || order.order_number;
        setSelectedId(id);
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            {/* Back nav */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-[#a1a1aa] hover:text-white flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Dashboard
                </button>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-2 text-[13px] font-medium text-[#a1a1aa] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualiser
                </button>
            </div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="flex items-center gap-4 mb-10"
            >
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Package className="w-7 h-7 text-white/80" strokeWidth={1.5} />
                </div>
                <div>
                    <h1 className="text-[28px] md:text-[34px] font-semibold text-white tracking-tight leading-tight">
                        Mes Commandes
                    </h1>
                    <p className="text-[#a1a1aa] text-[14px] font-medium mt-0.5">
                        Suivi de toutes tes commandes associées à ton compte.
                    </p>
                </div>
            </motion.div>

            {/* Content */}
            {loading && (
                <div className="flex items-center justify-center py-20 gap-3 text-[#a1a1aa]">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="text-[14px]">Chargement de tes commandes…</span>
                </div>
            )}

            {error && !loading && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-red-400 text-[14px]">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            {!loading && !error && orders.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                    className="flex flex-col items-center justify-center py-24 text-center"
                >
                    <div className="w-16 h-16 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center mb-5">
                        <Package className="w-8 h-8 text-white/30" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-white text-[18px] font-semibold mb-2">Aucune commande trouvée</h3>
                    <p className="text-[#71717a] text-[14px] max-w-85 leading-relaxed">
                        Aucune commande n'est associée à ton adresse email pour l'instant.
                    </p>
                </motion.div>
            )}

            {!loading && !error && orders.length > 0 && (
                <div className="flex flex-col gap-3">
                    {orders.map((order, i) => {
                        const st = statusLabel(order.status);
                        const pct = order.quantity > 0 ? Math.round((order.delivered / order.quantity) * 100) : 0;
                        const inProgress = ['in progress', 'processing', 'partial'].includes(order.status.toLowerCase());

                        return (
                            <motion.div
                                key={`${order.source}-${order.id}`}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 + i * 0.03 }}
                                onClick={() => openDetail(order)}
                                className="group bg-[#09090b] border border-white/5 hover:border-white/10 rounded-2xl p-5 cursor-pointer transition-all hover:bg-[#111111] flex flex-col gap-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.color}`}>
                                                {st.icon} {st.label}
                                            </span>
                                            {order.is_drip_feed && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border text-blue-400 bg-blue-500/10 border-blue-500/20">
                                                    <Zap className="w-3 h-3" /> Drip Feed
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-white text-[15px] font-semibold leading-snug truncate">{order.product}</p>
                                        {order.link && (
                                            <p className="text-[#71717a] text-[12px] mt-0.5 truncate">{order.link}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className="text-[11px] text-[#52525b]">#{order.order_number}</span>
                                        <span className="text-[11px] text-[#52525b]">{fmtDate(order.placed_at)}</span>
                                        <ChevronRight className="w-4 h-4 text-[#3f3f46] group-hover:text-[#a1a1aa] transition-colors mt-0.5" />
                                    </div>
                                </div>

                                {/* Progress bar (only when order has been dispatched) */}
                                {order.quantity > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${progressColor(pct)}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[11px] text-[#52525b]">
                                            <span>{order.delivered.toLocaleString('fr-FR')} livrés</span>
                                            {order.is_drip_feed && order.runs > 0
                                                ? <span>{order.executed_runs}/{order.runs} runs</span>
                                                : <span>{order.quantity.toLocaleString('fr-FR')} total</span>
                                            }
                                        </div>
                                    </div>
                                )}

                                {/* CTA for orders in progress */}
                                {inProgress && (
                                    <div className="flex items-center gap-2 text-[12px] text-brand-primary font-medium">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        Voir le suivi détaillé →
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Detail modal */}
            <AnimatePresence>
                {selectedId && (
                    <DetailModal orderId={selectedId} onClose={() => setSelectedId(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
