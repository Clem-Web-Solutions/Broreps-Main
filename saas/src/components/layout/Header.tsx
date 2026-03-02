import { useState, useRef, useEffect } from 'react';
import { Home, BookOpen, Trophy, User, ChevronDown, ChevronUp, Layers, Coins, Settings, ShoppingBag, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router';
import ProfileModal from './ProfileModal';

export default function Header() {
    const navigate = useNavigate();
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);
    const [isExplorerOpen, setIsExplorerOpen] = useState(false);
    const explorerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (explorerRef.current && !explorerRef.current.contains(event.target as Node)) {
                setIsExplorerOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-[#00A336] bg-[linear-gradient(90deg,#052e16_0%,#052e16_75%,#050505_100%)] shadow-[0_4px_45px_rgba(0,163,54,0.15)] relative">

            <div className="max-w-[1400px] mx-auto h-[72px] px-6 flex items-center justify-between relative z-10">

                {/* Logo */}
                <div className="flex items-center cursor-pointer hover:opacity-90 transition-opacity">
                    <img src="/logo.png" alt="BroReps Logo" className="h-[38px] object-contain" />
                </div>

                {/* Center Nav */}
                <nav className="hidden md:flex items-center gap-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-bold transition-all ${isActive
                                ? 'bg-[#042A11] text-[#00FF7F] border border-[#00A336]/20'
                                : 'bg-transparent border border-transparent text-[#a1a1aa] hover:text-white hover:bg-[#111111]'
                            }`
                        }
                    >
                        <Home className="w-[18px] h-[18px]" strokeWidth={2.5} />
                        Dashboard
                    </NavLink>
                    <NavLink
                        to="/notes"
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-bold transition-all ${isActive
                                ? 'bg-[#042A11] text-[#00FF7F] border border-[#00A336]/20'
                                : 'bg-transparent border border-[#111111] text-[#a1a1aa] hover:text-white hover:bg-[#111111]'
                            }`
                        }
                    >
                        <BookOpen className="w-[18px] h-[18px]" strokeWidth={2.5} />
                        Mes Notes
                    </NavLink>
                </nav>

                {/* Right Section */}
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#0A0A0A] border border-[#18181b] text-[#a1a1aa]">
                        <Trophy className="w-[14px] h-[14px]" strokeWidth={2.5} />
                        <span className="text-[13px] font-bold">Niv. 0</span>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-[10px] border border-[#00A336] bg-[#052e16] text-[#00FF7F] shadow-[0_0_20px_rgba(0,163,54,0.3)] mr-2">
                        <div className="w-[5px] h-[5px] rounded-full bg-[#00FF7F] animate-pulse" />
                        <span className="text-[12px] font-black tracking-wider uppercase">PREMIUM</span>
                    </div>

                    <div
                        className="relative w-[40px] h-[40px] flex items-center justify-center rounded-full bg-[#0A0A0A] border border-[#18181b] hover:bg-[#111] transition-colors cursor-pointer"
                        onClick={() => setProfileModalOpen(true)}
                    >
                        <User className="w-[18px] h-[18px] text-[#a1a1aa]" strokeWidth={2} />
                        <div className="absolute -bottom-1 -right-1 w-[16px] h-[16px] flex items-center justify-center bg-[#52525b] border-[2px] border-black rounded-full text-[9px] font-bold text-white">
                            0
                        </div>
                    </div>

                    <div className="relative" ref={explorerRef}>
                        <button
                            onClick={() => setIsExplorerOpen(!isExplorerOpen)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] border transition-colors text-[13px] font-bold ml-2 ${isExplorerOpen
                                ? 'bg-[#052e16] border-[#00A336] text-[#00FF7F]'
                                : 'bg-[#0A0A0A] border-[#18181b] hover:bg-[#111] text-white'
                                }`}
                        >
                            Explorer
                            {isExplorerOpen ? (
                                <ChevronUp className={`w-[16px] h-[16px] ${isExplorerOpen ? 'text-[#00FF7F]' : 'text-[#a1a1aa]'}`} strokeWidth={3} />
                            ) : (
                                <ChevronDown className={`w-[16px] h-[16px] ${isExplorerOpen ? 'text-[#00FF7F]' : 'text-[#a1a1aa]'}`} strokeWidth={3} />
                            )}
                        </button>

                        {/* Explorer Dropdown */}
                        {isExplorerOpen && (
                            <div className="absolute top-full right-0 mt-4 w-[280px] bg-[#0A0A0A] border border-[#18181b] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-4 duration-200">

                                <div className="space-y-1">
                                    <button
                                        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-[#111] transition-colors group"
                                        onClick={() => {
                                            setIsExplorerOpen(false);
                                            navigate('/resources');
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-[#18181b] flex items-center justify-center text-[#a1a1aa] group-hover:text-white transition-colors">
                                            <Layers className="w-5 h-5" strokeWidth={2} />
                                        </div>
                                        <span className="text-white text-[14px] font-bold">Mes ressources</span>
                                    </button>

                                    <div className="w-full flex items-center justify-between gap-4 p-3 rounded-xl opacity-50 cursor-not-allowed">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-[#18181b] flex items-center justify-center text-[#52525b]">
                                                <Coins className="w-5 h-5" strokeWidth={2} />
                                            </div>
                                            <span className="text-[#52525b] text-[14px] font-bold">Mes Coins</span>
                                        </div>
                                        <span className="text-[9px] font-black tracking-wider uppercase px-2 py-1 rounded bg-[#18181b] text-[#71717a]">Bientôt</span>
                                    </div>

                                    <div className="w-full flex items-center justify-between gap-4 p-3 rounded-xl opacity-50 cursor-not-allowed">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-[#18181b] flex items-center justify-center text-[#52525b]">
                                                <Trophy className="w-5 h-5" strokeWidth={2} />
                                            </div>
                                            <span className="text-[#52525b] text-[14px] font-bold">Classement</span>
                                        </div>
                                        <span className="text-[9px] font-black tracking-wider uppercase px-2 py-1 rounded bg-[#18181b] text-[#71717a]">Bientôt</span>
                                    </div>

                                    <button
                                        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-[#111] transition-colors group"
                                        onClick={() => {
                                            setIsExplorerOpen(false);
                                            navigate('/profile');
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-[#18181b] flex items-center justify-center text-[#a1a1aa] group-hover:text-white transition-colors">
                                            <User className="w-5 h-5" strokeWidth={2} />
                                        </div>
                                        <span className="text-white text-[14px] font-bold">Mon profil</span>
                                    </button>

                                    <button
                                        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-[#111] transition-colors group"
                                        onClick={() => {
                                            setIsExplorerOpen(false);
                                            navigate('/settings');
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-[#18181b] flex items-center justify-center text-[#a1a1aa] group-hover:text-white transition-colors">
                                            <Settings className="w-5 h-5" strokeWidth={2} />
                                        </div>
                                        <span className="text-white text-[14px] font-bold">Paramètres</span>
                                    </button>

                                    <div className="w-full flex items-center justify-between gap-4 p-3 rounded-xl opacity-50 cursor-not-allowed mb-2">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-[#18181b] flex items-center justify-center text-[#52525b]">
                                                <ShoppingBag className="w-5 h-5" strokeWidth={2} />
                                            </div>
                                            <span className="text-[#52525b] text-[14px] font-bold">Boutique</span>
                                        </div>
                                        <span className="text-[9px] font-black tracking-wider uppercase px-2 py-1 rounded bg-[#18181b] text-[#71717a]">Bientôt</span>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-[#18181b] mx-3 my-2" />

                                <button className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-[#201010] transition-colors group">
                                    <div className="w-10 h-10 rounded-lg bg-[#201010] flex items-center justify-center text-[#ef4444] group-hover:scale-110 transition-transform">
                                        <LogOut className="w-5 h-5" strokeWidth={2.5} />
                                    </div>
                                    <span className="text-[#ef4444] text-[14px] font-bold">Déconnexion</span>
                                </button>

                            </div>
                        )}
                    </div>
                </div>

            </div>

            <ProfileModal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} />
        </header>
    );
}
