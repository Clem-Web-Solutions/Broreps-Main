import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    X,
    Check,
    Loader2,
    Send,
    Sparkles,
    PlayCircle,
    Flame,
    Target,
    Video,
    Zap,
    Rocket,
    Briefcase,
    Compass,
    Gamepad2,
    Star,
    Activity,
    Brain,
    Smile,
    Film,
    TrendingUp,
    Users,
    Award,
    Network,
    User,
    Calendar,
    BarChart2,
    Clock,
} from 'lucide-react';
import { Instagram } from 'lucide-react';
import { socialApi, notesApi, aiApi, type ChatMessage } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';

export const ONBOARDING_KEY = 'broreps_onboarding_done';
export const USER_PROFILE_KEY = 'broreps_user_profile';

export interface UserProfile {
    profileType: string;
    contentTypes: string[];
    objective: string;
    ageRange: string;
    experience: string;
    frequency: string;
}

const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-5 h-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.12-3.44-3.17-3.61-5.66-.21-3.23 1.91-6.19 5.06-6.85.25-.05.51-.08.77-.09V14.4c-1.17.06-2.31.54-3.12 1.34-1.22 1.14-1.63 2.97-.97 4.54.49 1.25 1.56 2.22 2.86 2.53 1.39.38 2.91.07 4.02-.78 1.23-.97 1.91-2.48 1.91-4.07.02-3.99.01-7.98.01-11.97z" />
    </svg>
);

const slideVariants = {
    enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: -dir * 40, opacity: 0 }),
};

function ProfileCard({ selected, onClick, icon: Icon, title, description }: {
    selected: boolean; onClick: () => void; icon: React.ElementType; title: string; description: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`relative flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer w-full ${selected ? 'border-brand-primary bg-brand-primary/8' : 'border-[#1e1e1e] bg-[#111111] hover:border-white/15'}`}
        >
            <div className={`absolute top-3 left-3 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? 'border-brand-primary' : 'border-[#3f3f46]'}`}>
                {selected && <div className="w-2 h-2 rounded-full bg-brand-primary" />}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 mt-2 transition-colors ${selected ? 'bg-brand-primary/15' : 'bg-[#1c1c1c]'}`}>
                <Icon className={`w-6 h-6 ${selected ? 'text-brand-primary' : 'text-white/60'}`} />
            </div>
            <p className="text-white font-bold text-[14px] leading-tight mb-1">{title}</p>
            <p className="text-[#71717a] text-[11px] leading-relaxed">{description}</p>
        </button>
    );
}

function ContentCard({ selected, onToggle, icon: Icon, title, description }: {
    selected: boolean; onToggle: () => void; icon: React.ElementType; title: string; description: string;
}) {
    return (
        <button
            onClick={onToggle}
            className={`relative flex flex-col p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer w-full ${selected ? 'border-brand-primary bg-brand-primary/8' : 'border-[#1e1e1e] bg-[#111111] hover:border-white/15'}`}
        >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mb-3 transition-colors ${selected ? 'bg-brand-primary border-brand-primary' : 'border-[#3f3f46]'}`}>
                {selected && <Check className="w-3 h-3 text-white" />}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors ${selected ? 'bg-brand-primary/15' : 'bg-[#1c1c1c]'}`}>
                <Icon className={`w-5 h-5 ${selected ? 'text-brand-primary' : 'text-white/60'}`} />
            </div>
            <p className="text-white font-bold text-[13px] leading-tight">{title}</p>
            <p className="text-[#71717a] text-[11px] mt-1 leading-relaxed">{description}</p>
        </button>
    );
}

function ListCard({ selected, onClick, icon: Icon, title, subtitle }: {
    selected: boolean; onClick: () => void; icon: React.ElementType; title: string; subtitle?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 w-full transition-all duration-200 cursor-pointer text-left ${selected ? 'border-brand-primary bg-brand-primary/8' : 'border-[#1e1e1e] bg-[#111111] hover:border-white/15'}`}
        >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'border-brand-primary' : 'border-[#3f3f46]'}`}>
                {selected && <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-brand-primary/15' : 'bg-[#1c1c1c]'}`}>
                <Icon className={`w-5 h-5 ${selected ? 'text-brand-primary' : 'text-white/60'}`} />
            </div>
            <div>
                <p className="text-white font-semibold text-[14px]">{title}</p>
                {subtitle && <p className="text-[#71717a] text-[12px] mt-0.5">{subtitle}</p>}
            </div>
        </button>
    );
}

