import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Crown,
    Calendar,
    CreditCard,
    Pause,
    Play,
    X,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    Clock,
    Loader2,
    TrendingUp,
    BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionApi, type SubscriptionInfo, type SubscriptionPayment } from '../lib/api';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatAmount(cents: number, currency = 'EUR'): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

function formatInterval(interval: string | null): string {
    if (!interval) return '';
    const map: Record<string, string> = {
        month: '/mois',
        monthly: '/mois',
        year: '/an',
        yearly: '/an',
        week: '/semaine',
        weekly: '/semaine',
        bimonthly: '/2 mois',
    };
    return map[interval.toLowerCase()] ?? `/${interval}`;
}

function fmtDate(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function statusConfig(status: string): { label: string; color: string; bg: string; dotColor: string } {
    switch (status.toLowerCase()) {
        case 'active':
            return { label: 'Actif', color: 'text-brand-primary', bg: 'bg-brand-primary/10 border-brand-primary/20', dotColor: 'bg-brand-primary' };
        case 'paused':
            return { label: 'En pause', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', dotColor: 'bg-yellow-400' };
        case 'past_due':
            return { label: 'Paiement dû', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', dotColor: 'bg-orange-400' };
        case 'cancelled':
        case 'canceled':
            return { label: 'Annulé', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', dotColor: 'bg-red-400' };
        case 'expired':
            return { label: 'Expiré', color: 'text-[#71717a]', bg: 'bg-white/5 border-white/10', dotColor: 'bg-[#3f3f46]' };
        default:
            return { label: status, color: 'text-[#a1a1aa]', bg: 'bg-white/5 border-white/10', dotColor: 'bg-[#3f3f46]' };
    }
}

function paymentStatusConfig(status: string): { label: string; color: string } {
    switch (status?.toLowerCase()) {
        case 'succeeded':
        case 'paid':
            return { label: 'Payé', color: 'text-brand-primary' };
        case 'pending':
            return { label: 'En attente', color: 'text-yellow-400' };
        case 'failed':
            return { label: 'Échoué', color: 'text-red-400' };
        case 'refunded':
            return { label: 'Remboursé', color: 'text-[#a1a1aa]' };
        default:
            return { label: status || '—', color: 'text-[#71717a]' };
    }
}

// ── Confirmation modal ─────────────────────────────────────────────────────────

type ActionType = 'pause' | 'resume' | 'cancel';

interface ConfirmModalProps {
    action: ActionType;
    loading: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

const ACTION_CONTENT: Record<ActionType, {
    title: string;
    description: string;
    icon: React.ReactNode;
    confirmLabel: string;
    confirmClass: string;
}> = {
    pause: {
        title: 'Suspendre l\'abonnement',
        description: 'Ton abonnement sera mis en pause. Tu pourras le reprendre à tout moment. Tu garderas l\'accès pendant la période déjà payée.',
        icon: <Pause className="w-6 h-6 text-yellow-400" />,
        confirmLabel: 'Mettre en pause',
        confirmClass: 'bg-yellow-500 hover:bg-yellow-400 text-black',
    },
    resume: {
        title: 'Reprendre l\'abonnement',
        description: 'Ton abonnement va reprendre et la prochaine facturation sera planifiée selon ton cycle habituel.',
        icon: <Play className="w-6 h-6 text-brand-primary" />,
        confirmLabel: 'Reprendre',
        confirmClass: 'bg-brand-primary hover:bg-[#00BF3F] text-white',
    },
    cancel: {
        title: 'Annuler l\'abonnement',
        description: 'Ton abonnement sera définitivement annulé. Tu perdras l\'accès au SaaS BroReps à la fin de la période en cours. Cette action est irréversible.',
        icon: <AlertTriangle className="w-6 h-6 text-red-400" />,
        confirmLabel: 'Annuler mon abonnement',
        confirmClass: 'bg-red-500 hover:bg-red-400 text-white',
    },
};

function ConfirmModal({ action, loading, onConfirm, onClose }: ConfirmModalProps) {
    const cfg = ACTION_CONTENT[action];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18 }}
                className="relative w-full max-w-105 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl p-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        {cfg.icon}
                    </div>
                    <h3 className="text-white text-[17px] font-semibold leading-snug">{cfg.title}</h3>
                </div>

                <p className="text-[#a1a1aa] text-[14px] leading-relaxed mb-6">{cfg.description}</p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#a1a1aa] text-[14px] font-medium hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${cfg.confirmClass}`}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {cfg.confirmLabel}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
    const navigate = useNavigate();
    const { refresh } = useAuth();

    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [confirmAction, setConfirmAction] = useState<ActionType | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await subscriptionApi.get();
            setSubscription(res.subscription);
            setPayments(res.payments);
        } catch (e: unknown) {
            const err = e as Error & { code?: string };
            if (err.code === 'NO_SUBSCRIPTION') {
                setError('NO_SUBSCRIPTION');
            } else {
                setError(err.message || 'Erreur de chargement');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        load();
    }, [load]);

    async function handleAction(action: ActionType) {
        setActionLoading(true);
        try {
            let res: { success: boolean; message: string };
            if (action === 'pause') res = await subscriptionApi.pause();
            else if (action === 'resume') res = await subscriptionApi.resume();
            else res = await subscriptionApi.cancel();

            setConfirmAction(null);
            setActionSuccess(res.message);
            await load();
            await refresh(); // Sync auth context with new subscription_status

            setTimeout(() => setActionSuccess(null), 5000);
        } catch (e: unknown) {
            setConfirmAction(null);
            setError((e as Error).message || 'Erreur');
        } finally {
            setActionLoading(false);
        }
    }

    const st = subscription ? statusConfig(subscription.status) : null;
    const isCancelled = subscription?.status === 'cancelled' || subscription?.status === 'canceled' || subscription?.status === 'expired';
    const isActive = subscription?.status === 'active' || subscription?.status === 'past_due';
    const isPaused = subscription?.status === 'paused';

    // Total paid = sum of all succeeded payments
    const totalPaid = payments
        .filter(p => ['succeeded', 'paid'].includes(p.payment_status?.toLowerCase()))
        .reduce((acc, p) => acc + (p.amount || 0), 0);

    return (
        <div className="flex flex-col items-center w-full pb-12">
            <div className="w-full max-w-180 flex flex-col px-2 md:px-0">

                {/* Back Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-[13px] font-medium text-[#a1a1aa] hover:text-white transition-colors cursor-pointer mb-8 self-start"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Dashboard
                </button>

                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/15 border border-brand-primary/20 flex items-center justify-center">
                            <Crown className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <h1 className="text-white text-[26px] font-black tracking-tight">Mon abonnement</h1>
                    </div>
                    <p className="text-[#71717a] text-[14px]">Gérez votre abonnement BroReps et consultez l'historique de vos paiements.</p>
                </motion.div>

                {/* Success toast */}
                <AnimatePresence>
                    {actionSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            className="w-full bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-4 flex items-center gap-3 mb-6"
                        >
                            <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                            <span className="text-brand-primary text-[14px] font-medium">{actionSuccess}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                    </div>
                )}

                {/* No subscription */}
                {!loading && error === 'NO_SUBSCRIPTION' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 flex flex-col items-center gap-4"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Crown className="w-6 h-6 text-[#52525b]" />
                        </div>
                        <h2 className="text-white text-[18px] font-semibold">Aucun abonnement trouvé</h2>
                        <p className="text-[#71717a] text-[14px] max-w-75 leading-relaxed">
                            Aucun abonnement actif n'est associé à ton compte.
                        </p>
                        <a
                            href="https://broreps.fr"
                            className="px-5 py-2.5 bg-brand-primary text-white text-[14px] font-semibold rounded-xl hover:bg-[#00BF3F] transition-colors"
                        >
                            Souscrire un abonnement
                        </a>
                    </motion.div>
                )}

                {/* General error */}
                {!loading && error && error !== 'NO_SUBSCRIPTION' && (
                    <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-red-400 text-[14px]">{error}</span>
                        <button onClick={load} className="ml-auto text-[#a1a1aa] hover:text-white cursor-pointer">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Content */}
                {!loading && subscription && (
                    <div className="flex flex-col gap-5">

                        {/* ── Status + Details card ─────────────────────────────── */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="w-full bg-[#09090b] border border-white/5 rounded-2xl p-6"
                        >
                            <div className="flex items-start justify-between gap-4 mb-5">
                                <div>
                                    <p className="text-[#71717a] text-[12px] font-medium uppercase tracking-widest mb-1">Abonnement</p>
                                    <h2 className="text-white text-[20px] font-bold leading-snug">
                                        {subscription.product || 'BroReps Premium'}
                                    </h2>
                                </div>
                                {st && (
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold shrink-0 ${st.bg} ${st.color}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${st.dotColor}`} />
                                        {st.label}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[#52525b] text-[11px] uppercase tracking-widest font-medium">Montant</span>
                                    <span className="text-white text-[16px] font-bold">
                                        {formatAmount(subscription.amount, subscription.currency)}
                                        <span className="text-[#71717a] text-[13px] font-normal">
                                            {formatInterval(subscription.interval)}
                                        </span>
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-[#52525b] text-[11px] uppercase tracking-widest font-medium">Membre depuis</span>
                                    <span className="text-white text-[14px] font-medium">{fmtDate(subscription.started_at)}</span>
                                </div>

                                {totalPaid > 0 && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[#52525b] text-[11px] uppercase tracking-widest font-medium">Total payé</span>
                                        <span className="text-white text-[14px] font-medium">
                                            {formatAmount(totalPaid, subscription.currency)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* ── Next billing card ─────────────────────────────────── */}
                        {subscription.next_billing_at && !isCancelled && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                className="w-full bg-[#09090b] border border-white/5 rounded-2xl p-5 flex items-center gap-4"
                            >
                                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
                                    <Calendar className="w-5 h-5 text-brand-primary" />
                                </div>
                                <div>
                                    <p className="text-[#71717a] text-[12px] font-medium mb-0.5">
                                        {isPaused ? 'Abonnement suspendu — pas de prochain prélèvement' : 'Prochain prélèvement'}
                                    </p>
                                    <p className="text-white text-[15px] font-semibold">
                                        {isPaused ? '—' : fmtDate(subscription.next_billing_at)}
                                        {!isPaused && (
                                            <span className="text-[#71717a] text-[13px] font-normal ml-2">
                                                · {formatAmount(subscription.amount, subscription.currency)}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Actions ───────────────────────────────────────────── */}
                        {!isCancelled && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="w-full bg-[#09090b] border border-white/5 rounded-2xl p-6"
                            >
                                <h3 className="text-white text-[15px] font-semibold mb-4">Actions</h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {isActive && (
                                        <button
                                            onClick={() => setConfirmAction('pause')}
                                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-yellow-400 text-[14px] font-medium hover:bg-yellow-500/20 transition-colors cursor-pointer"
                                        >
                                            <Pause className="w-4 h-4" />
                                            Mettre en pause
                                        </button>
                                    )}
                                    {isPaused && (
                                        <button
                                            onClick={() => setConfirmAction('resume')}
                                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-brand-primary/20 bg-brand-primary/10 text-brand-primary text-[14px] font-medium hover:bg-brand-primary/20 transition-colors cursor-pointer"
                                        >
                                            <Play className="w-4 h-4" />
                                            Reprendre l'abonnement
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setConfirmAction('cancel')}
                                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-[14px] font-medium hover:bg-red-500/20 transition-colors cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                        Annuler l'abonnement
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Cancelled banner */}
                        {isCancelled && subscription.cancelled_at && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="w-full bg-red-500/5 border border-red-500/15 rounded-2xl p-5 flex items-start gap-4"
                            >
                                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-red-400 text-[14px] font-semibold mb-1">Abonnement annulé</p>
                                    <p className="text-[#a1a1aa] text-[13px]">
                                        Annulé le {fmtDate(subscription.cancelled_at)}. Pour réactiver BroReps, souscris un nouvel abonnement.
                                    </p>
                                    <a
                                        href="https://broreps.fr"
                                        className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-semibold text-brand-primary hover:text-green-400 transition-colors"
                                    >
                                        Réactiver mon accès →
                                    </a>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Payment history ───────────────────────────────────── */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="w-full bg-[#09090b] border border-white/5 rounded-2xl overflow-hidden"
                        >
                            <div className="flex items-center gap-3 p-5 border-b border-white/5">
                                <CreditCard className="w-4 h-4 text-[#a1a1aa]" />
                                <h3 className="text-white text-[15px] font-semibold">Historique des paiements</h3>
                                <span className="ml-auto text-[#52525b] text-[12px]">{payments.length} paiement{payments.length !== 1 ? 's' : ''}</span>
                            </div>

                            {payments.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10 text-center">
                                    <Clock className="w-6 h-6 text-[#3f3f46]" />
                                    <p className="text-[#52525b] text-[13px]">Aucun paiement enregistré</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {payments.map((p, i) => {
                                        const pst = paymentStatusConfig(p.payment_status);
                                        const isFirst = i === payments.length - 1;
                                        return (
                                            <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                                                    {p.payment_status?.toLowerCase() === 'succeeded' || p.payment_status?.toLowerCase() === 'paid'
                                                        ? <BadgeCheck className="w-4 h-4 text-brand-primary" />
                                                        : p.payment_status?.toLowerCase() === 'pending'
                                                            ? <Clock className="w-4 h-4 text-yellow-400" />
                                                            : <TrendingUp className="w-4 h-4 text-[#52525b]" />
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-[14px] font-medium truncate">
                                                        {p.product_title || subscription.product || 'BroReps Premium'}
                                                        {isFirst && <span className="ml-2 text-[11px] text-[#52525b] font-normal">Premier paiement</span>}
                                                    </p>
                                                    <p className="text-[#71717a] text-[12px]">
                                                        {fmtDate(p.payment_created_at || p.created_at)}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-white text-[14px] font-semibold">
                                                        {formatAmount(p.amount, p.currency || subscription.currency)}
                                                    </p>
                                                    <p className={`text-[12px] font-medium ${pst.color}`}>{pst.label}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>

                    </div>
                )}
            </div>

            {/* Confirmation modal */}
            <AnimatePresence>
                {confirmAction && (
                    <ConfirmModal
                        action={confirmAction}
                        loading={actionLoading}
                        onConfirm={() => handleAction(confirmAction)}
                        onClose={() => setConfirmAction(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

