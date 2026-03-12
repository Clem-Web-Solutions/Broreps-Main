import { useState, useEffect, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Crown, CheckCircle, AlertCircle } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router';
import { authApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import ParticlesBackground from '../components/layout/ParticlesBackground';

export default function SetupPasswordPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { refresh } = useAuth();
    const token = params.get('token') || '';
    const isReset = params.get('reset') === '1';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            navigate('/login', { replace: true });
        }
    }, [token, navigate]);

    const strength = (() => {
        if (password.length === 0) return 0;
        let s = 0;
        if (password.length >= 8) s++;
        if (/[A-Z]/.test(password)) s++;
        if (/[0-9]/.test(password)) s++;
        if (/[^A-Za-z0-9]/.test(password)) s++;
        return s;
    })();

    const strengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Excellent'][strength];
    const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#00A336'][strength];

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
        if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return; }
        setLoading(true);
        try {
            const res = await authApi.setupPassword(token, password);
            localStorage.setItem('saas_token', res.token);
            await refresh();
            setDone(true);
            setTimeout(() => navigate('/module/1?autoplay=1', { replace: true }), 2000);
        } catch (err: unknown) {
            const e = err as Error & { code?: string };
            if (e.code === 'INVALID_TOKEN') setError('Lien invalide ou expiré. Demande un nouveau lien.');
            else setError(e.message || 'Erreur');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[10%] -left-[15%] w-[40%] h-[80%] bg-[#00A336] opacity-20 blur-[200px] rounded-[100%]" />
                <div className="absolute top-[10%] -right-[15%] w-[35%] h-[70%] bg-[#00A336] opacity-15 blur-[200px] rounded-[100%]" />
                <ParticlesBackground />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-[420px] px-6"
            >
                <div className="flex flex-col items-center mb-10">
                    <Crown className="w-8 h-8 text-[#00A336] mb-1" />
                    <span className="text-[22px] font-black text-[#00A336] italic tracking-tighter leading-none">BROREPS</span>
                </div>

                <div className="bg-[#0a0a0a] border border-[#18181b] rounded-[20px] p-8 shadow-[0_0_60px_rgba(0,163,54,0.08)]">
                    {done ? (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <CheckCircle className="w-12 h-12 text-[#00A336]" />
                            <h2 className="text-white text-[20px] font-black text-center">Mot de passe créé !</h2>
                            <p className="text-[#71717a] text-[13px] text-center">Redirection vers ton premier module…</p>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-white text-[22px] font-black mb-1">
                                {isReset ? 'Nouveau mot de passe' : 'Créer ton mot de passe'}
                            </h1>
                            <p className="text-[#71717a] text-[13px] mb-7">
                                {isReset
                                    ? 'Choisis un nouveau mot de passe sécurisé'
                                    : 'Bienvenue chez BroReps 🎉 Choisis ton mot de passe'}
                            </p>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3 bg-[#111111] border border-[#27272a] rounded-xl px-4 h-[50px] focus-within:border-[#00A336] transition-colors">
                                        <Lock className="w-4 h-4 text-[#52525b] flex-shrink-0" />
                                        <input
                                            type={showPw ? 'text' : 'password'}
                                            placeholder="Mot de passe (min 8 caractères)"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            className="flex-1 bg-transparent text-white text-[14px] placeholder-[#52525b] outline-none"
                                        />
                                        <button type="button" onClick={() => setShowPw(v => !v)} className="text-[#52525b] hover:text-[#a1a1aa]">
                                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {password.length > 0 && (
                                        <div className="flex items-center gap-2 px-1">
                                            <div className="flex-1 h-1 bg-[#18181b] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
                                                    style={{ width: `${strength * 25}%`, backgroundColor: strengthColor }}
                                                />
                                            </div>
                                            <span className="text-[11px] font-medium" style={{ color: strengthColor }}>{strengthLabel}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 bg-[#111111] border border-[#27272a] rounded-xl px-4 h-[50px] focus-within:border-[#00A336] transition-colors">
                                    <Lock className="w-4 h-4 text-[#52525b] flex-shrink-0" />
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        placeholder="Confirmer le mot de passe"
                                        value={confirm}
                                        onChange={e => setConfirm(e.target.value)}
                                        required
                                        className="flex-1 bg-transparent text-white text-[14px] placeholder-[#52525b] outline-none"
                                    />
                                    {confirm.length > 0 && (
                                        <CheckCircle
                                            className={`w-4 h-4 ${confirm === password ? 'text-[#00A336]' : 'text-[#ef4444]'}`}
                                        />
                                    )}
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 text-[#f87171] text-[13px] bg-[#7f1d1d]/20 border border-[#7f1d1d]/30 rounded-xl p-3">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || password.length < 8}
                                    className="h-[50px] bg-[#00A336] hover:bg-[#00BF3F] text-white font-bold text-[15px] rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Création...' : 'Valider mon mot de passe'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
