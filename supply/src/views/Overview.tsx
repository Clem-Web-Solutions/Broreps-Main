import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../libs/api";
import { ArrowUpRight, BarChart2, Clock, PieChartIcon, ShoppingCart, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "../libs/utils";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWebSocket } from "../contexts/WebSocketContext";

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

interface TrendData {
    name: string;
    value: number;
}

interface StatusDistributionChartProps {
    data?: Array<{ status: string; count: number }>;
}

interface Order {
    id: number;
    service: string;
    quantity: string;
    status: string;
    time: string;
    icon: string;
    platform: string;
}

interface ServiceData {
    name: string;
    value: number;
}

function StatsCard({ label, value, trend, trendUp, icon: Icon }: StatsCardProps) {
    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 border border-white/5 hover:border-white/10 transition-all hover:translate-y-0.5 group">
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

function TrendChart() {
    const [data, setData] = useState<TrendData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTrendData = async () => {
            try {
                const ordersData = await api.getOrders({ status: '', service: '', link: '' }, false, 1, 500);
                console.log('📊 Trend Chart: Loaded', ordersData.orders?.length || 0, 'orders');
                console.log('📊 Sample order:', ordersData.orders?.[0]);
                
                // Filter out sub-orders (only count parent orders and standard orders)
                const parentOrders = (ordersData.orders || []).filter((order: any) => !order.parent_order_id);
                console.log('📊 Parent orders only:', parentOrders.length);

                // Get today's date in UTC to avoid timezone issues
                const now = new Date();
                const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

                // Get date range for last 30 days in UTC (as ISO strings)
                const last30Days = Array.from({ length: 30 }, (_, i) => {
                    const time = todayUTC - (29 - i) * 24 * 60 * 60 * 1000;
                    const date = new Date(time);
                    return date.toISOString().split('T')[0];
                });

                // Count orders per day for last 30 days
                const dailyCounts = last30Days.map(dateStr => {
                    const count = parentOrders.filter((order: any) => {
                        const orderDateStr = order.created_at.split('T')[0];
                        return orderDateStr === dateStr;
                    }).length;
                    return { date: dateStr, count };
                });

                // Find days with orders
                const daysWithOrders = dailyCounts.filter(d => d.count > 0);
                console.log('📊 Days with orders (last 30 days):', daysWithOrders);

                // Use last 7 days for display
                const last7Days = last30Days.slice(-7);
                const trendData = last7Days.map(dateStr => {
                    const date = new Date(dateStr + 'T00:00:00Z');
                    const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' });
                    
                    const count = parentOrders.filter((order: any) => {
                        const orderDateStr = order.created_at.split('T')[0];
                        return orderDateStr === dateStr;
                    }).length;
                    
                    console.log(`📊 ${dayName} (${dateStr}): ${count} orders`);
                    return { name: dayName, value: count };
                });

                console.log('📊 Final trend data:', trendData);
                setData(trendData);
            } catch (error) {
                console.error('Failed to load trend data:', error);
                setData([
                    { name: 'Lun', value: 0 },
                    { name: 'Mar', value: 0 },
                    { name: 'Mer', value: 0 },
                    { name: 'Jeu', value: 0 },
                    { name: 'Ven', value: 0 },
                    { name: 'Sam', value: 0 },
                    { name: 'Dim', value: 0 },
                ]);
            } finally {
                setLoading(false);
            }
        };
        loadTrendData();
    }, []);

    if (loading) {
        return (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 border border-white/5 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }
    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 border border-white/5 h-full flex flex-col hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <TrendingUp size={16} className="text-primary" />
                    Orders Trend
                </h3>
            </div>

            <div className="flex-1 w-full min-h-50">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <XAxis hide />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                            cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#bef264"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, fill: '#bef264', stroke: '#000' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function StatusDistributionChart({ data: statusData }: StatusDistributionChartProps) {
    const data = statusData ? statusData.map(item => ({
        name: item.status,
        value: item.count,
        color: item.status === 'Completed' ? '#10b981' :
            item.status === 'Processing' || item.status === 'In progress' ? '#FFEB3B' :
                item.status === 'Pending' || item.status === 'Awaiting Launch' ? '#f59e0b' : '#ef4444'
    })) : [
        { name: 'Completed', value: 3730, color: '#10b981' },
        { name: 'Processing', value: 352, color: '#FFEB3B' },
        { name: 'Pending', value: 50, color: '#f59e0b' },
    ];

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const completedPercentage = total > 0 ? Math.round((data.find(d => d.name === 'Completed')?.value || 0) / total * 100) : 0;
    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 border border-white/5 h-full flex flex-col hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <PieChartIcon size={16} className="text-primary" />
                    Status Distribution
                </h3>
            </div>

            <div className="flex items-center justify-center flex-1">
                <div className="relative w-full h-50">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <span className="text-2xl font-bold text-white">{completedPercentage}%</span>
                        <p className="text-[10px] text-slate-400">Success</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RecentOrdersTable() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadOrders = async () => {
            try {
                const data = await api.getOrders({ status: '', service: '', link: '' }, false, 1, 10);
                
                // Filter out sub-orders (only show parent orders and standard orders)
                const parentOrders = (data.orders || []).filter((order: any) => !order.parent_order_id);
                
                const formattedOrders = parentOrders.slice(0, 4).map((order: any) => ({
                    id: order.id,
                    service: order.service_name || 'Service',
                    quantity: order.quantity?.toLocaleString() || '0',
                    status: order.status,
                    time: getTimeAgo(order.created_at),
                    icon: getPlatformIcon(order.service_name),
                    platform: getPlatform(order.service_name)
                }));
                setOrders(formattedOrders);
            } catch (error) {
                console.error('Failed to load orders:', error);
            } finally {
                setLoading(false);
            }
        };
        loadOrders();
    }, []);

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        return `${Math.floor(diff / 86400)} days ago`;
    };

    const getPlatform = (serviceName: string) => {
        const name = serviceName?.toLowerCase() || '';
        if (name.includes('instagram')) return 'instagram';
        if (name.includes('tiktok')) return 'tiktok';
        return 'other';
    };

    const getPlatformIcon = (serviceName: string) => {
        const platform = getPlatform(serviceName);
        if (platform === 'instagram') return '/logo_instagram.png';
        if (platform === 'tiktok') return '/logo_tiktok.png';
        return '/logo.png';
    };

    if (loading) {
        return (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 border border-white/5 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/5 h-full flex flex-col hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Recent Orders</h2>
                <button className="text-primary text-sm font-semibold hover:text-lime-400 transition-colors flex items-center gap-1">
                    View All
                    <ArrowUpRight size={14} />
                </button>
            </div>

            <div className="space-y-3">
                {orders.map((order, i) => (
                    <div
                        key={i}
                        className="group flex items-center justify-between p-4 rounded-xl bg-white/2 hover:bg-white/6 transition-all cursor-pointer border border-white/5 hover:border-white/10"
                    >
                        {/* Left Section: Icon & Name */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                order.platform === 'instagram' && "bg-linear-to-br from-purple-500 to-pink-500",
                                order.platform === 'tiktok' && "bg-black",
                                order.platform === 'other' && "bg-linear-to-br from-primary to-lime-400"
                            )}>
                                <img
                                    src={order.icon}
                                    alt={order.platform}
                                    className="w-6 h-6 object-contain"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-semibold text-sm truncate">{order.service}</div>
                                <div className="text-slate-500 text-xs">#{order.id}</div>
                            </div>
                        </div>

                        {/* Middle Sections */}
                        <div className="text-white font-bold text-sm w-20 text-right hidden md:block">
                            {order.quantity}
                        </div>

                        <div className="w-28 justify-end hidden lg:flex">
                            <span className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold",
                                order.status === 'In progress' && "bg-primary/10 text-primary",
                                order.status === 'Processing' && "bg-primary/10 text-primary",
                                order.status === 'Completed' && "bg-emerald-500/10 text-emerald-400",
                                order.status === 'Pending' && "bg-orange-500/10 text-orange-400",
                            )}>
                                {order.status}
                            </span>
                        </div>

                        <div className="text-slate-400 text-xs w-20 text-right hidden sm:block">
                            {order.time}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TopServicesChart() {
    const [data, setData] = useState<ServiceData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTopServices = async () => {
            try {
                const ordersData = await api.getOrders({ status: '', service: '', link: '' }, false, 1, 500);
                const serviceCounts: Record<string, number> = {};

                (ordersData.orders || []).forEach((order: any) => {
                    const serviceName = order.service_name || 'Other';
                    serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
                });

                const topServices = Object.entries(serviceCounts)
                    .map(([name, value]) => ({ name: name.split(' ')[0], value }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5);

                setData(topServices);
            } catch (error) {
                console.error('Failed to load top services:', error);
                setData([
                    { name: 'Likes', value: 650 },
                    { name: 'Views', value: 640 },
                    { name: 'Saves', value: 630 },
                    { name: 'Shares', value: 580 },
                    { name: 'Follows', value: 500 },
                ]);
            } finally {
                setLoading(false);
            }
        };
        loadTopServices();
    }, []);

    if (loading) {
        return (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/5 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/5 h-full flex flex-col hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <BarChart2 size={20} className="text-primary" />
                    Top Services
                </h3>
            </div>

            <div className="flex-1 w-full min-h-62.5">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barGap={8}>
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            dx={-10}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 8 }}
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                padding: '8px 12px',
                                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)'
                            }}
                            labelStyle={{ color: '#fff', fontWeight: 600, marginBottom: '4px' }}
                            itemStyle={{ color: '#bef264', fontSize: '13px' }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
                            {data.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={index === 0 ? '#bef264' : `rgba(190, 242, 100, ${0.7 - index * 0.15})`}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function Overview() {
    const { user } = useAuth();
    const { on, off, isConnected } = useWebSocket();

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [balances, setBalances] = useState<ProviderBalance[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const statsData = await api.getDashboardStats();
            setStats(statsData);

            // Load all provider balances in one call
            try {
                const balancesData = await api.getAllProviderBalances();
                setBalances(balancesData.balances || []);
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

    useEffect(() => {
        fetchData();
    }, []);

    // WebSocket listeners for real-time dashboard updates
    useEffect(() => {
        if (!isConnected) return;

        const handleOrderCreated = (data: any) => {
            console.log('📊 Dashboard: Order created, refreshing stats');
            fetchData();
        };

        const handleOrderUpdated = (data: any) => {
            console.log('📊 Dashboard: Order updated, refreshing stats');
            fetchData();
        };

        const handleBalanceLow = (data: any) => {
            console.log('⚠️ Dashboard: Low balance detected, refreshing balances');
            fetchData();
        };

        on('order:created', handleOrderCreated);
        on('order:updated', handleOrderUpdated);
        on('balance:low', handleBalanceLow);

        return () => {
            off('order:created', handleOrderCreated);
            off('order:updated', handleOrderUpdated);
            off('balance:low', handleBalanceLow);
        };
    }, [isConnected, on, off]);

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
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-slate-400">
                    Welcome back, {(user as any)?.name || 'User'}
                </h1>
                <p className="text-slate-400 mt-1">Here is what's happening with your store today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    label="Solde Total Disponible"
                    value={`${balances.reduce((sum, b) => sum + (b.balance || 0), 0).toFixed(2)} USD`}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-87.5">
                <div className="lg:col-span-2 h-full">
                    <TrendChart />
                </div>
                <div className="h-full">
                    <StatusDistributionChart data={stats?.status_distribution} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <RecentOrdersTable />
                </div>
                <div className="h-100">
                    <TopServicesChart />
                </div>
            </div>
        </div>
    )
}