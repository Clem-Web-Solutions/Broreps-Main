import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Crown, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { authApi } from '../lib/api';
import ParticlesBackground from '../components/layout/ParticlesBackground';

type Mode = 'login' | 'forgot';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [forgotSent, setForgotSent] = useState(false);

    async function handleLogin(e: FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard', { replace: true });
        } catch (err: unknown) {
            const e = err as Error & { code?: string };
            if (e.code === 'NO_ACCOUNT') setError("Aucun compte trouvé avec cet email. Vérifie ton email d'abonnement.");
            else if (e.code === 'NO_PASSWORD') setError('Mot de passe non encore défini. Vérifie tes emails pour le lien de création.');
            else if (e.code === 'SUBSCRIPTION_INACTIVE') setError('Ton abonnement est inactif ou expiré. Reprends un abonnement pour accéder au SaaS.');
            else if (e.code === 'INVALID_PASSWORD') setError('Mot de passe incorrect.');
            else setError(e.message || 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    }

    async function handleForgot(e: FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authApi.forgotPassword(email);
            setForgotSent(true);
        } catch (err: unknown) {
            setError((err as Error).message || 'Erreur');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background */}
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
                {/* Logo */}
                <div className="flex flex-col items-center mb-10">
                    <Crown className="w-8 h-8 text-[#00A336] mb-1" />
                    <span className="text-[22px] font-black text-[#00A336] italic tracking-tighter leading-none">BROREPS</span>
                    <span className="text-[12px] text-[#52525b] font-medium mt-1 tracking-widest uppercase">Espace membres</span>
                </div>

                <div className="bg-[#0a0a0a] border border-[#18181b] rounded-[20px] p-8 shadow-[0_0_60px_rgba(0,163,54,0.08)]">
                    {mode === 'login' && (
                        <>
                            <h1 className="text-white text-[22px] font-black mb-1">Connexion</h1>
                            <p className="text-[#71717a] text-[13px] mb-7">Utilise l'email de ton abonnement BroReps</p>

                            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                {/* Email */}
                                <div className="flex items-center gap-3 bg-[#111111] border border-[#27272a] rounded-xl px-4 h-[50px] focus-within:border-[#00A336] transition-colors">
                                    <Mail className="w-4 h-4 text-[#52525b] flex-shrink-0" />
                                    <input
                                        type="email"
                                        placeholder="Ton adresse email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        className="flex-1 bg-transparent text-white text-[14px] placeholder-[#52525b] outline-none"
                                    />
                                </div>

                                {/* Password */}
                                <div className="flex items-center gap-3 bg-[#111111] border border-[#27272a] rounded-xl px-4 h-[50px] focus-within:border-[#00A336] transition-colors">
                                    <Lock className="w-4 h-4 text-[#52525b] flex-shrink-0" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Mot de passe"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        className="flex-1 bg-transparent text-white text-[14px] placeholder-[#52525b] outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 text-[#f87171] text-[13px] bg-[#7f1d1d]/20 border border-[#7f1d1d]/30 rounded-xl p-3">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="h-[50px] bg-[#00A336] hover:bg-[#00BF3F] text-white font-bold text-[15px] rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Connexion...' : (
                                        <>Accéder <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>

                            <button
                                onClick={() => { setMode('forgot'); setError(''); }}
                                className="w-full text-center text-[13px] text-[#52525b] hover:text-[#a1a1aa] transition-colors mt-5 cursor-pointer"
                            >
                                Mot de passe oublié ?
                            </button>
                        </>
                    )}

                    {mode === 'forgot' && !forgotSent && (
                        <>
                            <h1 className="text-white text-[22px] font-black mb-1">Réinitialiser</h1>
                            <p className="text-[#71717a] text-[13px] mb-7">Entre l'email de ton abonnement</p>

                            <form onSubmit={handleForgot} className="flex flex-col gap-4">
                                <div className="flex items-center gap-3 bg-[#111111] border border-[#27272a] rounded-xl px-4 h-[50px] focus-within:border-[#00A336] transition-colors">
                                    <Mail className="w-4 h-4 text-[#52525b] flex-shrink-0" />
                                    <input
                                        type="email"
                                        placeholder="Ton adresse email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        className="flex-1 bg-transparent text-white text-[14px] placeholder-[#52525b] outline-none"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 text-[#f87171] text-[13px] bg-[#7f1d1d]/20 border border-[#7f1d1d]/30 rounded-xl p-3">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="h-[50px] bg-[#00A336] hover:bg-[#00BF3F] text-white font-bold text-[15px] rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Envoi...' : 'Envoyer le lien'}
                                </button>
                            </form>

                            <button
                                onClick={() => setMode('login')}
                                className="w-full text-center text-[13px] text-[#52525b] hover:text-[#a1a1aa] transition-colors mt-5 cursor-pointer"
                            >
                                ← Retour
                            </button>
                        </>
                    )}

                    {mode === 'forgot' && forgotSent && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <span className="text-[40px]">📬</span>
                            <h2 className="text-white text-[18px] font-bold text-center">Email envoyé !</h2>
                            <p className="text-[#71717a] text-[13px] text-center leading-relaxed">
                                Si un compte existe avec cet email, tu recevras un lien de réinitialisation.
                            </p>
                            <button
                                onClick={() => { setMode('login'); setForgotSent(false); }}
                                className="text-[#00A336] text-[13px] font-medium hover:underline cursor-pointer"
                            >
                                Retour à la connexion
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-center text-[12px] text-[#3f3f46] mt-6">
                    Problème d'accès ? <a href="mailto:support@broreps.fr" className="text-[#52525b] hover:text-[#a1a1aa]">support@broreps.fr</a>
                </p>
            </motion.div>
        </div>
    );
}
