import { useNavigate } from 'react-router';
import {
    ArrowLeft,
    Settings,
    User,
    Link as LinkIcon,
    Sparkles,
    Bell,
    Trash2,
    FileText,
    ShieldCheck,
    ChevronDown,
    Mail,
    Zap,
    TrendingUp,
    Shield,
    FileSignature,
    MessageSquare,
    ExternalLink
} from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
    const navigate = useNavigate();

    // Toggle states for notifications
    const [notifTickets, setNotifTickets] = useState(true);
    const [notifModules, setNotifModules] = useState(true);
    const [notifWeekly, setNotifWeekly] = useState(false);

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            {/* Top Header */}
            <div className="flex items-center absolute top-0 mt-6 lg:mt-0 lg:relative z-10 w-full mb-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-[#a1a1aa] hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Dashboard
                </button>
            </div>

            <div className="relative max-w-3xl mx-auto">
                {/* Title Section */}
                <div className="flex items-center gap-5 mb-12">
                    <div className="w-16 h-16 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center shadow-sm text-white/80">
                        <Settings className="w-8 h-8" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-[32px] font-semibold text-white leading-tight tracking-tight">Paramètres</h1>
                        <p className="text-[#a1a1aa] font-medium text-[15px]">
                            Configure ton expérience BroReps
                        </p>
                    </div>
                </div>

                {/* Profil & Compte */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <User className="w-5 h-5 text-white/80" strokeWidth={2.5} />
                        <h2 className="text-white text-[17px] font-semibold tracking-tight">Profil & Compte</h2>
                    </div>

                    <div className="bg-[#09090b] border border-white/5 rounded-2xl overflow-hidden p-6 space-y-6 shadow-sm">

                        {/* Users Info */}
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-[#050505] border border-white/5 rounded-xl shadow-inner">
                                <span className="text-[#a1a1aa] text-[14px] font-medium">Prénom</span>
                                <span className="text-white font-medium text-[14px]">Clement</span>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-[#050505] border border-white/5 rounded-xl shadow-inner">
                                <span className="text-[#a1a1aa] text-[14px] font-medium">Email</span>
                                <span className="text-white font-medium text-[14px]">t3mq.pro@gmail.com</span>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-[#050505] border border-white/5 rounded-xl shadow-inner">
                                <span className="text-[#a1a1aa] text-[14px] font-medium">Membre depuis</span>
                                <span className="text-white font-medium text-[14px]">janvier 2026</span>
                            </div>
                        </div>

                        {/* Subscription Info */}
                        <div className="p-5 border border-white/10 bg-white/[0.02] rounded-xl relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 w-1 h-full bg-white/40"></div>
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-white font-semibold text-[15px] mb-1">Formule actuelle</h3>
                                    <p className="text-[#a1a1aa] text-[13px] font-medium">Premium Mensuel</p>
                                </div>
                                <span className="bg-white/10 border border-white/5 text-white/90 text-[11px] font-semibold px-3 py-1 rounded-md tracking-wider uppercase">Actif</span>
                            </div>
                            <button className="w-full bg-white hover:bg-gray-200 text-black font-semibold text-[14px] py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
                                <Settings className="w-4 h-4" />
                                Gérer mon abonnement
                            </button>
                        </div>

                    </div>
                </div>

                {/* Comptes connectés */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <LinkIcon className="w-5 h-5 text-white/80" strokeWidth={2.5} />
                        <h2 className="text-white text-[17px] font-semibold tracking-tight">Comptes connectés</h2>
                    </div>

                    <div className="bg-[#09090b] border border-white/5 rounded-2xl p-6 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* TikTok */}
                            <div className="bg-[#050505] border border-white/5 rounded-xl p-5 shadow-inner">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#69C9D0] via-[#EE1D52] to-[#000000] p-[1px]">
                                        <div className="w-full h-full bg-[#050505] rounded-lg flex items-center justify-center text-white">
                                            <span className="font-semibold text-lg select-none" style={{ textShadow: '1px 1px 0 #EE1D52, -1px -1px 0 #69C9D0' }}>d</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-[14px]">TikTok</h3>
                                        <p className="text-[#a1a1aa] text-[12px] font-medium">Non connecté</p>
                                    </div>
                                </div>
                                <button className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/80 font-semibold text-[13px] hover:bg-white/10 hover:text-white transition-colors">
                                    Associer
                                </button>
                            </div>

                            {/* Instagram */}
                            <div className="bg-[#050505] border border-white/5 rounded-xl p-5 shadow-inner">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] p-[1px]">
                                        <div className="w-full h-full bg-[#050505] rounded-lg flex items-center justify-center text-white">
                                            <div className="w-5 h-5 border-[1.5px] border-white/80 rounded-[6px] relative flex items-center justify-center">
                                                <div className="w-2 h-2 border-[1.5px] border-white/80 rounded-full"></div>
                                                <div className="w-1 h-1 bg-white/80 rounded-full absolute top-[1px] right-[1px]"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-[14px]">Instagram</h3>
                                        <p className="text-[#a1a1aa] text-[12px] font-medium">Non connecté</p>
                                    </div>
                                </div>
                                <button className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/80 font-semibold text-[13px] hover:bg-white/10 hover:text-white transition-colors">
                                    Associer
                                </button>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Personnalisation IA */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Sparkles className="w-5 h-5 text-white/80" strokeWidth={2.5} />
                        <h2 className="text-white text-[17px] font-semibold tracking-tight">Personnalisation IA</h2>
                    </div>

                    <div className="bg-[#09090b] border border-white/5 rounded-2xl p-6 space-y-6 shadow-sm">

                        <div className="bg-[#050505] border border-white/5 rounded-xl p-5 shadow-inner">
                            <div className="flex items-center gap-3 mb-3">
                                <Sparkles className="w-4 h-4 text-white/80" />
                                <h3 className="text-white font-semibold text-[14px]">Mode IA</h3>
                            </div>
                            <div className="relative mb-3">
                                <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl p-3.5 flex items-center justify-between cursor-pointer">
                                    <span className="text-white text-[14px] font-medium"></span>
                                    <ChevronDown className="w-4 h-4 text-[#a1a1aa]" />
                                </div>
                            </div>
                            <p className="text-[#a1a1aa] text-[12px] font-medium">Le ton et la profondeur des réponses du Coach IA</p>
                        </div>

                        <div className="bg-[#050505] border border-white/5 rounded-xl p-5 shadow-inner">
                            <div className="flex items-center gap-3 mb-3">
                                <TrendingUp className="w-4 h-4 text-white/80" />
                                <h3 className="text-white font-semibold text-[14px]">Fréquence des conseils</h3>
                            </div>
                            <div className="relative mb-3">
                                <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl p-3.5 flex items-center justify-between cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg leading-none">📅</span>
                                        <span className="text-white text-[14px] font-medium">Quotidien</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-[#a1a1aa]" />
                                </div>
                            </div>
                            <p className="text-[#a1a1aa] text-[12px] font-medium">Combien de fois le Coach IA envoie un bilan</p>
                        </div>

                        <div className="bg-[#050505] border border-white/5 rounded-xl p-5 shadow-inner">
                            <div className="flex items-center gap-3 mb-3">
                                <Zap className="w-4 h-4 text-white/80" />
                                <h3 className="text-white font-semibold text-[14px]">Priorité d'objectif</h3>
                            </div>
                            <div className="relative mb-3">
                                <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl p-3.5 flex items-center justify-between cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg leading-none">🚀</span>
                                        <span className="text-white text-[14px] font-medium">Croissance rapide - Volume & reach</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-[#a1a1aa]" />
                                </div>
                            </div>
                            <p className="text-[#a1a1aa] text-[12px] font-medium">Adapte les conseils selon ton objectif principal</p>
                        </div>

                    </div>
                </div>

                {/* Notifications */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Bell className="w-5 h-5 text-white/80" strokeWidth={2.5} />
                        <h2 className="text-white text-[17px] font-semibold tracking-tight">Notifications</h2>
                    </div>

                    <div className="bg-[#09090b] border border-white/5 rounded-2xl p-6 space-y-4 shadow-sm">

                        {/* Toggle Tickets */}
                        <div className="flex items-center justify-between bg-[#050505] border border-white/5 rounded-xl p-5 shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-[14px]">Notifications tickets</h3>
                                    <p className="text-[#a1a1aa] text-[12px] font-medium">Recevoir un email pour les mises à jour de tickets</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setNotifTickets(!notifTickets)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${notifTickets ? 'bg-white' : 'bg-[#3f3f46]'}`}
                            >
                                <div className={`w-4 h-4 rounded-full ${notifTickets ? 'bg-black' : 'bg-white'} shadow-sm transform transition-transform duration-300 ease-in-out ${notifTickets ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Toggle Modules */}
                        <div className="flex items-center justify-between bg-[#050505] border border-white/5 rounded-xl p-5 shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-[14px]">Nouveaux modules</h3>
                                    <p className="text-[#a1a1aa] text-[12px] font-medium">Être notifié quand un module se déverrouille</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setNotifModules(!notifModules)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${notifModules ? 'bg-white' : 'bg-[#3f3f46]'}`}
                            >
                                <div className={`w-4 h-4 rounded-full ${notifModules ? 'bg-black' : 'bg-white'} shadow-sm transform transition-transform duration-300 ease-in-out ${notifModules ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Toggle Weekly */}
                        <div className="flex items-center justify-between bg-[#050505] border border-white/5 rounded-xl p-5 shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-[14px]">Résumé hebdomadaire</h3>
                                    <p className="text-[#a1a1aa] text-[12px] font-medium">Recevoir un bilan de ta progression chaque semaine</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setNotifWeekly(!notifWeekly)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${notifWeekly ? 'bg-white' : 'bg-[#3f3f46]'}`}
                            >
                                <div className={`w-4 h-4 rounded-full ${notifWeekly ? 'bg-black' : 'bg-white'} shadow-sm transform transition-transform duration-300 ease-in-out ${notifWeekly ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                    </div>
                </div>

                {/* Zone dangereuse */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Trash2 className="w-5 h-5 text-[#ef4444]" strokeWidth={2.5} />
                        <h2 className="text-white text-[17px] font-semibold tracking-tight">Zone dangereuse</h2>
                    </div>

                    <div className="bg-[#09090b] border border-white/5 rounded-2xl p-6 shadow-sm">
                        <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4 p-5 bg-[#201010] border border-[#ef4444]/20 rounded-xl">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center text-[#ef4444] shrink-0">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[#ef4444] font-semibold text-[14px] mb-1">Supprimer mon compte</h3>
                                    <p className="text-[#a1a1aa] text-[12px] font-medium">Suppression définitive et irréversible</p>
                                </div>
                            </div>
                            <button className="px-5 py-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] font-semibold text-[13px] hover:bg-[#ef4444]/20 transition-colors shrink-0">
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>

                {/* Liens utiles */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-5 h-5 text-white/80" strokeWidth={2.5} />
                        <h2 className="text-white text-[17px] font-semibold tracking-tight">Liens utiles</h2>
                    </div>

                    <div className="bg-[#09090b] border border-white/5 rounded-2xl p-6 space-y-4 shadow-sm">

                        <a href="#" className="flex items-center justify-between p-5 bg-[#050505] border border-white/5 rounded-xl hover:border-white/10 group transition-all cursor-pointer shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-[14px]">Politique de confidentialité</h3>
                                    <p className="text-[#a1a1aa] text-[12px] font-medium">Consulter nos engagements de protection des données</p>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-[#52525b] group-hover:text-white/80 transition-colors" />
                        </a>

                        <a href="#" className="flex items-center justify-between p-5 bg-[#050505] border border-white/5 rounded-xl hover:border-white/10 group transition-all cursor-pointer shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                                    <FileSignature className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-[14px]">Conditions générales</h3>
                                    <p className="text-[#a1a1aa] text-[12px] font-medium">Lire les CGU de la plateforme BroReps</p>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-[#52525b] group-hover:text-white/80 transition-colors" />
                        </a>

                        <div className="flex items-center justify-between p-5 bg-[#050505] border border-white/5 rounded-xl hover:border-white/10 group transition-all cursor-pointer shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-[14px]">Contacter le support</h3>
                                    <p className="text-[#a1a1aa] text-[12px] font-medium">Notre équipe répond sous 24h</p>
                                </div>
                            </div>
                            <button className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 font-semibold text-[13px] hover:bg-white/10 hover:text-white transition-colors">
                                Ouvrir
                            </button>
                        </div>

                    </div>
                </div>

                {/* Footer simple indicatory */}
                <div className="flex items-center justify-center gap-2 mt-8 opacity-50 pb-8">
                    <ShieldCheck className="w-4 h-4 text-[#a1a1aa]" />
                    <span className="text-[#a1a1aa] text-[13px] font-medium">Paramètres sécurisés — BroReps Premium</span>
                </div>

            </div>
        </div>
    );
}
