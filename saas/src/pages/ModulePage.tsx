import { ArrowLeft, Sparkles, Zap, Play, MessageSquare, Ticket, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { modulesApi, type ModuleProgress } from '../lib/api';

export default function ModulePage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const autoplay = searchParams.get('autoplay') === '1';
    const autoplayedRef = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoCompleted, setVideoCompleted] = useState(false);
    const [moduleProgress, setModuleProgress] = useState<ModuleProgress | null>(null);
    const [loadingProgress, setLoadingProgress] = useState(true);
    const lastSaveRef = useRef<number>(0);

    // Module Data definition
    const moduleId = id || "1";

    const moduleData = {
        "1": {
            pillIcon: <Zap className="w-4 h-4 text-[#eab308]" fill="currentColor" strokeWidth={0} />,
            title: <>BIENVENUE DANS TON<br />ÉCOSYSTÈME</>,
            videoSrc: "/module1.mp4",
            aboutTitle: "À propos de ce module",
            aboutText: (
                <>
                    <p>Merci pour ta confiance et bienvenue dans le meilleur Écosystème pour exploser sur les réseaux.<br />À chaque cycle de renouvellement de ton abonnement, tu débloqueras une vidéo exclusive pour t'expliquer comment tirer le maximum de valeur de ton abonnement.</p>
                    <p>Dans l'Écosystème BroReps, tu retrouveras également ton Coach IA, qui s'adaptera à toi et à tes objectifs.</p>
                    <p>Enfin, tu profites d'un accès direct à notre équipe technique : si tu rencontres un problème, tu peux nous contacter et tu recevras une réponse sous <span className="text-white font-bold">24h</span>.</p>
                </>
            )
        },
        "2": {
            pillIcon: <span className="text-[12px]">🎬</span>,
            title: <>BOOST MULTI-<br />PLATEFORMES</>,
            videoSrc: "/module2.mp4",
            aboutTitle: "À propos de ce module",
            aboutText: (
                <>
                    <p>Ton abonnement TikTok est déjà en place, et c'est une excellente base pour faire grandir ton compte. Mais si tu veux vraiment accélérer, il y a une stratégie que les créateurs qui explosent utilisent tous : être présent sur plusieurs plateformes.</p>
                    <p>Beaucoup de nos abonnés combinent TikTok et Instagram. Résultat : plus de visibilité, plus de crédibilité, et une communauté qui se renforce des deux côtés. TikTok découvre ton Insta, Insta renvoie vers ton TikTok — c'est un cercle vertueux.</p>
                    <p>Si tu veux devenir vraiment incontournable, teste nos abonnements multi-plateformes BroReps. C'est ce que font déjà ceux qui veulent passer à l'étape au-dessus. 🚀</p>
                </>
            )
        },
        "3": {
            pillIcon: <span className="text-[12px]">🎬</span>,
            title: <>PASSE AU NIVEAU<br />SUPÉRIEUR</>,
            videoSrc: "/module3.mp4",
            aboutTitle: "À propos de ce module",
            aboutText: (
                <>
                    <p>Ça fait maintenant 3 mois que tu es abonné chez BroReps, et honnêtement, tu as fait un excellent choix.<br />Ton compte gagne en crédibilité chaque jour, et c'est exactement ce qui crée l'effet cumulé dont profitent les créateurs qui durent.</p>
                    <p>Mais si tu veux passer un vrai cap, sache qu'on propose aussi des abonnements plus puissants. Évoluer vers un plan supérieur, c'est la meilleure façon de multiplier tes résultats — parfois par deux, parfois par trois.</p>
                    <p>C'est comme à l'entraînement : tu peux rester régulier, ou décider d'augmenter l'intensité pour obtenir un impact encore plus fort.</p>
                    <p>Si tu sens que c'est le bon moment pour toi, upgrade ton abonnement BroReps. Tu verras la différence.</p>
                </>
            )
        },
        "4": {
            pillIcon: <span className="text-[12px]">🎬</span>,
            title: <>ÉTAPE CLÉ<br />À VENIR</>,
            videoSrc: "/module4.mp4",
            aboutTitle: "À propos de ce module",
            aboutText: (
                <>
                    <p>Aujourd'hui, tu profites déjà d'une croissance automatique de tes abonnés chaque mois avec BroReps. Mais il existe un levier complémentaire que beaucoup de nos clients ne connaissent pas encore : nos abonnements pour les likes, les vues et les partages.</p>
                    <p>Pourquoi c'est si efficace ?<br />Parce qu'il ne s'agit pas seulement d'augmenter les chiffres, mais d'augmenter l'engagement réel de tes contenus. Plus tes vidéos ont de vues, de likes et de partages, plus elles sont naturellement mises en avant par les algorithmes — et ça accélère toute la croissance de ton compte.</p>
                    <p>Si tu veux donner un vrai coup d'accélérateur à ton abonnement actuel, combine-le avec ces services complémentaires BroReps. C'est ce que font ceux qui veulent dominer leur niche... et les résultats suivent. 🚀</p>
                </>
            )
        },
        "5": {
            pillIcon: <span className="text-[12px]">🎬</span>,
            title: <>DISCIPLINE &<br />RÉGULARITÉ</>,
            videoSrc: "/module5.mp4",
            aboutTitle: "À propos de ce module",
            aboutText: (
                <>
                    <p>Tu fais déjà partie des abonnés fidèles BroReps, et c'est exactement ce qui te distingue. La majorité de nos membres qui restent plusieurs mois voient leur audience décoller : plus de visibilité, des collaborations, et une crédibilité qui attire les opportunités.</p>
                    <p>Et tu le verras toi-même : ceux qui upgrade leur abonnement gagnent encore plus vite. Pourquoi ? Parce qu'ils misent sur la vitesse, la régularité et l'effet boule de neige.</p>
                    <p>Alors sois stratégique : maintenir ta croissance, c'est bien. L'accélérer fortement, c'est mieux. Si tu veux viser plus haut, c'est le moment parfait pour passer au niveau supérieur. 🔥</p>
                </>
            )
        },
        "6": {
            pillIcon: <span className="text-[12px]">🎬</span>,
            title: <>MAÎTRISE DES<br />RÉSEAUX</>,
            videoSrc: "/module6.mp4",
            aboutTitle: "À propos de ce module",
            aboutText: (
                <>
                    <p>Bravo, ça fait maintenant 6 mois que tu es abonné BroReps 👏🔥 Et crois-moi, tu as pris une excellente décision.</p>
                    <p>La régularité, c'est ce qui transforme un simple créateur en un profil qui compte vraiment. Ceux qui tiennent dans la durée sont ceux qui finissent par prendre une avance nette : plus de visibilité, plus de crédibilité, plus d'opportunités.</p>
                    <p>Tu fais partie de cette catégorie. Continue comme ça, car c'est justement cette discipline qui te permettra de viser plus haut et de te démarquer réellement.</p>
                </>
            )
        }
    };

    const data = moduleData[moduleId as keyof typeof moduleData] || moduleData["1"];

    // Fetch progress for this module
    useEffect(() => {
        const fetchProgress = async () => {
            setLoadingProgress(true);
            try {
                const r = await modulesApi.list();
                const m = r.modules.find((m: ModuleProgress) => m.id === parseInt(moduleId));
                setModuleProgress(m || null);
                if (m && (m.completed || m.progress_pct >= 99)) setVideoCompleted(true);
            } catch {
                setModuleProgress(null);
            } finally {
                setLoadingProgress(false);
            }
        };
        fetchProgress();
    }, [moduleId]);

    // Restore watched position when video loads
    useEffect(() => {
        if (videoRef.current && moduleProgress && moduleProgress.watched_seconds > 0) {
            videoRef.current.currentTime = moduleProgress.watched_seconds;
        }
    }, [moduleProgress]);

    const handleSaveProgress = () => {
        const video = videoRef.current;
        if (!video || isNaN(video.duration) || video.duration === 0) return;
        if (!moduleProgress?.unlocked) return;
        modulesApi.saveProgress(
            parseInt(moduleId),
            Math.floor(video.currentTime),
            Math.floor(video.duration)
        ).catch(() => { });
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video || !moduleProgress?.unlocked) return;
        const now = Date.now();
        if (now - lastSaveRef.current < 10000) return; // throttle: 1 save max tous les 10s
        lastSaveRef.current = now;
        handleSaveProgress();
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Auto-play (muted) when arriving from onboarding (?autoplay=1)
    const handleCanPlay = () => {
        if (autoplay && !autoplayedRef.current && videoRef.current) {
            autoplayedRef.current = true;
            videoRef.current.muted = true;
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
    };

    // Make sure we stop playing and scroll top when loading another module
    useEffect(() => {
        setTimeout(() => setIsPlaying(false), 0);
        setVideoCompleted(false);
        autoplayedRef.current = false;
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
        lastSaveRef.current = 0;
        window.scrollTo(0, 0);
    }, [moduleId]);

    // Locked screen
    if (!loadingProgress && moduleProgress && !moduleProgress.unlocked) {
        return (
            <div className="flex flex-col items-center w-full pb-24">
                <div className="w-full max-w-[800px] flex justify-start px-4 md:px-8 mb-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 px-2 py-2 text-[12px] font-bold text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
                        Retour aux modules
                    </button>
                </div>
                <div className="flex flex-col items-center justify-center flex-1 gap-6 px-8 text-center py-24">
                    <div className="w-20 h-20 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center shadow-sm">
                        <Lock className="w-8 h-8 text-white/80" />
                    </div>
                    <h2 className="text-white text-2xl font-semibold">Module {moduleId} verrouillé</h2>
                    <p className="text-[#A1A1AA] text-[14px] max-w-[340px] leading-relaxed">
                        Ce module se débloque automatiquement à ton prochain renouvellement d'abonnement. Continue ta progression !
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-8 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-all shadow-sm"
                    >
                        Retour au Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full pb-24">

            {/* Top Navigation Row */}
            <div className="w-full max-w-[800px] flex justify-start px-4 md:px-8 mb-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 px-2 py-2 text-[12px] font-bold text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
                    Retour aux modules
                </button>
            </div>

            <div className="w-full max-w-[800px] flex flex-col items-center px-4 md:px-8 relative z-10">

                {/* 1. Pill "MODULE PREMIUM X" with specific icon */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 px-5 py-2 rounded-full border border-white/5 bg-white/[0.02] mb-6 shadow-sm"
                >
                    <Sparkles className="w-3.5 h-3.5 text-white/80" fill="currentColor" />
                    <span className="text-white font-semibold text-[11px] uppercase tracking-widest mt-0.5">Module Premium {moduleId}</span>
                    {data.pillIcon}
                </motion.div>

                {/* 2. Slanted Title Box -> Replaced with modern clean box */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                    className="w-[90%] md:w-full max-w-[750px] relative mb-12"
                >
                    <div className="w-full relative border border-white/10 bg-[#050505] shadow-sm rounded-3xl overflow-hidden p-8 flex items-center justify-center min-h-[140px]">
                        <h1 className="text-white text-[28px] md:text-[40px] lg:text-[42px] font-semibold tracking-tight text-center leading-tight">
                            {data.title}
                        </h1>
                    </div>
                </motion.div>

                {/* 3. Vertical Video Player */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="relative w-full max-w-[340px] aspect-[9/16] rounded-3xl overflow-hidden mb-12 border border-white/10 shadow-xl bg-[#09090b] group"
                >
                    <video
                        ref={videoRef}
                        src={data.videoSrc}
                        controls={isPlaying}
                        onClick={isPlaying ? undefined : togglePlay}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isPlaying ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}
                        playsInline
                        onPause={() => { setIsPlaying(false); handleSaveProgress(); }}
                        onEnded={() => { setIsPlaying(false); setVideoCompleted(true); handleSaveProgress(); }}
                        onPlay={() => setIsPlaying(true)}
                        onTimeUpdate={handleTimeUpdate}
                        onCanPlay={handleCanPlay}
                    />

                    {!isPlaying && (
                        <div
                            className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center group/play bg-black/30 group-hover:bg-black/10 transition-colors"
                            onClick={togglePlay}
                        >
                            {/* Minimal & modern play button */}
                            <div className="w-[80px] h-[80px] rounded-[24px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg group-hover/play:scale-105 group-hover/play:bg-white/20 transition-all duration-300 relative z-10 pointer-events-none">
                                <Play className="w-10 h-10 text-white ml-2 opacity-90 transition-colors" fill="currentColor" />
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* 4. Detail Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="w-full flex flex-col gap-6"
                >
                    {/* Card 1: À propos */}
                    <div className="w-full bg-[#09090b] border border-white/5 rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <Sparkles className="w-6 h-6 text-white" />
                            <h2 className="text-[24px] font-semibold text-white tracking-tight">{data.aboutTitle}</h2>
                        </div>
                        <div className="space-y-6 text-[#A1A1AA] text-[15px] font-medium leading-[1.8]">
                            {data.aboutText}
                        </div>
                    </div>

                    {/* Card 2: Coach IA */}
                    <div className="w-full border border-white/10 bg-[#050505] rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-[42px] h-[42px] bg-white/5 border border-white/10 rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-sm">
                                <MessageSquare className="w-5 h-5 text-white/80" fill="currentColor" strokeWidth={0} />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-[20px] font-semibold text-white flex items-center gap-2 tracking-tight">
                                    🤖 Ton Coach IA
                                </h2>
                                <span className="text-[#A1A1AA] text-[13px] font-medium mt-0.5">Aide personnalisée pour ce module</span>
                            </div>
                        </div>
                        <p className="text-[#A1A1AA] text-[14px] font-medium leading-relaxed mb-6">
                            Pose tes questions, débloque tes blocages, et reçois des conseils personnalisés en lien avec <span className="text-white font-medium">ce module</span>.
                        </p>
                        <button className="w-full py-3.5 bg-white rounded-xl text-black font-semibold text-[14px] hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                            <MessageSquare className="w-4 h-4" />
                            Ouvrir le Coach IA
                        </button>
                    </div>

                    {/* Card 3: Besoin d'aide */}
                    <div className="w-full border border-white/10 bg-[#050505] rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-[42px] h-[42px] bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 rounded-[12px] flex items-center justify-center flex-shrink-0">
                                <Ticket className="w-5 h-5 text-[#a78bfa]" strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-[20px] font-semibold text-white flex items-center gap-2 tracking-tight">
                                    🎫 Besoin d'aide ?
                                </h2>
                                <span className="text-[#A1A1AA] text-[13px] font-medium mt-0.5">Support technique dédié</span>
                            </div>
                        </div>
                        <p className="text-[#A1A1AA] text-[14px] font-medium leading-relaxed mb-6">
                            Un problème avec ce module ? Notre équipe peut t'aider rapidement.
                        </p>
                        <button className="w-full py-3.5 bg-[#8b5cf6] rounded-xl text-white font-semibold text-[14px] hover:bg-[#7c3aed] transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                            <Ticket className="w-4 h-4" strokeWidth={2.5} />
                            Ouvrir un ticket
                        </button>
                    </div>
                </motion.div>

                {/* Next / Previous Module Navigation */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="w-full flex justify-between items-center mt-8 gap-4"
                >
                    <button
                        onClick={() => navigate(moduleId === "1" ? '/dashboard' : `/module/${parseInt(moduleId) - 1}`)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#09090b] text-[#A1A1AA] font-semibold text-[13px] border border-white/10 hover:bg-white/5 hover:text-white transition-all cursor-pointer shadow-sm"
                    >
                        <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                        Précédent
                    </button>

                    <button
                        onClick={() => videoCompleted && navigate(parseInt(moduleId) >= Object.keys(moduleData).length ? '/dashboard' : `/module/${parseInt(moduleId) + 1}`)}
                        disabled={!videoCompleted}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[13px] transition-all shadow-sm ${videoCompleted ? 'bg-white text-black hover:bg-gray-200 cursor-pointer' : 'bg-white/20 text-white/40 cursor-not-allowed'}`}
                    >
                        Suivant
                        <ChevronRight className="w-4 h-4" strokeWidth={3} />
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
