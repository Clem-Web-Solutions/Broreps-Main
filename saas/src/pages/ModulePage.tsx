import { ArrowLeft, Sparkles, Zap, Play, MessageSquare, Ticket, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router';

export default function ModulePage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

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

    // Make sure we stop playing and scroll top when loading another module
    useEffect(() => {
        setIsPlaying(false);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
        window.scrollTo(0, 0);
    }, [moduleId]);

    return (
        <div className="flex flex-col items-center w-full min-h-screen pt-4 pb-24">

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

                {/* 1. Pill "MODULE PREMIUM 1" with specific icon */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 px-5 py-2 rounded-full border border-[#14321D] bg-[#0A1A0F] mb-6 shadow-[0_0_15px_rgba(0,163,54,0.15)]"
                >
                    <Sparkles className="w-3.5 h-3.5 text-[#00A336]" fill="currentColor" />
                    <span className="text-[#00A336] text-[11px] font-black uppercase tracking-widest mt-0.5">Module Premium {moduleId}</span>
                    {data.pillIcon}
                </motion.div>

                {/* 2. Slanted Green Title Box */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                    className="w-[90%] md:w-full max-w-[750px] relative mb-12"
                >
                    <div
                        className="w-full relative border-[2px] border-[#00A336] shadow-[0_0_40px_rgba(0,163,54,0.3)] rounded-[12px] overflow-hidden"
                        style={{ transform: "skewX(-8deg)" }}
                    >
                        {/* Gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#011406] via-[#00A336]/80 to-[#00A336]" />

                        <div
                            className="relative z-10 text-center py-6 md:py-8 px-4 flex items-center justify-center min-h-[140px]"
                            style={{ transform: "skewX(8deg)" }}
                        >
                            <h1
                                className="text-white text-[28px] md:text-[44px] lg:text-[46px] font-black uppercase italic leading-[1.05] tracking-wide"
                                style={{ textShadow: "0px 4px 15px rgba(0,0,0,0.5)" }}
                            >
                                {data.title}
                            </h1>
                        </div>
                    </div>
                </motion.div>

                {/* 3. Vertical Video Player */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="relative w-full max-w-[340px] aspect-[9/16] rounded-[24px] overflow-hidden mb-12 border-2 border-[#14321D] shadow-[0_0_40px_rgba(0,163,54,0.2)] bg-black group"
                >
                    <video
                        ref={videoRef}
                        src={data.videoSrc}
                        controls={isPlaying}
                        onClick={isPlaying ? undefined : togglePlay}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isPlaying ? 'opacity-100' : 'opacity-80 group-hover:scale-105'}`}
                        playsInline
                        onPause={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                    />

                    {!isPlaying && (
                        <div
                            className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center group/play"
                            onClick={togglePlay}
                        >
                            {/* Subtle dark gradient overlay to make the play button pop */}
                            <div className="absolute inset-0 bg-black/40 group-hover/play:bg-black/50 transition-colors duration-300 pointer-events-none" />

                            {/* Minimal & modern play button */}
                            <div className="w-[80px] h-[80px] rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] group-hover/play:scale-110 group-hover/play:border-[#00A336]/50 group-hover/play:shadow-[0_0_30px_rgba(0,163,54,0.3)] transition-all duration-300 relative z-10 pointer-events-none">
                                <Play className="w-10 h-10 text-white ml-2 opacity-90 group-hover/play:text-[#3edb6c] transition-colors" fill="currentColor" />
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
                    <div className="w-full bg-[#030A05] border-[1px] border-[#00A336] rounded-[24px] p-8 md:p-10 relative overflow-hidden shadow-[0_0_20px_rgba(0,163,54,0.05)]">
                        <div className="flex items-center gap-3 mb-6">
                            <Sparkles className="w-6 h-6 text-[#00A336]" />
                            <h2 className="text-[24px] font-bold text-[#00A336]">{data.aboutTitle}</h2>
                        </div>
                        <div className="space-y-6 text-[#A1A1AA] text-[14px] font-medium leading-[1.7]">
                            {data.aboutText}
                        </div>
                    </div>

                    {/* Card 2: Coach IA */}
                    <div className="w-full bg-[#030A05] border-[1px] border-[#00A336] rounded-[24px] p-6 md:p-8 relative overflow-hidden shadow-[0_0_20px_rgba(0,163,54,0.05)]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-[42px] h-[42px] bg-[#00A336] rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(0,163,54,0.3)]">
                                <MessageSquare className="w-5 h-5 text-[#030A05]" fill="currentColor" strokeWidth={0} />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-[20px] font-bold text-white flex items-center gap-2">
                                    🤖 Ton Coach IA
                                </h2>
                                <span className="text-[#A1A1AA] text-[12px] font-medium mt-0.5">Aide personnalisée pour ce module</span>
                            </div>
                        </div>
                        <p className="text-[#A1A1AA] text-[14px] font-medium leading-relaxed mb-6">
                            Pose tes questions, débloque tes blocages, et reçois des conseils personnalisés en lien avec <span className="text-[#00A336] font-bold">ce module</span>.
                        </p>
                        <button className="w-full py-3 bg-[#00A336] rounded-[10px] text-white font-black text-[14px] hover:bg-[#008f2f] transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,163,54,0.2)] cursor-pointer">
                            <MessageSquare className="w-4 h-4" />
                            Ouvrir le Coach IA
                        </button>
                    </div>

                    {/* Card 3: Besoin d'aide */}
                    <div className="w-full bg-[#030A05] border-[1px] border-[#00A336] rounded-[24px] p-6 md:p-8 relative overflow-hidden shadow-[0_0_20px_rgba(0,163,54,0.05)]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-[42px] h-[42px] bg-[#8b5cf6] rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                <Ticket className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-[20px] font-bold text-white flex items-center gap-2">
                                    🎫 Besoin d'aide ?
                                </h2>
                                <span className="text-[#A1A1AA] text-[12px] font-medium mt-0.5">Support technique dédié</span>
                            </div>
                        </div>
                        <p className="text-[#A1A1AA] text-[14px] font-medium leading-relaxed mb-6">
                            Un problème avec ce module ? Notre équipe peut t'aider rapidement.
                        </p>
                        <button className="w-full py-3 bg-[#8b5cf6] rounded-[10px] text-white font-black text-[14px] hover:bg-[#7c3aed] transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.2)] cursor-pointer">
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
                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0E0E0E] text-[#A1A1AA] font-bold text-[13px] border border-[#27272A] hover:bg-[#18181B] hover:text-white transition-all cursor-pointer shadow-md"
                    >
                        <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                        Module précédent
                    </button>

                    <button
                        onClick={() => navigate(parseInt(moduleId) >= Object.keys(moduleData).length ? '/dashboard' : `/module/${parseInt(moduleId) + 1}`)}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#00A336] text-[#05140A] font-bold text-[13px] hover:brightness-110 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,163,54,0.3)]"
                    >
                        Module suivant
                        <ChevronRight className="w-4 h-4" strokeWidth={3} />
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