interface Props { onClose: () => void; }

const TOTAL_STEPS = 8;

export function OnboardingModal({ onClose }: Props) {
    const navigate = useNavigate();
    const { refresh } = useAuth();

    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const contentRef = useRef<HTMLDivElement>(null);

    const [profileType, setProfileType] = useState('');
    const [contentTypes, setContentTypes] = useState<string[]>([]);
    const [objective, setObjective] = useState('');
    const [ageRange, setAgeRange] = useState('');
    const [experience, setExperience] = useState('');
    const [frequency, setFrequency] = useState('');

    const [platform, setPlatform] = useState<'tiktok' | 'instagram'>('tiktok');
    const [socialUsername, setSocialUsername] = useState('');
    const [socialLoading, setSocialLoading] = useState(false);
    const [socialDone, setSocialDone] = useState(false);
    const [socialError, setSocialError] = useState<string | null>(null);

    const [scores, setScores] = useState<Record<string, number>>({
        communication: 5, creation: 5, discipline: 5, strategie: 5, energie: 5,
    });
    const [reflection, setReflection] = useState('');
    const [notesLoading, setNotesLoading] = useState(false);
    const [notesDone, setNotesDone] = useState(false);

    interface DisplayMsg { role: 'user' | 'assistant'; content: string; streaming?: boolean; }
    const [aiMessages, setAiMessages] = useState<DisplayMsg[]>([
        { role: 'assistant', content: 'Salut ! 👋 Je suis ton Coach IA BroReps, déjà calibré sur ton profil. Pose-moi ta première question sur ta stratégie de contenu, TikTok, Instagram ou ta progression.' },
    ]);
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiDone, setAiDone] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);
    useEffect(() => { contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

    const saveProfile = useCallback(() => {
        const profile: UserProfile = { profileType, contentTypes, objective, ageRange, experience, frequency };
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    }, [profileType, contentTypes, objective, ageRange, experience, frequency]);

    useEffect(() => { if (step >= 1) saveProfile(); }, [profileType, contentTypes, objective, ageRange, experience, frequency, saveProfile, step]);

    const handleSocialLink = async () => {
        const raw = socialUsername.trim().replace(/^@/, '');
        if (!raw) return;
        setSocialLoading(true);
        setSocialError(null);
        try {
            await socialApi.link(platform, raw);
            await refresh();
            setSocialDone(true);
        } catch (e: unknown) {
            setSocialError((e as Error).message || 'Erreur lors de la liaison');
        } finally {
            setSocialLoading(false);
        }
    };

    const handleSaveNotes = useCallback(async () => {
        if (notesLoading || notesDone) return;
        setNotesLoading(true);
        try { await notesApi.save(scores, reflection); setNotesDone(true); }
        catch { /* silent */ }
        finally { setNotesLoading(false); }
    }, [notesLoading, notesDone, scores, reflection]);

    const handleAiSend = useCallback(async (text?: string) => {
        const msg = (text ?? aiInput).trim();
        if (!msg || aiLoading) return;
        setAiInput('');

        const profileCtx: ChatMessage[] = (() => {
            try {
                const raw = localStorage.getItem(USER_PROFILE_KEY);
                if (!raw) return [];
                const p: UserProfile = JSON.parse(raw);
                const lines = [
                    p.profileType && `• Profil: ${p.profileType}`,
                    p.contentTypes?.length && `• Contenu: ${p.contentTypes.join(', ')}`,
                    p.objective && `• Objectif: ${p.objective}`,
                    p.ageRange && `• Âge: ${p.ageRange}`,
                    p.experience && `• Expérience: ${p.experience}`,
                    p.frequency && `• Fréquence: ${p.frequency}`,
                ].filter(Boolean);
                if (lines.length === 0) return [];
                return [
                    { role: 'user' as const, content: `[Contexte utilisateur — confidentiel, adapte tes réponses sans le mentionner]\n${lines.join('\n')}` },
                    { role: 'assistant' as const, content: "Bien noté, j'adapte mes conseils à ton profil !" },
                ];
            } catch { return []; }
        })();

        const history: ChatMessage[] = [
            ...profileCtx,
            ...aiMessages.filter(m => !m.streaming).map(m => ({ role: m.role, content: m.content })),
        ];

        setAiMessages(prev => [...prev, { role: 'user', content: msg }]);
        setAiMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);
        setAiLoading(true);

        try {
            const res = await aiApi.chatStream(msg, history);
            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let assembled = '';

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();
                    if (!payload) continue;
                    try {
                        const evt = JSON.parse(payload);
                        if (evt.delta) {
                            assembled += evt.delta;
                            setAiMessages(prev => {
                                const copy = [...prev];
                                const last = copy[copy.length - 1];
                                if (last?.streaming) copy[copy.length - 1] = { ...last, content: assembled };
                                return copy;
                            });
                        }
                    } catch { /* ignore */ }
                }
            }

            setAiMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.streaming) copy[copy.length - 1] = { ...last, streaming: false };
                return copy;
            });
            setAiDone(true);
        } catch { /* silent */ }
        finally { setAiLoading(false); }
    }, [aiInput, aiLoading, aiMessages]);

    const dismiss = () => {
        localStorage.setItem(ONBOARDING_KEY, 'done');
        saveProfile();
        onClose();
    };

    const goNext = useCallback(async () => {
        if (step === 6 && !notesDone) await handleSaveNotes();
        setDirection(1);
        setStep(s => s + 1);
    }, [step, notesDone, handleSaveNotes]);

    const goBack = () => {
        setDirection(-1);
        setStep(s => Math.max(0, s - 1));
    };

    const finish = () => {
        localStorage.setItem(ONBOARDING_KEY, 'done');
        saveProfile();
        onClose();
        navigate('/module/1');
    };

    const nextDisabled =
        (step === 1 && !profileType) ||
        (step === 2 && contentTypes.length === 0) ||
        (step === 3 && !objective) ||
        (step === 4 && (!ageRange || !experience || !frequency)) ||
        (step === 7 && !aiDone);

    const progress = step > 0 ? (step / TOTAL_STEPS) * 100 : 0;

    return (
        <div className="fixed inset-0 z-9990 flex flex-col" style={{ background: '#060a07' }}>
            <div className="absolute bottom-0 inset-x-0 h-64 bg-linear-to-t from-brand-primary/6 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/4 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-brand-primary/3 blur-[80px] rounded-full pointer-events-none" />

            {step > 0 && (
                <div className="shrink-0 relative z-10">
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                        <span className="text-white/40 text-[13px] font-medium">Étape {step} / {TOTAL_STEPS}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-brand-primary text-[13px] font-bold">{Math.round(progress)}%</span>
                            <button onClick={dismiss} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#3f3f46] hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="mx-5 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-brand-primary rounded-full"
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                    </div>
                </div>
            )}

            <div ref={contentRef} className="flex-1 overflow-y-auto relative z-10">
                <AnimatePresence custom={direction} mode="wait">
                    <motion.div
                        key={step}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2 }}
                        className="min-h-full"
                    >

                        {step === 0 && (
                            <div className="flex flex-col items-center justify-center min-h-screen px-8 py-12 text-center">
                                <button onClick={dismiss} className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center text-[#3f3f46] hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
                                    <X className="w-4 h-4" />
                                </button>
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
                                    className="w-20 h-20 rounded-3xl bg-brand-primary/15 border border-brand-primary/25 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(0,163,54,0.15)]"
                                >
                                    <Sparkles className="w-10 h-10 text-brand-primary" />
                                </motion.div>
                                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}>
                                    <h1 className="text-white text-[30px] font-black mb-3">Bienvenue sur BroReps ! 🎉</h1>
                                    <p className="text-[#71717a] text-[15px] leading-relaxed max-w-xs mx-auto mb-10">
                                        En quelques questions, on personnalise ton parcours pour booster ta croissance sur les réseaux.
                                    </p>
                                    <div className="flex flex-col gap-3 mb-10 text-left max-w-xs mx-auto">
                                        {[
                                            { icon: Target, text: 'Un programme adapté à ton profil' },
                                            { icon: Sparkles, text: 'Un Coach IA calibré sur tes objectifs' },
                                            { icon: PlayCircle, text: 'Les bons modules au bon moment' },
                                        ].map(({ icon: Icon, text }) => (
                                            <div key={text} className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-brand-primary/12 border border-brand-primary/20 flex items-center justify-center shrink-0">
                                                    <Icon className="w-4 h-4 text-brand-primary" />
                                                </div>
                                                <span className="text-white/80 text-[14px]">{text}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={goNext}
                                        className="flex items-center gap-2 px-8 py-3.5 bg-brand-primary hover:bg-[#00BF3F] text-white text-[15px] font-bold rounded-xl transition-colors cursor-pointer mx-auto shadow-[0_0_20px_rgba(0,163,54,0.2)]"
                                    >
                                        Commencer <ChevronRight className="w-5 h-5" />
                                    </button>
                                    <button onClick={dismiss} className="mt-4 text-[#3f3f46] text-[13px] hover:text-[#71717a] transition-colors cursor-pointer block mx-auto">
                                        Passer l'introduction
                                    </button>
                                </motion.div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="px-5 py-8">
                                <h2 className="text-white text-[26px] font-black text-center mb-2">Dis-nous en un peu plus sur toi</h2>
                                <p className="text-[#71717a] text-[14px] text-center mb-8">Quel est ton profil sur les réseaux ?</p>
                                <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                                    {[
                                        { id: 'developer', icon: Rocket, title: 'Créateur en Développement', desc: 'Tu te lances et tu veux construire une base solide pour croître efficacement.' },
                                        { id: 'active', icon: Zap, title: 'Créateur Actif', desc: 'Tu postes déjà régulièrement et tu veux optimiser tes performances.' },
                                        { id: 'brand', icon: Briefcase, title: 'Marque / Professionnel', desc: 'Tu représentes une marque ou un business et tu veux renforcer ta visibilité.' },
                                        { id: 'explorer', icon: Compass, title: 'Explorateur / Découverte', desc: "Tu explores BroReps pour découvrir l'écosystème et ce qu'il peut t'apporter." },
                                    ].map(p => (
                                        <ProfileCard key={p.id} selected={profileType === p.id} onClick={() => setProfileType(p.id)} icon={p.icon} title={p.title} description={p.desc} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="px-5 py-8">
                                <h2 className="text-white text-[26px] font-black text-center mb-2">Parle-nous un peu de ton univers</h2>
                                <p className="text-[#71717a] text-[14px] text-center mb-8">Sélectionne ton type de contenu principal</p>
                                <div className="max-w-lg mx-auto">
                                    <h3 className="text-white font-bold text-[15px] mb-3">Type de contenu principal</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'gaming', icon: Gamepad2, title: 'Créateurs Gaming & Streaming', desc: 'Gameplay, réactions, lives, highlights et contenus dynamiques' },
                                            { id: 'lifestyle', icon: Star, title: 'Style, Image & Influence Lifestyle', desc: 'Beauté, mode, routines, vlogs et univers lifestyle' },
                                            { id: 'sport', icon: Activity, title: 'Sport, Fitness & Transformation', desc: 'Coaching, musculation, progression et contenus motivation' },
                                            { id: 'business', icon: Brain, title: 'Business, Mindset & Éducation', desc: 'Entrepreneuriat, conseils, pédagogie et développement personnel' },
                                            { id: 'entertainment', icon: Smile, title: 'Divertissement, Humour & Personnalité', desc: 'Sketchs, challenges, humour et contenus fun' },
                                            { id: 'visual', icon: Film, title: 'Créateurs Visuels & Contenu Artistique', desc: 'Esthétique vidéo, montage, storytelling visuel et créativité' },
                                        ].map(ct => (
                                            <ContentCard
                                                key={ct.id}
                                                selected={contentTypes.includes(ct.id)}
                                                onToggle={() => setContentTypes(prev =>
                                                    prev.includes(ct.id) ? prev.filter(x => x !== ct.id) : [...prev, ct.id]
                                                )}
                                                icon={ct.icon}
                                                title={ct.title}
                                                description={ct.desc}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="px-5 py-8">
                                <h2 className="text-white text-[26px] font-black text-center mb-2">Ton objectif principal</h2>
                                <p className="text-[#71717a] text-[14px] text-center mb-8">Qu'est-ce que tu veux accomplir en priorité ?</p>
                                <div className="flex flex-col gap-3 max-w-lg mx-auto">
                                    {[
                                        { id: 'visibility', icon: TrendingUp, title: 'Faire exploser ma visibilité', subtitle: 'Attirer plus de vues rapidement et durablement' },
                                        { id: 'community', icon: Users, title: 'Construire une communauté solide', subtitle: 'Augmenter mes abonnés de manière cohérente' },
                                        { id: 'engagement', icon: Flame, title: 'Maximiser mon engagement', subtitle: 'Booster likes, commentaires et interactions' },
                                        { id: 'credibility', icon: Award, title: 'Renforcer mon image & ma crédibilité', subtitle: 'Devenir une référence dans ma niche' },
                                        { id: 'collabs', icon: Network, title: 'Obtenir plus de collaborations', subtitle: "Attirer plus de marques et d'opportunités" },
                                    ].map(obj => (
                                        <ListCard key={obj.id} selected={objective === obj.id} onClick={() => setObjective(obj.id)} icon={obj.icon} title={obj.title} subtitle={obj.subtitle} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="px-5 py-8">
                                <h2 className="text-white text-[24px] font-black text-center mb-2">Personnalise ton expérience BroReps</h2>
                                <p className="text-[#71717a] text-[13px] text-center mb-8 max-w-sm mx-auto leading-relaxed">
                                    Réponds à ces quelques questions pour optimiser ton parcours et débloquer un accompagnement 100% adapté à ton profil.
                                </p>
                                <div className="flex flex-col gap-8 max-w-lg mx-auto">
                                    <div>
                                        <h3 className="text-white font-bold text-[15px] mb-1">Ton âge</h3>
                                        <p className="text-[#71717a] text-[12px] mb-3">Pour que l'IA adapte ton parcours à ton niveau actuel.</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['16–18 ans', '18–21 ans', '21–25 ans', '25+ ans'].map(age => (
                                                <ListCard key={age} selected={ageRange === age} onClick={() => setAgeRange(age)} icon={User} title={age} />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-[15px] mb-1">Depuis quand crées-tu du contenu ?</h3>
                                        <p className="text-[#71717a] text-[12px] mb-3">Indique ton expérience pour que ton plan soit calibré au bon niveau.</p>
                                        <div className="flex flex-col gap-2">
                                            {[
                                                { id: 'beginner', icon: Rocket, title: 'Je démarre tout juste', subtitle: '(moins de 30 jours)' },
                                                { id: 'months', icon: Calendar, title: 'Je crée depuis quelques mois', subtitle: '(1 à 6 mois)' },
                                                { id: 'active_exp', icon: Activity, title: 'Je suis actif depuis un moment', subtitle: '(6 à 12 mois)' },
                                                { id: 'confirmed', icon: Award, title: 'Créateur confirmé', subtitle: '(1 an et +)' },
                                            ].map(exp => (
                                                <ListCard key={exp.id} selected={experience === exp.id} onClick={() => setExperience(exp.id)} icon={exp.icon} title={exp.title} subtitle={exp.subtitle} />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-[15px] mb-1">Ta fréquence de publication</h3>
                                        <p className="text-[#71717a] text-[12px] mb-3">Pour analyser ton rythme et optimiser ta montée en puissance.</p>
                                        <div className="flex flex-col gap-2">
                                            {[
                                                { id: 'occasional', icon: Clock, title: 'Occasionnelle', subtitle: '(rarement)' },
                                                { id: 'regular', icon: Calendar, title: 'Régulière', subtitle: '(1–2 fois/semaine)' },
                                                { id: 'intensive', icon: Activity, title: 'Intensive', subtitle: '(3–5 fois/semaine)' },
                                                { id: 'daily', icon: BarChart2, title: 'Quotidienne', subtitle: '(tous les jours)' },
                                            ].map(freq => (
                                                <ListCard key={freq.id} selected={frequency === freq.id} onClick={() => setFrequency(freq.id)} icon={freq.icon} title={freq.title} subtitle={freq.subtitle} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="flex flex-col justify-center min-h-[calc(100vh-120px)] px-6 py-8">
                                <h2 className="text-white text-[26px] font-black text-center mb-2">Connecte tes réseaux</h2>
                                <p className="text-[#71717a] text-[14px] text-center mb-8 max-w-sm mx-auto leading-relaxed">
                                    Associe ton compte TikTok ou Instagram pour que BroReps suive ta croissance en temps réel.
                                </p>
                                <div className="max-w-sm mx-auto w-full flex flex-col gap-3">
                                    <div className="flex gap-2">
                                        {(['tiktok', 'instagram'] as const).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => { setPlatform(p); setSocialError(null); }}
                                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-[14px] font-medium transition-all cursor-pointer ${platform === p ? 'border-brand-primary bg-brand-primary/10 text-white' : 'border-[#1e1e1e] bg-[#111] text-[#71717a] hover:border-white/15'}`}
                                            >
                                                {p === 'tiktok' ? <TikTokIcon /> : <Instagram className="w-5 h-5" />}
                                                {p === 'tiktok' ? 'TikTok' : 'Instagram'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className={`flex items-center gap-2 bg-[#111] border-2 rounded-xl px-3 py-3 transition-colors ${socialError ? 'border-red-500/40' : 'border-[#1e1e1e] focus-within:border-brand-primary/50'}`}>
                                        <span className="text-[#3f3f46] text-[14px] select-none">@</span>
                                        <input
                                            type="text"
                                            value={socialUsername}
                                            onChange={e => { setSocialUsername(e.target.value); setSocialError(null); }}
                                            onKeyDown={e => { if (e.key === 'Enter' && !socialDone) handleSocialLink(); }}
                                            placeholder={platform === 'tiktok' ? 'ton_pseudo_tiktok' : 'ton_pseudo_instagram'}
                                            className="flex-1 bg-transparent text-white text-[14px] placeholder-[#3f3f46] outline-none"
                                            disabled={socialDone}
                                            autoFocus
                                        />
                                        {socialDone && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
                                    </div>
                                    {!socialDone && (
                                        <button
                                            onClick={handleSocialLink}
                                            disabled={!socialUsername.trim() || socialLoading}
                                            className="w-full py-3 bg-brand-primary hover:bg-[#00BF3F] disabled:opacity-40 text-white text-[14px] font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            {socialLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                            Associer mon compte
                                        </button>
                                    )}
                                    {socialError && <p className="text-red-400 text-[12px] text-center">{socialError}</p>}
                                    {socialDone && (
                                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl px-4 py-3">
                                            <Check className="w-4 h-4 text-brand-primary shrink-0" />
                                            <span className="text-brand-primary text-[13px] font-medium">@{socialUsername.replace(/^@/, '')} associé !</span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 6 && (
                            <div className="px-5 py-8">
                                <h2 className="text-white text-[26px] font-black text-center mb-2">Évalue tes compétences</h2>
                                <p className="text-[#71717a] text-[14px] text-center mb-8">Note-toi sur 10 — on suivra ta progression dans le temps.</p>
                                <div className="flex flex-col gap-4 max-w-sm mx-auto">
                                    {[
                                        { id: 'discipline', name: 'Discipline', icon: Zap },
                                        { id: 'creation', name: 'Création', icon: Video },
                                        { id: 'strategie', name: 'Stratégie', icon: Target },
                                        { id: 'energie', name: 'Énergie', icon: Flame },
                                        { id: 'communication', name: 'Communication', icon: Users },
                                    ].map(cat => {
                                        const Icon = cat.icon;
                                        return (
                                            <div key={cat.id} className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-[#1c1c1c] border border-white/5 flex items-center justify-center shrink-0">
                                                    <Icon className="w-4 h-4 text-[#a1a1aa]" />
                                                </div>
                                                <span className="text-[13px] text-white w-24 shrink-0">{cat.name}</span>
                                                <input
                                                    type="range" min={1} max={10} step={1}
                                                    value={scores[cat.id] ?? 5}
                                                    onChange={e => setScores(s => ({ ...s, [cat.id]: Number(e.target.value) }))}
                                                    className="flex-1" style={{ accentColor: '#00A336' }}
                                                />
                                                <span className="text-brand-primary text-[14px] font-bold w-5 text-right shrink-0">{scores[cat.id] ?? 5}</span>
                                            </div>
                                        );
                                    })}
                                    <textarea
                                        value={reflection}
                                        onChange={e => setReflection(e.target.value)}
                                        placeholder="Ta réflexion du moment (optionnel)…"
                                        rows={2}
                                        className="w-full bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-[#3f3f46] outline-none focus:border-brand-primary/50 resize-none transition-colors mt-2"
                                    />
                                    {notesDone && (
                                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl px-4 py-3">
                                            <Check className="w-4 h-4 text-brand-primary shrink-0" />
                                            <span className="text-brand-primary text-[13px] font-medium">Notes sauvegardées !</span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 7 && (
                            <div className="flex flex-col px-5 py-8" style={{ minHeight: 'calc(100vh - 120px)' }}>
                                <h2 className="text-white text-[24px] font-black text-center mb-1">Pose une question au Coach IA</h2>
                                <p className="text-[#71717a] text-[13px] text-center mb-5">Il est déjà calibré sur ton profil. Envoie un message pour continuer.</p>
                                <div className="bg-[#080c09] border border-white/6 rounded-xl p-3 flex flex-col gap-2 overflow-y-auto mb-3" style={{ minHeight: 180, maxHeight: 260 }}>
                                    {aiMessages.map((m, i) => (
                                        <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {m.role === 'assistant' && (
                                                <div className="w-6 h-6 rounded-full bg-brand-primary/15 border border-brand-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Sparkles className="w-3 h-3 text-brand-primary" />
                                                </div>
                                            )}
                                            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-brand-primary/15 border border-brand-primary/20 text-white' : 'bg-white/4 border border-white/6 text-[#e4e4e7]'}`}>
                                                {m.content || (
                                                    <span className="flex gap-1 items-center">
                                                        <span className="w-1.5 h-1.5 bg-[#71717a] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <span className="w-1.5 h-1.5 bg-[#71717a] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <span className="w-1.5 h-1.5 bg-[#71717a] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                                {!aiDone && aiMessages.length <= 1 && (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {['Comment percer sur TikTok ?', 'Stratégie pour gagner des abonnés', 'Idée de short viral ?'].map(s => (
                                            <button key={s} onClick={() => handleAiSend(s)}
                                                className="px-3 py-1.5 bg-[#111] border border-[#1e1e1e] rounded-lg text-[12px] text-[#a1a1aa] hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={aiInput}
                                        onChange={e => setAiInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleAiSend(); }}
                                        placeholder="Pose ta question…"
                                        disabled={aiLoading}
                                        className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-3 text-[13px] text-white placeholder-[#3f3f46] outline-none focus:border-brand-primary/50 transition-colors disabled:opacity-50"
                                    />
                                    <button
                                        onClick={() => handleAiSend()}
                                        disabled={!aiInput.trim() || aiLoading}
                                        className="w-11 h-11 bg-brand-primary hover:bg-[#00BF3F] disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                    >
                                        {aiLoading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 8 && (
                            <div className="flex flex-col items-center justify-center min-h-screen px-8 py-12 text-center">
                                <motion.div
                                    initial={{ scale: 0.7, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 16 }}
                                    className="w-20 h-20 rounded-3xl bg-brand-primary/15 border border-brand-primary/25 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,163,54,0.2)]"
                                >
                                    <PlayCircle className="w-10 h-10 text-brand-primary" />
                                </motion.div>
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}>
                                    <h2 className="text-white text-[28px] font-black mb-3">Tout est prêt ! 🎉</h2>
                                    <p className="text-[#71717a] text-[14px] leading-relaxed max-w-xs mx-auto mb-8">
                                        Ton profil est configuré. Lance ton premier module et commence à construire ta présence sur les réseaux !
                                    </p>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
                                    className="w-full max-w-sm bg-[#0c160d] border border-brand-primary/20 rounded-2xl p-5 flex items-center gap-4 text-left mb-8"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-brand-primary/15 border border-brand-primary/20 flex items-center justify-center shrink-0">
                                        <span className="text-brand-primary text-[15px] font-black">01</span>
                                    </div>
                                    <div>
                                        <p className="text-white text-[15px] font-bold">Bienvenue dans ton écosystème</p>
                                        <p className="text-[#71717a] text-[12px] mt-0.5">Module 1 · Débloqué · Gratuit</p>
                                    </div>
                                    <div className="ml-auto shrink-0">
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-primary/15 border border-brand-primary/20 rounded-full text-[11px] text-brand-primary font-semibold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                                            Disponible
                                        </span>
                                    </div>
                                </motion.div>
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.31 }}
                                    onClick={finish}
                                    className="flex items-center gap-2 px-8 py-4 bg-brand-primary hover:bg-[#00BF3F] text-white text-[15px] font-bold rounded-xl transition-colors cursor-pointer shadow-[0_0_30px_rgba(0,163,54,0.25)]"
                                >
                                    <PlayCircle className="w-5 h-5" /> Lancer le module
                                </motion.button>
                                <button onClick={dismiss} className="mt-4 text-[#3f3f46] text-[13px] hover:text-[#71717a] transition-colors cursor-pointer">
                                    Aller au dashboard
                                </button>
                            </div>
                        )}

                    </motion.div>
                </AnimatePresence>
            </div>

            {step > 0 && step < 8 && (
                <div className="shrink-0 px-5 py-4 border-t border-white/4 flex items-center justify-between relative z-10" style={{ background: 'rgba(6,10,7,0.92)', backdropFilter: 'blur(8px)' }}>
                    <button onClick={goBack} className="flex items-center gap-1.5 text-white/50 text-[14px] font-medium hover:text-white transition-colors cursor-pointer">
                        <ChevronLeft className="w-4 h-4" /> Retour
                    </button>
                    <div className="flex items-center gap-3">
                        {step === 5 && (
                            <button onClick={goNext} className="text-[#3f3f46] text-[13px] hover:text-[#71717a] transition-colors cursor-pointer">
                                Passer
                            </button>
                        )}
                        <button
                            onClick={goNext}
                            disabled={nextDisabled || notesLoading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-[#00BF3F] disabled:opacity-35 disabled:cursor-not-allowed text-white text-[14px] font-bold rounded-xl transition-colors cursor-pointer"
                        >
                            {notesLoading && step === 6 && <Loader2 className="w-4 h-4 animate-spin" />}
                            Continuer <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}


