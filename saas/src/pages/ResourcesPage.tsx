import { useNavigate } from 'react-router';
import { ArrowLeft, Layers, Sparkles, Target, Users, Zap, FileText, Smartphone, LayoutTemplate, Gift } from 'lucide-react';

export default function ResourcesPage() {
    const navigate = useNavigate();

    return (
        <div className="animate-in fade-in duration-500 pb-20">

            {/* Top Header */}
            <div className="flex items-center absolute top-0 mt-6 lg:mt-0 lg:relative z-10 w-full mb-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-[#a1a1aa] hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Dashboard
                </button>
            </div>

            <div className="relative">
                {/* Title Section */}
                <div className="flex flex-col items-center mb-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#00A336] flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,163,54,0.3)]">
                        <Layers className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-[32px] md:text-[40px] font-black text-white mb-3 tracking-tight">Mes Ressources Premium</h1>
                    <p className="text-[#a1a1aa] font-medium text-[15px] max-w-lg">
                        Accède rapidement à toutes tes ressources actives et à tes bonus.
                    </p>
                </div>

                {/* Section Ressources Débloquées */}
                <div className="mb-12">
                    <div className="flex items-center gap-2.5 mb-6">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00FF7F] shadow-[0_0_8px_rgba(0,255,127,0.8)]" />
                        <h2 className="text-white text-xl font-bold">Ressources débloquées (6)</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Carte 1 */}
                        <div className="bg-[#050505]/80 backdrop-blur-xl border border-[#18181b] rounded-2xl p-6 hover:border-[#3f3f46] transition-colors flex flex-col justify-between h-full group">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-[#0A0A0A] border border-[#18181b] flex items-center justify-center text-[#00A336] group-hover:scale-110 group-hover:border-[#00A336]/30 group-hover:bg-[#052e16] transition-all">
                                    <Sparkles className="w-6 h-6" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-white font-bold text-[15px]">Bienvenue dans ton Écosystème</h3>
                                        <span className="bg-[#052e16] border border-[#00A336]/30 text-[#00FF7F] text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase">Actif</span>
                                    </div>
                                    <p className="text-[#a1a1aa] text-[13px] font-medium">Message de bienvenue + Introduction à l'abonnement</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/module/1')}
                                className="w-full bg-[#0A0A0A] hover:bg-[#111] border border-[#18181b] hover:border-[#3f3f46] text-white font-bold text-[14px] py-3 rounded-xl transition-all"
                            >
                                Découvrir
                            </button>
                        </div>

                        {/* Carte 2 */}
                        <div className="bg-[#050505]/80 backdrop-blur-xl border border-[#18181b] rounded-2xl p-6 hover:border-[#3f3f46] transition-colors flex flex-col justify-between h-full group">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6] group-hover:scale-110 group-hover:border-[#3b82f6]/40 group-hover:bg-[#3b82f6]/20 transition-all">
                                    <Target className="w-6 h-6" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-white font-bold text-[15px]">Boost multi-plateformes : deviens incontournable</h3>
                                        <span className="bg-[#052e16] border border-[#00A336]/30 text-[#00FF7F] text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase">Actif</span>
                                    </div>
                                    <p className="text-[#a1a1aa] text-[13px] font-medium">Transition vers un niveau supérieur</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/module/2')}
                                className="w-full bg-[#0A0A0A] hover:bg-[#111] border border-[#18181b] hover:border-[#3f3f46] text-white font-bold text-[14px] py-3 rounded-xl transition-all"
                            >
                                Découvrir
                            </button>
                        </div>

                        {/* Carte 3 */}
                        <div className="bg-[#050505]/80 backdrop-blur-xl border border-[#18181b] rounded-2xl p-6 hover:border-[#3f3f46] transition-colors flex flex-col justify-between h-full group">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center text-[#8b5cf6] group-hover:scale-110 group-hover:border-[#8b5cf6]/40 group-hover:bg-[#8b5cf6]/20 transition-all">
                                    <Target className="w-6 h-6" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-white font-bold text-[15px]">Module 3</h3>
                                        <span className="bg-[#052e16] border border-[#00A336]/30 text-[#00FF7F] text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase">Actif</span>
                                    </div>
                                    <p className="text-[#a1a1aa] text-[13px] font-medium">Contenu exclusif à venir</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/module/3')}
                                className="w-full bg-[#0A0A0A] hover:bg-[#111] border border-[#18181b] hover:border-[#3f3f46] text-white font-bold text-[14px] py-3 rounded-xl transition-all"
                            >
                                Découvrir
                            </button>
                        </div>

                        {/* Carte 4 */}
                        <div className="bg-[#050505]/80 backdrop-blur-xl border border-[#18181b] rounded-2xl p-6 hover:border-[#3f3f46] transition-colors flex flex-col justify-between h-full group">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] group-hover:scale-110 group-hover:border-[#f59e0b]/40 group-hover:bg-[#f59e0b]/20 transition-all">
                                    <Target className="w-6 h-6" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-white font-bold text-[15px]">Module 4</h3>
                                        <span className="bg-[#052e16] border border-[#00A336]/30 text-[#00FF7F] text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase">Actif</span>
                                    </div>
                                    <p className="text-[#a1a1aa] text-[13px] font-medium">Contenu exclusif à venir</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/module/4')}
                                className="w-full bg-[#0A0A0A] hover:bg-[#111] border border-[#18181b] hover:border-[#3f3f46] text-white font-bold text-[14px] py-3 rounded-xl transition-all"
                            >
                                Découvrir
                            </button>
                        </div>

                        {/* Carte 5 */}
                        <div className="bg-[#050505]/80 backdrop-blur-xl border border-[#18181b] rounded-2xl p-6 hover:border-[#3f3f46] transition-colors flex flex-col justify-between h-full group">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-[#ec4899]/10 border border-[#ec4899]/20 flex items-center justify-center text-[#ec4899] group-hover:scale-110 group-hover:border-[#ec4899]/40 group-hover:bg-[#ec4899]/20 transition-all">
                                    <Users className="w-6 h-6" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-white font-bold text-[15px]">Module 5</h3>
                                        <span className="bg-[#052e16] border border-[#00A336]/30 text-[#00FF7F] text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase">Actif</span>
                                    </div>
                                    <p className="text-[#a1a1aa] text-[13px] font-medium">Contenu exclusif à venir</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/module/5')}
                                className="w-full bg-[#0A0A0A] hover:bg-[#111] border border-[#18181b] hover:border-[#3f3f46] text-white font-bold text-[14px] py-3 rounded-xl transition-all"
                            >
                                Découvrir
                            </button>
                        </div>

                        {/* Carte 6 */}
                        <div className="bg-[#050505]/80 backdrop-blur-xl border border-[#18181b] rounded-2xl p-6 hover:border-[#3f3f46] transition-colors flex flex-col justify-between h-full group">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center text-[#ef4444] group-hover:scale-110 group-hover:border-[#ef4444]/40 group-hover:bg-[#ef4444]/20 transition-all">
                                    <Zap className="w-6 h-6" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-white font-bold text-[15px]">Module 6</h3>
                                        <span className="bg-[#052e16] border border-[#00A336]/30 text-[#00FF7F] text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase">Actif</span>
                                    </div>
                                    <p className="text-[#a1a1aa] text-[13px] font-medium">Contenu exclusif à venir</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/module/6')}
                                className="w-full bg-[#0A0A0A] hover:bg-[#111] border border-[#18181b] hover:border-[#3f3f46] text-white font-bold text-[14px] py-3 rounded-xl transition-all"
                            >
                                Découvrir
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section Récompenses & Ressources */}
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Gift className="w-6 h-6 text-white" strokeWidth={2.5} />
                        <h2 className="text-white text-xl font-bold">Récompenses & Ressources</h2>
                    </div>
                    <div className="flex items-center gap-2 mb-6 opacity-70">
                        <span className="text-[#eab308] text-sm">⚠️</span>
                        <p className="text-[#a1a1aa] text-[13px] italic font-medium">Ces ressources sont des EXEMPLES TEMPORAIRES. Les versions finales seront ajoutées prochainement.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* Fake Resource 1 */}
                        <div className="bg-[#050505]/40 backdrop-blur-xl border border-[#18181b] rounded-2xl p-5 flex flex-col justify-between h-full opacity-60">
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] border border-[#18181b] flex items-center justify-center text-[#10b981]">
                                    <FileText className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <h3 className="text-[#71717a] font-bold text-[14px]">Pack PDF BroReps – Méthodes de Croissance 2025</h3>
                                        <span className="bg-[#27272a]/40 border border-[#3f3f46]/40 text-[#a1a1aa] text-[8px] font-black px-2 py-0.5 rounded tracking-wider uppercase">Exemple Temporaire</span>
                                    </div>
                                    <p className="text-[#52525b] text-[12px] font-medium">Un guide complet regroupant techniques et analyses.</p>
                                </div>
                            </div>
                            <button className="w-full bg-[#0A0A0A]/50 border border-[#18181b] text-[#52525b] font-bold text-[13px] py-2.5 rounded-xl cursor-not-allowed">
                                Bientôt disponible
                            </button>
                        </div>

                        {/* Fake Resource 2 */}
                        <div className="bg-[#050505]/40 backdrop-blur-xl border border-[#18181b] rounded-2xl p-5 flex flex-col justify-between h-full opacity-60">
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] border border-[#18181b] flex items-center justify-center text-[#14b8a6]">
                                    <Smartphone className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <h3 className="text-[#71717a] font-bold text-[14px]">Mini-ebook 'Algorithme TikTok expliqué'</h3>
                                        <span className="bg-[#27272a]/40 border border-[#3f3f46]/40 text-[#a1a1aa] text-[8px] font-black px-2 py-0.5 rounded tracking-wider uppercase">Exemple Temporaire</span>
                                    </div>
                                    <p className="text-[#52525b] text-[12px] font-medium">Comprendre et exploiter l'algorithme sans jargon.</p>
                                </div>
                            </div>
                            <button className="w-full bg-[#0A0A0A]/50 border border-[#18181b] text-[#52525b] font-bold text-[13px] py-2.5 rounded-xl cursor-not-allowed">
                                Bientôt disponible
                            </button>
                        </div>

                        {/* Fake Resource 3 */}
                        <div className="bg-[#050505]/40 backdrop-blur-xl border border-[#18181b] rounded-2xl p-5 flex flex-col justify-between h-full opacity-60">
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] border border-[#18181b] flex items-center justify-center text-[#2dd4bf]">
                                    <LayoutTemplate className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <h3 className="text-[#71717a] font-bold text-[14px]">Templates Premium</h3>
                                        <span className="bg-[#27272a]/40 border border-[#3f3f46]/40 text-[#a1a1aa] text-[8px] font-black px-2 py-0.5 rounded tracking-wider uppercase">Exemple Temporaire</span>
                                    </div>
                                    <p className="text-[#52525b] text-[12px] font-medium">Scripts, hooks, idées de vidéos prêtes à l'emploi.</p>
                                </div>
                            </div>
                            <button className="w-full bg-[#0A0A0A]/50 border border-[#18181b] text-[#52525b] font-bold text-[13px] py-2.5 rounded-xl cursor-not-allowed">
                                Bientôt disponible
                            </button>
                        </div>

                        {/* Fake Resource 4 */}
                        <div className="bg-[#050505]/40 backdrop-blur-xl border border-[#18181b] rounded-2xl p-5 flex flex-col justify-between h-full opacity-60">
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] border border-[#18181b] flex items-center justify-center text-[#10b981]">
                                    <Sparkles className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <h3 className="text-[#71717a] font-bold text-[14px]">Accès beta aux futurs outils</h3>
                                        <span className="bg-[#27272a]/40 border border-[#3f3f46]/40 text-[#a1a1aa] text-[8px] font-black px-2 py-0.5 rounded tracking-wider uppercase">Exemple Temporaire</span>
                                    </div>
                                    <p className="text-[#52525b] text-[12px] font-medium">Essai anticipé des fonctionnalités en développement.</p>
                                </div>
                            </div>
                            <button className="w-full bg-[#0A0A0A]/50 border border-[#18181b] text-[#52525b] font-bold text-[13px] py-2.5 rounded-xl cursor-not-allowed">
                                Bientôt disponible
                            </button>
                        </div>

                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 mt-16 text-[#52525b] text-[12px] font-medium border-t border-[#18181b] pt-8">
                    <Sparkles className="w-4 h-4" />
                    Ressources & Bonus / BroReps Premium
                </div>

            </div>
        </div>
    );
}
