import { useState } from 'react';
import { User, Settings, LogOut, Zap, Search } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[#000000]/80 backdrop-blur-2xl border-b border-white/[0.08]">
            {/* The top gradient highlight */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="max-w-[1240px] mx-auto w-full h-[60px] px-6 flex items-center justify-between">

                <div className="flex items-center gap-8 h-full">
                    {/* Logo */}
                    <div className="flex items-center cursor-pointer group h-full" onClick={() => navigate('/dashboard')}>
                        <img src="/logo.png" alt="BroReps Logo" className="h-[24px] object-contain drop-shadow-sm group-hover:opacity-80 transition-opacity" />
                        <span className="ml-2.5 font-bold text-white text-[15px] hidden sm:block tracking-tight group-hover:text-white/80 transition-colors">BroReps<span className="text-[#00A336]">.</span></span>
                    </div>

                    {/* Nav Links */}
                    <nav className="hidden md:flex items-center gap-6 h-full">
                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) =>
                                `h-full flex items-center relative text-[13px] font-medium transition-colors ${isActive
                                    ? 'text-white'
                                    : 'text-[#A1A1AA] hover:text-white'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    Tableau de bord
                                    {isActive && (
                                        <motion.div layoutId="nav-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full" />
                                    )}
                                </>
                            )}
                        </NavLink>
                        <NavLink
                            to="/notes"
                            className={({ isActive }) =>
                                `h-full flex items-center relative text-[13px] font-medium transition-colors ${isActive
                                    ? 'text-white'
                                    : 'text-[#A1A1AA] hover:text-white'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    Mes Notes
                                    {isActive && (
                                        <motion.div layoutId="nav-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    </nav>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    {/* Command Search */}
                    <button
                        className="hidden sm:flex items-center gap-2 px-3 h-[32px] rounded-md bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 text-[#A1A1AA] hover:text-white transition-all group shadow-sm"
                        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'k', 'metaKey': true }))}
                    >
                        <Search className="w-3.5 h-3.5" />
                        <span className="text-[12px] font-medium mr-2">Rechercher...</span>
                        <kbd className="hidden lg:inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-semibold bg-white/10 text-white/60 rounded-sm">⌘K</kbd>
                    </button>

                    <div className="w-[1px] h-4 bg-white/10 hidden sm:block mx-1" />

                    {/* Premium Badge */}
                    {user?.subscription_status === 'active' && (
                        <div className="hidden sm:flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 fill-[#00A336] text-[#00A336]" />
                            <span className="text-[#00A336] text-[12px] font-bold tracking-wide uppercase">Pro</span>
                        </div>
                    )}

                    {/* User Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 p-[1px] hover:scale-105 transition-transform"
                        >
                            <div className="w-full h-full bg-[#050505] rounded-full flex items-center justify-center border border-white/10">
                                <User className="w-4 h-4 text-white/80" />
                            </div>
                        </button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="absolute top-[calc(100%+8px)] right-0 w-[240px] bg-[#111111] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50"
                                    >
                                        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                                            <p className="text-[14px] font-semibold text-white truncate">{user?.name || 'Utilisateur'}</p>
                                            <p className="text-[12px] text-[#A1A1AA] font-medium mt-0.5 truncate">{user?.email || 'user@example.com'}</p>
                                        </div>
                                        <div className="p-1">
                                            <button onClick={() => { setIsDropdownOpen(false); navigate('/profile'); }} className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#A1A1AA] hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
                                                <User className="w-4 h-4 text-white/60" /> Mon Profil
                                            </button>
                                            <button onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }} className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#A1A1AA] hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
                                                <Settings className="w-4 h-4 text-white/60" /> Paramètres
                                            </button>
                                        </div>
                                        <div className="w-full h-[1px] bg-white/5" />
                                        <div className="p-1">
                                            <button onClick={() => { setIsDropdownOpen(false); handleLogout(); }} className="w-full text-left px-3 py-2 text-[13px] font-medium text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
                                                <LogOut className="w-4 h-4 text-red-500/80" /> Se déconnecter
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </header>
    );
}