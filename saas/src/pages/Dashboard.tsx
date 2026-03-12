import { useState, useEffect, useRef, useCallback } from 'react';
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
    Star,
    Zap,
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

    // Newly unlocked module modal
    const [newlyUnlockedModule, setNewlyUnlockedModule] = useState<{ id: number; title: string } | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

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

    const MODULE_TITLES: Record<number, string> = {
        1: "Bienvenue dans ton écosystème",
        2: "Boost multi-plateformes",
        3: "Passe au niveau supérieur",
        4: "Étape clé à venir",
        5: "Discipline & régularité",
        6: "Maîtrise des réseaux",
    };

    useEffect(() => {
        modulesApi.list()
            .then(r => {
                const fetched: ModuleProgress[] = r.modules;
                setModules(fetched);

                // Detect newly unlocked modules vs cached state
                const CACHE_KEY = 'broreps_unlocked_ids';
                const cached: number[] = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
                const currentUnlocked = fetched.filter(m => m.unlocked).map(m => m.id);

                // Persist new cache
                localStorage.setItem(CACHE_KEY, JSON.stringify(currentUnlocked));

                // If cache was non-empty (not first visit), find new unlocks
                if (cached.length > 0) {
                    const newIds = currentUnlocked.filter(id => !cached.includes(id));
                    if (newIds.length > 0) {
                        const firstNew = newIds[0];
                        setNewlyUnlockedModule({ id: firstNew, title: MODULE_TITLES[firstNew] ?? `Module ${firstNew}` });
                        setShowConfetti(true);
                        setTimeout(() => setShowConfetti(false), 4000);
                    }
                }
            })
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
                            onClick={() => navigate('/ia')}
                            className="bg-[#09090b] border border-white/10 rounded-xl p-3 flex items-center justify-between text-[#A1A1AA] text-[13px] hover:border-white/20 cursor-pointer transition-colors group"
                        >
                            <span className="flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-white/40 group-hover:text-[#00A336] transition-colors" />
                                Demande conseil à ton coach...
                            </span>
                            <div className="px-2 py-1 rounded bg-white/5 text-[10px] font-medium text-white/50">Cmd + J</div>
                        </div>
                        <div className="flex gap-2 flex-wrap text-[12px]">
                            <span onClick={() => navigate('/ia')} className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-white/70 cursor-pointer hover:bg-white/10 transition-colors">Idée de short ?</span>
                            <span onClick={() => navigate('/ia')} className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-white/70 cursor-pointer hover:bg-white/10 transition-colors">Comment percer ?</span>
                        </div>
                    </div>
                </div>

                {/* Growth Visualizer */}
                <div className="w-full lg:w-[40%] rounded-[24px] bg-[#09090b] border border-white/5 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 z-0 opacity-40">
                        <CobeGlobe />
                    </div>
                    <div className="relative z-10 w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mt-20 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00A336] animate-pulse" />
                            <span className="text-[#00A336] text-[11px] font-bold uppercase tracking-widest">En direct</span>
                        </div>
                        <h3 className="text-white font-semibold text-[15px] mb-1">Croissance Globale</h3>
                        <p className="text-[#A1A1AA] text-[13px]">+1 200 créateurs actifs sur BroReps</p>
                        <div className="mt-4 flex -space-x-2 justify-center items-center">
                            {[0, 1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    style={{ zIndex: 4 - i }}
                                    className="w-8 h-8 rounded-full border-2 border-[#09090b] overflow-hidden flex-shrink-0"
                                >
                                    <UserAvatar seed={i.toString()} />
                                </div>
                            ))}
                            <div style={{ zIndex: 0 }} className="w-8 h-8 rounded-full border-2 border-[#09090b] bg-[#00A336] text-black text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                +1k
                            </div>
                        </div>
                        <p className="text-[#52525b] text-[11px] mt-3">45+ pays · TikTok · Instagram</p>
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
                        { id: 1, title: "Bienvenue dans ton écosystème", desc: "Prends en main ton espace BroReps et démarre efficacement.", Icon: PlayCircle },
                        { id: 2, title: "Boost multi-plateformes", desc: "Explose ta visibilité sur TikTok et Instagram simultanément.", Icon: Rocket },
                        { id: 3, title: "Passe au niveau supérieur", desc: "Multiplie tes résultats et passe un vrai cap de croissance.", Icon: Target },
                        { id: 4, title: "Étape clé à venir", desc: "Booste tes vues, likes et partages pour dominer l'algorithme.", Icon: Video },
                        { id: 5, title: "Discipline & régularité", desc: "Construis une présence durable grâce à la constance.", Icon: BarChart2 },
                        { id: 6, title: "Maîtrise des réseaux", desc: "Maîtrise les codes des réseaux et deviens incontournable.", Icon: Sparkles },
                    ].map(m => (
                        <PremiumModuleCard
                            key={m.id}
                            number={m.id}
                            title={m.title}
                            desc={m.desc}
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

            {/* Confetti burst on new module unlock */}
            <AnimatePresence>
                {showConfetti && <ConfettiCanvas />}
            </AnimatePresence>

            {/* New module unlock modal */}
            <AnimatePresence>
                {newlyUnlockedModule && (
                    <ModuleUnlockModal
                        moduleId={newlyUnlockedModule.id}
                        title={newlyUnlockedModule.title}
                        onOpen={() => { setNewlyUnlockedModule(null); navigate(`/module/${newlyUnlockedModule.id}`); }}
                        onClose={() => setNewlyUnlockedModule(null)}
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

function PremiumModuleCard({ number, title, desc, status, progressPct, onClick }: { number: number, title: string, desc: string, status: 'en_cours' | 'en_attente' | 'termine' | 'verrouille', progressPct?: number, onClick?: () => void }) {
    const isLocked = status === 'verrouille';
    const cardRef = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isLocked || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        setTilt({ x: dy * -6, y: dx * 6 });
    }, [isLocked]);

    const resetTilt = () => setTilt({ x: 0, y: 0 });

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => !isLocked && setIsHovered(true)}
            onMouseLeave={() => { resetTilt(); setIsHovered(false); }}
            onClick={isLocked ? undefined : onClick}
            animate={{
                rotateX: tilt.x,
                rotateY: tilt.y,
                scale: isHovered ? 1.03 : 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={!isLocked
                ? { animation: 'corner-glow 4s ease-in-out infinite', perspective: 800, transformStyle: 'preserve-3d' as const }
                : { perspective: 800, transformStyle: 'preserve-3d' as const }
            }
            className={`animated-border-card group flex flex-col p-6 rounded-2xl transition-colors duration-300 relative overflow-hidden ${isLocked
                ? 'bg-[#09090b] border border-white/5 cursor-not-allowed opacity-50'
                : 'bg-[#09090b] border-2 border-[#00A336]/40 cursor-pointer hover:border-[#00A336]/80 hover:shadow-[0_0_60px_rgba(0,163,54,0.18),0_0_20px_rgba(0,163,54,0.08)]'
                }`}
        >
            {/* Animated top scan line on hover */}
            {!isLocked && (
                <motion.div
                    className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#00A336] to-transparent"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0, scaleX: isHovered ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                />
            )}

            {/* Spotlight radial glow that follows cursor */}
            {!isLocked && isHovered && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at ${50 + tilt.y * 4}% ${50 + tilt.x * -4}%, rgba(0,163,54,0.12) 0%, transparent 65%)`,
                    }}
                />
            )}

            {/* Corner glow */}
            <div className="absolute bottom-0 left-0 w-24 h-4 bg-[#00A336]/8 blur-2xl rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="flex justify-between items-start mb-5 relative z-10">
                {/* MODULE X badge */}
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${isLocked ? 'bg-white/5 border border-white/10 text-white/30' : 'bg-[#00A336]/10 border border-[#00A336]/30 text-[#00A336]'}`}>
                    <Sparkles className="w-3 h-3" />
                    Module {number}
                </span>

                {/* Play / Lock button */}
                {isLocked ? (
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-white/20" />
                    </div>
                ) : (
                    <motion.div
                        animate={{ scale: isHovered ? 1.15 : 1, rotate: isHovered ? 5 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="w-10 h-10 rounded-xl bg-[#00A336]/10 border border-[#00A336]/30 flex items-center justify-center group-hover:bg-[#00A336]/30 group-hover:border-[#00A336]/70 transition-colors duration-300"
                    >
                        <PlayCircle className="w-5 h-5 text-[#00A336]" />
                    </motion.div>
                )}
            </div>

            <div className="relative z-10 flex-1">
                <h3 className={`text-[17px] font-bold leading-snug mb-2 transition-colors ${isLocked ? 'text-white/30' : isHovered ? 'text-white' : 'text-white/90'}`}>
                    {title}
                </h3>
                <p className={`text-[13px] leading-relaxed ${isLocked ? 'text-white/20' : 'text-[#A1A1AA]'}`}>
                    {desc}
                </p>

                {!isLocked && (
                    <div className="mt-4">
                        <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-[#00A336] to-[#00cc44] rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${status === 'termine' ? 100 : (progressPct ?? 0)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                        </div>
                        {status === 'en_cours' && (
                            <p className="text-[11px] text-[#00A336]/70 mt-1">{progressPct ?? 0}% complété</p>
                        )}
                        {status === 'termine' && (
                            <p className="text-[11px] text-[#00A336] mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Terminé
                            </p>
                        )}
                    </div>
                )}
            </div>

            {!isLocked && (
                <div className="flex items-center justify-between relative z-10 mt-5 pt-4 border-t border-[#00A336]/10">
                    <motion.span
                        animate={{ gap: isHovered ? '10px' : '6px' }}
                        className="flex items-center text-[#00A336] text-[13px] font-bold transition-all"
                        style={{ gap: isHovered ? '10px' : '6px' }}
                    >
                        <PlayCircle className="w-4 h-4 flex-shrink-0" />
                        {status === 'termine' ? 'Revoir' : 'Découvrir'}
                    </motion.span>
                    <motion.div
                        animate={{ width: isHovered ? 64 : 40 }}
                        className="h-[1px] bg-gradient-to-r from-[#00A336]/60 to-transparent"
                    />
                </div>
            )}
        </motion.div>
    )
}



// Placeholder avatar with gradient + initial
function UserAvatar({ seed }: { seed: string }) {
    const avatars: { grad: string; initial: string }[] = [
        { grad: 'linear-gradient(135deg,#7c3aed,#a855f7)', initial: 'A' },
        { grad: 'linear-gradient(135deg,#2563eb,#06b6d4)', initial: 'M' },
        { grad: 'linear-gradient(135deg,#ea580c,#f59e0b)', initial: 'K' },
        { grad: 'linear-gradient(135deg,#db2777,#f43f5e)', initial: 'T' },
        { grad: 'linear-gradient(135deg,#16a34a,#22c55e)', initial: 'S' },
    ];
    const av = avatars[parseInt(seed) % avatars.length];
    return (
        <div
            className="w-full h-full flex items-center justify-center text-white text-[11px] font-bold"
            style={{ background: av.grad }}
        >
            {av.initial}
        </div>
    );
}

// ========================
// Confetti Canvas
// ========================
function ConfettiCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const COLORS = ['#00A336', '#00cc44', '#ffffff', '#a3e635', '#facc15', '#00ff88'];
        const particles = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 200,
            vx: (Math.random() - 0.5) * 4,
            vy: 2 + Math.random() * 5,
            w: 6 + Math.random() * 8,
            h: 3 + Math.random() * 5,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.2,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            opacity: 1,
        }));

        let rafId: number;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.12; // gravity
                p.angle += p.spin;
                if (p.y > canvas.height * 0.7) p.opacity -= 0.02;
                if (p.opacity > 0) {
                    alive = true;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.angle);
                    ctx.globalAlpha = Math.max(0, p.opacity);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    ctx.restore();
                }
            }
            if (alive) rafId = requestAnimationFrame(draw);
        };
        rafId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafId);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[9999]"
        />
    );
}

