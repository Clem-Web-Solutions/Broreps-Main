import { ArrowLeft, Plus, Heart, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { hubApi, type HubPost } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function HubPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeFilter, setActiveFilter] = useState('recent');
    const [posts, setPosts] = useState<HubPost[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [newType, setNewType] = useState<'post' | 'collab'>('post');
    const [posting, setPosting] = useState(false);

    // Scroll to top when mounted
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        hubApi.list(activeFilter).then(r => setPosts(r.posts)).catch(error => console.error(error));
    }, [activeFilter]);

    const handlePublish = async () => {
        if (!newContent.trim() || posting) return;
        setPosting(true);
        try {
            const r = await hubApi.post(newContent.trim(), newType);
            setPosts(prev => [r.post, ...prev]);
            setNewContent('');
            setShowModal(false);
        } catch (error) {
            console.error(error);
        } finally {
            setPosting(false);
        }
    };

    const handleLike = async (id: number) => {
        try {
            const r = await hubApi.like(id);
            setPosts(prev => prev.map(p => p.id === id ? { ...p, likes_count: r.likes_count, liked_by_me: r.liked } : p));
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await hubApi.delete(id);
            setPosts(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const filters = [
        { id: 'recent', icon: '⏳', label: 'Récent' },
        { id: 'populaire', icon: '🔥', label: 'Populaire' },
        { id: 'collab', icon: '🤝', label: 'Collab' }
    ];

    return (
        <div className="flex flex-col items-center w-full pb-12">
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
                                    ? 'bg-white/10 text-white font-medium border border-white/10 shadow-sm'
                                    : 'bg-white/[0.02] border border-white/5 text-[#a1a1aa] hover:bg-white/[0.04] hover:text-white font-medium'
                                    }`}
                            >
                                <span className={isActive ? "" : "opacity-80"}>{filter.icon}</span>
                                {filter.label}
                            </button>
                        );
                    })}
                </motion.div>

                {/* Posts list or Empty State */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                    className="flex-grow flex flex-col gap-4"
                >
                    {posts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-16">
                            <div className="text-[32px] mb-4">💭</div>
                            <p className="text-[#A1A1AA] text-[15px] font-medium">Aucun post pour ce filtre</p>
                        </div>
                    ) : posts.map(post => (
                        <div key={post.id} className="w-full bg-[#09090b] border border-white/5 rounded-2xl p-5 shadow-sm hover:border-white/10 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <span className="text-white font-medium text-[14px]">{post.author_name}</span>
                                    {post.post_type === 'collab' && (
                                        <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/90 font-medium">Collab</span>
                                    )}
                                    <p className="text-[#a1a1aa] text-[11px] mt-0.5">{new Date(post.created_at).toLocaleDateString('fr-FR')}</p>
                                </div>
                                {user?.id === post.author_id && (
                                    <button onClick={() => handleDelete(post.id)} className="text-[#52525b] hover:text-red-400/80 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <p className="text-[#d4d4d8] text-[14px] font-medium leading-relaxed whitespace-pre-wrap mb-4">{post.content}</p>
                            <button
                                onClick={() => handleLike(post.id)}
                                className={`flex items-center gap-2 text-[13px] font-medium transition-colors ${post.liked_by_me ? 'text-white' : 'text-[#a1a1aa] hover:text-white/80'}`}
                            >
                                <Heart className="w-4 h-4" fill={post.liked_by_me ? 'currentColor' : 'none'} />
                                {post.likes_count}
                            </button>
                        </div>
                    ))}
                </motion.div>

                {/* Bottom Action Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="mt-auto pt-10"
                >
                    <button
                        onClick={() => setShowModal(true)}
                        className="w-full py-4 bg-white text-[#0A0A0A] rounded-xl font-semibold text-[14px] tracking-wide flex items-center justify-center gap-2 hover:bg-gray-100 hover:scale-[1.01] transition-all cursor-pointer shadow-md">
                        <Plus className="w-5 h-5" strokeWidth={2} />
                        PUBLIER MON PROFIL
                    </button>
                </motion.div>

            </div>

            {/* Post creation modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-[500px] bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white text-[18px] font-semibold">Publier sur le Hub</h3>
                            <button onClick={() => setShowModal(false)} className="text-[#a1a1aa] hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex gap-2 mb-4">
                            {(['post', 'collab'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setNewType(t)}
                                    className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all ${newType === t ? 'bg-white text-black' : 'bg-white/[0.02] border border-white/5 text-[#a1a1aa]'}`}
                                >
                                    {t === 'post' ? 'Post' : '🤝 Collab'}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={newContent}
                            onChange={e => setNewContent(e.target.value)}
                            placeholder="Présente-toi, partage tes objectifs, propose une collab..."
                            className="w-full bg-[#050505] border border-white/5 rounded-xl p-4 text-white text-[14px] placeholder-[#a1a1aa] min-h-[120px] resize-none focus:outline-none focus:border-white/20 transition-colors mb-4 shadow-inner"
                        />
                        <button
                            onClick={handlePublish}
                            disabled={posting || !newContent.trim()}
                            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                        >
                            {posting ? 'Publication...' : 'Publier'}
                        </button>
                    </motion.div>
                </div>
            )}

        </div>
    );
}
