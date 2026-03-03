import { ArrowLeft, Info, AlertCircle, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function SubscriptionPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="flex flex-col items-center w-full pb-12">
            <div className="w-full max-w-[700px] flex flex-col px-4 md:px-8">

                {/* Back Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-[13px] font-medium text-[#a1a1aa] hover:text-white transition-colors cursor-pointer mb-8 self-start"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Dashboard
                </button>

                {/* Main Header Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="w-full bg-[#050505] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center mb-8 shadow-sm"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-[14px] bg-white/5 border border-white/10 flex items-center justify-center">
                            <Info className="w-6 h-6 text-white/80" strokeWidth={2} />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-white text-[28px] md:text-[36px] font-semibold tracking-tight leading-tight">
                            Gestion de ton abonnement
                        </h1>
                    </div>
                </motion.div>

                {/* Subtitle Info */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="flex flex-col items-center text-center mb-10 px-4"
                >
                    <p className="text-[#a1a1aa] text-[15px] font-medium leading-relaxed max-w-[500px]">
                        Tu peux ici suspendre, modifier ou annuler ton abonnement BroReps.<br />
                        Notre IA est là pour t'aider à trouver la meilleure solution.
                    </p>
                </motion.div>

                {/* Form Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                    className="w-full bg-[#09090b] border border-white/5 rounded-2xl p-6 md:p-8 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <AlertCircle className="w-5 h-5 text-white/80" strokeWidth={2} />
                        <h2 className="text-white text-[20px] font-semibold tracking-tight">Annuler mon abonnement</h2>
                    </div>

                    {/* Success notification */}
                    <div className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center gap-3 mb-8">
                        <CheckSquare className="w-5 h-5 text-[#a1a1aa] flex-shrink-0" />
                        <p className="text-[#a1a1aa] text-[14px] font-medium">
                            Tu as déverrouillé <span className="font-semibold text-white">{user?.modules_unlocked || 0} module{(user?.modules_unlocked || 0) !== 1 ? 's' : ''}</span>. Tu peux procéder à la résiliation.
                        </p>
                    </div>

                    {/* Form Fields */}
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-white/80 text-[14px] font-medium">Nom complet *</label>
                            <input
                                type="text"
                                defaultValue={user?.name || ''}
                                className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-white text-[14px] focus:outline-none focus:border-white/20 transition-colors shadow-inner"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-white/80 text-[14px] font-medium">Email *</label>
                            <input
                                type="email"
                                defaultValue={user?.email || ''}
                                className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-white text-[14px] focus:outline-none focus:border-white/20 transition-colors shadow-inner"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-white/80 text-[14px] font-medium">Téléphone</label>
                            <input
                                type="tel"
                                defaultValue="+33 6 12 34 56 78"
                                className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-[#A1A1AA] text-[14px] focus:outline-none focus:border-white/20 transition-colors shadow-inner"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-white/80 text-[14px] font-medium">Numéro de commande *</label>
                            <input
                                type="text"
                                defaultValue="12345"
                                className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-white text-[14px] focus:outline-none focus:border-white/20 transition-colors shadow-inner"
                            />
                        </div>

                        <div className="flex flex-col gap-2 mb-4">
                            <label className="text-white/80 text-[14px] font-medium">Pourquoi souhaites-tu annuler ? *</label>
                            <textarea
                                placeholder="Explique-nous ce qui ne fonctionne pas..."
                                className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-white text-[14px] placeholder-[#444] min-h-[120px] resize-none focus:outline-none focus:border-white/20 transition-colors shadow-inner"
                            />
                        </div>

                        <button className="w-full py-3.5 bg-white hover:bg-gray-200 text-black font-semibold text-[15px] rounded-xl transition-colors cursor-pointer shadow-sm">
                            Continuer
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
