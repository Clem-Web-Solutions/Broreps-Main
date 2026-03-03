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
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../libs/api';
import { cn } from '../libs/utils';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface Payment {
    id: number;
    payment_id: string;
    order_type: string;
    customer_email: string;
    customer_name: string;
    product_title: string;
    quantity: number;
    amount: number;
    currency: string;
    payment_status: string;
    social_link: string;
    payment_created_at: string;
    created_at: string;
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
    const map: Record<string, { label: string; icon: any; cls: string }> = {
        paid:      { label: 'Payé',      icon: CheckCircle2, cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
        succeeded: { label: 'Payé',      icon: CheckCircle2, cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
        success:   { label: 'Payé',      icon: CheckCircle2, cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
        active:    { label: 'Actif',     icon: CheckCircle2, cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
        pending:   { label: 'En attente', icon: Clock,       cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        failed:    { label: 'Échoué',    icon: XCircle,      cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
        refunded:  { label: 'Remboursé', icon: RotateCcw,    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        cancelled: { label: 'Annulé',    icon: XCircle,      cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
        paused:    { label: 'Pausé',     icon: AlertCircle,  cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        past_due:  { label: 'En retard', icon: AlertCircle,  cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
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
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
    return (
        <div className="bg-surface border border-white/5 rounded-xl p-5 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', color)}>
                <Icon size={20} className="text-white" />
            </div>
            <div>
                <p className="text-slate-400 text-xs font-medium">{label}</p>
                <p className="text-white text-xl font-bold mt-0.5">{value}</p>
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Paiements</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Paiements uniques & abonnements TagadaPay</p>
                </div>
                <button
                    onClick={() => { loadStats(); tab === 'payments' ? loadPayments(payPage, paySearch) : loadSubscriptions(subPage, subSearch, subFilter); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors text-sm"
                >
                    <RefreshCw size={14} />
                    Actualiser
                </button>
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
            <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
                {(['payments', 'subscriptions'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                            'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                            tab === t ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'
                        )}
                    >
                        {t === 'payments' ? '💳 Paiements' : '🔄 Abonnements'}
                    </button>
                ))}
            </div>

            {/* ── Payments Tab ─────────────────────────────────────────────── */}
            {tab === 'payments' && (
                <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-white/5 flex gap-3">
                        <form onSubmit={handlePaySearch} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1 max-w-sm">
                            <Search size={14} className="text-slate-500" />
                            <input
                                type="text"
                                placeholder="Email, produit, lien..."
                                value={paySearch}
                                onChange={e => setPaySearch(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-full"
                            />
                            <button type="submit" className="text-primary text-xs font-bold">OK</button>
                        </form>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 text-slate-500 text-xs uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left">Date</th>
                                    <th className="px-4 py-3 text-left">Client</th>
                                    <th className="px-4 py-3 text-left">Produit</th>
                                    <th className="px-4 py-3 text-left">Lien social</th>
                                    <th className="px-4 py-3 text-right">Montant</th>
                                    <th className="px-4 py-3 text-center">Statut</th>
                                    <th className="px-4 py-3 text-center">ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payLoading ? (
                                    <tr><td colSpan={7} className="text-center py-12 text-slate-500">Chargement…</td></tr>
                                ) : payments.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-12 text-slate-500">Aucun paiement trouvé</td></tr>
                                ) : payments.map(p => (
                                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">{formatDate(p.payment_created_at || p.created_at)}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-white text-xs font-medium">{p.customer_name || '–'}</div>
                                            <div className="text-slate-500 text-[11px]">{p.customer_email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-white text-xs max-w-50 truncate">{p.product_title}</div>
                                            {p.quantity > 1 && <div className="text-slate-500 text-[11px]">x{p.quantity}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-[11px] max-w-40 truncate">
                                            {p.social_link ? (
                                                <a href={p.social_link} target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-1 hover:text-primary transition-colors truncate">
                                                    <ArrowUpRight size={10} />
                                                    {p.social_link.replace(/https?:\/\/(www\.)?/, '')}
                                                </a>
                                            ) : '–'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-white font-semibold text-xs whitespace-nowrap">
                                            {formatAmount(p.amount, p.currency)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <PaymentStatusBadge status={p.payment_status} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-slate-600 text-[10px] font-mono">{p.payment_id?.slice(0, 8)}…</span>
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
                <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-white/5 flex flex-wrap gap-3">
                        <form onSubmit={handleSubSearch} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1 max-w-sm">
                            <Search size={14} className="text-slate-500" />
                            <input
                                type="text"
                                placeholder="Email, produit..."
                                value={subSearch}
                                onChange={e => setSubSearch(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-full"
                            />
                            <button type="submit" className="text-primary text-xs font-bold">OK</button>
                        </form>
                        <select
                            value={subFilter}
                            onChange={e => { setSubFilter(e.target.value); setSubPage(1); }}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none"
                        >
                            <option value="">Tous les statuts</option>
                            <option value="active">Actif</option>
                            <option value="paused">Pausé</option>
                            <option value="cancelled">Annulé</option>
                            <option value="past_due">En retard</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 text-slate-500 text-xs uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left">Début</th>
                                    <th className="px-4 py-3 text-left">Client</th>
                                    <th className="px-4 py-3 text-left">Produit</th>
                                    <th className="px-4 py-3 text-left">Lien social</th>
                                    <th className="px-4 py-3 text-center">Intervalle</th>
                                    <th className="px-4 py-3 text-left">Prochain renouvellement</th>
                                    <th className="px-4 py-3 text-right">Montant</th>
                                    <th className="px-4 py-3 text-right">Total encaissé</th>
                                    <th className="px-4 py-3 text-center">Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subLoading ? (
                                    <tr><td colSpan={9} className="text-center py-12 text-slate-500">Chargement…</td></tr>
                                ) : subs.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-12 text-slate-500">Aucun abonnement trouvé</td></tr>
                                ) : subs.map(s => (
                                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">{formatDate(s.subscription_started_at || s.created_at)}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-white text-xs font-medium">{s.customer_name || '–'}</div>
                                            <div className="text-slate-500 text-[11px]">{s.customer_email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-white text-xs max-w-50 truncate">{s.product_title}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-[11px] max-w-40 truncate">
                                            {s.social_link ? (
                                                <a href={s.social_link} target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-1 hover:text-primary transition-colors truncate">
                                                    <ArrowUpRight size={10} />
                                                    {s.social_link.replace(/https?:\/\/(www\.)?/, '')}
                                                </a>
                                            ) : '–'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-slate-400 text-[11px] capitalize">{s.subscription_interval || '–'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                                            {s.subscription_next_billing_date ? (
                                                <span className={cn(
                                                    new Date(s.subscription_next_billing_date) < new Date()
                                                        ? 'text-red-400' : 'text-slate-300'
                                                )}>
                                                    {formatDate(s.subscription_next_billing_date)}
                                                </span>
                                            ) : '–'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-white font-semibold text-xs whitespace-nowrap">
                                            {formatAmount(s.amount, s.currency)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-400 font-semibold text-xs whitespace-nowrap">
                                            {s.total_paid ? formatAmount(Number(s.total_paid), s.currency) : '–'}
                                            {s.payment_count > 0 && (
                                                <div className="text-slate-500 text-[10px]">{s.payment_count} paiement{s.payment_count > 1 ? 's' : ''}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
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
        </div>
    );
}
