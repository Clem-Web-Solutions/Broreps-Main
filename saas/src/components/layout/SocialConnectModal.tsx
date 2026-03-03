import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Loader2, AlertCircle, Link, ExternalLink } from 'lucide-react';
import { Instagram } from 'lucide-react';
import { socialApi } from '../../lib/api';

// ─── TikTok Icon ──────────────────────────────────────────────────────────────
const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-[18px] h-[18px]">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.12-3.44-3.17-3.61-5.66-.21-3.23 1.91-6.19 5.06-6.85.25-.05.51-.08.77-.09V14.4c-1.17.06-2.31.54-3.12 1.34-1.22 1.14-1.63 2.97-.97 4.54.49 1.25 1.56 2.22 2.86 2.53 1.39.38 2.91.07 4.02-.78 1.23-.97 1.91-2.48 1.91-4.07.02-3.99.01-7.98.01-11.97-.04.05-.08.1-.13.15z" />
    </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Platform = 'tiktok' | 'instagram';

interface PlatformState {
    username: string;
    linked_at: string | null;
    inputValue: string;
    editing: boolean;
    loading: boolean;
    error: string | null;
    success: string | null;
}

interface Props {
    onClose: () => void;
    /** Callback so Dashboard can refresh user context after linking */
    onLinked?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SocialConnectModal({ onClose, onLinked }: Props) {
    const [loadingInit, setLoadingInit] = useState(true);

    const [platforms, setPlatforms] = useState<Record<Platform, PlatformState>>({
        tiktok: { username: '', linked_at: null, inputValue: '', editing: false, loading: false, error: null, success: null },
        instagram: { username: '', linked_at: null, inputValue: '', editing: false, loading: false, error: null, success: null },
    });

    // Fetch current linked accounts on mount
    useEffect(() => {
        socialApi.get()
            .then(({ accounts }) => {
                setPlatforms(prev => ({
                    tiktok: {
                        ...prev.tiktok,
                        username: accounts.tiktok_username || '',
                        linked_at: accounts.tiktok_linked_at || null,
                    },
                    instagram: {
                        ...prev.instagram,
                        username: accounts.instagram_username || '',
                        linked_at: accounts.instagram_linked_at || null,
                    },
                }));
            })
            .catch(() => { })
            .finally(() => setLoadingInit(false));
    }, []);

    const update = (platform: Platform, patch: Partial<PlatformState>) => {
        setPlatforms(prev => ({ ...prev, [platform]: { ...prev[platform], ...patch } }));
    };

    const handleLink = async (platform: Platform) => {
        const p = platforms[platform];
        const raw = p.inputValue.trim();
        if (!raw) return;

        update(platform, { loading: true, error: null, success: null });

        try {
            const res = await socialApi.link(platform, raw);
            update(platform, {
                username: res.username,
                linked_at: res.linked_at,
                inputValue: '',
                editing: false,
                loading: false,
                success: res.message,
            });
            onLinked?.();
        } catch (err: any) {
            update(platform, {
                loading: false,
                error: err.message || 'Erreur lors de la connexion.',
            });
        }
    };

    const handleUnlink = async (platform: Platform) => {
        if (!confirm(`Déconnecter le compte ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} ?`)) return;

        update(platform, { loading: true, error: null, success: null });

        try {
            await socialApi.unlink(platform);
            update(platform, {
                username: '',
                linked_at: null,
                loading: false,
                success: 'Compte déconnecté.',
                editing: false,
            });
            onLinked?.();
        } catch (err: any) {
            update(platform, {
                loading: false,
                error: err.message || 'Erreur lors de la déconnexion.',
            });
        }
    };

    const platformConfig = {
        tiktok: {
            label: 'TikTok',
            subtitle: 'Analyse de croissance et vues',
            icon: <TikTokIcon />,
            iconBg: 'bg-white/5',
            profileUrl: (u: string) => `https://tiktok.com/@${u}`,
            placeholder: '@tonpseudo ou URL de profil',
        },
        instagram: {
            label: 'Instagram',
            subtitle: 'Insights publications et Reels',
            icon: <Instagram className="w-5 h-5" />,
            iconBg: 'bg-gradient-to-br from-pink-500/20 to-purple-500/20',
            profileUrl: (u: string) => `https://instagram.com/${u}`,
            placeholder: '@tonpseudo ou URL de profil',
        },
    } as const;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                className="w-full max-w-[520px] bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
                            <Link className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-[17px] leading-tight">Mes comptes sociaux</h2>
                            <p className="text-[#A1A1AA] text-[12px]">Utilisés par le Coach IA pour personnaliser tes conseils</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-7 py-6 flex flex-col gap-4">
                    {loadingInit ? (
                        <div className="flex items-center justify-center py-8 text-[#A1A1AA] gap-2 text-[13px]">
                            <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
                        </div>
                    ) : (
                        (['tiktok', 'instagram'] as Platform[]).map(platform => {
                            const p = platforms[platform];
                            const cfg = platformConfig[platform];
                            const isLinked = !!p.username;

                            return (
                                <div
                                    key={platform}
                                    className={`rounded-xl border transition-all ${isLinked
                                        ? 'bg-[#00A336]/5 border-[#00A336]/20'
                                        : 'bg-[#050505] border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {/* Platform row */}
                                    <div className="flex items-center justify-between p-4 gap-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-10 h-10 ${cfg.iconBg} rounded-lg flex items-center justify-center text-white/80 shrink-0`}>
                                                {cfg.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-white font-medium text-[14px]">{cfg.label}</h3>
                                                    {isLinked && (
                                                        <span className="flex items-center gap-1 bg-[#00A336]/15 text-[#00A336] border border-[#00A336]/30 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                            <Check className="w-2.5 h-2.5" /> Connecté
                                                        </span>
                                                    )}
                                                </div>
                                                {isLinked ? (
                                                    <a
                                                        href={cfg.profileUrl(p.username)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[#A1A1AA] text-[12px] hover:text-white flex items-center gap-1 mt-0.5 transition-colors"
                                                    >
                                                        @{p.username}
                                                        <ExternalLink className="w-3 h-3 opacity-50" />
                                                    </a>
                                                ) : (
                                                    <p className="text-white/40 text-[12px]">{cfg.subtitle}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {isLinked ? (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => update(platform, { editing: !p.editing, error: null, success: null })}
                                                    disabled={p.loading}
                                                    className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-40"
                                                >
                                                    Modifier
                                                </button>
                                                <button
                                                    onClick={() => handleUnlink(platform)}
                                                    disabled={p.loading}
                                                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors disabled:opacity-40"
                                                    title="Déconnecter"
                                                >
                                                    {p.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => update(platform, { editing: !p.editing, error: null, success: null })}
                                                disabled={p.loading}
                                                className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors shrink-0 disabled:opacity-40"
                                            >
                                                Connecter
                                            </button>
                                        )}
                                    </div>

                                    {/* Input row (collapsible) */}
                                    <AnimatePresence>
                                        {p.editing && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-4 border-t border-white/10 pt-3 flex flex-col gap-2">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={p.inputValue}
                                                            onChange={e => update(platform, { inputValue: e.target.value, error: null })}
                                                            onKeyDown={e => { if (e.key === 'Enter') handleLink(platform); if (e.key === 'Escape') update(platform, { editing: false }); }}
                                                            placeholder={cfg.placeholder}
                                                            autoFocus
                                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-[13px] placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
                                                        />
                                                        <button
                                                            onClick={() => handleLink(platform)}
                                                            disabled={!p.inputValue.trim() || p.loading}
                                                            className="px-4 py-2 bg-[#00A336] hover:bg-[#00cc44] disabled:bg-white/10 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                                                        >
                                                            {p.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                            Valider
                                                        </button>
                                                    </div>
                                                    <p className="text-[11px] text-white/30">
                                                        Colle ton pseudo ou lien de profil — ex: @tonpseudo ou https://tiktok.com/@tonpseudo
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Feedback messages */}
                                    <AnimatePresence>
                                        {(p.error || p.success) && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className={`mx-4 mb-3 flex items-start gap-2 px-3 py-2 rounded-lg text-[12px] ${p.error
                                                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                                    : 'bg-[#00A336]/10 border border-[#00A336]/20 text-[#00A336]'
                                                    }`}
                                            >
                                                {p.error
                                                    ? <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                    : <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                }
                                                {p.error || p.success}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })
                    )}

                    <p className="text-[11px] text-white/20 text-center pt-1">
                        Tes pseudos sont stockés de façon sécurisée et utilisés uniquement par ton Coach IA BroReps.
                    </p>
                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-[13px] font-medium text-[#A1A1AA] hover:text-white transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
