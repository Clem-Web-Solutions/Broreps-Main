import { ArrowLeft, Send, Sparkles, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function ForumCategoryPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [message, setMessage] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

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
        <div className="flex flex-col items-center w-full min-h-screen pt-4 pb-12">
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
                            <span>0 message</span>
                        </div>
                    </div>
                </motion.div>

                {/* Banner Guideline */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-[#14321D] bg-[#0A1A0F] mb-6"
                >
                    <Sparkles className={`w-4 h-4 ${data.themeColor} flex-shrink-0`} />
                    <span className="text-[#a1a1aa] text-[13px] font-medium">
                        Sois respectueux, bienveillant et aide la communauté à grandir
                    </span>
                </motion.div>

                {/* Composer Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-[16px] p-4 flex flex-col focus-within:border-[#4f4f56] transition-colors mb-20 shadow-lg"
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

                        <button className={`flex items-center gap-2 px-5 py-2.5 rounded-[10px] ${data.btnBg} ${data.btnText} ${data.btnHover} transition-colors cursor-pointer font-bold text-[14px]`}>
                            <Send className="w-4 h-4" strokeWidth={2.5} />
                            Publier
                        </button>
                    </div>
                </motion.div>

                {/* Empty State */}
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

            </div>
        </div>
    );
}
