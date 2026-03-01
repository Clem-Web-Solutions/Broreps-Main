import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function HubPage() {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState('recent');

    // Scroll to top when mounted
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const filters = [
        { id: 'recent', icon: '⏳', label: 'Récent' },
        { id: 'populaire', icon: '🔥', label: 'Populaire' },
        { id: 'collab', icon: '🤝', label: 'Collab' }
    ];

    return (
        <div className="flex flex-col items-center w-full min-h-screen pt-4 pb-12">
            <div className="w-full max-w-[800px] flex flex-col px-4 md:px-8 min-h-[85vh]">

                {/* Back Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-[13px] font-medium text-[#a1a1aa] hover:text-white transition-colors cursor-pointer mb-8 self-start"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                </button>

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="mb-8"
                >
                    <h1 className="text-white text-[32px] md:text-[36px] font-black uppercase tracking-wide mb-1">
                        LE HUB
                    </h1>
                    <p className="text-[#A1A1AA] text-[14px] font-medium">
                        Partage, collabore & développe ta communauté naturellement.
                    </p>
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="flex flex-wrap items-center gap-3 mb-16"
                >
                    {filters.map(filter => {
                        const isActive = activeFilter === filter.id;
                        return (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full text-[13px] transition-all cursor-pointer ${isActive
                                    ? 'bg-[#00FF7F] text-black font-bold'
                                    : 'bg-[#131514] border border-[#1a1d1c] text-[#a1a1aa] hover:bg-[#1a1d1c] hover:text-white font-medium'
                                    }`}
                            >
                                <span className={isActive ? "" : "opacity-80"}>{filter.icon}</span>
                                {filter.label}
                            </button>
                        );
                    })}
                </motion.div>

                {/* Empty State */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                    className="flex-grow flex flex-col items-center justify-center flex-1 py-16"
                >
                    <div className="text-[32px] mb-4">
                        📭
                    </div>
                    <p className="text-[#A1A1AA] text-[15px] font-medium">
                        Aucun post pour ce filtre
                    </p>
                </motion.div>

                {/* Bottom Action Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="mt-auto pt-10"
                >
                    <button className="w-full py-4 bg-[#00FF7F] rounded-xl text-black font-semibold text-[14px] tracking-wide flex items-center justify-center gap-2 hover:bg-[#00e371] hover:scale-[1.01] transition-all cursor-pointer">
                        <Plus className="w-5 h-5" strokeWidth={2} />
                        PUBLIER MON PROFIL
                    </button>
                </motion.div>

            </div>
        </div>
    );
}
