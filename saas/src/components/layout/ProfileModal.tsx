import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Skull, Plus, LogOut } from 'lucide-react';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const [presence, setPresence] = useState('online');

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Click Outside overlay to close */}
            <div className="absolute inset-0 z-0" onClick={onClose}></div>

            {/* Modal Container */}
            <div
                className="w-full max-w-[500px] bg-[#0A0A0A] border border-[#18181b] rounded-2xl p-6 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white text-xl font-bold">Mon profil</h2>
                    <button
                        onClick={onClose}
                        className="text-[#a1a1aa] hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Banner & Avatar Wrapper */}
                <div className="relative mb-16">
                    {/* Banner */}
                    <div className="h-[120px] rounded-xl bg-gradient-to-r from-[#052e16] to-[#011a0c] border border-[#18181b] relative overflow-hidden">
                        <button className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/70 border border-white/10 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                            Changer la bannière
                        </button>
                    </div>

                    {/* Avatar Container */}
                    <div className="absolute -bottom-10 left-6 flex items-end">
                        <div className="relative w-[80px] h-[80px] rounded-full bg-[#00E64D] border-[4px] border-[#0A0A0A] flex items-center justify-center font-bold text-3xl text-black shadow-[0_0_20px_rgba(0,230,77,0.4)]">
                            ?
                            {/* Online Status Dot */}
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#00FF7F] border-[2px] border-[#0A0A0A] rounded-full"></div>
                        </div>

                        {/* Name & Title */}
                        <div className="ml-4 mb-2">
                            <h3 className="text-white text-xl font-bold leading-tight">Ton nom</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[#a1a1aa] text-sm">@username</span>
                                <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded-md text-[#a1a1aa] text-xs font-medium">
                                    <Skull className="w-3.5 h-3.5" />
                                    Broke
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Statut de présence */}
                    <div>
                        <h4 className="text-[#a1a1aa] text-[11px] font-bold mb-3 tracking-widest uppercase">Statut de présence</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setPresence('online')}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-bold transition-colors ${presence === 'online' ? 'bg-[#052e16] border-[#00A336] text-white' : 'bg-[#111] border-[#18181b] text-[#a1a1aa] hover:bg-[#18181b] hover:text-white'}`}
                            >
                                <div className="w-2.5 h-2.5 rounded-full bg-[#00FF7F]" />
                                En ligne
                            </button>
                            <button
                                onClick={() => setPresence('away')}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-bold transition-colors ${presence === 'away' ? 'bg-[#052e16] border-[#00A336] text-white' : 'bg-[#111] border-[#18181b] text-[#a1a1aa] hover:bg-[#18181b] hover:text-white'}`}
                            >
                                <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                                Absent
                            </button>
                            <button
                                onClick={() => setPresence('dnd')}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-bold transition-colors ${presence === 'dnd' ? 'bg-[#052e16] border-[#00A336] text-white' : 'bg-[#111] border-[#18181b] text-[#a1a1aa] hover:bg-[#18181b] hover:text-white'}`}
                            >
                                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                                Ne pas déranger
                            </button>
                            <button
                                onClick={() => setPresence('offline')}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-bold transition-colors ${presence === 'offline' ? 'bg-[#052e16] border-[#00A336] text-white' : 'bg-[#111] border-[#18181b] text-[#a1a1aa] hover:bg-[#18181b] hover:text-white'}`}
                            >
                                <div className="w-2.5 h-2.5 rounded-full bg-[#52525b]" />
                                Invisible
                            </button>
                        </div>
                    </div>

                    {/* Statut personnalisé */}
                    <div>
                        <h4 className="text-[#a1a1aa] text-[11px] font-bold mb-2 tracking-widest uppercase">Statut personnalisé</h4>
                        <input
                            type="text"
                            placeholder="Ex: Building BroReps..."
                            className="w-full bg-[#111] border border-[#18181b] rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#52525b] focus:outline-none focus:border-[#00A336] focus:ring-1 focus:ring-[#00A336] transition-colors"
                        />
                    </div>

                    {/* Bio */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[#a1a1aa] text-[11px] font-bold tracking-widest uppercase">Bio</h4>
                            <span className="text-[#52525b] text-[11px] font-medium">0 / 250</span>
                        </div>
                        <textarea
                            placeholder="Présente-toi à la communauté BroReps..."
                            className="w-full bg-[#111] border border-[#18181b] rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#52525b] focus:outline-none focus:border-[#00A336] focus:ring-1 focus:ring-[#00A336] transition-colors min-h-[90px] resize-none"
                        />
                    </div>

                    {/* Liens */}
                    <div className="flex items-center justify-between">
                        <h4 className="text-[#a1a1aa] text-[11px] font-bold tracking-widest uppercase">Liens</h4>
                        <button className="text-[#00E64D] hover:text-[#00FF7F] text-[13px] font-black flex items-center gap-1.5 transition-colors">
                            <Plus className="w-4 h-4" strokeWidth={3} />
                            Ajouter un lien
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 gap-4">
                        <button className="flex-1 bg-[#00E64D] hover:bg-[#00FF7F] text-black font-black py-3.5 rounded-xl transition-colors text-[15px] shadow-[0_0_20px_rgba(0,230,77,0.2)]">
                            Enregistrer le profil
                        </button>
                        <button className="text-[#ef4444] hover:text-[#f87171] font-bold flex items-center gap-2 px-4 py-3.5 rounded-xl hover:bg-[#ef4444]/10 transition-colors text-[14px]">
                            <LogOut className="w-[18px] h-[18px]" strokeWidth={2.5} />
                            Déconnexion
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
