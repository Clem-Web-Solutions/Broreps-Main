import { useNavigate } from 'react-router';
import {
    ArrowLeft,
    User,
    Upload,
    Sparkles,
    PenLine,
    Mail,
    Calendar,
    Zap,
    CheckCircle,
    Link as LinkIcon,
    Shield,
    Bell,
    Key,
    LogOut,
    ShieldCheck,
    X
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
    const navigate = useNavigate();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            {/* Top Header */}
            <div className="flex items-center absolute top-0 mt-6 lg:mt-0 lg:relative z-10 w-full mb-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-[#a1a1aa] hover:text-white flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Dashboard
                </button>
            </div>

            <div className="relative max-w-3xl mx-auto">
                {/* Title Section */}
                <div className="flex items-center gap-6 mb-12">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center shadow-sm text-white/80">
                            <User className="w-10 h-10" strokeWidth={1.5} />
                        </div>
                        <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#09090b] border border-white/10 flex items-center justify-center text-[#a1a1aa] hover:bg-white/10 hover:text-white transition-colors shadow-lg cursor-pointer">
                            <Upload className="w-4 h-4" strokeWidth={2} />
                        </button>
                    </div>
                    <div>
                        <h1 className="text-[32px] font-semibold text-white leading-tight tracking-tight">Ton Profil Créateur</h1>
                        <p className="text-[#a1a1aa] font-medium text-[15px]">
                            Gère tes informations et optimise ton expérience BroReps.
                        </p>
                    </div>
                </div>

                {/* Informations personnelles */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-white/80" strokeWidth={2.5} />
                            <h2 className="text-white text-xl font-medium tracking-tight">Informations personnelles</h2>
                        </div>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-[#a1a1aa] hover:bg-white/[0.04] hover:text-white transition-colors text-[13px] font-medium cursor-pointer"
                        >
                            <PenLine className="w-3.5 h-3.5" />
                            Modifier
                        </button>
                    </div>

                    <div className="bg-[#09090b] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 shadow-sm">

                        <div className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-[#a1a1aa]">
                                    <User className="w-5 h-5" />
                                </div>
                                <span className="text-[#a1a1aa] text-[15px] font-medium">Prénom</span>
                            </div>
                            <span className="text-white font-medium text-[15px]">Clement</span>
                        </div>

                        <div className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-[#a1a1aa]">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <span className="text-[#a1a1aa] text-[15px] font-medium">Email</span>
                            </div>
                            <span className="text-white font-medium text-[15px]">t3mq.pro@gmail.com</span>
                        </div>

                        <div className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-[#a1a1aa]">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <span className="text-[#a1a1aa] text-[15px] font-medium">Membre depuis</span>
                            </div>
                            <span className="text-white font-medium text-[15px]">30/01/2026</span>
                        </div>

                        <div className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/80">
                                    <Zap className="w-5 h-5 text-white/80" />
                                </div>
                                <span className="text-[#a1a1aa] text-[15px] font-medium">Formule active</span>
                            </div>
                            <span className="text-[#00A336] font-medium text-[15px]">Pro Premium</span>
                        </div>

                        <div className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/80">
                                    <CheckCircle className="w-5 h-5 text-white/80" />
                                </div>
                                <span className="text-[#a1a1aa] text-[15px] font-medium">Statut du compte</span>
                            </div>
                            <span className="bg-[#00A336]/10 border border-[#00A336]/30 text-[#00A336] text-[11px] font-bold px-3 py-1 rounded-md tracking-wider uppercase">Actif</span>
                        </div>

                    </div>
                </div>

                {/* Comptes connectés */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <LinkIcon className="w-5 h-5 text-white/80" strokeWidth={2.5} />
                        <h2 className="text-white text-xl font-medium tracking-tight">Comptes connectés</h2>
                    </div>

                    <div className="bg-[#09090b] border border-white/5 rounded-2xl p-6 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* TikTok Card */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#69C9D0] via-[#EE1D52] to-[#000000] p-[1px]">
                                        <div className="w-full h-full bg-[#111111] rounded-xl flex items-center justify-center text-white">
                                            {/* Simple TikTok generic icon representation */}
                                            <span className="font-bold text-lg select-none" style={{ textShadow: '1px 1px 0 #EE1D52, -1px -1px 0 #69C9D0' }}>d</span>
                                        </div>
                                    </div>
                                    <span className="text-white font-medium text-[15px]">TikTok</span>
                                </div>
                                <button className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-[#a1a1aa] font-medium text-[13px] hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
                                    Associer
                                </button>
                            </div>

                            {/* Instagram Card */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] p-[1px]">
                                        <div className="w-full h-full bg-[#111111] rounded-xl flex items-center justify-center text-white">
                                            {/* Simple Instagram generic icon representation */}
                                            <div className="w-5 h-5 border-2 border-white rounded-[6px] relative flex items-center justify-center">
                                                <div className="w-2 h-2 border-2 border-white rounded-full"></div>
                                                <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-white font-medium text-[15px]">Instagram</span>
                                </div>
                                <button className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-[#a1a1aa] font-medium text-[13px] hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
                                    Associer
                                </button>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Préférences & sécurité */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-white/80" strokeWidth={2.5} />
                        <h2 className="text-white text-xl font-medium tracking-tight">Préférences & sécurité</h2>
                    </div>

                    <div className="bg-[#09090b] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 shadow-sm">

                        {/* Notifications */}
                        <div className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-[#a1a1aa]">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium text-[15px]">Notifications</h3>
                                    <p className="text-[#a1a1aa] text-[13px] font-medium">Recevoir les alertes importantes</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${notificationsEnabled ? 'bg-white' : 'bg-[#3f3f46]'}`}
                            >
                                <div className={`w-4 h-4 rounded-full ${notificationsEnabled ? 'bg-black' : 'bg-white'} shadow-sm transform transition-transform duration-300 ease-in-out ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Password */}
                        <div className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-[#a1a1aa] group-hover:text-white transition-colors">
                                    <Key className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium text-[15px]">Changer mon mot de passe</h3>
                                    <p className="text-[#a1a1aa] text-[13px] font-medium">Modifier ton mot de passe</p>
                                </div>
                            </div>
                            <ArrowLeft className="w-4 h-4 text-[#52525b] group-hover:text-white rotate-180 transition-colors" />
                        </div>

                        {/* Disconnect */}
                        <div className="flex items-center justify-between p-5 hover:bg-[#ef4444]/5 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center text-[#ef4444]">
                                    <LogOut className="w-5 h-5" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-[#ef4444] font-medium text-[15px]">Se déconnecter</h3>
                                    <p className="text-[#ef4444]/60 text-[13px] font-medium">Quitter ton compte</p>
                                </div>
                            </div>
                            <ArrowLeft className="w-4 h-4 text-[#ef4444]/60 group-hover:text-[#ef4444] rotate-180 transition-colors" />
                        </div>

                    </div>
                </div>

                {/* Footer simple indicatory */}
                <div className="flex items-center justify-center gap-2 mt-8 opacity-50 pb-8">
                    <ShieldCheck className="w-4 h-4 text-[#a1a1aa]" />
                    <span className="text-[#a1a1aa] text-[13px] font-medium">Toutes tes données sont protégées et sécurisées.</span>
                </div>

            </div>

            {/* Modal for Editing Informations */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setIsEditModalOpen(false)}
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl"
                        >
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 mb-4 shadow-sm">
                                    <PenLine className="w-6 h-6" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-[22px] font-semibold text-white tracking-tight">Modifier tes infos</h3>
                                <p className="text-[#a1a1aa] text-[14px] mt-1.5 font-medium">
                                    Met à jour tes informations personnelles pour ton profil.
                                </p>
                            </div>

                            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsEditModalOpen(false); }}>
                                <div>
                                    <label className="block text-[13px] font-semibold text-[#a1a1aa] mb-2 uppercase tracking-wide">Prénom</label>
                                    <input
                                        type="text"
                                        defaultValue="Clement"
                                        placeholder="Ton prénom"
                                        className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3.5 text-[15px] font-medium text-white placeholder:text-[#a1a1aa]/50 focus:outline-none focus:border-[#00A336]/50 focus:ring-1 focus:ring-[#00A336]/50 transition-all shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-[#a1a1aa] mb-2 uppercase tracking-wide">Adresse Email</label>
                                    <input
                                        type="email"
                                        defaultValue="t3mq.pro@gmail.com"
                                        placeholder="Ton email"
                                        className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3.5 text-[15px] font-medium text-white placeholder:text-[#a1a1aa]/50 focus:outline-none focus:border-[#00A336]/50 focus:ring-1 focus:ring-[#00A336]/50 transition-all shadow-sm"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="flex-1 py-3.5 rounded-xl border border-white/10 text-white font-medium text-[14px] hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3.5 rounded-xl bg-white text-black font-semibold text-[14px] hover:bg-gray-200 transition-colors shadow-sm cursor-pointer"
                                    >
                                        Enregistrer
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

