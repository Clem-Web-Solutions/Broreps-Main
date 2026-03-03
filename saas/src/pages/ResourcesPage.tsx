import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Layers, Sparkles, Target, Users, Zap, FileText, Smartphone, LayoutTemplate, Gift, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { modulesApi, type ModuleProgress } from '../lib/api';

// ─── Static module metadata ────────────────────────────────────────────────────
const MODULE_META = [
    {
        id: 1,
        title: "Bienvenue dans ton Écosystème",
        description: "Message de bienvenue + Introduction à l'abonnement",
        icon: Sparkles,
        color: 'text-white/80',
    },
    {
        id: 2,
        title: "Boost multi-plateformes : deviens incontournable",
        description: "Transition vers un niveau supérieur",
        icon: Target,
        color: 'text-[#3b82f6]',
    },
    {
        id: 3,
        title: "Module 3",
        description: "Contenu exclusif à venir",
        icon: Target,
        color: 'text-[#8b5cf6]',
    },
    {
        id: 4,
        title: "Module 4",
        description: "Contenu exclusif à venir",
        icon: Target,
        color: 'text-[#f59e0b]',
    },
    {
        id: 5,
        title: "Module 5",
        description: "Contenu exclusif à venir",
        icon: Users,
        color: 'text-[#ec4899]',
    },
    {
        id: 6,
        title: "Module 6",
        description: "Contenu exclusif à venir",
        icon: Zap,
        color: 'text-[#ef4444]',
    },
];

