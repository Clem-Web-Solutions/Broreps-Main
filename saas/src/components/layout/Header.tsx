import { useState } from 'react';
import { User, Settings, LogOut, Zap, Search, ArrowRight, Package } from 'lucide-react';
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
        <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex justify-center w-[calc(100%-32px)] max-w-[900px]">
            <div className="w-full h-[60px] pl-5 pr-2 bg-[#111111]/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-full flex items-center justify-between border border-white/10">

                {/* Left: Logo */}
                <div className="flex items-center cursor-pointer group" onClick={() => navigate('/dashboard')}>
                    <img src="/logo.png" alt="BroReps Logo" className="h-[24px] object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300" />
                    <span className="ml-2.5 font-semibold text-white text-[15px] hidden md:block tracking-tight">BroReps<span className="text-[#00A336]">.</span></span>
                </div>

                {/* Right Section / Nav */}
                <div className="flex items-center gap-1 sm:gap-6">

                    {/* Nav Links */}
                    <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium mr-2">
                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) =>
                                `transition-colors ${isActive
                                    ? 'text-white font-semibold'
                                    : 'text-[#A1A1AA] hover:text-white'
                                }`
                            }
                        >
                            Tableau de bord
                        </NavLink>
                        <NavLink
                            to="/notes"
                            className={({ isActive }) =>
                                `transition-colors ${isActive
                                    ? 'text-white font-semibold'
                                    : 'text-[#A1A1AA] hover:text-white'
                                }`
                            }
                        >
                            Mes Notes
                        </NavLink>
                        <NavLink
                            to="/orders"
                            className={({ isActive }) =>
                                `transition-colors ${isActive
                                    ? 'text-white font-semibold'
                                    : 'text-[#A1A1AA] hover:text-white'
                                }`
                            }
                        >
                            Mes Commandes
                        </NavLink>
                    </nav>

                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Search Button */}
                        <button
                            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-transparent hover:bg-white/5 text-[#A1A1AA] hover:text-white transition-colors"
                            title="Rechercher (Cmd+K)"
                            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'k', 'metaKey': true }))}
                        >
                            <Search className="w-4 h-4" />
                        </button>

                        {/* Premium Badge */}
                        {user?.subscription_status === 'active' && (
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00A336]/10 border border-[#00A336]/30">
                                <Zap className="w-3.5 h-3.5 fill-[#00A336] text-[#00A336]" />
                                <span className="text-[#00A336] text-[10px] font-bold uppercase tracking-wider">Pro</span>
                            </div>
                        )}

                        {/* Profile Dropdown Capsule (Inspired by image CTA) */}
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-full bg-[#050505] hover:bg-[#1a1a1a] text-white transition-all border border-white/5 shadow-sm cursor-pointer group"
                            >
                                <span className="text-[13px] font-medium hidden sm:block">Profil</span>
                                <div className="w-7 h-7 rounded-full bg-[#00A336] flex items-center justify-center text-black group-hover:scale-105 transition-transform duration-300">
                                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                                </div>
                            </button>

                            <AnimatePresence>
                                {isDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="absolute top-[calc(100%+12px)] right-0 w-[240px] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden py-1.5 z-50 p-1"
                                        >
                                            <div className="px-3 py-2.5 mb-1 border-b border-white/5 mx-1">
                                                <p className="text-[13px] font-medium text-white truncate">{user?.name || 'Utilisateur'}</p>
                                                <p className="text-[11px] text-[#A1A1AA] font-medium mt-0.5 truncate">{user?.email || 'user@example.com'}</p>
                                            </div>
                                            <button onClick={() => { setIsDropdownOpen(false); navigate('/profile'); }} className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#A1A1AA] hover:bg-white/5 hover:text-white rounded-xl flex items-center gap-3 cursor-pointer transition-colors mb-0.5">
                                                <User className="w-4 h-4" /> Mon Profil
                                            </button>
                                            <button onClick={() => { setIsDropdownOpen(false); navigate('/orders'); }} className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#A1A1AA] hover:bg-white/5 hover:text-white rounded-xl flex items-center gap-3 cursor-pointer transition-colors mb-0.5">
                                                <Package className="w-4 h-4" /> Mes Commandes
                                            </button>
                                            <button onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }} className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#A1A1AA] hover:bg-white/5 hover:text-white rounded-xl flex items-center gap-3 cursor-pointer transition-colors mb-1">
                                                <Settings className="w-4 h-4" /> Paramètres
                                            </button>
                                            <div className="w-full h-[1px] bg-white/5 my-1" />
                                            <button onClick={() => { setIsDropdownOpen(false); handleLogout(); }} className="w-full text-left px-3 py-2 text-[13px] font-medium text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-xl flex items-center gap-3 cursor-pointer transition-colors">
                                                <LogOut className="w-4 h-4" /> Se déconnecter
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

            </div>
        </header>
    );
}