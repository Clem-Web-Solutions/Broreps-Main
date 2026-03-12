import { Crown } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="w-full mt-auto relative z-10 border-t border-white/[0.05] bg-[#050505] py-16">
            <div className="max-w-[1280px] mx-auto px-6 flex flex-col items-center text-center">

                {/* Logo & Intro */}
                <div className="flex flex-col items-center mb-8">
                    <Crown className="w-8 h-8 text-[#00A336] mb-3 drop-shadow-[0_0_15px_rgba(0,163,54,0.4)]" />
                    <span className="text-2xl font-black text-white tracking-tight leading-none mb-4">BroReps<span className="text-[#00A336]">.</span></span>
                    <p className="text-[#A1A1AA] text-[15px] font-medium max-w-[400px] leading-relaxed">
                        L'écosystème nouvelle génération dédié aux créateurs de contenu qui souhaitent scaler leur visibilité.
                    </p>
                </div>

                {/* Quick Links / Badges */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
                    <div className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/[0.02] border border-white/5 shadow-sm text-sm font-medium text-[#A1A1AA]">
                        <span className="w-2 h-2 rounded-full bg-[#00A336] animate-pulse" />
                        V1
                    </div>

                    <a href="mailto:contact@broreps.fr" className="px-6 py-2 rounded-full bg-white/[0.02] border border-white/5 shadow-sm text-sm font-medium text-[#A1A1AA] hover:text-white hover:bg-white/5 hover:border-white/10 transition-colors">
                        contact@broreps.fr
                    </a>
                </div>

                {/* Bottom Rights */}
                <div className="w-full max-w-[800px] h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent mb-8" />

                <div className="flex flex-col items-center gap-2">
                    <p className="text-[#71717A] text-[13px] font-medium">© 2025 BroReps by BroSociety. Tous droits réservés.</p>
                    <p className="text-[#52525B] text-[12px]">Conçu avec passion pour les créateurs ambitieux.</p>
                </div>

            </div>
        </footer>
    );
}