// ========================
// Module Unlock Modal
// ========================
function ModuleUnlockModal({ moduleId, title, onOpen, onClose }: {
    moduleId: number;
    title: string;
    onOpen: () => void;
    onClose: () => void;
}) {
    return (
        <motion.div
            className="fixed inset-0 z-[9998] flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            />

            {/* Card */}
            <motion.div
                className="relative z-10 w-full max-w-[420px] bg-[#09090b] border-2 border-[#00A336]/50 rounded-3xl p-8 flex flex-col items-center text-center shadow-[0_0_80px_rgba(0,163,54,0.25)]"
                initial={{ scale: 0.7, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
                {/* Glowing badge */}
                <motion.div
                    className="w-20 h-20 rounded-[24px] bg-[#00A336]/15 border border-[#00A336]/40 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,163,54,0.3)]"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <Zap className="w-9 h-9 text-[#00A336]" fill="currentColor" strokeWidth={0} />
                </motion.div>

                {/* Stars decoration */}
                <div className="flex gap-2 mb-4">
                    {[0, 1, 2].map(i => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 300 }}
                        >
                            <Star className="w-4 h-4 text-[#00A336] fill-[#00A336]" />
                        </motion.div>
                    ))}
                </div>

                <span className="text-[#00A336] text-[11px] font-bold uppercase tracking-widest mb-2">
                    Nouveau module débloqué !
                </span>

                <h2 className="text-white text-[22px] font-semibold leading-tight mb-2">
                    Module {moduleId}
                </h2>
                <p className="text-[#A1A1AA] text-[14px] font-medium mb-8 leading-relaxed">
                    "{title}" vient d'être débloqué. Lance-toi dès maintenant !
                </p>

                <div className="flex flex-col gap-3 w-full">
                    <button
                        onClick={onOpen}
                        className="w-full py-3.5 bg-[#00A336] hover:bg-[#00b83d] text-black font-bold text-[14px] rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                        <PlayCircle className="w-4 h-4" />
                        Commencer le module
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-[#A1A1AA] font-semibold text-[13px] rounded-xl transition-colors cursor-pointer"
                    >
                        Plus tard
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
