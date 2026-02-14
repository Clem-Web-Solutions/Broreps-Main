import { Eye, EyeOff, Lock, Mail, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { cn } from "../../libs/utils";
import api from "../../libs/api";

export function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('❌ Les mots de passe ne correspondent pas');
            return;
        }

        if (formData.password.length < 6) {
            setError('❌ Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        setLoading(true);

        try {
            await api.register({
                name: formData.name,
                email: formData.email,
                password: formData.password
            });

            alert('✅ Inscription réussie!\n\nVotre compte est en attente de validation par un administrateur.\nVous recevrez un email une fois votre compte approuvé.');
            navigate('/login');
        } catch (err: any) {
            // Gérer les différents codes d'erreur
            let errorMessage = 'Erreur lors de l\'inscription';

            switch (err.code) {
                case 'EMAIL_EXISTS':
                    errorMessage = '❌ Cet email est déjà utilisé. Un compte existe déjà avec cet email.';
                    break;
                case 'INVALID_EMAIL':
                    errorMessage = '❌ Format d\'email invalide';
                    break;
                case 'PASSWORD_TOO_SHORT':
                    errorMessage = '❌ Le mot de passe doit contenir au moins 6 caractères';
                    break;
                case 'MISSING_FIELDS':
                    errorMessage = '❌ Tous les champs sont requis';
                    break;
                default:
                    errorMessage = err.message || 'Erreur lors de l\'inscription';
            }

            setError(errorMessage);
        } finally {
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

            {/* Register Card */}
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
                            Créez votre compte
                        </p>
                    </div>

                    {/* Register Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Name Field */}
                        <div className="space-y-2">
                            <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                                Nom complet
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                    className="w-full pl-11 pr-4 py-3 bg-background/50 border border-primary/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                    required
                                />
                            </div>
                        </div>

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
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                        {/* Confirm Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                                Confirmer le mot de passe
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-12 py-3 bg-background/50 border border-primary/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
                                    Création en cours...
                                </>
                            ) : (
                                <>
                                    <UserPlus size={20} />
                                    Créer mon compte
                                </>
                            )}
                        </button>
                    </form>

                    {/* Sign In Link */}
                    <div className="mt-6 text-center text-sm">
                        <span className="text-slate-400">Déjà un compte? </span>
                        <button
                            onClick={() => navigate('/login')}
                            className="text-primary hover:text-primary/80 transition-colors font-medium"
                        >
                            Se connecter
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