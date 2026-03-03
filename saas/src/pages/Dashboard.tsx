import { useState, useEffect } from 'react';
import {
    Target,
    Hourglass,
    PlayCircle,
    Users,
    Network,
    Rocket,
    Video,
    BarChart2,
    MessageCircle,
    Lock,
    LifeBuoy,
    Sparkles,
    ArrowRight,
    CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CobeGlobe from '../components/layout/CobeGlobe';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { modulesApi, type ModuleProgress } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { AICoachModal } from '../components/layout/AICoachModal';
import { SocialConnectModal } from '../components/layout/SocialConnectModal';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, refresh } = useAuth();
    const [modules, setModules] = useState<ModuleProgress[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [now] = useState(() => Date.now());

    // Mock link modal
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    // AI Coach modal
    const [isAICoachOpen, setIsAICoachOpen] = useState(false);
    const [aiInitialMessage, setAiInitialMessage] = useState<string | undefined>();

    const openCoach = (message?: string) => {
        setAiInitialMessage(message);
        setIsAICoachOpen(true);
    };

    // Cmd+J / Ctrl+J keyboard shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
                e.preventDefault();
                openCoach();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        modulesApi.list()
            .then(r => setModules(r.modules))
            .catch(() => { })
            .finally(() => setIsLoading(false));
    }, []);

    const totalModules = 6;
    const unlockedCount = modules.length > 0
        ? modules.filter(m => m.unlocked).length
        : (user?.modules_unlocked || 1);
    const completedCount = modules.filter(m => m.completed).length;
    const progressPct = Math.round((completedCount / totalModules) * 100);

    const getModuleStatus = (id: number): 'termine' | 'en_cours' | 'en_attente' | 'verrouille' => {
        const m = modules.find(m => m.id === id);
        if (!m || !m.unlocked) return 'verrouille';
        if (m.completed) return 'termine';
        if (m.watched_seconds > 0) return 'en_cours';
        return 'en_attente';
    };

    return (
        <div className="w-full flex flex-col pb-24">
            {/* Header Section */}
            <motion.header
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
            >
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="bg-[#00A336]/10 text-[#00A336] border border-[#00A336]/20 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase">
                            {user?.subscription_product || 'Premium Mensuel'}
                        </span>
                        <span className="text-[#A1A1AA] text-[13px] font-medium flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00A336] animate-pulse" />
                            Connecté
                        </span>
                    </div>
                    <h1 className="text-[32px] md:text-[42px] font-semibold tracking-tight text-white leading-tight">
                        Salut, <span className="text-[#00A336]">{user?.name?.split(' ')[0] || 'Créateur'}</span>
                    </h1>
                    <p className="text-[#A1A1AA] text-[15px] mt-1.5 font-medium">Contrôle ta progression et accède à tes ressources.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setIsLinkModalOpen(true)}
                        className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[13px] font-semibold transition-all flex items-center gap-2"
                    >
                        <Network className="w-4 h-4 text-[#A1A1AA]" />
                        Associer un compte
                    </button>
                    <button
                        onClick={() => navigate('/settings')}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#A1A1AA] hover:text-white transition-all"
                    >
                        <Target className="w-4 h-4" />
                    </button>
                </div>
            </motion.header>

            {/* Stats Overview */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
                    <Skeleton className="h-[140px] rounded-2xl bg-[#09090b] border border-white/5" />
                    <Skeleton className="h-[140px] rounded-2xl bg-[#09090b] border border-white/5" />
                    <Skeleton className="h-[140px] rounded-2xl bg-[#09090b] border border-white/5" />
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16"
                >
                    <StatCard
                        title="Progression"
                        value={`${progressPct}%`}
                        subtitle="Parcours complété"
                        icon={Target}
                        color="text-[#00A336]"
                        iconBg="bg-[#00A336]/10"
                    />
                    <StatCard
                        title="Modules"
                        value={`${unlockedCount}/${totalModules}`}
                        subtitle="Déverrouillés"
                        icon={PlayCircle}
                        color="text-white"
                        iconBg="bg-white/10"
                    />
                    <StatCard
                        title="Renouvellement"
                        value={user?.next_billing_at ? `${Math.max(0, Math.ceil((new Date(user.next_billing_at).getTime() - now) / 86400000))}j` : '–'}
                        subtitle="Avant prochaine échéance"
                        icon={Hourglass}
                        color="text-white"
                        iconBg="bg-white/10"
                    />
                </motion.div>
            )}

            {/* AI Coach AI / Global Path Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full flex flex-col lg:flex-row gap-6 mb-16"
            >
                {/* AI Coach Banner */}
                <div className="flex-1 rounded-[24px] bg-[#050505] border border-white/10 relative overflow-hidden group min-h-[300px] flex flex-col justify-between p-8">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-radial from-[#00A336]/10 to-transparent opacity-50 translate-x-1/3 -translate-y-1/3 pointer-events-none" />

                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#00A336]/10 flex items-center justify-center border border-[#00A336]/20 backdrop-blur-md">
                                <Sparkles className="w-5 h-5 text-[#00A336]" />
                            </div>
                            <h2 className="text-[20px] font-semibold text-white">Coach IA</h2>
                            <span className="bg-white/10 border border-white/5 text-white/70 text-[10px] uppercase font-bold px-2 py-0.5 rounded ml-2">Beta</span>
                        </div>
                        <p className="text-[#A1A1AA] text-[14px] leading-relaxed max-w-md">
                            Pose tes questions directement sur ton contenu ou ta stratégie. Le Coach IA analyse ton profil et te guide vers tes objectifs.
                        </p>
                    </div>

                    <div className="mt-8 flex flex-col gap-3 relative z-10 w-full md:w-[80%]">
                        <div
                            onClick={() => openCoach()}
                            className="bg-[#09090b] border border-white/10 rounded-xl p-3 flex items-center justify-between text-[#A1A1AA] text-[13px] hover:border-white/20 cursor-pointer transition-colors group"
                        >
                            <span className="flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-white/40 group-hover:text-[#00A336] transition-colors" />
                                Demande conseil à ton coach...
                            </span>
                            <div className="px-2 py-1 rounded bg-white/5 text-[10px] font-medium text-white/50">Cmd + J</div>
                        </div>
                        <div className="flex gap-2 flex-wrap text-[12px]">
                            <span onClick={() => openCoach('Idée de short ?')} className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-white/70 cursor-pointer hover:bg-white/10 transition-colors">Idée de short ?</span>
                            <span onClick={() => openCoach('Comment percer ?')} className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-white/70 cursor-pointer hover:bg-white/10 transition-colors">Comment percer ?</span>
                        </div>
                    </div>
                </div>

                {/* Growth Visualizer */}
                <div className="w-full lg:w-[40%] rounded-[24px] bg-[#09090b] border border-white/5 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 z-0 opacity-40">
                        <CobeGlobe />
                    </div>
                    <div className="relative z-10 w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mt-20 text-center">
                        <h3 className="text-white font-semibold text-[15px] mb-1">Croissance Globale</h3>
                        <p className="text-[#A1A1AA] text-[13px]">Rejoins les créateurs connectés</p>
                        <div className="mt-4 flex -space-x-2 justify-center">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#09090b] bg-white/10 flex items-center justify-center overflow-hidden z-[${4 - i}]`}>
                                    <UserAvatar seed={i.toString()} />
                                </div>
                            ))}
                            <div className="w-8 h-8 rounded-full border-2 border-[#09090b] bg-[#00A336] text-black text-[10px] font-bold flex items-center justify-center z-0">
                                +2k
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Modules Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mb-16"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-[20px] font-semibold text-white">Ton Parcours</h2>
                        <p className="text-[#A1A1AA] text-[14px]">Complète les modules pour évoluer</p>
                    </div>
                    {progressPct === 100 && (
                        <div className="flex items-center gap-2 text-[#00A336] text-[13px] font-semibold bg-[#00A336]/10 px-3 py-1.5 rounded-full">
                            <CheckCircle2 className="w-4 h-4" /> Terminé
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { id: 1, title: "Bienvenue dans ton écosystème", Icon: PlayCircle },
                        { id: 2, title: "Boost multi-plateformes", Icon: Rocket },
                        { id: 3, title: "Passe au niveau supérieur", Icon: Target },
                        { id: 4, title: "L'art du montage", Icon: Video },
                        { id: 5, title: "Discipline & régularité", Icon: BarChart2 },
                        { id: 6, title: "Maîtrise des réseaux", Icon: Sparkles },
                    ].map(m => (
                        <PremiumModuleCard
                            key={m.id}
                            number={m.id}
                            title={m.title}
                            Icon={m.Icon}
                            status={getModuleStatus(m.id)}
                            progressPct={modules.find(mod => mod.id === m.id)?.progress_pct}
                            onClick={() => navigate(`/module/${m.id}`)}
                        />
                    ))}
                </div>
            </motion.div>

            {/* Forums & Support */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
                {/* Forum Invite */}
                <div className="rounded-[24px] bg-gradient-to-br from-[#09090b] to-[#0d0d12] border border-white/5 p-8 flex flex-col justify-between group cursor-pointer hover:border-white/10 transition-colors" onClick={() => navigate('/hub')}>
                    <div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-white text-[20px] font-semibold mb-2">Le Hub Communautaire</h3>
                        <p className="text-[#A1A1AA] text-[14px] leading-relaxed max-w-sm">
                            Connecte-toi à d'autres créateurs, partage tes résultats et fais grandir ta visibilité naturellement.
                        </p>
                    </div>
                    <div className="mt-8 flex items-center text-[14px] font-semibold text-white/90 group-hover:text-white group-hover:translate-x-1 transition-all">
                        Rejoindre la communauté <ArrowRight className="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100" />
                    </div>
                </div>

                {/* Support Block */}
                <div className="rounded-[24px] bg-gradient-to-br from-[#09090b] to-[#0a110a] border border-white/5 p-8 flex flex-col justify-between group cursor-pointer hover:border-[#00A336]/30 transition-colors" onClick={() => window.open('https://broreps-sav.base44.app/', '_blank')}>
                    <div>
                        <div className="w-12 h-12 rounded-xl bg-[#00A336]/10 border border-[#00A336]/20 text-[#00A336] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                            <LifeBuoy className="w-6 h-6" />
                        </div>
                        <h3 className="text-white text-[20px] font-semibold mb-2">Centre d'assistance</h3>
                        <p className="text-[#A1A1AA] text-[14px] leading-relaxed max-w-sm">
                            Tu as une demande, un blocage ou besoin d'un suivi avancé ? Notre équipe te répond rapidement.
                        </p>
                    </div>
                    <div className="mt-8 flex items-center text-[14px] font-semibold text-white/90 group-hover:text-white group-hover:translate-x-1 transition-all">
                        Créer un ticket <ArrowRight className="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100" />
                    </div>
                </div>
            </motion.div>

            {/* Social Connect Modal */}
            <AnimatePresence>
                {isLinkModalOpen && (
                    <SocialConnectModal
                        onClose={() => setIsLinkModalOpen(false)}
                        onLinked={() => refresh()}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isAICoachOpen && (
                    <AICoachModal
                        key="ai-coach"
                        onClose={() => { setIsAICoachOpen(false); setAiInitialMessage(undefined); }}
                        initialMessage={aiInitialMessage}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ========================
// Sub-Components
// ========================

interface StatCardProps {
    title: string;
    value: React.ReactNode;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    iconBg: string;
}

function StatCard({ title, value, subtitle, icon: Icon, color, iconBg }: StatCardProps) {
    return (
        <div className="bg-[#09090b] border border-white/5 rounded-2xl p-6 flex flex-col justify-between transition-colors hover:bg-white/[0.02]">
            <div className="flex justify-between items-start mb-6">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
            </div>
            <div>
                <h3 className="text-[#A1A1AA] text-[13px] font-medium mb-1">{title}</h3>
                <div className="text-[32px] font-semibold text-white tracking-tight leading-none mb-2">{value}</div>
                <p className="text-white/40 text-[12px]">{subtitle}</p>
            </div>
        </div>
    );
}

function PremiumModuleCard({ number, title, Icon, status, progressPct, onClick }: { number: number, title: string, Icon: React.ElementType, status: 'en_cours' | 'en_attente' | 'termine' | 'verrouille', progressPct?: number, onClick?: () => void }) {
    const isLocked = status === 'verrouille';

    return (
        <div
            onClick={isLocked ? undefined : onClick}
            className={`group flex flex-col p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden ${isLocked
                ? 'bg-[#050505] border-white/5 cursor-not-allowed opacity-75'
                : 'bg-[#09090b] border-white/5 hover:border-white/20 cursor-pointer hover:bg-white/[0.02]'
                }`}
        >
            <div className="flex justify-between items-start mb-10 relative z-10">
                <div className="flex flex-col gap-2">
                    <span className="text-white/40 font-medium text-[11px] uppercase tracking-wider">Module {number}</span>
                    {status === 'en_cours' && (
                        <span className="bg-[#1e3a8a]/20 text-[#60a5fa] border border-[#1e3a8a]/50 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide w-fit">En cours</span>
                    )}
                    {status === 'termine' && (
                        <span className="bg-[#00A336]/10 text-[#00A336] border border-[#00A336]/20 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide w-fit">Terminé</span>
                    )}
                    {status === 'verrouille' && (
                        <span className="bg-white/5 text-white/40 border border-white/10 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide w-fit flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Verrouillé
                        </span>
                    )}
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform ${isLocked ? 'bg-white/5 text-white/20' : 'bg-white/10 text-white/80 group-hover:scale-110 group-hover:text-white group-hover:bg-white/15'}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>

            <div className="relative z-10">
                <h3 className={`text-[16px] font-semibold leading-snug mb-4 ${isLocked ? 'text-white/40' : 'text-white'}`}>
                    {title}
                </h3>

                {!isLocked && (
                    <div className="flex items-center justify-between">
                        <span className={`text-[12px] font-medium transition-colors ${status === 'termine' ? 'text-[#00A336]' : 'text-white/40 group-hover:text-white/70'}`}>
                            {status === 'termine' ? 'Visionné' : 'Découvrir'}
                        </span>
                        {status === 'en_cours' && (
                            <div className="w-1/2 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-white transition-all duration-500" style={{ width: `${progressPct ?? 0}%` }} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Subtle glow effect for active cards */}
            {!isLocked && status !== 'termine' && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </div>
    )
}



// Minimal placeholder avatar
function UserAvatar({ seed }: { seed: string }) {
    const bgColors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500"];
    const color = bgColors[parseInt(seed) % bgColors.length];
    return <div className={`w-full h-full ${color} opacity-80 mix-blend-screen`} />
}
