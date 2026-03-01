import { useState } from 'react';
import {
    Lock,
    Target,
    Hourglass,
    Play,
    Sparkles,
    Clock,
    Sparkle,
    Link,
    Zap,
    TrendingUp,
    Medal,
    Settings2,
    Crown,
    PlayCircle,
    Users,
    Network,
    Rocket,
    Video,
    Camera,
    BarChart2,
    MessageCircle,
    ChevronRight,
    LifeBuoy,
    Package,
    X,
    Instagram
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CobeGlobe from '../components/layout/CobeGlobe';

import { useNavigate } from 'react-router';

export default function Dashboard() {
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center w-full min-h-screen pt-8 pb-24 px-4 lg:px-12">

            {/* Top Narrow Section */}
            <div className="w-full max-w-[800px] flex flex-col items-center">

                {/* 1. Welcome Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center text-center space-y-7 mb-16 relative z-10"
                >
                    <div className="flex items-center gap-2 px-5 py-2 rounded-full border border-[#14321D] bg-[#06140A] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#00A336] shadow-[0_0_8px_rgba(0,163,54,0.8)]" />
                        <span className="text-[11px] font-bold text-[#A1A1AA] tracking-[0.2em] uppercase">
                            Clement • Premium Mensuel
                        </span>
                    </div>

                    <div className="flex flex-col items-center">
                        <h1 className="text-[56px] md:text-[64px] font-[900] tracking-[-0.04em] leading-[1.05] text-white">
                            Salut
                        </h1>
                        <h1 className="text-[56px] md:text-[64px] font-[900] tracking-[-0.04em] leading-[1.05] text-[#00A336] mb-4">
                            Clement
                        </h1>

                        <div className="text-[32px] md:text-[40px] mt-1 mb-5">
                            <span className="inline-block transform -rotate-12 origin-bottom-right">👋</span>
                        </div>

                        <p className="text-[15px] md:text-[16px] text-[#A1A1AA] max-w-lg mx-auto font-medium">
                            L'écosystème des créateurs qui veulent évoluer
                        </p>
                    </div>
                </motion.div>

                {/* 2. Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-6"
                >
                    {/* Stat Card 1 */}
                    <div className="flex flex-col items-center justify-center p-8 rounded-[32px] bg-[#06140A] border border-[#14321D] shadow-lg group relative overflow-hidden h-[300px]">
                        <div className="w-[72px] h-[72px] rounded-3xl bg-gradient-to-b from-[#3edb6c] to-[#12a143] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[inset_0_2px_6px_rgba(255,255,255,0.6),0_0_20px_rgba(0,163,54,0.2)]">
                            <Lock className="w-8 h-8 text-white relative z-10" strokeWidth={2.5} />
                        </div>
                        <span className="text-[56px] font-black text-white mb-2 leading-none tracking-tight">6/6</span>
                        <span className="text-[15px] text-[#e0e0e0] font-semibold text-center leading-tight">Modules<br />déverrouillés</span>
                    </div>

                    {/* Stat Card 2 */}
                    <div className="flex flex-col items-center justify-center p-8 rounded-[32px] bg-[#06140A] border border-[#14321D] shadow-lg group relative overflow-hidden h-[300px]">
                        <div className="w-[72px] h-[72px] rounded-3xl bg-gradient-to-b from-[#3edb6c] to-[#12a143] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[inset_0_2px_6px_rgba(255,255,255,0.6),0_0_20px_rgba(0,163,54,0.2)] relative">
                            <Target className="w-8 h-8 text-white relative z-10" strokeWidth={2.5} />
                            <Sparkle className="w-[14px] h-[14px] text-[#fcd34d] absolute top-1.5 right-1.5 z-20" fill="currentColor" strokeWidth={1} />
                        </div>
                        <span className="text-[56px] font-black text-white mb-2 leading-none tracking-tight">100%</span>
                        <span className="text-[15px] text-[#e0e0e0] font-semibold text-center leading-tight">Parcours<br />complété</span>
                    </div>

                    {/* Stat Card 3 */}
                    <div className="flex flex-col items-center justify-center p-8 rounded-[32px] bg-[#06140A] border border-[#14321D] shadow-lg group relative overflow-hidden h-[300px]">
                        <div className="w-[72px] h-[72px] rounded-3xl bg-gradient-to-b from-[#3edb6c] to-[#12a143] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[inset_0_2px_6px_rgba(255,255,255,0.6),0_0_20px_rgba(0,163,54,0.2)] relative">
                            <Hourglass className="w-8 h-8 text-white relative z-10" strokeWidth={2.5} />
                        </div>
                        <span className="text-[56px] font-black text-white mb-2 leading-none tracking-tight">0j</span>
                        <span className="text-[15px] text-[#e0e0e0] font-semibold text-center leading-tight">Avant le<br />prochain</span>
                    </div>
                </motion.div>

                {/* Link Account Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="w-full mb-10"
                >
                    <button
                        onClick={() => setIsLinkModalOpen(true)}
                        className="w-full py-4 rounded-xl bg-[#06140A] border border-[#14321D] flex items-center justify-center gap-3 hover:bg-[#081b0d] transition-colors shadow-lg group cursor-pointer"
                    >
                        <Link className="w-[18px] h-[18px] text-[#00A336] group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                        <span className="text-white font-[700] text-[16px]">Associer un compte</span>
                    </button>
                </motion.div>

                {/* Ton parcours Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-full bg-[#06140A] border border-[#14321D] rounded-[32px] p-8 md:p-10 mb-16 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
                >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <h2 className="text-[32px] font-bold text-white mb-1.5 leading-tight">Ton parcours</h2>
                            <p className="text-[16px] text-[#A1A1AA] font-medium leading-loose">Programme d'excellence BroReps</p>
                        </div>
                        {/* Icon */}
                        <div className="w-[60px] h-[60px] rounded-[20px] bg-gradient-to-b from-[#3edb6c] to-[#12a143] flex items-center justify-center shadow-[inset_0_2px_6px_rgba(255,255,255,0.6),0_0_20px_rgba(0,163,54,0.3)] relative flex-shrink-0">
                            <Target className="w-7 h-7 text-white relative z-10" strokeWidth={2.5} />
                            <Sparkle className="w-3.5 h-3.5 text-[#fcd34d] absolute top-1.5 right-1.5 z-20" fill="currentColor" strokeWidth={1} />
                        </div>
                    </div>

                    {/* Progress Bar Area */}
                    <div className="mb-10">
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-[16px] font-semibold text-[#e0e0e0]">Progression globale</span>
                            <span className="text-[16px] font-bold text-[#3edb6c]">100%</span>
                        </div>
                        {/* Progress Bar Background */}
                        <div className="w-full h-[12px] rounded-full bg-[#112a18] overflow-visible relative">
                            {/* the filled green bar with an intense shadow */}
                            <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-[#12a143] to-[#3edb6c] rounded-full shadow-[0_0_15px_rgba(62,219,108,0.7)]"></div>
                        </div>
                    </div>

                    {/* Inner Card "Parcours terminé" */}
                    {/* uses a dark golden brown gradient and subtle gold border */}
                    <div className="w-full rounded-[24px] border border-[#443615] bg-gradient-to-b from-[#221b08] to-[#0A0D08] p-10 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                        <span className="text-[48px] leading-none mb-4 drop-shadow-[0_4px_12px_rgba(252,211,77,0.4)]">🏆</span>
                        <h3 className="text-[24px] font-bold text-white mb-2">Parcours terminé !</h3>
                        <p className="text-[16px] text-[#A1A1AA] font-medium text-center">Félicitations champion</p>
                    </div>
                </motion.div>

                {/* 3 Small Info Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16"
                >
                    {/* Abonnement */}
                    <div className="flex items-center py-5 px-6 md:py-6 md:px-8 rounded-[28px] bg-[#06140A] border border-[#14321D] shadow-lg group hover:bg-[#081a0d] transition-colors">
                        <div className="w-[56px] h-[56px] rounded-[18px] bg-[#0f3b1e] flex items-center justify-center mr-6 flex-shrink-0 group-hover:scale-110 transition-transform">
                            <Zap className="w-[28px] h-[28px] text-[#3edb6c]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-[17px] font-bold text-white mb-0.5 leading-tight">Abonnement</h3>
                            <p className="text-[14px] text-[#A1A1AA] font-medium leading-tight">Mensuel</p>
                        </div>
                    </div>

                    {/* Objectif */}
                    <div className="flex items-center py-5 px-6 md:py-6 md:px-8 rounded-[28px] bg-[#06140A] border border-[#14321D] shadow-lg group hover:bg-[#081a0d] transition-colors">
                        <div className="w-[56px] h-[56px] rounded-[18px] bg-[#12304d] flex items-center justify-center mr-6 flex-shrink-0 group-hover:scale-110 transition-transform">
                            <Target className="w-[28px] h-[28px] text-[#60a5fa]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-[17px] font-bold text-white mb-0.5 leading-tight">Objectif</h3>
                            <p className="text-[14px] text-[#A1A1AA] font-medium leading-tight">visibilite</p>
                        </div>
                    </div>

                    {/* Profil */}
                    <div className="flex items-center py-5 px-6 md:py-6 md:px-8 rounded-[28px] bg-[#06140A] border border-[#14321D] shadow-lg group hover:bg-[#081a0d] transition-colors">
                        <div className="w-[56px] h-[56px] rounded-[18px] bg-[#321c45] flex items-center justify-center mr-6 flex-shrink-0 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-[28px] h-[28px] text-[#c084fc]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-[17px] font-bold text-white mb-0.5 leading-tight">Profil</h3>
                            <p className="text-[14px] text-[#A1A1AA] font-medium leading-tight">Jeune Createur</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Wide Section for AI Coach and Modules */}
            <div className="w-full max-w-[1280px] flex flex-col items-center mt-4">

                {/* 3. AI Coach Banner Layout */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="w-full flex flex-col md:flex-row gap-8 mb-16 items-center md:items-stretch"
                >
                    {/* Left Side: Globe & Users Count */}
                    <div className="flex-1 w-full md:w-[40%] flex flex-col items-center justify-center pt-4">
                        <CobeGlobe />
                        <div className="mt-8 border border-[#14321D] bg-[#06140A] rounded-[24px] px-8 py-4 flex items-center gap-3 shadow-lg">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#00A336] shadow-[0_0_12px_#00A336] animate-pulse" />
                            <span className="text-[17px] font-bold text-white tracking-wide">Utilisateurs guidés par le Coach IA</span>
                        </div>
                    </div>

                    {/* Right Side: Coach IA Form */}
                    <div className="flex-1 w-full md:w-[60%] border border-[#00A336] bg-gradient-to-b from-[#06140A] to-[#030905] rounded-[32px] p-8 md:p-10 shadow-[0_0_40px_rgba(0,163,54,0.15)] relative overflow-hidden flex flex-col justify-between">

                        {/* Header */}
                        <div className="flex items-start gap-5 mb-8">
                            <div className="w-[60px] h-[60px] rounded-full bg-[#00A336] flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_#00A336]">
                                <Sparkles className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h2 className="text-[26px] font-bold text-white leading-tight">Coach IA Personnalisé</h2>
                                    <span className="bg-[#E63946] text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-[0_0_10px_rgba(230,57,70,0.5)] flex items-center gap-1">
                                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
                                        Populaire
                                    </span>
                                </div>
                                <p className="text-[#A1A1AA] text-[15px] mt-1 font-medium">Des conseils adaptés pour débuter</p>
                            </div>
                        </div>

                        {/* Fake Text Area */}
                        <div className="w-full h-[140px] bg-[#141212] border border-[#2A2525] rounded-[24px] p-5 shadow-inner mb-6 relative group cursor-text">
                            <p className="text-[#6B6B6B] text-[15px] flex items-center gap-1">
                                Écrivez votre idée ici...<Sparkle className="w-4 h-4" />
                            </p>
                        </div>

                        {/* Discuter Button */}
                        <div className="flex justify-center mb-10 w-full relative z-10">
                            {/* Disabled-looking dark button */}
                            <div className="pointer-events-none py-3 px-8 rounded-full bg-[#181616] border border-[#252222] shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-[#444]" />
                                <span className="text-[#888] font-bold text-[15px]">Discuter avec le Coach IA</span>
                            </div>
                        </div>

                        {/* Quick Tags row */}
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {["Comment débuter sur TikTok ?", "Mes premiers 1000 abonnés", "Checklist pour créer ma première vidéo", "Quel matériel pour débuter ?"].map((tag, i) => (
                                <div key={i} className="px-5 py-2.5 rounded-full border border-[#14321D] bg-[#0A1A0F] text-[#D1D5DB] text-[13px] font-medium cursor-pointer hover:bg-[#112F1B] hover:border-[#224A2D] transition-colors whitespace-nowrap">
                                    {tag}
                                </div>
                            ))}
                        </div>

                        {/* Optional subtle glow overlay */}
                        <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] bg-[#00A336] opacity-[0.05] rounded-full blur-[80px] pointer-events-none" />
                    </div>
                </motion.div>


                {/* 4. Modules Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
                >
                    <ModuleCard
                        number={1}
                        title="Bienvenue dans ton écosystème"
                        subtitle="Prends en main ton espace BroReps et démarre efficacement."
                        Icon={Play}
                        status="termine"
                        onClick={() => navigate('/module/1')}
                    />
                    <ModuleCard
                        number={2}
                        title="Boost multi-plateformes"
                        subtitle="Active TikTok + Instagram pour multiplier ta visibilité."
                        Icon={Clock}
                        status="en_cours"
                        onClick={() => navigate('/module/2')}
                    />
                    <ModuleCard
                        number={3}
                        title="Passe au niveau supérieur"
                        subtitle="Débloque plus de puissance et d'outils pour accélérer ta croissance."
                        Icon={TrendingUp}
                        status="en_attente"
                        onClick={() => navigate('/module/3')}
                    />
                    <ModuleCard
                        number={4}
                        title="Étape clé à venir"
                        subtitle="Module premium à débloquer dans ton parcours."
                        Icon={Medal}
                        status="en_attente"
                        onClick={() => navigate('/module/4')}
                    />
                    <ModuleCard
                        number={5}
                        title="Discipline & régularité"
                        subtitle="Nouveau niveau de structure et de progression."
                        Icon={Settings2}
                        status="en_attente"
                        onClick={() => navigate('/module/5')}
                    />
                    <ModuleCard
                        number={6}
                        title="Maîtrise des réseaux"
                        subtitle="Accède aux stratégies avancées de création de contenu."
                        Icon={Crown}
                        status="en_attente"
                        onClick={() => navigate('/module/6')}
                    />
                </motion.div>

                {/* 5. Forums Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="w-full mt-16 p-8 md:p-10 border border-[#14321D] bg-[#06140A] rounded-[32px] flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center gap-5 mb-10">
                        <div className="w-[60px] h-[60px] rounded-[18px] bg-[#00A336] flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(0,163,54,0.3)]">
                            <Users className="w-8 h-8 text-[#05140A]" strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-[28px] font-bold text-white leading-tight mb-1">Forums entre créateurs</h2>
                            <p className="text-[#A1A1AA] text-[15px] font-medium">Échange avec les autres membres, pose tes questions, partage tes résultats.</p>
                        </div>
                    </div>

                    {/* Block 1: LE HUB */}
                    <div className="w-full rounded-[24px] border border-[#14321D] bg-[#0A1A0F] relative overflow-hidden mb-8 p-10 flex flex-col items-center">
                        {/* Grid Background Effect */}
                        <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem00MCA0MEgwVjBoNDB2NDB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6TTEgMWgzOHYzOEgxVjF6IiBmaWxsPSJyZ2JhKDAsMTYzLDU0LDAuMDUpIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-50 mix-blend-screen" />

                        {/* Red Tag */}
                        <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#831843] bg-[#4c0519]/50 shadow-[0_0_15px_rgba(225,29,72,0.2)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] shadow-[0_0_8px_#f43f5e] animate-pulse" />
                            <span className="text-[#f43f5e] text-[10px] font-bold uppercase tracking-wider">Le plus recommandé</span>
                        </div>

                        <div className="flex flex-col items-center relative z-10 text-center mt-6 mb-10">
                            <div className="flex items-center gap-4 mb-4">
                                <Network className="w-14 h-14 text-[#00A336] drop-shadow-[0_0_15px_rgba(0,163,54,0.6)]" strokeWidth={2.5} />
                                <h2 className="text-[48px] font-black text-white tracking-tight">LE HUB</h2>
                            </div>
                            <p className="text-[#A1A1AA] text-[16px] font-medium max-w-lg">
                                Connecte-toi à d'autres créateurs et fais grandir ta visibilité naturellement.
                            </p>
                        </div>

                        {/* Feature Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-[900px] relative z-10 mb-10">
                            <div onClick={() => navigate('/hub')} className="flex flex-col items-center justify-center p-6 rounded-[20px] bg-[#040D06] border border-[#14321D] text-center transition-all duration-300 hover:bg-[#06140A] hover:-translate-y-1 hover:border-[#00A336] hover:shadow-[0_0_20px_rgba(0,163,54,0.15)] cursor-pointer group">
                                <Sparkles className="w-8 h-8 text-[#00A336] mb-4 drop-shadow-[0_0_8px_rgba(0,163,54,0.4)] transition-transform duration-300 group-hover:scale-110" />
                                <span className="text-white text-[14px] font-bold leading-snug">Partage ton compte, gagne en<br />visibilité</span>
                            </div>
                            <div onClick={() => navigate('/hub')} className="flex flex-col items-center justify-center p-6 rounded-[20px] bg-[#040D06] border border-[#14321D] text-center transition-all duration-300 hover:bg-[#06140A] hover:-translate-y-1 hover:border-[#00A336] hover:shadow-[0_0_20px_rgba(0,163,54,0.15)] cursor-pointer group">
                                <Users className="w-8 h-8 text-[#00A336] mb-4 drop-shadow-[0_0_8px_rgba(0,163,54,0.4)] transition-transform duration-300 group-hover:scale-110" />
                                <span className="text-white text-[14px] font-bold leading-snug">Suis ceux qui te ressemblent et<br />crée ton cercle</span>
                            </div>
                            <div onClick={() => navigate('/hub')} className="flex flex-col items-center justify-center p-6 rounded-[20px] bg-[#040D06] border border-[#14321D] text-center transition-all duration-300 hover:bg-[#06140A] hover:-translate-y-1 hover:border-[#00A336] hover:shadow-[0_0_20px_rgba(0,163,54,0.15)] cursor-pointer group">
                                <TrendingUp className="w-8 h-8 text-[#00A336] mb-4 drop-shadow-[0_0_8px_rgba(0,163,54,0.4)] transition-transform duration-300 group-hover:scale-110" />
                                <span className="text-white text-[14px] font-bold leading-snug">Fais grandir ta communauté<br />naturellement</span>
                            </div>
                        </div>

                        <button onClick={() => navigate('/hub')} className="relative z-10 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#00A336] to-[#04D44A] text-[#05140A] text-[16px] font-bold hover:scale-105 hover:shadow-[0_0_25px_rgba(0,163,54,0.5)] transition-all cursor-pointer">
                            Rejoindre la communauté
                        </button>
                    </div>

                    {/* Block 2: Category Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ForumCategoryCard
                            icon={Rocket}
                            iconColor="text-[#34d399]"
                            iconBg="bg-[#022c22]"
                            title="Débutants & Mise en route"
                            subtitle="Pour bien démarrer"
                            glowColor="group-hover:shadow-[0_0_20px_rgba(52,211,153,0.1)]"
                            onClick={() => navigate('/forum/debutants')}
                        />
                        <ForumCategoryCard
                            icon={Video}
                            iconColor="text-[#f43f5e]"
                            iconBg="bg-[#4c0519]"
                            title="TikTok & Shorts"
                            subtitle="Stratégies vidéos courtes"
                            glowColor="group-hover:shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                            onClick={() => navigate('/forum/tiktok')}
                        />
                        <ForumCategoryCard
                            icon={Camera}
                            iconColor="text-[#fb7185]"
                            iconBg="bg-[#4c0519]"
                            title="Instagram & Reels"
                            subtitle="Croissance Instagram"
                            glowColor="group-hover:shadow-[0_0_20px_rgba(251,113,133,0.1)]"
                            onClick={() => navigate('/forum/instagram')}
                        />
                        <ForumCategoryCard
                            icon={Target}
                            iconColor="text-[#60a5fa]"
                            iconBg="bg-[#172554]"
                            title="Stratégie & contenu"
                            subtitle="Planification avancée"
                            glowColor="group-hover:shadow-[0_0_20px_rgba(96,165,250,0.1)]"
                            onClick={() => navigate('/forum/strategie')}
                        />
                        <ForumCategoryCard
                            icon={BarChart2}
                            iconColor="text-[#fbbf24]"
                            iconBg="bg-[#451a03]"
                            title="Résultats & retours"
                            subtitle="Partage tes wins"
                            glowColor="group-hover:shadow-[0_0_20px_rgba(251,191,36,0.1)]"
                            onClick={() => navigate('/forum/resultats')}
                        />
                        <ForumCategoryCard
                            icon={MessageCircle}
                            iconColor="text-[#c084fc]"
                            iconBg="bg-[#2e1065]"
                            title="Discussion générale"
                            subtitle="Échanges libres"
                            glowColor="group-hover:shadow-[0_0_20px_rgba(192,132,252,0.1)]"
                            onClick={() => navigate('/forum/general')}
                        />
                    </div>
                </motion.div>
            </div>

            {/* Bottom Narrow Section */}
            <div className="w-full max-w-[800px] flex flex-col items-center mt-12">

                {/* Support Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 mb-16"
                >
                    {/* Assistance Card */}
                    <div className="flex flex-col p-8 rounded-[24px] bg-[#07130A] border border-[#14321D] shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-1 hover:border-[#00A336] group">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-[42px] h-[42px] rounded-[12px] bg-[#00A336] flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(0,163,54,0.3)]">
                                <LifeBuoy className="w-6 h-6 text-white" strokeWidth={2} />
                            </div>
                            <h3 className="text-white text-[18px] font-bold uppercase tracking-wide">Centre d'assistance</h3>
                        </div>
                        <p className="text-[#A1A1AA] text-[14px] font-medium leading-relaxed mb-8 flex-grow">
                            Tu as une demande, un blocage ou besoin d'un suivi avancé ? Notre équipe Premium te répond rapidement.
                        </p>
                        <button
                            onClick={() => window.open('https://broreps-sav.base44.app/login?from_url=https%3A%2F%2Fbroreps-sav.base44.app%2F', '_blank')}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[12px] bg-gradient-to-r from-[#00A336] to-[#04D44A] text-[#05140A] font-bold transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(0,163,54,0.4)] cursor-pointer"
                        >
                            <Package className="w-5 h-5 text-[#05140A]" strokeWidth={2.5} />
                            Créer un ticket
                        </button>
                    </div>

                    {/* Subscription Card */}
                    <div className="flex flex-col p-8 rounded-[24px] bg-[#040D06] border border-[#14321D] shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-1 hover:border-[#00A336] group">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-[42px] h-[42px] rounded-[12px] bg-[#00A336] flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(0,163,54,0.3)]">
                                <MessageCircle className="w-6 h-6 text-white" strokeWidth={2} />
                            </div>
                            <h3 className="text-white text-[18px] font-bold uppercase tracking-wide">Gérer mon abonnement</h3>
                        </div>
                        <p className="text-[#A1A1AA] text-[14px] font-medium leading-relaxed mb-8 flex-grow">
                            Accède à la page pour suspendre, modifier ou annuler ton abonnement.
                        </p>
                        <button
                            onClick={() => navigate('/subscription')}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[12px] border border-[#00A336] bg-[#00A336]/5 hover:bg-[#00A336]/10 text-white font-bold transition-all hover:scale-[1.02] cursor-pointer"
                        >
                            <Sparkles className="w-5 h-5" strokeWidth={2} />
                            Gérer mon abonnement
                        </button>

                        {/* Note at the bottom */}
                        <div className="mt-8 pt-6 border-t border-[#14321D]/40">
                            <p className="text-[#52525B] text-[12px] font-medium text-center">
                                Partage tes idées, suggestions ou remarques. Ton feedback est précieux pour nous.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Social Connect Modal */}
            <AnimatePresence>
                {isLinkModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="w-full max-w-[520px] bg-[#050505] border-[2px] border-[#00A336] rounded-[24px] p-8 md:p-10 relative overflow-hidden"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setIsLinkModalOpen(false)}
                                className="absolute top-6 right-6 text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-6 h-6" strokeWidth={2} />
                            </button>

                            {/* Modal Content */}
                            <div className="flex flex-col items-center mt-2 mb-10 text-center">
                                <h2 className="text-[32px] md:text-[36px] font-bold text-white leading-tight mb-4 tracking-tight">
                                    Choisis la plateforme à<br />connecter
                                </h2>
                                <p className="text-[#a1a1aa] text-[15px] font-medium leading-relaxed max-w-[400px]">
                                    Connecter ton compte permet à ton Coach IA de t'offrir des analyses ultra-personnalisées.
                                </p>
                            </div>

                            <div className="flex flex-col gap-5">
                                {/* TikTok Card */}
                                <div className="flex items-start gap-5 p-6 rounded-[20px] bg-[#09090b] border border-[#27272a] hover:border-[#3f3f46] transition-colors group">
                                    <div className="flex items-center justify-center w-[64px] h-[64px] bg-[#18181b] rounded-[16px] flex-shrink-0 group-hover:scale-105 transition-transform">
                                        <TikTokIcon />
                                    </div>
                                    <div className="flex flex-col flex-1 pt-1">
                                        <h3 className="text-white text-[20px] font-bold leading-none mb-2">TikTok</h3>
                                        <p className="text-[#a1a1aa] text-[14px] font-medium leading-snug mb-5">
                                            Analyse de la croissance, des vues et de ton<br />engagement.
                                        </p>
                                        <div className="flex">
                                            <button className="px-6 py-2.5 rounded-lg bg-[#052e16] text-[#00A336] text-[14px] font-bold border border-[#0f4624] hover:bg-[#0a3a1f] transition-colors cursor-pointer">
                                                Associer
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Instagram Card */}
                                <div className="flex items-start gap-5 p-6 rounded-[20px] bg-[#09090b] border border-[#27272a] hover:border-[#3f3f46] transition-colors group">
                                    <div className="flex items-center justify-center w-[64px] h-[64px] bg-[#18181b] rounded-[16px] flex-shrink-0 group-hover:scale-105 transition-transform">
                                        <Instagram className="w-7 h-7 text-[#a1a1aa]" strokeWidth={1.5} />
                                    </div>
                                    <div className="flex flex-col flex-1 pt-1">
                                        <h3 className="text-white text-[20px] font-bold leading-none mb-2">Instagram</h3>
                                        <p className="text-[#a1a1aa] text-[14px] font-medium leading-snug mb-5">
                                            Insights sur tes Reels, posts et performances<br />globales.
                                        </p>
                                        <div className="flex">
                                            <button className="px-6 py-2.5 rounded-lg bg-[#052e16] text-[#00A336] text-[14px] font-bold border border-[#0f4624] hover:bg-[#0a3a1f] transition-colors cursor-pointer">
                                                Associer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Custom TikTok SVG Icon
const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-[30px] h-[30px] text-[#a1a1aa]">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.12-3.44-3.17-3.61-5.66-.21-3.23 1.91-6.19 5.06-6.85.25-.05.51-.08.77-.09V14.4c-1.17.06-2.31.54-3.12 1.34-1.22 1.14-1.63 2.97-.97 4.54.49 1.25 1.56 2.22 2.86 2.53 1.39.38 2.91.07 4.02-.78 1.23-.97 1.91-2.48 1.91-4.07.02-3.99.01-7.98.01-11.97-.04.05-.08.1-.13.15z" />
    </svg>
);

// Reusable component for the module card
export function ModuleCard({ number, title, subtitle, Icon, status, onClick }: { number: number, title: string, subtitle: string, Icon: React.ElementType, status: 'en_cours' | 'en_attente' | 'termine', onClick?: () => void }) {

    // Status visual mapping
    const isLocked = status === 'en_attente';
    const borderColor = isLocked ? 'border-[#0a2612]' : 'border-[#00A336] shadow-[inset_0_0_20px_rgba(0,163,54,0.05)]';
    const textColor = isLocked ? 'text-[#888]' : 'text-[#00A336]';

    let progressFill = 'w-0';
    let statusBadge = null;

    if (status === 'en_cours') {
        progressFill = 'w-[50%]';
        statusBadge = (
            <div className="flex items-center px-2 py-0.5 rounded-full bg-[#1e3a8a] text-[#60a5fa] text-[9px] font-bold uppercase tracking-wider">
                En cours
            </div>
        );
    } else if (status === 'termine') {
        progressFill = 'w-full';
        statusBadge = (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00A336] text-[#05140A] text-[10px] font-bold uppercase tracking-wide">
                Terminé
            </div>
        );
    }

    return (
        <div className={`relative col-span-1 rounded-[28px] bg-[#06140A] p-7 md:p-8 flex flex-col justify-between border ${borderColor} group overflow-hidden transition-all hover:-translate-y-1`}>

            <div className="flex justify-between items-start mb-6">
                {/* Module Badge & State */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0C2413] border border-[#14321D] ${textColor} text-[10px] font-bold uppercase tracking-wider`}>
                            <Sparkles className="w-3.5 h-3.5" />
                            Module {number}
                        </div>
                        {statusBadge}
                    </div>
                    {/* Last seen text */}
                    <span className="text-[10px] font-medium text-[#71717A] ml-2">
                        {number === 1 ? 'Vu : il y a 27 min' : 'Vu : À l\'instant'}
                    </span>
                </div>

                {/* Status Icon */}
                <button onClick={onClick} className={`w-[52px] h-[52px] rounded-[18px] border border-[#14321D] bg-[#0A1D11] flex items-center justify-center transition-all duration-300 hover:bg-[#0D2415] hover:border-[#00A336] hover:shadow-[0_0_15px_rgba(0,163,54,0.15)] hover:-translate-y-1 cursor-pointer group/icon flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${textColor} transition-transform duration-300 group-hover/icon:scale-110`} strokeWidth={1.5} />
                </button>
            </div>

            {/* Text Content */}
            <div className="mb-8">
                <h3 className="text-[22px] font-bold text-white mb-2 leading-tight">{title}</h3>
                <p className="text-[#A1A1AA] text-[15px] font-medium leading-relaxed h-[45px] overflow-hidden">
                    {subtitle}
                </p>
            </div>

            {/* Bottom Section */}
            <div>
                <div className="w-full h-px bg-gradient-to-r from-[#14321D] to-transparent mb-5" />

                <div className="flex items-center justify-between">
                    <button onClick={onClick} className={`flex items-center gap-2 font-bold ${textColor} transition-all duration-300 hover:brightness-125 text-[14px] group-hover:text-[#3edb6c] hover:translate-x-1 cursor-pointer group/btn`}>
                        <PlayCircle className={`w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110`} strokeWidth={2} />
                        Découvrir
                    </button>

                    {/* Small dash progress bar */}
                    <div className="w-[80px] h-[4px] rounded-full bg-[#112a18] relative overflow-hidden">
                        <div className={`absolute left-0 top-0 h-full ${progressFill} bg-[#3edb6c] shadow-[0_0_8px_#3edb6c] transition-all duration-500`} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Reusable component for the Forum Categories
export function ForumCategoryCard({ icon: Icon, iconColor, iconBg, title, subtitle, glowColor, onClick }: { icon: React.ElementType, iconColor: string, iconBg: string, title: string, subtitle: string, glowColor: string, onClick?: () => void }) {
    return (
        <div onClick={onClick} className={`flex flex-col p-6 rounded-[24px] bg-[#090b0a] border border-[#181a19] hover:bg-[#0c0f0d] transition-all duration-300 hover:-translate-y-1 cursor-pointer group ${glowColor} hover:border-white/10`}>
            <div className="flex justify-between items-start mb-8">
                <div className={`w-[48px] h-[48px] rounded-[14px] ${iconBg} border border-white/5 flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`w-[22px] h-[22px] ${iconColor} opacity-90 transition-transform duration-300`} strokeWidth={2} />
                </div>
                <ChevronRight className={`w-5 h-5 ${iconColor} opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300`} strokeWidth={2} />
            </div>
            <div>
                <h3 className="text-white text-[16px] font-bold mb-1 leading-tight transition-colors">{title}</h3>
                <p className="text-[#A1A1AA] text-[13px] font-medium leading-snug">{subtitle}</p>
            </div>
        </div>
    );
}