export default function ResourcesPage() {
    const navigate = useNavigate();
    const [modules, setModules] = useState<ModuleProgress[]>([]);
    const [unlockedCount, setUnlockedCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        modulesApi.list()
            .then(({ modules: m, modules_unlocked }) => {
                setModules(m);
                setUnlockedCount(modules_unlocked);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

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
                    <div className="w-16 h-16 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-sm">
                        <Layers className="w-8 h-8 text-white/80" strokeWidth={2} />
                    </div>
                    <h1 className="text-[32px] md:text-[40px] font-semibold text-white mb-3 tracking-tight">Mes Ressources Premium</h1>
                    <p className="text-[#a1a1aa] font-medium text-[15px] max-w-lg">
                        Accède rapidement à toutes tes ressources actives et à tes bonus.
                    </p>
                </div>

                {/* Section Ressources Débloquées */}
                <div className="mb-12">
                    <div className="flex items-center gap-2.5 mb-6">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00FF7F] shadow-[0_0_8px_rgba(0,255,127,0.8)]" />
                        <h2 className="text-white text-xl font-bold">
                            Ressources débloquées ({loading ? '…' : unlockedCount})
                        </h2>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-[#a1a1aa] gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-[14px]">Chargement de tes modules…</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {MODULE_META.map(meta => {
                                const progress = modules.find(m => m.id === meta.id);
                                const isUnlocked = progress?.unlocked ?? false;
                                const isCompleted = progress?.completed ?? false;
                                const pct = progress?.progress_pct ?? 0;
                                const Icon = meta.icon;

                                return (
                                    <div
                                        key={meta.id}
                                        className={`bg-[#09090b] border rounded-2xl p-6 flex flex-col justify-between h-full group shadow-sm transition-colors ${
                                            isUnlocked
                                                ? 'border-white/5 hover:border-white/10'
                                                : 'border-white/5 opacity-50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${isUnlocked ? `${meta.color} group-hover:scale-105 transition-all` : 'text-white/20'}`}>
                                                {isUnlocked
                                                    ? <Icon className="w-6 h-6" strokeWidth={2} />
                                                    : <Lock className="w-5 h-5" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="text-white font-semibold text-[15px]">{meta.title}</h3>
                                                    {isUnlocked && (
                                                        isCompleted
                                                            ? <span className="flex items-center gap-1 bg-[#00A336]/10 border border-[#00A336]/20 text-[#00A336] text-[10px] font-semibold px-2 py-0.5 rounded tracking-wider uppercase"><CheckCircle2 className="w-3 h-3" />Terminé</span>
                                                            : <span className="bg-white/10 border border-white/5 text-white/90 text-[10px] font-medium px-2 py-0.5 rounded tracking-wider uppercase">Actif</span>
                                                    )}
                                                    {!isUnlocked && (
                                                        <span className="bg-white/5 border border-white/10 text-white/40 text-[10px] font-semibold px-2 py-0.5 rounded tracking-wider uppercase">Verrouillé</span>
                                                    )}
                                                </div>
                                                <p className="text-[#a1a1aa] text-[13px] font-medium">{meta.description}</p>
                                                {isUnlocked && pct > 0 && !isCompleted && (
                                                    <div className="mt-3">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[11px] text-white/30">Progression</span>
                                                            <span className="text-[11px] text-white/50">{pct}%</span>
                                                        </div>
                                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-white/30 rounded-full transition-all"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            disabled={!isUnlocked}
                                            onClick={() => isUnlocked && navigate(`/module/${meta.id}`)}
                                            className={`w-full font-semibold text-[14px] py-3 rounded-xl transition-all shadow-sm ${
                                                isUnlocked
                                                    ? 'bg-white hover:bg-gray-200 text-black cursor-pointer'
                                                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                                            }`}
                                        >
                                            {!isUnlocked ? 'Verrouillé' : isCompleted ? 'Revoir' : pct > 0 ? 'Reprendre' : 'Découvrir'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
                        <div className="bg-[#09090b] border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-full opacity-60">
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                                    <FileText className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <h3 className="text-[#a1a1aa] font-medium text-[14px]">Pack PDF BroReps – Méthodes de Croissance 2025</h3>
                                        <span className="bg-white/5 border border-white/10 text-white/50 text-[9px] font-semibold px-2 py-0.5 rounded tracking-wider uppercase">Exemple Temporaire</span>
                                    </div>
                                    <p className="text-[#52525b] text-[12px] font-medium">Un guide complet regroupant techniques et analyses.</p>
                                </div>
                            </div>
                            <button className="w-full bg-white/5 border border-white/5 text-[#52525b] font-medium text-[13px] py-2.5 rounded-xl cursor-not-allowed">
                                Bientôt disponible
                            </button>
                        </div>

                        {/* Fake Resource 2 */}
                        <div className="bg-[#09090b] border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-full opacity-60">
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                                    <Smartphone className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <h3 className="text-[#a1a1aa] font-medium text-[14px]">Mini-ebook 'Algorithme TikTok expliqué'</h3>
                                        <span className="bg-white/5 border border-white/10 text-white/50 text-[9px] font-semibold px-2 py-0.5 rounded tracking-wider uppercase">Exemple Temporaire</span>
                                    </div>
                                    <p className="text-[#52525b] text-[12px] font-medium">Comprendre et exploiter l'algorithme sans jargon.</p>
                                </div>
                            </div>
                            <button className="w-full bg-white/5 border border-white/5 text-[#52525b] font-medium text-[13px] py-2.5 rounded-xl cursor-not-allowed">
                                Bientôt disponible
                            </button>
                        </div>

                        {/* Fake Resource 3 */}
                        <div className="bg-[#09090b] border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-full opacity-60">
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                                    <LayoutTemplate className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <h3 className="text-[#a1a1aa] font-medium text-[14px]">Templates Premium</h3>
                                        <span className="bg-white/5 border border-white/10 text-white/50 text-[9px] font-semibold px-2 py-0.5 rounded tracking-wider uppercase">Exemple Temporaire</span>
                                    </div>
                                    <p className="text-[#52525b] text-[12px] font-medium">Scripts, hooks, idées de vidéos prêtes à l'emploi.</p>
                                </div>
                            </div>
                            <button className="w-full bg-white/5 border border-white/5 text-[#52525b] font-medium text-[13px] py-2.5 rounded-xl cursor-not-allowed">
                                Bientôt disponible
                            </button>
                        </div>

                        {/* Fake Resource 4 */}
                        <div className="bg-[#09090b] border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-full opacity-60">
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                                    <Sparkles className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <h3 className="text-[#a1a1aa] font-medium text-[14px]">Accès beta aux futurs outils</h3>
                                        <span className="bg-white/5 border border-white/10 text-white/50 text-[9px] font-semibold px-2 py-0.5 rounded tracking-wider uppercase">Exemple Temporaire</span>
                                    </div>
                                    <p className="text-[#52525b] text-[12px] font-medium">Essai anticipé des fonctionnalités en développement.</p>
                                </div>
                            </div>
                            <button className="w-full bg-white/5 border border-white/5 text-[#52525b] font-medium text-[13px] py-2.5 rounded-xl cursor-not-allowed">
                                Bientôt disponible
                            </button>
                        </div>

                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 mt-16 text-[#52525b] text-[12px] font-medium border-t border-white/5 pt-8">
                    <Sparkles className="w-4 h-4" />
                    Ressources & Bonus / BroReps Premium
                </div>

            </div>
        </div>
    );
}
