import { Outlet } from 'react-router';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ParticlesBackground from '../components/layout/ParticlesBackground';
import { CommandMenu } from '../components/ui/command-menu';

export default function DashboardLayout() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col relative overflow-hidden text-white font-['Inter','Geist',sans-serif]">
            {/* 1. Base Dark Background is set on parent div */}

            {/* 2. Massive Halos (Glows Verts / Nuages) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-black">

                {/* Ambient glow, very subtle */}
                <div className="absolute top-[0%] left-[20%] w-[50%] h-[50%] bg-[#00A336] opacity-[0.06] blur-[150px] rounded-full mix-blend-screen pointer-events-none"></div>
                <div className="absolute bottom-[0%] right-[10%] w-[40%] h-[50%] bg-[#00A336] opacity-[0.04] blur-[150px] rounded-full mix-blend-screen pointer-events-none"></div>


                {/* Stars/Particles ON TOP of the background clouds so they shine clearly */}
                <ParticlesBackground />
            </div>

            <Header />
            <CommandMenu />
            <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 pt-32 pb-12 flex flex-col relative z-10">
                <Outlet />
            </main>
            <Footer />
        </div >
    );
}
