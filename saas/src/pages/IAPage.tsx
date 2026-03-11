import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, AlertCircle } from 'lucide-react';
import { aiApi } from '../lib/api';
import type { ChatMessage } from '../lib/api';

interface Message {
    id: number;
    text: string;
    isBot: boolean;
    timestamp: Date;
    streaming?: boolean;
}

const quickQuestions = [
    'Résume mon parcours sur BroReps',
    'Quelles formations devrais-je suivre ?',
    'Aide-moi à créer un plan d\'action',
    'Donne-moi des conseils pour progresser',
];

export default function IAPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            text: 'Bonjour ! Je suis ton assistant IA BroReps. Je peux t\'accompagner dans ton apprentissage, répondre à tes questions sur les formations, et t\'aider à définir tes objectifs. Comment puis-je t\'aider ?',
            isBot: true,
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [dailyLimit, setDailyLimit] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const historyRef = useRef<ChatMessage[]>([]);

    useEffect(() => {
        aiApi.status().then((data) => {
            setRemaining(data.remaining);
            setDailyLimit(data.daily_limit);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (text?: string) => {
        const messageText = (text ?? input).trim();
        if (!messageText || loading) return;

        setInput('');
        setError(null);

        const userMsg: Message = {
            id: Date.now(),
            text: messageText,
            isBot: false,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);

        // Keep only last 10 messages for context
        const history = historyRef.current.slice(-10);
        historyRef.current.push({ role: 'user', content: messageText });

        const botMsgId = Date.now() + 1;
        setMessages((prev) => [
            ...prev,
            { id: botMsgId, text: '', isBot: true, timestamp: new Date(), streaming: true },
        ]);

        try {
            const response = await aiApi.chatStream(messageText, history);
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No stream');

            let fullText = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                // SSE format: lines starting with "data: "
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(data);
                            const token = parsed.choices?.[0]?.delta?.content ?? parsed.token ?? parsed.content ?? '';
                            if (token) {
                                fullText += token;
                                setMessages((prev) =>
                                    prev.map((m) =>
                                        m.id === botMsgId ? { ...m, text: fullText } : m
                                    )
                                );
                            }
                        } catch {
                            // plain text chunk
                            if (data) {
                                fullText += data;
                                setMessages((prev) =>
                                    prev.map((m) =>
                                        m.id === botMsgId ? { ...m, text: fullText } : m
                                    )
                                );
                            }
                        }
                    }
                }
            }

            historyRef.current.push({ role: 'assistant', content: fullText });

            // Mark streaming done
            setMessages((prev) =>
                prev.map((m) => (m.id === botMsgId ? { ...m, streaming: false } : m))
            );

            // Refresh rate limit counter
            aiApi.status().then((data) => setRemaining(data.remaining)).catch(() => {});
        } catch (err: unknown) {
            const e = err as Error & { status?: number };
            setMessages((prev) => prev.filter((m) => m.id !== botMsgId));
            historyRef.current.pop(); // remove last user push on error

            if (e.status === 429) {
                setError('Limite quotidienne atteinte. Reviens demain !');
            } else {
                setError(e.message || 'Une erreur est survenue. Réessaie dans un moment.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatMessage = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
            .replace(/\n/g, '<br />');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] min-h-200">

            {/* Scrollable chat area */}
            <div className="flex-1 overflow-y-auto">
                {messages.length === 1 ? (
                    /* ── Empty state: centered icon + tagline + suggestions ── */
                    <div className="flex flex-col items-center justify-center h-full gap-8 px-4 py-12">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-[#00A336]/10 border border-[#00A336]/20 flex items-center justify-center">
                                <Sparkles size={32} className="text-[#00A336]" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white mb-1">Coach IA BroReps</h1>
                                <p className="text-slate-400 text-sm">Pose tes questions, obtiens des conseils personnalisés.</p>
                            </div>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-1 w-full min-w-0 scrollbar-hide">
                            {quickQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(q)}
                                    disabled={loading}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#00A336]/30 text-slate-300 hover:text-white rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* ── Messages ── */
                    <div className="flex flex-col gap-6 py-6 px-2">
                        {messages.slice(1).map((message) => (
                            <div key={message.id} className={`flex gap-4 ${message.isBot ? '' : 'flex-row-reverse'}`}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    message.isBot
                                        ? 'bg-[#00A336]/10 text-[#00A336] border border-[#00A336]/20'
                                        : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                }`}>
                                    {message.isBot ? <Bot size={18} /> : <User size={18} />}
                                </div>
                                <div className={`border rounded-2xl p-4 max-w-[80%] ${
                                    message.isBot
                                        ? 'bg-white/[0.03] border-white/10 rounded-tl-none'
                                        : 'bg-blue-500/10 border-blue-500/20 rounded-tr-none'
                                }`}>
                                    {message.text ? (
                                        <div
                                            className="text-slate-300 text-sm leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
                                        />
                                    ) : (
                                        <div className="flex gap-2 items-center h-5">
                                            <div className="w-2 h-2 bg-[#00A336] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-[#00A336] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-[#00A336] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    )}
                                    {message.streaming && message.text && (
                                        <span className="inline-block w-0.5 h-4 bg-[#00A336] ml-0.5 animate-pulse align-middle" />
                                    )}
                                    <div className="text-xs text-slate-600 mt-2">
                                        {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm shrink-0">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            )}

            {/* Input — pinned at bottom */}
            <div className="shrink-0 pb-4">
                <div className="relative rounded-xl overflow-hidden p-[2px]">
                    {/* Spinning conic gradient — square centered on bar */}
                    <div
                        className="absolute animate-spin pointer-events-none"
                        style={{
                            width: '200vw',
                            height: '200vw',
                            top: '50%',
                            left: '50%',
                            marginLeft: '-100vw',
                            marginTop: '-100vw',
                            background: 'conic-gradient(from 0deg, transparent 0deg, #00A336 20deg, transparent 40deg, transparent 200deg, #00A336 220deg, transparent 240deg, transparent 360deg)',
                            animationDuration: '3s',
                            animationTimingFunction: 'linear',
                        }}
                    />
                    <div className="relative flex items-center bg-black rounded-[10px]">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            placeholder="Pose ta question..."
                            className="w-full bg-transparent pl-6 pr-14 py-4 text-white text-sm placeholder-slate-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={loading || !input.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#00A336] hover:bg-[#00bf3f] text-black rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
