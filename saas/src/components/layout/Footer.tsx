import { Crown } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="w-full mt-auto relative z-10 border-t border-black/40 bg-black/20 backdrop-blur-sm">
            <div className="max-w-[1200px] mx-auto px-6 py-12 flex flex-col gap-12">

                {/* Top Row: Logo, Center Badge, Support Email */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">

                    {/* Logo */}
                    <div className="flex flex-col items-center">
                        <Crown className="w-6 h-6 text-brand-primary mb-[-4px]" />
                        <span className="text-xl font-black text-brand-primary italic tracking-tighter">BROREPS</span>
                    </div>

                    {/* Center Beta Badge */}
                    <div className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-brand-primary/30 bg-black/40 backdrop-blur-sm shadow-[0_0_20px_rgba(0,163,54,0.15)]">
                        <svg className="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-xs sm:text-sm font-bold text-brand-primary tracking-widest uppercase">Version Bêta - En cours de développement</span>
                        <svg className="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>

                    {/* Support Email */}
                    <a href="mailto:support@broreps.fr" className="px-5 py-2 rounded-full border border-border bg-surface text-sm font-medium text-text-dimmed hover:text-white hover:bg-surface-hover transition-all">
                        support@broreps.fr
                    </a>

                </div>

                {/* Bottom Row / Copyright */}
                <div className="pt-8 border-t border-border/50 flex flex-col items-center gap-2">
                    <p className="text-xs text-text-dimmed">© 2025 BroSociety. Tous droits réservés.</p>
                    <p className="text-xs text-text-dimmed">Made with precision & excellence</p>
                </div>

            </div>
        </footer>
    );
}
