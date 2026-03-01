import { ArrowLeft, Info, AlertCircle, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

export default function SubscriptionPage() {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="flex flex-col items-center w-full min-h-screen pt-4 pb-12">
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
                    className="w-full bg-[#00A336] rounded-[16px] p-6 flex flex-col items-center justify-center text-center transform -skew-x-3 mb-8 shadow-[0_0_30px_rgba(0,163,54,0.3)]"
                >
                    <div className="transform skew-x-3">
                        <h1 className="text-white text-[32px] md:text-[46px] font-black italic uppercase tracking-wider leading-tight">
                            GESTION DE TON <br />
                            ABONNEMENT
                        </h1>
                    </div>
                </motion.div>

                {/* Subtitle Info */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="flex items-start gap-3 justify-center text-center mb-10 px-4"
                >
                    <Info className="w-5 h-5 text-[#00A336] flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <p className="text-white text-[15px] font-medium leading-relaxed">
                        Tu peux ici suspendre, modifier ou annuler ton abonnement BroReps.<br />
                        Notre IA est là pour t'aider à trouver la meilleure solution.
                    </p>
                </motion.div>

                {/* Form Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                    className="w-full bg-[#080808] border border-[#14321D] rounded-[16px] p-6 md:p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <AlertCircle className="w-6 h-6 text-[#00A336]" strokeWidth={2.5} />
                        <h2 className="text-white text-[22px] font-bold">Annuler mon abonnement</h2>
                    </div>

                    {/* Success notification */}
                    <div className="w-full bg-[#051a0d] border border-[#145620] rounded-[10px] p-4 flex items-center gap-3 mb-8">
                        <CheckSquare className="w-5 h-5 text-[#00FF7F] flex-shrink-0" fill="#00FF7F" color="#051a0d" />
                        <p className="text-[#00FF7F] text-[14px] font-medium">
                            Vous avez déverrouillé <span className="font-bold">6 modules</span>. Vous pouvez procéder à la résiliation.
                        </p>
                    </div>

                    {/* Form Fields */}
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-white text-[14px] font-bold">Nom complet *</label>
                            <input
                                type="text"
                                defaultValue="Clément Van Kerckvoorde"
                                className="w-full bg-[#111111] border border-[#222222] rounded-[8px] px-4 py-3 text-white text-[14px] focus:outline-none focus:border-[#00FF7F] transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-white text-[14px] font-bold">Email *</label>
                            <input
                                type="email"
                                defaultValue="t3mq.pro@gmail.com"
                                className="w-full bg-[#111111] border border-[#222222] rounded-[8px] px-4 py-3 text-white text-[14px] focus:outline-none focus:border-[#00FF7F] transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-white text-[14px] font-bold">Téléphone</label>
                            <input
                                type="tel"
                                defaultValue="+33 6 12 34 56 78"
                                className="w-full bg-[#111111] border border-[#222222] rounded-[8px] px-4 py-3 text-[#A1A1AA] text-[14px] focus:outline-none focus:border-[#00FF7F] transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-white text-[14px] font-bold">Numéro de commande *</label>
                            <input
                                type="text"
                                defaultValue="12345"
                                className="w-full bg-[#111111] border border-[#222222] rounded-[8px] px-4 py-3 text-white text-[14px] focus:outline-none focus:border-[#00FF7F] transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-2 mb-4">
                            <label className="text-white text-[14px] font-bold">Pourquoi souhaites-tu annuler ? *</label>
                            <textarea
                                placeholder="Explique-nous ce qui ne fonctionne pas..."
                                className="w-full bg-[#111111] border border-[#222222] rounded-[8px] px-4 py-3 text-white text-[14px] placeholder-[#444] min-h-[120px] resize-none focus:outline-none focus:border-[#00FF7F] transition-colors"
                            />
                        </div>

                        <button className="w-full py-4 bg-[#00D647] hover:bg-[#00fc54] text-white font-bold text-[15px] rounded-[10px] transition-colors cursor-pointer shadow-[0_0_20px_rgba(0,214,71,0.2)]">
                            Continuer
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
