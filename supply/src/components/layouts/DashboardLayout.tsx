import { Clock, CreditCard, FileText, LayoutDashboard, LogOut, Package, RefreshCcw, Search, Settings, Shield, ShoppingCart, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../libs/utils';
import { NotificationBell } from '../notifications/NotificationBell';
import ParticlesBackground from './ParticlesBackground';

const mainNav = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { path: '/paiements', label: 'Paiements', icon: CreditCard, adminOnly: true },
    { path: '/services', label: 'Services', icon: ShoppingCart, adminOnly: false },
    { path: '/commandes', label: 'Commandes', icon: Package, adminOnly: false },
    { path: '/track', label: 'Track', icon: Search, adminOnly: false },
    { path: '/ia', label: 'IA', icon: Sparkles, adminOnly: false },
    { path: '/drip', label: 'Drip', icon: Clock, adminOnly: false },
    { path: '/rapport', label: 'Rapport', icon: FileText, adminOnly: true },
    { path: '/team', label: 'Team', icon: Shield, adminOnly: true },
    { path: '/refill', label: 'Refill', icon: RefreshCcw, adminOnly: true },
];

const bottomNav = [
    { path: '/config', label: 'Config', icon: Settings, adminOnly: true },
]

export function DashboardLayout() {
    const [showDropdown, setShowDropdown] = useState(false);
    const { user, logout, loading, isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            console.log('🔒 Not authenticated, redirecting to login...');
            navigate('/login');
        }
    }, [loading, isAuthenticated, navigate]);

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen bg-background text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-slate-400">Chargement...</p>
                </div>
            </div>
        );
    }

    // Don't render anything if not authenticated (will redirect)
    if (!isAuthenticated) {
        return null;
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = (name: string | undefined) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const NavItem = ({ item }: { item: any }) => {
        const Icon = item.icon;
        // Check if the current path starts with the item's path, but handle root explicitly if needed
        const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');

        return (
            <Link
                to={item.path}
                className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left group",
                    isActive
                        ? "bg-primary text-black font-semibold"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
            >
                <Icon size={20} className={cn("transition-colors", isActive ? "text-black" : "text-slate-500 group-hover:text-white")} />
                <span className="text-sm">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 bg-black rounded-full"></div>}
            </Link>
        )
    }

    const filteredMainNav = mainNav.filter(item => !item.adminOnly || isAdmin);
    const filteredBottomNav = bottomNav.filter(item => !item.adminOnly || isAdmin);

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col relative overflow-hidden text-white font-['Inter','Geist',sans-serif] h-screen">
            {/* Massive Halos (Glows Verts / Nuages) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-black">
                {/* Ambient glow, very subtle */}
                <div className="absolute top-[0%] left-[20%] w-[50%] h-[50%] bg-[#00A336] opacity-[0.06] blur-[150px] rounded-full mix-blend-screen pointer-events-none"></div>
                <div className="absolute bottom-[0%] right-[10%] w-[40%] h-[50%] bg-[#00A336] opacity-[0.04] blur-[150px] rounded-full mix-blend-screen pointer-events-none"></div>

                {/* Stars/Particles ON TOP of the background clouds so they shine clearly */}
                <ParticlesBackground />
            </div>

            <header className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-[#111111]/80 backdrop-blur-xl relative z-10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="BroReps Supply" className="h-10 w-auto object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105" />
                    </div>

                    {/* Search Bar - hidden on mobile */}
                    <div className="hidden md:flex items-center gap-3 bg-surface/50 border border-white/5 rounded-full px-4 py-2 w-96 focus-within:border-primary/50 transition-colors">
                        <Search size={18} className="text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search for orders, services..."
                            className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-full"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <NotificationBell />

                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-3 pl-1 pr-4 py-1 rounded-full bg-[#050505] hover:bg-[#1a1a1a] text-white transition-all border border-white/5 shadow-sm cursor-pointer group"
                        >
                            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-black cursor-pointer group-hover:scale-105 transition-transform duration-300">
                                {getInitials(user?.name)}
                            </div>
                            <span className="text-[13px] font-medium hidden sm:block">Profil</span>
                        </button>

                        {showDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                                <div className="absolute right-0 mt-2 w-[240px] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden py-1.5 z-50 p-1">
                                    <div className="px-3 py-2.5 mb-1 border-b border-white/5 mx-1">
                                        <p className="text-[13px] font-medium text-white truncate">{user?.name}</p>
                                        <p className="text-[11px] text-[#A1A1AA] font-medium mt-0.5 truncate">{user?.email}</p>
                                        {user?.role === 'admin' && (
                                            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] bg-primary/10 text-primary border border-primary/20 uppercase font-bold rounded">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-3 py-2 text-[13px] font-medium text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Sign out
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative z-10">
                <nav className="w-64 hidden lg:flex flex-col border-r border-white/5 p-6 h-[calc(100vh-80px)] overflow-y-auto bg-[#0a0a0a]/50 backdrop-blur-md">
                    <div className="space-y-2">
                        <h4 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">M E N U</h4>
                        {filteredMainNav.map((item) => <NavItem key={item.path} item={item} />)}
                    </div>

                    {filteredBottomNav.length > 0 && (
                        <div className="mt-8 space-y-2">
                            <h4 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">other</h4>
                            {filteredBottomNav.map((item) => <NavItem key={item.path} item={item} />)}
                        </div>
                    )}

                    <div className="mt-auto pt-8">
                    </div>
                </nav>

                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-8xl mx-auto pb-12">
                        <Outlet />
                    </div>

                    <footer className="mt-auto text-center text-slate-500 text-[10px] py-4 border-t border-white/5 bg-[#0a0a0a]/30 backdrop-blur-sm rounded-t-xl mx-4">
                        <div className="flex justify-between px-4">
                            <span>© 2026 BroReps Supply. All rights reserved.</span>
                            <span className="text-orange-500/80">⚠️ Propriété privée</span>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
}
