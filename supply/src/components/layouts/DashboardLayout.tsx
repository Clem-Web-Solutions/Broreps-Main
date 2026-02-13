import { Bell, Clock, FileText, LayoutDashboard, LogOut, Package, RefreshCcw, Search, Settings, Shield, ShoppingCart, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../libs/utils';

const mainNav = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
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
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const location = useLocation();
    const { isAdmin } = useAuth();

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
        <div className="min-h-screen bg-background text-white selection:bg-primary selection:text-black font-sans h-screen flex flex-col">
            <header className="flex items-center justify-between px-8 py-5">
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="BroReps Supply" className="h-10 w-auto object-contain" />
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
                    <button className="p-2 relative text-slate-400 hover:text-white transition-colors">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="h-8 w-8 bg-surface rounded-full border border-white/10 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:border-primary/50 transition-colors"
                        >
                            {getInitials(user?.name)}
                        </button>

                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-[#0f1f35] border border-[#7FFF00]/20 rounded-lg shadow-xl z-50">
                                <div className="p-3 border-b border-white/10">
                                    <p className="text-sm font-medium text-white">{user?.name}</p>
                                    <p className="text-xs text-slate-400">{user?.email}</p>
                                    {user?.role === 'admin' && (
                                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-[#7FFF00]/10 text-[#7FFF00] rounded">
                                            Admin
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <LogOut size={16} />
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <nav className="w-64 hidden lg:flex flex-col border-r border-white/5 p-6 h-[calc(100vh-80px)] overflow-y-auto">
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

                    <footer className="mt-auto text-center text-slate-500 text-[10px] py-4 border-t border-white/5">
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
