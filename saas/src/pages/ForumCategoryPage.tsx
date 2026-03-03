import { ArrowLeft, Send, Sparkles, Users, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { forumApi, type ForumMessage } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function ForumCategoryPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ForumMessage[]>([]);
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    useEffect(() => {
        if (id) {
            forumApi.list(id).then(r => setMessages(r.messages)).catch(error => console.error(error));
        }
    }, [id]);

    const handlePost = async () => {
        if (!message.trim() || posting) return;
        setPosting(true);
        try {
            const r = await forumApi.post(id!, message.trim());
            setMessages(prev => [r.message, ...prev]);
            setMessage('');
        } catch (error) {
            console.error(error);
        } finally {
            setPosting(false);
        }
    };

    const handleDelete = async (msgId: number) => {
        try {
            await forumApi.delete(msgId);
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (error) {
            console.error(error);
        }
    };

    const forumData = {
        debutants: {
            title: "Débutants & Mise en route",
            icon: "🚀",
            iconBg: "bg-[#022c22]",
            themeColor: "text-[#34d399]",
            btnBg: "bg-[#34d399]/20",
            btnHover: "hover:bg-[#34d399]/30",
            btnText: "text-[#34d399]",
            emptyText: "Aucun message pour le moment. Sois le premier à lancer la discussion !"
        },
        tiktok: {
            title: "TikTok & Shorts",
            icon: "📱",
            iconBg: "bg-[#4c0519]",
            themeColor: "text-[#f43f5e]",
            btnBg: "bg-[#f43f5e]/20",
            btnHover: "hover:bg-[#f43f5e]/30",
            btnText: "text-[#f43f5e]",
            emptyText: "Aucun message pour le moment. Sois le premier à lancer la discussion !"
        },
        instagram: {
            title: "Instagram & Reels",
            icon: "📸",
            iconBg: "bg-[#4c0519]",
            themeColor: "text-[#fb7185]",
            btnBg: "bg-[#fb7185]/20",
            btnHover: "hover:bg-[#fb7185]/30",
            btnText: "text-[#fb7185]",
            emptyText: "Aucun message pour le moment. Sois le premier à lancer la discussion !"
        },
        strategie: {
            title: "Stratégie & contenu",
            icon: "🎯",
            iconBg: "bg-[#172554]",
            themeColor: "text-[#60a5fa]",
            btnBg: "bg-[#60a5fa]/20",
            btnHover: "hover:bg-[#60a5fa]/30",
            btnText: "text-[#60a5fa]",
            emptyText: "Aucun message pour le moment. Sois le premier à lancer la discussion !"
        },
        resultats: {
            title: "Résultats & retours",
            icon: "📊",
            iconBg: "bg-[#451a03]",
            themeColor: "text-[#fbbf24]",
            btnBg: "bg-[#fbbf24]/20",
            btnHover: "hover:bg-[#fbbf24]/30",
            btnText: "text-[#fbbf24]",
            emptyText: "Aucun message pour le moment. Sois le premier à lancer la discussion !"
        },
        general: {
            title: "Discussion générale",
            icon: "💬",
            iconBg: "bg-[#2e1065]",
            themeColor: "text-[#c084fc]",
            btnBg: "bg-[#c084fc]/20",
            btnHover: "hover:bg-[#c084fc]/30",
            btnText: "text-[#c084fc]",
            emptyText: "Aucun message pour le moment. Sois le premier à lancer la discussion !"
        }
    };

    const data = forumData[id as keyof typeof forumData] || forumData.debutants;

    return (
        <div className="flex flex-col items-center w-full pb-12">
            <div className="w-full max-w-[900px] flex flex-col px-4 md:px-8">

                {/* Back Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-[13px] font-medium text-[#a1a1aa] hover:text-white transition-colors cursor-pointer mb-8 self-start"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Dashboard
                </button>

                {/* Forum Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="flex items-center gap-4 mb-6"
                >
                    {/* Big Icon Box */}
                    <div className={`w-[60px] h-[60px] rounded-2xl ${data.iconBg} border border-white/5 flex items-center justify-center flex-shrink-0 shadow-lg`}>
                        <span className="text-[28px]">{data.icon}</span>
                    </div>

                    <div className="flex flex-col justify-center">
                        <h1 className={`${data.themeColor} text-[28px] md:text-[32px] font-black tracking-tight leading-tight mb-1`}>
                            {data.title}
                        </h1>
                        <div className="flex items-center gap-1.5 text-[#a1a1aa] text-[13px] font-medium">
                            <Users className="w-4 h-4" strokeWidth={2.5} />
                            <span className="text-[#a1a1aa] text-[13px] font-medium">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Banner Guideline */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] mb-6 shadow-sm"
                >
                    <Sparkles className={`w-4 h-4 ${data.themeColor} flex-shrink-0`} />
                    <span className="text-[#a1a1aa] text-[13px] font-medium">
                        Sois respectueux, bienveillant et aide la communauté à grandir
                    </span>
                </motion.div>

                {/* Composer Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="w-full bg-[#050505] border border-white/5 rounded-2xl p-4 flex flex-col focus-within:border-white/10 transition-colors mb-20 shadow-sm"
                >
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Partage ton message avec la communauté..."
                        className="w-full bg-transparent text-white text-[15px] placeholder-[#a1a1aa] outline-none min-h-[140px] resize-none mb-4"
                    />

                    <div className="flex items-center justify-between mt-auto">
                        <span className="text-[#52525b] text-[12px] font-medium">
                            0 / 10 min
                        </span>

                        <button
                            onClick={handlePost}
                            disabled={posting || !message.trim()}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-[10px] ${data.btnBg} ${data.btnText} ${data.btnHover} transition-colors cursor-pointer font-bold text-[14px] disabled:opacity-50`}
                        >
                            <Send className="w-4 h-4" strokeWidth={2.5} />
                            {posting ? 'Publication...' : 'Publier'}
                        </button>
                    </div>
                </motion.div>

                {/* Messages list */}
                {messages.length > 0 ? (
                    <div className="flex flex-col gap-4 mb-8">
                        {messages.map(msg => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                className="w-full bg-[#09090b] border border-white/5 rounded-2xl p-5 shadow-sm hover:border-white/10 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[13px] font-bold ${data.themeColor}`}>{msg.author_name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-[#52525b]">{new Date(msg.created_at).toLocaleDateString('fr-FR')}</span>
                                        {user?.id === msg.author_id && (
                                            <button onClick={() => handleDelete(msg.id)} className="text-[#52525b] hover:text-red-400 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[#d4d4d8] text-[14px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                        className="flex flex-col items-center justify-center p-10"
                    >
                        <div className="text-[52px] mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                            {data.icon}
                        </div>
                        <p className="text-[#a1a1aa] text-[15px] font-medium text-center">
                            {data.emptyText}
                        </p>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
