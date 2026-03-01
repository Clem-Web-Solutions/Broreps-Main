import { Home, BookOpen, Trophy, User, ChevronDown } from 'lucide-react';
import { NavLink } from 'react-router';

export default function Header() {
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

                    <div className="relative w-[40px] h-[40px] flex items-center justify-center rounded-full bg-[#0A0A0A] border border-[#18181b] hover:bg-[#111] transition-colors cursor-pointer">
                        <User className="w-[18px] h-[18px] text-[#a1a1aa]" strokeWidth={2} />
                        <div className="absolute -bottom-1 -right-1 w-[16px] h-[16px] flex items-center justify-center bg-[#52525b] border-[2px] border-black rounded-full text-[9px] font-bold text-white">
                            0
                        </div>
                    </div>

                    <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-[#0A0A0A] border border-[#18181b] hover:bg-[#111] transition-colors text-[13px] font-bold text-white ml-2">
                        Explorer
                        <ChevronDown className="w-[16px] h-[16px] text-[#a1a1aa]" strokeWidth={3} />
                    </button>
                </div>

            </div>
        </header>
    );
}
