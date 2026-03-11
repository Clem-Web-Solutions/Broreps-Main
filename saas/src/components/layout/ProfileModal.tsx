import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Skull, Plus, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [presence, setPresence] = useState('online');
    const [bio, setBio] = useState('');
    const [customStatus, setCustomStatus] = useState('');

    const handleLogout = () => {
        onClose();
        logout();
        navigate('/login');
    };

    // Get user initials for avatar
    const initials = user?.name
        ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    const username = user?.email
        ? '@' + user.email.split('@')[0]
        : '@username';

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            {/* Click Outside overlay to close */}
            <div className="absolute inset-0 z-0" onClick={onClose}></div>

            {/* Modal Container */}
            <div
                className="w-full max-w-[500px] bg-[#0A0A0A] border border-[#00A336]/20 rounded-2xl p-6 shadow-[0_0_60px_rgba(0,163,54,0.15)] relative z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white text-xl font-bold">Mon profil</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#a1a1aa] hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Banner & Avatar Wrapper */}
                <div className="relative mb-16">
                    {/* Banner */}
                    <div className="h-[120px] rounded-xl bg-gradient-to-r from-[#052e16] via-[#041f10] to-[#011a0c] border border-[#00A336]/20 relative overflow-hidden">
                        {/* Animated glow in banner */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#00A336]/10 to-transparent" />
                        <button className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 border border-[#00A336]/20 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:border-[#00A336]/40">
                            Changer la bannière
                        </button>
                    </div>

                    {/* Avatar Container */}
                    <div className="absolute -bottom-10 left-6 flex items-end">
                        <div className="relative w-[80px] h-[80px] rounded-full bg-gradient-to-br from-[#00A336] to-[#007a27] border-[4px] border-[#0A0A0A] flex items-center justify-center font-bold text-2xl text-black shadow-[0_0_25px_rgba(0,163,54,0.5)]">
                            {initials}
                            {/* Presence dot */}
                            <div className={`absolute bottom-0 right-0 w-4 h-4 border-[2px] border-[#0A0A0A] rounded-full ${
                                presence === 'online' ? 'bg-[#00FF7F]' :
                                presence === 'away' ? 'bg-[#eab308]' :
                                presence === 'dnd' ? 'bg-[#ef4444]' :
                                'bg-[#52525b]'
                            }`} />
                        </div>

                        {/* Name & Title */}
                        <div className="ml-4 mb-2">
                            <h3 className="text-white text-xl font-bold leading-tight">{user?.name || 'Ton nom'}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[#a1a1aa] text-sm">{username}</span>
                                <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded-md text-[#a1a1aa] text-xs font-medium">
                                    <Skull className="w-3.5 h-3.5" />
                                    {user?.subscription_status === 'active' ? 'Premium' : 'Broke'}
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
                            value={customStatus}
                            onChange={e => setCustomStatus(e.target.value)}
                            placeholder="Ex: Building BroReps..."
                            className="w-full bg-[#111] border border-[#18181b] rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#52525b] focus:outline-none focus:border-[#00A336] focus:ring-1 focus:ring-[#00A336] transition-colors"
                        />
                    </div>

                    {/* Bio */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[#a1a1aa] text-[11px] font-bold tracking-widest uppercase">Bio</h4>
                            <span className="text-[#52525b] text-[11px] font-medium">{bio.length} / 250</span>
                        </div>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value.slice(0, 250))}
                            placeholder="Présente-toi à la communauté BroReps..."
                            className="w-full bg-[#111] border border-[#18181b] rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#52525b] focus:outline-none focus:border-[#00A336] focus:ring-1 focus:ring-[#00A336] transition-colors min-h-[90px] resize-none"
                        />
                    </div>

                    {/* Liens */}
                    <div className="flex items-center justify-between">
                        <h4 className="text-[#a1a1aa] text-[11px] font-bold tracking-widest uppercase">Liens</h4>
                        <button className="text-[#00A336] hover:text-[#00cc44] text-[13px] font-black flex items-center gap-1.5 transition-colors">
                            <Plus className="w-4 h-4" strokeWidth={3} />
                            Ajouter un lien
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 gap-4">
                        <button className="flex-1 bg-[#00A336] hover:bg-[#00cc44] text-black font-black py-3.5 rounded-xl transition-all text-[15px] shadow-[0_0_20px_rgba(0,163,54,0.3)] hover:shadow-[0_0_30px_rgba(0,204,68,0.4)]">
                            Enregistrer le profil
                        </button>
                        <button
                            onClick={handleLogout}
                            className="text-[#ef4444] hover:text-[#f87171] font-bold flex items-center gap-2 px-4 py-3.5 rounded-xl hover:bg-[#ef4444]/10 transition-colors text-[14px]"
                        >
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
