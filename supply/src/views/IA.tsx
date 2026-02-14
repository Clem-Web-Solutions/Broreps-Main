import { Bot, Send, Sparkles, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { api } from "../libs/api";

interface Message {
    id: string;
    text: string;
    isBot: boolean;
    timestamp: Date;
}

export function AI() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "Bonjour ! Je suis votre assistant IA. Je peux vous aider à analyser vos commandes, statistiques, services et répondre à toutes vos questions sur vos données. Comment puis-je vous aider ?",
            isBot: true,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const quickQuestions = [
        "Combien de commandes j'ai?",
        "Mes dernières commandes",
        "Mes dépenses",
        "Mes statistiques",
        "Commandes en cours"
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (messageText?: string) => {
        const textToSend = messageText || input;
        if (!textToSend.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: textToSend,
            isBot: false,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await api.sendChatMessage(textToSend);
            
            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response.response,
                isBot: true,
                timestamp: new Date(response.timestamp)
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error: any) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: `❌ Erreur: ${error.message || 'Une erreur est survenue'}`,
                isBot: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickQuestion = (question: string) => {
        handleSend(question);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatMessage = (text: string) => {
        // Convert markdown-style formatting to HTML
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
            .replace(/\n/g, '<br />');
        return formatted;
    };

    return (
        <div className="flex flex-col gap-6 pb-12 h-[calc(100vh-120px)]">

            {/* Header / Config Bar */}
            <div className="flex items-center justify-between p-6 bg-surface/20 border border-white/5 rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-primary border border-primary/20">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-white">Assistant IA</h1>
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-[10px] font-bold uppercase rounded-full border border-green-500/20">Powered by AI</span>
                        </div>
                        <p className="text-slate-400 text-xs">Posez vos questions sur vos commandes et statistiques</p>
                    </div>
                </div>
            </div>

            {/* Quick Questions */}
            {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 justify-center">
                    {quickQuestions.map((question, i) => (
                        <button
                            key={i}
                            onClick={() => handleQuickQuestion(question)}
                            disabled={loading}
                            className="px-4 py-2 bg-surface/40 hover:bg-surface border border-white/10 hover:border-primary/30 text-slate-300 hover:text-white rounded-lg text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {question}
                        </button>
                    ))}
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 bg-surface/20 border border-white/5 rounded-3xl p-6 flex flex-col relative overflow-hidden">

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto space-y-6 pr-4">

                    {messages.map((message) => (
                        <div key={message.id} className={`flex gap-4 ${message.isBot ? '' : 'flex-row-reverse'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                message.isBot 
                                    ? 'bg-green-500/10 text-primary border border-primary/20' 
                                    : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            }`}>
                                {message.isBot ? <Bot size={20} /> : <User size={20} />}
                            </div>
                            <div className={`border rounded-2xl p-4 max-w-[80%] ${
                                message.isBot 
                                    ? 'bg-surface border-white/10 rounded-tl-none' 
                                    : 'bg-blue-500/10 border-blue-500/20 rounded-tr-none'
                            }`}>
                                <div 
                                    className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
                                />
                                <div className="text-xs text-slate-500 mt-2">
                                    {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                <Bot size={20} />
                            </div>
                            <div className="bg-surface border border-white/10 rounded-2xl rounded-tl-none p-4">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />

                </div>

                {/* Input Area */}
                <div className="mt-6 relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        placeholder="Posez votre question..."
                        className="w-full bg-[#0f172a] border border-white/10 rounded-xl pl-6 pr-14 py-4 text-white text-sm placeholder-slate-500 outline-none focus:border-green-500/50 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button 
                        onClick={() => handleSend()}
                        disabled={loading || !input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary hover:bg-secondary text-black rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}