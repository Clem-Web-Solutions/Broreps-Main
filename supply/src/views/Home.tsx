import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export function Home() {
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem('auth_token');
        
        if (token) {
            // Redirect to dashboard if authenticated
            navigate('/dashboard', { replace: true });
        } else {
            // Redirect to login if not authenticated
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    // Show loading while redirecting
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Chargement...</p>
            </div>
        </div>
    );
}
