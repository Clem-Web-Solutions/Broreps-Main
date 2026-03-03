import { useState } from 'react';
import { User, Settings, LogOut, Zap } from 'lucide-react';
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
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-center w-full">
            <div className="w-full h-[64px] px-6 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between shadow-sm">

                {/* Left: Logo */}
                <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/dashboard')}>
                    <img src="/logo.png" alt="BroReps Logo" className="h-[28px] object-contain drop-shadow-sm" />
                    <span className="ml-3 font-semibold text-white text-[15px] hidden sm:block tracking-tight">BroReps<span className="text-[#00A336]">.</span></span>
                </div>

                {/* Center Nav */}
                <nav className="hidden md:flex items-center justify-center gap-1">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `group flex items-center px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${isActive
                                ? 'bg-[#00A336]/10 text-[#00A336]'
                                : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                            }`
                        }
                    >
                        Tableau de bord
                    </NavLink>
                    <NavLink
                        to="/notes"
                        className={({ isActive }) =>
                            `group flex items-center px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${isActive
                                ? 'bg-[#00A336]/10 text-[#00A336]'
                                : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                            }`
                        }
                    >
                        Mes Notes
                    </NavLink>
                </nav>

                {/* Right Section */}
                <div className="flex items-center justify-end gap-3">

                    {/* Command Menu Button */}
                    <button className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#A1A1AA] hover:text-white transition-colors" title="Rechercher (Cmd+K)" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'k', 'metaKey': true }))}>
                        <SearchIcon className="w-4 h-4" />
                    </button>

                    {/* Premium Badge */}
                    {user?.subscription_status === 'active' && (
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00A336]/10 border border-[#00A336]/30 text-[#00A336]">
                            <Zap className="w-3.5 h-3.5 fill-[#00A336] text-[#00A336]" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Premium</span>
                        </div>
                    )}

                    {/* User Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
                        >
                            <span className="text-[13px] font-medium">Profil</span>
                            <div className="w-5 h-5 rounded-full bg-[#111111] flex items-center justify-center group-hover:bg-[#222] transition-colors">
                                <ArrowRightIcon className="w-3 h-3 text-white" />
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
                                        className="absolute top-[calc(100%+12px)] right-0 w-[220px] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-xl overflow-hidden py-1.5 z-50 p-1"
                                    >
                                        <div className="px-3 py-2.5 mb-1 border-b border-white/5">
                                            <p className="text-[13px] font-medium text-white truncate">{user?.name || 'Utilisateur'}</p>
                                            <p className="text-[11px] text-[#A1A1AA] font-medium mt-0.5 truncate">{user?.email || 'user@example.com'}</p>
                                        </div>
                                        <button onClick={() => { setIsDropdownOpen(false); navigate('/profile'); }} className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#A1A1AA] hover:bg-white/5 hover:text-white rounded-xl flex items-center gap-3 cursor-pointer transition-colors mb-0.5">
                                            <User className="w-4 h-4" /> Mon Profil
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
        </header>
    );
}

function SearchIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    )
}

function ArrowRightIcon(props: any) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}