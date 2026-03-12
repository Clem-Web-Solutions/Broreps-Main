import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { authApi } from '../lib/api';
import ParticlesBackground from '../components/layout/ParticlesBackground';

import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';

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
        <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[10%] -left-[15%] w-[40%] h-[80%] bg-[#00A336] opacity-[0.07] blur-[150px] rounded-[100%]" />
                <div className="absolute top-[30%] right-[5%] w-[35%] h-[70%] bg-[#00FF7F] opacity-[0.05] blur-[150px] rounded-[100%]" />
                <ParticlesBackground />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-[420px] px-6"
            >
                {/* Logo Area */}
                <div className="flex flex-col items-center mb-8">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <img src="/logo.png" alt="BroReps Logo" className="h-[52px] object-contain mb-4" />
                    </motion.div>
                    <span className="flex items-center gap-2 text-[11px] text-[#A1A1AA] font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full border border-[#18181b] bg-[#0A0A0A]">
                        <Sparkles className="w-3 h-3 text-[#00A336]" />
                        Espace Membres Premium
                    </span>
                </div>

                <Card className="border-[#18181b] bg-[#0A0A0A]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/5 mx-auto">
                    <AnimatePresence mode="wait">
                        {mode === 'login' ? (
                            <motion.div
                                key="login"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-2xl font-black">Bon retour.</CardTitle>
                                    <CardDescription>Accède à ton dashboard et à tes cours BroReps.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                        <div className="flex flex-col gap-3">
                                            {/* Custom Input Group */}
                                            <div className="group flex items-center gap-3 bg-[#111] border border-[#18181b] rounded-[10px] px-4 h-[48px] focus-within:border-[#00A336] focus-within:ring-1 focus-within:ring-[#00A336]/20 transition-all">
                                                <Mail className="w-[18px] h-[18px] text-[#A1A1AA] group-focus-within:text-[#00A336] transition-colors flex-shrink-0" />
                                                <input
                                                    type="email"
                                                    placeholder="Adresse email"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    required
                                                    className="flex-1 bg-transparent text-[#F4F4F5] text-[14px] placeholder-[#52525b] outline-none"
                                                />
                                            </div>

                                            <div className="group flex items-center gap-3 bg-[#111] border border-[#18181b] rounded-[10px] px-4 h-[48px] focus-within:border-[#00A336] focus-within:ring-1 focus-within:ring-[#00A336]/20 transition-all relative">
                                                <Lock className="w-[18px] h-[18px] text-[#A1A1AA] group-focus-within:text-[#00A336] transition-colors flex-shrink-0" />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Mot de passe"
                                                    value={password}
                                                    onChange={e => setPassword(e.target.value)}
                                                    required
                                                    className="flex-1 bg-transparent text-[#F4F4F5] text-[14px] placeholder-[#52525b] outline-none pr-8"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(v => !v)}
                                                    className="absolute right-4 text-[#52525B] hover:text-[#F4F4F5] transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="flex items-start gap-2 text-red-500 text-[13px] bg-red-500/10 border border-red-500/20 rounded-[10px] p-3"
                                            >
                                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                <p>{error}</p>
                                            </motion.div>
                                        )}

                                        <Button
                                            type="submit"
                                            variant="premium"
                                            disabled={loading}
                                            className="w-full h-[48px] mt-2 group text-[15px] font-bold"
                                        >
                                            {loading ? 'Connexion en cours...' : (
                                                <>Accéder au portail <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>
                                            )}
                                        </Button>
                                    </form>

                                    <div className="mt-6 flex justify-center">
                                        <button
                                            onClick={() => { setMode('forgot'); setError(''); }}
                                            className="text-[13px] text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors cursor-pointer"
                                        >
                                            Mot de passe oublié ?
                                        </button>
                                    </div>
                                </CardContent>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="forgot"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {!forgotSent ? (
                                    <>
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-2xl font-black">Réinitialisation</CardTitle>
                                            <CardDescription>Entre l'email associé à ton compte pour récupérer l'accès.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <form onSubmit={handleForgot} className="flex flex-col gap-4">
                                                <div className="group flex items-center gap-3 bg-[#111] border border-[#18181b] rounded-[10px] px-4 h-[48px] focus-within:border-[#00A336] focus-within:ring-1 focus-within:ring-[#00A336]/20 transition-all">
                                                    <Mail className="w-[18px] h-[18px] text-[#A1A1AA] group-focus-within:text-[#00A336] transition-colors flex-shrink-0" />
                                                    <input
                                                        type="email"
                                                        placeholder="Adresse email"
                                                        value={email}
                                                        onChange={e => setEmail(e.target.value)}
                                                        required
                                                        className="flex-1 bg-transparent text-[#F4F4F5] text-[14px] placeholder-[#52525b] outline-none"
                                                    />
                                                </div>

                                                {error && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="flex items-start gap-2 text-red-500 text-[13px] bg-red-500/10 border border-red-500/20 rounded-[10px] p-3"
                                                    >
                                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                        <p>{error}</p>
                                                    </motion.div>
                                                )}

                                                <Button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="w-full h-[48px] mt-2 group font-bold bg-[#F4F4F5] text-[#0A0A0A] hover:bg-white"
                                                >
                                                    {loading ? 'Envoi...' : 'M\'envoyer le lien'}
                                                </Button>
                                            </form>

                                            <div className="mt-6 flex justify-center">
                                                <button
                                                    onClick={() => setMode('login')}
                                                    className="text-[13px] text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors cursor-pointer flex items-center gap-2"
                                                >
                                                    ← Retour à la connexion
                                                </button>
                                            </div>
                                        </CardContent>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-8 gap-4">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", bounce: 0.5 }}
                                            className="w-16 h-16 bg-[#00A336]/10 rounded-full flex items-center justify-center"
                                        >
                                            <span className="text-[32px]">📬</span>
                                        </motion.div>
                                        <h2 className="text-white text-xl font-bold text-center">Lien envoyé !</h2>
                                        <p className="text-[#A1A1AA] text-[14px] text-center leading-relaxed mb-4">
                                            Vérifie ta boîte mail. Si un compte existe, tu y trouveras les instructions.
                                        </p>
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setMode('login'); setForgotSent(false); }}
                                            className="text-[13px] h-[36px]"
                                        >
                                            Retour à la connexion
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-[12px] text-[#52525B] mt-8"
                >
                    Besoin d'aide ? <a href="mailto:contact@broreps.fr" className="hover:text-[#F4F4F5] transition-colors underline underline-offset-4">contact@broreps.fr</a>
                </motion.p>
            </motion.div>
        </div>
    );
}
