import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { cn } from "../../libs/utils";

export function Login() {
    const { login, isAuthenticated } = useAuth() as any;
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect to dashboard if already authenticated
    useEffect(() => {
        if (isAuthenticated && !loading) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, loading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard', { replace: true });
        } catch (err: any) {
            console.error('Login error:', err);
            
            // Gérer les différents codes d'erreur
            let errorMessage = 'Échec de la connexion';

            switch (err.code) {
                case 'NO_ACCOUNT':
                    errorMessage = '❌ Aucun compte trouvé avec cet email';
                    break;
                case 'PENDING_VALIDATION':
                    errorMessage = '⏳ Votre compte est en attente de validation par un administrateur';
                    break;
                case 'ACCOUNT_REJECTED':
                    errorMessage = '🚫 Votre compte a été refusé par un administrateur';
                    break;
                case 'INVALID_PASSWORD':
                    errorMessage = '❌ Mot de passe incorrect';
                    break;
                case 'MISSING_FIELDS':
                    errorMessage = '❌ Email et mot de passe requis';
                    break;
                default:
                    errorMessage = err.message || 'Échec de la connexion';
            }

            setError(errorMessage);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-card/50 backdrop-blur-xl border border-primary/10 rounded-2xl p-8 shadow-2xl">
                    {/* Logo/Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                            <span className="text-3xl font-black text-primary">BR</span>
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-slate-400 mb-2">
                            BROREPS
                        </h1>
                        <p className="text-slate-400 text-sm">
                            Connectez-vous à votre compte
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="votre@email.com"
                                    className="w-full pl-11 pr-4 py-3 bg-background/50 border border-primary/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                                Mot de passe
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-12 py-3 bg-background/50 border border-primary/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full py-3 px-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                "shadow-lg shadow-primary/20 hover:shadow-primary/30"
                            )}
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                    Connexion en cours...
                                </>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    Se connecter
                                </>
                            )}
                        </button>
                    </form>

                    {/* Sign Up Link */}
                    <div className="mt-6 text-center text-sm">
                        <span className="text-slate-400">Pas encore de compte? </span>
                        <button
                            onClick={() => navigate('/register')}
                            className="text-primary hover:text-primary/80 transition-colors font-medium"
                        >
                            Créer un compte
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-xs text-slate-500">
                    © 2026 BROREPS. Tous droits réservés.
                </div>
            </div>
        </div>
    )
}