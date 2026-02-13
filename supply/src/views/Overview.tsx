import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../libs/api";
import { Clock, ShoppingCart, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "../libs/utils";

interface DashboardStats {
    total_orders: number;
    pending_orders: number;
    active_drip: number;
    status_distribution: Array<{ status: string; count: number }>;
}

interface ProviderBalance {
    provider: string;
    balance: number;
    currency: string;
    status: string;
}

interface StatsCardProps {
    label: string;
    value: string;
    trend?: string;
    trendUp?: boolean;
    icon: LucideIcon;
}

function StatsCard({ label, value, trend, trendUp, icon: Icon }: StatsCardProps) {
    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 border border-white/5 hover:border-white/10 transition-all hover:translate-y-[-2px] group">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-primary/20 transition-colors">
                    <Icon size={20} className="text-white group-hover:text-primary transition-colors" />
                </div>
                {trend && (
                    <span className={cn("text-xs font-medium px-2 py-1 rounded-full", trendUp ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-slate-400 text-sm font-medium mb-1">{label}</h3>
                <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
            </div>
        </div>
    );
}

export function Overview() {
    const { user } = useAuth();

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [balances, setBalances] = useState<ProviderBalance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsData = await api.getDashboardStats();
                setStats(statsData);

                // Load all providers and their balances
                try {
                    const providersData = await api.getProviders();
                    if (providersData.providers && providersData.providers.length > 0) {
                        const balancePromises = providersData.providers.map(async (provider: any) => {
                            try {
                                const balanceData = await api.getBalance(provider.provider_name);
                                return {
                                    provider: provider.provider_name,
                                    balance: balanceData.balance || 0,
                                    currency: balanceData.currency || 'USD',
                                    status: 'ok'
                                };
                            } catch (error) {
                                console.error(`Error fetching balance for ${provider.provider_name}:`, error);
                                return {
                                    provider: provider.provider_name,
                                    balance: 0,
                                    currency: 'USD',
                                    status: 'error'
                                };
                            }
                        });

                        const allBalances = await Promise.all(balancePromises);
                        setBalances(allBalances);
                    } else {
                        setBalances([]);
                    }
                } catch (balanceError) {
                    console.error('Error fetching balances:', balanceError);
                    setBalances([]);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7FFF00]"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="mb-2">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    Welcome back, {(user as any)?.name || 'User'}
                </h1>
                <p className="text-slate-400 mt-1">Here is what's happening with your store today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    label="Solde Total Disponible"
                    value={`${balances.reduce((sum, b) => sum + b.balance, 0).toFixed(2)} USD`}
                    trend={balances.length > 0 ? `${balances.length} provider${balances.length > 1 ? 's' : ''}` : 'No providers'}
                    trendUp={balances.length > 0}
                    icon={Wallet}
                />
                <StatsCard
                    label="Total Orders"
                    value={stats?.total_orders?.toString() || '0'}
                    icon={ShoppingCart}
                />
                <StatsCard
                    label="Pending Orders"
                    value={stats?.pending_orders?.toString() || '0'}
                    icon={Clock}
                />
                <StatsCard
                    label="Active Drip"
                    value={stats?.active_drip?.toString() || '0'}
                    icon={TrendingUp}
                />
            </div>
        </div>
    )
}