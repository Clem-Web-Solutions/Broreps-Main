import {
    ArrowUpRight,
    CreditCard,
    RefreshCw,
    Search,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    Repeat,
    CalendarClock,
    TrendingUp,
    Zap,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../libs/api';
import { cn } from '../libs/utils';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface Payment {
    id: number;
    payment_id: string;
    order_id: string | null;
    order_type: string;
    customer_email: string;
    customer_name: string;
    product_title: string;
    quantity: number;
    amount: number;
    currency: string;
    payment_status: string;
    social_link: string | null;
    service_id: number | null;
    shopify_order_number: number | null;
    payment_created_at: string;
    created_at: string;
    is_processed: number | boolean;
    internal_order_id: number | null;
}

interface Subscription {
    id: number;
    subscription_id: string;
    subscription_status: string;
    subscription_interval: string;
    subscription_next_billing_date: string;
    subscription_started_at: string;
    customer_email: string;
    customer_name: string;
    product_title: string;
    amount: number;
    currency: string;
    social_link: string;
    payment_count: number;
    total_paid: number;
    created_at: string;
}

interface StatsData {
    total_payments: number;
    total_revenue: number;
    total_subscriptions: number;
    active_subscriptions: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const formatDate = (d: string | null) => {
    if (!d) return '–';
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
        + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const formatAmount = (cents: number, currency = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; icon: LucideIcon; cls: string }> = {
        paid: { label: 'Payé', icon: CheckCircle2, cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
        succeeded: { label: 'Payé', icon: CheckCircle2, cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
        success: { label: 'Payé', icon: CheckCircle2, cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
        active: { label: 'Actif', icon: CheckCircle2, cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
        pending: { label: 'En attente', icon: Clock, cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        failed: { label: 'Échoué', icon: XCircle, cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
        refunded: { label: 'Remboursé', icon: RotateCcw, cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        cancelled: { label: 'Annulé', icon: XCircle, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
        paused: { label: 'Pausé', icon: AlertCircle, cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        past_due: { label: 'En retard', icon: AlertCircle, cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
    };
    const cfg = map[status?.toLowerCase()] ?? { label: status ?? '–', icon: AlertCircle, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    const Icon = cfg.icon;
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border', cfg.cls)}>
            <Icon size={10} />
            {cfg.label}
        </span>
    );
};

/* ─── Stat Card ──────────────────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: LucideIcon; color: string }) {
    return (
        <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-colors group shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-5 rounded-full blur-[50px] pointer-events-none group-hover:opacity-10 transition-opacity"></div>
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/5 backdrop-blur-md relative z-10', color)}>
                <Icon size={22} className="text-white drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="relative z-10">
                <p className="text-[#A1A1AA] text-[13px] font-medium tracking-wide">{label}</p>
                <p className="text-white text-2xl font-bold mt-1 tracking-tight">{value}</p>
            </div>
        </div>
    );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export function Payments() {
    const [tab, setTab] = useState<'payments' | 'subscriptions'>('payments');

    /* payments state */
    const [payments, setPayments] = useState<Payment[]>([]);
    const [payPage, setPayPage] = useState(1);
    const [payTotalPages, setPayTotalPages] = useState(1);
    const [paySearch, setPaySearch] = useState('');
    const [payLoading, setPayLoading] = useState(false);

    /* subscriptions state */
    const [subs, setSubs] = useState<Subscription[]>([]);
    const [subPage, setSubPage] = useState(1);
    const [subTotalPages, setSubTotalPages] = useState(1);
    const [subSearch, setSubSearch] = useState('');
    const [subLoading, setSubLoading] = useState(false);
    const [subFilter, setSubFilter] = useState('');

    /* stats */
    const [stats, setStats] = useState<StatsData | null>(null);

    /* complete-order modal */
    const [completeModal, setCompleteModal] = useState<Payment | null>(null);
    const [completeSocialLink, setCompleteSocialLink] = useState('');
    const [completeEmail, setCompleteEmail] = useState('');
    const [completeServiceId, setCompleteServiceId] = useState('');
    const [completeLoading, setCompleteLoading] = useState(false);
    const [completeError, setCompleteError] = useState('');

    const openComplete = (p: Payment) => {
        setCompleteModal(p);
        setCompleteSocialLink('');
        setCompleteEmail(p.customer_email || '');
        setCompleteServiceId(p.service_id !== null && p.service_id !== undefined ? String(p.service_id) : '');
        setCompleteError('');
    };
    const closeComplete = () => { setCompleteModal(null); setCompleteError(''); };
    const submitComplete = async () => {
        if (!completeModal || !completeSocialLink.trim()) return;
        setCompleteLoading(true);
        setCompleteError('');
        try {
            await api.request(`/tagadapay/admin/complete-order/${completeModal.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    social_link: completeSocialLink.trim(),
                    customer_email: completeEmail.trim() || undefined,
                    service_id: completeServiceId.trim() ? Number(completeServiceId.trim()) : undefined,
                }),
            });
            closeComplete();
            loadPayments(payPage, paySearch);
        } catch (e: unknown) {
            setCompleteError(e instanceof Error ? e.message : 'Erreur inconnue');
        } finally {
            setCompleteLoading(false);
        }
    };

    /* ── Fetch ────────────────────────────────────────────────────────────── */
    const loadPayments = async (page = 1, search = '') => {
        setPayLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '50' });
            if (search) params.append('search', search);
            const data = await api.request(`/tagadapay/admin/payments?${params}`);
            setPayments(data.payments ?? []);
            setPayTotalPages(data.total_pages ?? 1);
        } catch (e) {
            console.error(e);
        } finally {
            setPayLoading(false);
        }
    };

    const loadSubscriptions = async (page = 1, search = '', status = '') => {
        setSubLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '50' });
            if (search) params.append('search', search);
            if (status) params.append('status', status);
            const data = await api.request(`/tagadapay/admin/subscriptions?${params}`);
            setSubs(data.subscriptions ?? []);
            setSubTotalPages(data.total_pages ?? 1);
        } catch (e) {
            console.error(e);
        } finally {
            setSubLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const data = await api.request('/tagadapay/admin/stats');
            setStats(data);
        } catch (e) { /* silent */ }
    };

    useEffect(() => { loadStats(); }, []);
    useEffect(() => { loadPayments(payPage, paySearch); }, [payPage]);
    useEffect(() => { loadSubscriptions(subPage, subSearch, subFilter); }, [subPage, subFilter]);

    const handlePaySearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPayPage(1);
        loadPayments(1, paySearch);
    };

    const handleSubSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSubPage(1);
        loadSubscriptions(1, subSearch, subFilter);
    };

    /* ── Render ───────────────────────────────────────────────────────────── */
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-[28px] font-bold text-white tracking-tight flex items-center gap-3">
                        Paiements
                    </h1>
                    <p className="text-[#A1A1AA] text-sm mt-1">Gérez les paiements uniques et abonnements via TagadaPay</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { loadStats(); tab === 'payments' ? loadPayments(payPage, paySearch) : loadSubscriptions(subPage, subSearch, subFilter); }}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#111111]/80 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-sm cursor-pointer group"
                        title="Actualiser les données"
                    >
                        <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500 text-primary" />
                    </button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Paiements totaux" value={String(stats.total_payments)} icon={CreditCard} color="bg-primary/20" />
                    <StatCard label="Revenus totaux" value={formatAmount(stats.total_revenue)} icon={TrendingUp} color="bg-green-600/30" />
                    <StatCard label="Abonnements" value={String(stats.total_subscriptions)} icon={Repeat} color="bg-purple-600/30" />
                    <StatCard label="Abonnements actifs" value={String(stats.active_subscriptions)} icon={CalendarClock} color="bg-blue-600/30" />
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1.5 bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-1.5 w-fit shadow-sm relative z-10">
                {(['payments', 'subscriptions'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                            'px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center gap-2 cursor-pointer',
                            tab === t
                                ? 'bg-primary text-black shadow-md'
                                : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                        )}
                    >
                        {t === 'payments' ? <CreditCard size={16} /> : <Repeat size={16} />}
                        {t === 'payments' ? 'Transactions' : 'Abonnements'}
                    </button>
                ))}
            </div>

            {/* ── Payments Tab ─────────────────────────────────────────────── */}
            {tab === 'payments' && (
                <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl mb-12">
                    {/* Toolbar */}
                    <div className="p-5 border-b border-white/5 flex gap-3 items-center">
                        <form onSubmit={handlePaySearch} className="flex items-center gap-3 bg-[#050505] border border-white/10 rounded-xl px-4 py-2.5 flex-1 max-w-sm focus-within:border-primary/50 transition-colors shadow-inner">
                            <Search size={16} className="text-[#A1A1AA]" />
                            <input
                                type="text"
                                placeholder="Email, produit, ID..."
                                value={paySearch}
                                onChange={e => setPaySearch(e.target.value)}
                                className="bg-transparent border-none outline-none text-[13px] text-white placeholder-[#A1A1AA] w-full font-medium"
                            />
                            {paySearch && (
                                <button type="button" onClick={() => { setPaySearch(''); loadPayments(1, ''); }} className="text-[#A1A1AA] hover:text-white p-1">
                                    <X size={14} />
                                </button>
                            )}
                            <button type="submit" className="hidden">OK</button>
                        </form>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-[13px]">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-5 py-4 text-left font-semibold text-[#A1A1AA]">Date</th>
                                    <th className="px-5 py-4 text-left font-semibold text-[#A1A1AA]">Client</th>
                                    <th className="px-5 py-4 text-left font-semibold text-[#A1A1AA]">Produit</th>
                                    <th className="px-5 py-4 text-left font-semibold text-[#A1A1AA]">Lien social</th>
                                    <th className="px-5 py-4 text-right font-semibold text-[#A1A1AA]">Montant</th>
                                    <th className="px-5 py-4 text-center font-semibold text-[#A1A1AA]">Statut</th>
                                    <th className="px-5 py-4 text-center font-semibold text-[#A1A1AA]">Détails</th>
                                    <th className="px-5 py-4 text-center font-semibold text-[#A1A1AA]">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payLoading ? (
                                    <tr><td colSpan={8} className="text-center py-12 text-slate-500">Chargement…</td></tr>
                                ) : payments.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-12 text-slate-500">Aucun paiement trouvé</td></tr>
                                ) : payments.map(p => (
                                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                                        <td className="px-5 py-4 text-[#A1A1AA] whitespace-nowrap text-[13px]">{formatDate(p.payment_created_at || p.created_at)}</td>
                                        <td className="px-5 py-4">
                                            <div className="text-white text-[13px] font-semibold">{p.customer_name || '–'}</div>
                                            <div className="text-[#A1A1AA] text-xs">{p.customer_email}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-white text-[13px] font-medium max-w-50 truncate">{p.product_title}</div>
                                            {p.order_type === 'subscription' && (
                                                <div className="text-[10px] text-purple-400 font-bold mt-0.5">REBILL</div>
                                            )}
                                            {p.quantity > 1 && <div className="text-[#00A336] font-bold text-xs mt-0.5">x{p.quantity}</div>}
                                        </td>
                                        <td className="px-5 py-4 text-[#A1A1AA] text-xs max-w-40 truncate">
                                            {p.social_link ? (
                                                <a href={p.social_link} target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 hover:text-primary transition-colors truncate px-2 py-1 bg-white/5 rounded-md">
                                                    <ArrowUpRight size={12} />
                                                    {p.social_link.replace(/https?:\/\/(www\.)?/, '')}
                                                </a>
                                            ) : '–'}
                                        </td>
                                        <td className="px-5 py-4 text-right text-white font-bold text-[13px] whitespace-nowrap">
                                            {formatAmount(p.amount, p.currency)}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <PaymentStatusBadge status={p.payment_status} />
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                <span className="text-[#A1A1AA] text-[11px] font-mono font-medium px-1.5 py-0.5 bg-white/5 rounded">#{p.id}</span>
                                                {p.shopify_order_number && <span className="text-blue-400 text-[10px] font-mono px-1.5 py-0.5 bg-blue-500/10 rounded">S_#{p.shopify_order_number}</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {['paid', 'succeeded', 'success'].includes(p.payment_status) ? (
                                                <div className="flex flex-col items-center gap-1.5">
                                                    {p.internal_order_id && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-semibold">
                                                            <CheckCircle2 size={10} />
                                                            #{p.internal_order_id}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => openComplete(p)}
                                                        className={cn(
                                                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold hover:scale-105 text-[11px]',
                                                            p.is_processed
                                                                ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                                                : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'
                                                        )}
                                                    >
                                                        {p.is_processed ? <RotateCcw size={10} /> : <Zap size={10} />}
                                                        {p.is_processed ? 'Relancer' : 'Compléter'}
                                                    </button>
                                                </div>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-slate-500 text-xs">Page {payPage} / {payTotalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPayPage(p => Math.max(1, p - 1))} disabled={payPage <= 1}
                                className="p-1.5 rounded-lg bg-white/5 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={() => setPayPage(p => Math.min(payTotalPages, p + 1))} disabled={payPage >= payTotalPages}
                                className="p-1.5 rounded-lg bg-white/5 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Subscriptions Tab ────────────────────────────────────────── */}
            {tab === 'subscriptions' && (
                <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl mb-12">
                    {/* Toolbar */}
                    <div className="p-5 border-b border-white/5 flex flex-wrap gap-4 items-center">
                        <form onSubmit={handleSubSearch} className="flex items-center gap-3 bg-[#050505] border border-white/10 rounded-xl px-4 py-2.5 flex-1 max-w-sm focus-within:border-primary/50 transition-colors shadow-inner">
                            <Search size={16} className="text-[#A1A1AA]" />
                            <input
                                type="text"
                                placeholder="Rechercher un abonnement..."
                                value={subSearch}
                                onChange={e => setSubSearch(e.target.value)}
                                className="bg-transparent border-none outline-none text-[13px] text-white placeholder-[#A1A1AA] w-full font-medium"
                            />
                            {subSearch && (
                                <button type="button" onClick={() => { setSubSearch(''); loadSubscriptions(1, '', subFilter); }} className="text-[#A1A1AA] hover:text-white p-1">
                                    <X size={14} />
                                </button>
                            )}
                            <button type="submit" className="hidden">OK</button>
                        </form>
                        <div className="relative">
                            <select
                                value={subFilter}
                                onChange={e => { setSubFilter(e.target.value); setSubPage(1); }}
                                className="bg-[#050505] border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-[13px] font-medium text-white outline-none focus:border-primary/50 appearance-none shadow-inner cursor-pointer"
                            >
                                <option value="">Tous les abonnements</option>
                                <option value="active">Actifs uniquement</option>
                                <option value="paused">En pause</option>
                                <option value="cancelled">Annulés</option>
                                <option value="past_due">En retard de paiement</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#A1A1AA]">
                                <ChevronRight size={14} className="rotate-90" />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-[13px]">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-5 py-4 text-left font-semibold text-[#A1A1AA]">Débuté le</th>
                                    <th className="px-5 py-4 text-left font-semibold text-[#A1A1AA]">Abonné</th>
                                    <th className="px-5 py-4 text-left font-semibold text-[#A1A1AA]">Formule</th>
                                    <th className="px-5 py-4 text-left font-semibold text-[#A1A1AA]">Cible</th>
                                    <th className="px-5 py-4 text-center font-semibold text-[#A1A1AA]">Cycle</th>
                                    <th className="px-5 py-4 text-left font-semibold text-[#A1A1AA]">Prochain prélèvement</th>
                                    <th className="px-5 py-4 text-right font-semibold text-[#A1A1AA]">Mensualité</th>
                                    <th className="px-5 py-4 text-right font-semibold text-[#A1A1AA]">LTV (Encaissé)</th>
                                    <th className="px-5 py-4 text-center font-semibold text-[#A1A1AA]">Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subLoading ? (
                                    <tr><td colSpan={9} className="text-center py-12 text-slate-500">Chargement…</td></tr>
                                ) : subs.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-12 text-slate-500">Aucun abonnement trouvé</td></tr>
                                ) : subs.map(s => (
                                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                                        <td className="px-5 py-4 text-[#A1A1AA] whitespace-nowrap text-[13px]">{formatDate(s.subscription_started_at || s.created_at)}</td>
                                        <td className="px-5 py-4">
                                            <div className="text-white text-[13px] font-semibold">{s.customer_name || '–'}</div>
                                            <div className="text-[#A1A1AA] text-xs">{s.customer_email}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-white text-[13px] font-medium max-w-50 truncate">{s.product_title}</div>
                                        </td>
                                        <td className="px-5 py-4 text-[#A1A1AA] text-xs max-w-40 truncate">
                                            {s.social_link ? (
                                                <a href={s.social_link} target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 hover:text-primary transition-colors truncate px-2 py-1 bg-white/5 rounded-md">
                                                    <ArrowUpRight size={12} />
                                                    {s.social_link.replace(/https?:\/\/(www\.)?/, '')}
                                                </a>
                                            ) : '–'}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="text-[#A1A1AA] text-xs capitalize bg-white/5 px-2 py-1 rounded-md">{s.subscription_interval || '–'}</span>
                                        </td>
                                        <td className="px-5 py-4 text-[13px] whitespace-nowrap">
                                            {s.subscription_next_billing_date ? (
                                                <span className={cn(
                                                    new Date(s.subscription_next_billing_date) < new Date()
                                                        ? 'text-red-400 font-medium bg-red-500/10 px-2 py-1 rounded-md' : 'text-[#A1A1AA]'
                                                )}>
                                                    {formatDate(s.subscription_next_billing_date)}
                                                </span>
                                            ) : '–'}
                                        </td>
                                        <td className="px-5 py-4 text-right text-white font-bold text-[13px] whitespace-nowrap">
                                            {formatAmount(s.amount, s.currency)}
                                        </td>
                                        <td className="px-5 py-4 text-right text-primary font-bold text-[13px] whitespace-nowrap">
                                            {s.total_paid ? formatAmount(Number(s.total_paid), s.currency) : '–'}
                                            {s.payment_count > 0 && (
                                                <div className="text-[#A1A1AA] font-normal text-xs mt-0.5">{s.payment_count} prélèvement{s.payment_count > 1 ? 's' : ''}</div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <PaymentStatusBadge status={s.subscription_status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-slate-500 text-xs">Page {subPage} / {subTotalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setSubPage(p => Math.max(1, p - 1))} disabled={subPage <= 1}
                                className="p-1.5 rounded-lg bg-white/5 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={() => setSubPage(p => Math.min(subTotalPages, p + 1))} disabled={subPage >= subTotalPages}
                                className="p-1.5 rounded-lg bg-white/5 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Complete Order Modal ─────────────────────────────────────── */}
            {completeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-[#050505]/80 backdrop-blur-xl"
                        onClick={closeComplete}
                    />

                    <div className="relative w-full max-w-[480px] bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#111111]/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                                    <Zap size={20} className="text-yellow-400" />
                                </div>
                                <div>
                                    <h2 className="text-white font-bold text-lg tracking-tight">Compléter la commande</h2>
                                    <p className="text-[#A1A1AA] text-xs font-medium truncate max-w-[200px] mt-0.5">{completeModal.product_title}</p>
                                </div>
                            </div>
                            <button
                                onClick={closeComplete}
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#A1A1AA] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto">
                            <div className="space-y-5">
                                <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 text-[13px] text-[#A1A1AA] space-y-2.5">
                                    <div className="flex justify-between items-center group">
                                        <span className="font-medium">Produit commandé</span>
                                        <span className="text-white font-semibold truncate max-w-[200px]">{completeModal.product_title}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Quantité</span>
                                        <span className="text-white bg-white/5 px-2 py-0.5 rounded-md font-mono">{completeModal.quantity?.toLocaleString('fr-FR')}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Montant encaissé</span>
                                        <span className="text-[#00A336] font-bold">{formatAmount(completeModal.amount, completeModal.currency)}</span>
                                    </div>
                                    <div className="pt-2 mt-2 border-t border-white/5 flex justify-between items-center">
                                        <span className="font-medium">Réf. TagadaPay</span>
                                        <span className="text-[#A1A1AA] font-mono text-[11px] bg-black px-2 py-1 rounded-md">{completeModal.payment_id?.slice(0, 16)}…</span>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-white text-[13px] font-semibold flex items-center gap-1.5 focus-within:text-primary transition-colors">
                                            Lien(s) de destination <span className="text-[#00A336]">*</span>
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={completeSocialLink}
                                            onChange={e => setCompleteSocialLink(e.target.value)}
                                            placeholder={"ex: https://www.tiktok.com/@user/video/123\nhttps://www.tiktok.com/@user/video/456"}
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#A1A1AA]/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-medium resize-none"
                                            autoFocus
                                        />
                                        <p className="text-[#A1A1AA] text-[11px]">
                                            Un lien par ligne (ou séparés par une virgule). Si plusieurs liens, la quantité sera divisée équitablement.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-white text-[13px] font-semibold flex items-center gap-1.5 focus-within:text-primary transition-colors">
                                            ID du service <span className="text-[#A1A1AA] font-normal text-xs">(Optionnel si déjà détecté)</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={completeServiceId}
                                            onChange={e => setCompleteServiceId(e.target.value)}
                                            placeholder="ex: 42 — laissez vide pour utiliser le service auto-détecté"
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#A1A1AA]/50 outline-none focus:border-white/30 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-white text-[13px] font-semibold flex items-center gap-1.5 focus-within:text-primary transition-colors">
                                            Email de notification <span className="text-[#A1A1AA] font-normal text-xs">(Optionnel)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={completeEmail}
                                            onChange={e => setCompleteEmail(e.target.value)}
                                            placeholder="client@mail.com"
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#A1A1AA]/50 outline-none focus:border-white/30 transition-all"
                                        />
                                    </div>
                                </div>

                                {completeError && (
                                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-medium">
                                        <AlertCircle size={16} className="shrink-0" />
                                        <p>{completeError}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-5 border-t border-white/5 bg-[#111111]/80 flex gap-3">
                            <button
                                onClick={closeComplete}
                                className="flex-1 px-4 py-3 rounded-xl bg-transparent border border-white/10 text-white font-medium hover:bg-white/5 transition-colors text-[13px] cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={submitComplete}
                                disabled={!completeSocialLink.trim() || completeLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-black font-bold text-[13px] hover:bg-[#00BF3F] hover:shadow-[0_0_20px_rgba(0,163,54,0.3)] transition-all disabled:opacity-50 disabled:hover:shadow-none cursor-pointer group"
                            >
                                {completeLoading ? (
                                    <RefreshCw size={16} className="animate-spin" />
                                ) : (
                                    <Zap size={16} className="group-hover:scale-110 transition-transform" />
                                )}
                                {completeLoading ? 'Envoi en cours...' : 'Envoyer en production'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
