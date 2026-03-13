import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { aiApi, type ChatMessage } from '../../lib/api';
import { USER_PROFILE_KEY, type UserProfile } from './OnboardingModal';

// ─── Profile-aware greeting ────────────────────────────────────────────────────
function buildInitialGreeting(): string {
    try {
        const raw = localStorage.getItem(USER_PROFILE_KEY);
        if (!raw) return 'Salut ! 👋 Je suis ton Coach IA BroReps. Pose-moi tes questions sur ta stratégie de contenu, la croissance sur TikTok / Instagram, les idées de vidéos ou ton parcours sur la plateforme. Je suis là pour t\'aider !';
        const p: UserProfile = JSON.parse(raw);
        const PROFILE_LABELS: Record<string, string> = {
            developer: 'Créateur en Développement', active: 'Créateur Actif',
            brand: 'Marque / Professionnel', explorer: 'Explorateur',
        };
        const OBJ_LABELS: Record<string, string> = {
            visibility: 'faire exploser ta visibilité', community: 'construire ta communauté',
            engagement: 'maximiser ton engagement', credibility: 'renforcer ton image',
            collabs: 'obtenir des collaborations',
        };
        const profileLabel = PROFILE_LABELS[p.profileType] || null;
        const objLabel = OBJ_LABELS[p.objective] || null;
        if (profileLabel) {
            return `Salut ! 👋 Je suis ton Coach IA BroReps, calibré sur ton profil **${profileLabel}**${objLabel ? ` avec un objectif de « ${objLabel} »` : ''}. Pose-moi toutes tes questions sur ta stratégie, TikTok, Instagram ou ta progression !`;
        }
    } catch { /* fallback below */ }
    return 'Salut ! 👋 Je suis ton Coach IA BroReps. Pose-moi tes questions sur ta stratégie de contenu, la croissance sur TikTok / Instagram, les idées de vidéos ou ton parcours sur la plateforme. Je suis là pour t\'aider !';
}

