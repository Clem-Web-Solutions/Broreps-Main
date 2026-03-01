import { Outlet } from 'react-router';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ParticlesBackground from '../components/layout/ParticlesBackground';

export default function DashboardLayout() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col relative overflow-hidden text-white font-['Inter','Geist',sans-serif]">
            {/* 1. Base Dark Background is set on parent div */}

            {/* 2. Massive Halos (Glows Verts / Nuages) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-black">

                {/* Nuage Gauche, smooth diffuse lighting */}
                <div className="absolute top-[10%] -left-[15%] w-[40%] h-[80%] bg-[#00A336] opacity-30 blur-[200px] rounded-[100%]"></div>

                {/* Nuage Droit, diffuse lighting */}
                <div className="absolute top-[10%] -right-[15%] w-[35%] h-[70%] bg-[#00A336] opacity-25 blur-[200px] rounded-[100%]"></div>

                {/* Stars/Particles ON TOP of the background clouds so they shine clearly */}
                <ParticlesBackground />
            </div>

            <Header />
            <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 py-12 flex flex-col relative z-10">
                <Outlet />
            </main>
            <Footer />
        </div >
    );
}