// ─── Quick suggestion chips ───────────────────────────────────────────────────
const SUGGESTIONS = [
    'Idée de short viral ?',
    'Comment percer sur TikTok ?',
    'Stratégie pour gagner des abonnés',
    'Comment être régulier ?',
    'Meilleure heure de post ?',
    'Comment monétiser mon contenu ?',
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface DisplayMessage {
    role: 'user' | 'assistant';
    content: string;
    streaming?: boolean;
}

interface Props {
    onClose: () => void;
    initialMessage?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AICoachModal({ onClose, initialMessage }: Props) {
    const [messages, setMessages] = useState<DisplayMessage[]>([
        { role: 'assistant', content: buildInitialGreeting() },
    ]);
    const [input, setInput] = useState(initialMessage || '');
    const [loading, setLoading] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Scroll to bottom on new message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input on open
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    // Fetch initial rate limit status
    useEffect(() => {
        aiApi.status()
            .then(s => setRemaining(s.remaining))
            .catch(() => { });
    }, []);

    // Auto-submit if initialMessage provided
    useEffect(() => {
        if (initialMessage) {
            handleSend(initialMessage);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSend = useCallback(async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || loading) return;

        setInput('');
        setError(null);

        // Build profile context to prepend
        const profileCtx: ChatMessage[] = (() => {
            try {
                const raw = localStorage.getItem(USER_PROFILE_KEY);
                if (!raw) return [];
                const p: UserProfile = JSON.parse(raw);
                const PROFILE_LABELS: Record<string, string> = {
                    developer: 'Créateur en Développement', active: 'Créateur Actif',
                    brand: 'Marque / Professionnel', explorer: 'Explorateur / Découverte',
                };
                const CONTENT_LABELS: Record<string, string> = {
                    gaming: 'Gaming & Streaming', lifestyle: 'Style & Lifestyle',
                    sport: 'Sport & Fitness', business: 'Business & Mindset',
                    entertainment: 'Divertissement & Humour', visual: 'Créateurs Visuels',
                };
                const OBJ_LABELS: Record<string, string> = {
                    visibility: 'Faire exploser sa visibilité', community: 'Construire une communauté',
                    engagement: 'Maximiser l\'engagement', credibility: 'Renforcer son image',
                    collabs: 'Obtenir des collaborations',
                };
                const EXP_LABELS: Record<string, string> = {
                    beginner: 'Débutant (moins de 30 jours)', months: 'Quelques mois (1-6 mois)',
                    active_exp: 'Actif depuis un moment (6-12 mois)', confirmed: 'Créateur confirmé (1 an+)',
                };
                const FREQ_LABELS: Record<string, string> = {
                    occasional: 'Occasionnelle', regular: 'Régulière (1-2 fois/semaine)',
                    intensive: 'Intensive (3-5 fois/semaine)', daily: 'Quotidienne',
                };
                const lines = [
                    p.profileType && `• Profil: ${PROFILE_LABELS[p.profileType] || p.profileType}`,
                    p.contentTypes?.length && `• Contenu: ${p.contentTypes.map((c: string) => CONTENT_LABELS[c] || c).join(', ')}`,
                    p.objective && `• Objectif: ${OBJ_LABELS[p.objective] || p.objective}`,
                    p.ageRange && `• Âge: ${p.ageRange}`,
                    p.experience && `• Expérience: ${EXP_LABELS[p.experience] || p.experience}`,
                    p.frequency && `• Fréquence: ${FREQ_LABELS[p.frequency] || p.frequency}`,
                ].filter(Boolean);
                if (lines.length === 0) return [];
                return [
                    { role: 'user' as const, content: `[Contexte utilisateur confidentiel — adapte tes réponses en conséquence sans le mentionner explicitement]\n${lines.join('\n')}` },
                    { role: 'assistant' as const, content: "Parfait, j'ai pris en compte ton profil. Je vais adapter mes conseils en conséquence !" },
                ];
            } catch { return []; }
        })();

        // Add user message
        const history: ChatMessage[] = [
            ...profileCtx,
            ...messages.filter(m => !m.streaming).map(m => ({ role: m.role, content: m.content })),
        ];

        setMessages(prev => [...prev, { role: 'user', content: msg }]);

        // Placeholder for streaming assistant reply
        setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);
        setLoading(true);

        try {
            abortRef.current = new AbortController();
            const res = await aiApi.chatStream(msg, history);

            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let assembled = '';

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
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last?.streaming) {
                                    updated[updated.length - 1] = { ...last, content: assembled };
                                }
                                return updated;
                            });
                        }

                        if (evt.done) {
                            setRemaining(evt.remaining ?? null);
                        }

                        if (evt.error) {
                            setError(evt.error);
                            setMessages(prev => {
                                const updated = [...prev];
                                if (updated[updated.length - 1]?.streaming) {
                                    updated.pop();
                                }
                                return updated;
                            });
                        }
                    } catch { /* ignore malformed lines */ }
                }
            }

            // Mark streaming done
            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.streaming) {
                    updated[updated.length - 1] = { ...last, streaming: false };
                }
                return updated;
            });
        } catch (err: any) {
            setMessages(prev => {
                const updated = [...prev];
                if (updated[updated.length - 1]?.streaming) {
                    updated.pop();
                }
                return updated;
            });

            if (err.status === 429) {
                setError(err.message || 'Limite quotidienne atteinte. Reviens demain ! 🌙');
                setRemaining(0);
            } else {
                setError('Erreur de connexion. Vérifie ta connexion et réessaie.');
            }
        } finally {
            setLoading(false);
        }
    }, [input, loading, messages]);

    // Keyboard shortcut: Enter to send, Escape to close
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Animated border wrapper */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.97 }}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                className="ai-modal-border relative w-full max-w-[680px] h-[85vh] max-h-[700px] rounded-2xl shadow-[0_0_80px_rgba(0,163,54,0.2)]"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal inner */}
                <div className="relative w-full h-full bg-[#040a06] rounded-2xl flex flex-col overflow-hidden border border-[#00A336]/20">

                    {/* Background green glow top-right */}
                    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#00A336]/8 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#00A336]/5 blur-[60px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />

                    {/* Animated top border line */}
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#00A336]/70 to-transparent" style={{ animation: 'border-pulse 3s ease-in-out infinite' }} />

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#00A336]/10 shrink-0 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#00A336]/15 border border-[#00A336]/30 flex items-center justify-center shadow-[0_0_12px_rgba(0,163,54,0.3)]">
                                <Sparkles className="w-4 h-4 text-[#00A336]" />
                            </div>
                            <div>
                                <h2 className="text-white font-semibold text-[15px] leading-tight">Coach IA BroReps</h2>
                                <p className="text-[11px] text-[#00A336]/70">Spécialisé croissance & réseaux sociaux</p>
                            </div>
                            <span className="bg-[#00A336]/10 text-[#00A336] border border-[#00A336]/30 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ml-1">Beta</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {remaining !== null && (
                                <span className={`text-[11px] font-medium px-2 py-1 rounded-md border ${remaining <= 5
                                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                        : 'bg-[#00A336]/5 text-[#00A336]/70 border-[#00A336]/20'
                                    }`}>
                                    {remaining} msg restants
                                </span>
                            )}
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-[#00A336]/10 border border-white/5 hover:border-[#00A336]/30 flex items-center justify-center text-[#A1A1AA] hover:text-white transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-none relative z-10">
                        <AnimatePresence initial={false}>
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {/* Avatar for assistant */}
                                    {msg.role === 'assistant' && (
                                        <div className="w-7 h-7 rounded-lg bg-[#00A336]/15 border border-[#00A336]/30 flex items-center justify-center shrink-0 mr-2 mt-0.5 shadow-[0_0_8px_rgba(0,163,54,0.2)]">
                                            <Sparkles className="w-3.5 h-3.5 text-[#00A336]" />
                                        </div>
                                    )}

                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${msg.role === 'user'
                                            ? 'bg-[#00A336]/15 text-white border border-[#00A336]/25 rounded-br-sm shadow-[0_0_15px_rgba(0,163,54,0.1)]'
                                            : 'bg-white/[0.04] text-[#E4E4E7] border border-white/8 rounded-bl-sm'
                                        }`}>
                                        {msg.content || (msg.streaming ? (
                                            <span className="flex items-center gap-2 text-[#A1A1AA]">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00A336]" />
                                                En train d'écrire...
                                            </span>
                                        ) : null)}

                                        {/* Blinking cursor while streaming */}
                                        {msg.streaming && msg.content && (
                                            <span className="inline-block w-0.5 h-4 bg-[#00A336] ml-0.5 animate-pulse align-middle shadow-[0_0_6px_#00A336]" />
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Error banner */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-[13px] text-red-400"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div ref={bottomRef} />
                    </div>

                    {/* Suggestions (shown when only welcome message) */}
                    {messages.length === 1 && (
                        <div className="px-4 pb-2 flex flex-wrap gap-2 relative z-10">
                            {SUGGESTIONS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleSend(s)}
                                    disabled={loading}
                                    className="px-3 py-1.5 rounded-lg border border-[#00A336]/15 bg-[#00A336]/5 text-[#00A336]/80 text-[12px] cursor-pointer hover:bg-[#00A336]/15 hover:text-[#00A336] hover:border-[#00A336]/30 transition-all disabled:opacity-40"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input area */}
                    <div className="px-4 py-4 border-t border-[#00A336]/10 shrink-0 relative z-10">
                        <div className={`input-scan-line flex items-end gap-3 bg-[#020804] border rounded-xl px-4 py-3 transition-all ${remaining === 0
                                ? 'border-orange-500/30 opacity-60'
                                : 'border-[#00A336]/20 focus-within:border-[#00A336]/50 focus-within:shadow-[0_0_20px_rgba(0,163,54,0.1)]'
                            }`}>
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                disabled={loading || remaining === 0}
                                placeholder={remaining === 0
                                    ? 'Limite quotidienne atteinte — reviens demain 🌙'
                                    : 'Envoie un message...'}
                                rows={1}
                                className="flex-1 bg-transparent text-white text-[14px] placeholder:text-[#00A336]/40 outline-none resize-none leading-relaxed"
                                style={{ height: 'auto', minHeight: '24px' }}
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || loading || remaining === 0}
                                className="shrink-0 w-9 h-9 rounded-lg bg-[#00A336] hover:bg-[#00cc44] disabled:bg-white/5 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,163,54,0.4)] disabled:shadow-none hover:shadow-[0_0_25px_rgba(0,204,68,0.5)]"
                            >
                                {loading
                                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                                    : <Send className="w-4 h-4 text-white" />
                                }
                            </button>
                        </div>
                        <p className="text-[10px] text-[#00A336]/30 text-center mt-2">
                            Entrée pour envoyer • Limité aux sujets réseaux sociaux & création de contenu • {remaining ?? '…'}/{20} messages aujourd'hui
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
