import createGlobe from 'cobe';
import { useEffect, useRef, useState } from 'react';

export default function CobeGlobe() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointerInteracting = useRef<number | null>(null);
    const pointerInteractionMovement = useRef(0);

    useEffect(() => {
        let phi = 0;
        let width = 0;

        const onResize = () => {
            if (canvasRef.current) {
                width = canvasRef.current.offsetWidth;
            }
        };
        window.addEventListener('resize', onResize);
        onResize();

        if (!canvasRef.current) return;

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: width * 2,
            height: width * 2,
            phi: 0,
            theta: 0.3,
            dark: 1,
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: 6,
            baseColor: [0.04, 0.06, 0.05],
            markerColor: [0.1, 0.8, 0.3],
            glowColor: [0, 0.6, 0.2],
            markers: [
                // Europe / France
                { location: [48.8566, 2.3522], size: 0.1 },   // Paris
                { location: [45.7640, 4.8357], size: 0.07 },  // Lyon
                { location: [43.2965, 5.3698], size: 0.08 },  // Marseille
                { location: [44.8378, -0.5792], size: 0.06 }, // Bordeaux
                { location: [50.8503, 4.3517], size: 0.08 },  // Brussels
                { location: [46.2044, 6.1432], size: 0.07 },  // Geneva
                { location: [51.5074, -0.1278], size: 0.08 }, // London
                { location: [41.9028, 12.4964], size: 0.06 }, // Rome
                { location: [40.4168, -3.7038], size: 0.07 }, // Madrid
                { location: [52.5200, 13.4050], size: 0.08 }, // Berlin

                // Africa (Francophone focus & more)
                { location: [5.30966, -4.01266], size: 0.1 }, // Abidjan (Côte d'Ivoire)
                { location: [14.6928, -17.4467], size: 0.09 }, // Dakar (Senegal)
                { location: [3.8480, 11.5021], size: 0.08 },  // Yaoundé (Cameroon)
                { location: [4.0511, 9.7679], size: 0.07 },   // Douala (Cameroon)
                { location: [-4.2689, 15.2814], size: 0.09 }, // Brazzaville (Congo)
                { location: [-4.4419, 15.2663], size: 0.1 },  // Kinshasa (DRC)
                { location: [6.1256, 1.2254], size: 0.07 },   // Lomé (Togo)
                { location: [36.8065, 10.1815], size: 0.08 }, // Tunis (Tunisia)
                { location: [33.5731, -7.5898], size: 0.09 }, // Casablanca (Morocco)
                { location: [36.7538, 3.0588], size: 0.08 },  // Algiers (Algeria)
                { location: [6.5244, 3.3792], size: 0.07 },   // Lagos
                { location: [-26.2041, 28.0473], size: 0.06 },// Johannesburg
                { location: [9.0820, 8.6753], size: 0.05 },   // Abuja
                { location: [-1.2921, 36.8219], size: 0.06 }, // Nairobi

                // Americas
                { location: [45.5017, -73.5673], size: 0.09 },  // Montreal
                { location: [46.8139, -71.2080], size: 0.06 },  // Quebec
                { location: [40.7128, -74.0060], size: 0.08 },  // NY
                { location: [34.0522, -118.2437], size: 0.07 }, // LA
                { location: [37.7749, -122.4194], size: 0.08 }, // SF
                { location: [25.7617, -80.1918], size: 0.05 },  // Miami
                { location: [-23.5505, -46.6333], size: 0.07 }, // Sao Paulo

                // Middle East & Asia
                { location: [25.2048, 55.2708], size: 0.08 },   // Dubai
                { location: [1.3521, 103.8198], size: 0.06 },   // Singapore
                { location: [35.6762, 139.6503], size: 0.06 },  // Tokyo
                { location: [-33.8688, 151.2093], size: 0.05 }, // Sydney
            ],
            onRender: (state: Record<string, any>) => {
                if (!pointerInteracting.current) {
                    phi += 0.003;
                }
                state.phi = phi + pointerInteractionMovement.current;
                state.width = width * 2;
                state.height = width * 2;
            }
        });

        // Small delay to ensure layout is complete and width is correct
        setTimeout(() => onResize(), 100);

        return () => {
            globe.destroy();
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return (
        <div className="w-full relative flex items-center justify-center max-w-[320px] aspect-square mx-auto my-8">
            {/* The dramatic background glow under the globe */}
            <div className="absolute inset-0 rounded-full bg-[#00A336] opacity-30 blur-[60px] pointer-events-none" />

            <canvas
                ref={canvasRef}
                onPointerDown={(e) => {
                    pointerInteracting.current = e.clientX;
                    if (canvasRef.current) {
                        canvasRef.current.style.cursor = 'grabbing';
                    }
                }}
                onPointerUp={() => {
                    pointerInteracting.current = null;
                    if (canvasRef.current) {
                        canvasRef.current.style.cursor = 'grab';
                    }
                }}
                onPointerOut={() => {
                    pointerInteracting.current = null;
                    if (canvasRef.current) {
                        canvasRef.current.style.cursor = 'grab';
                    }
                }}
                onMouseMove={(e) => {
                    if (pointerInteracting.current !== null) {
                        const delta = e.clientX - pointerInteracting.current;
                        pointerInteractionMovement.current = delta / 200;
                    }
                }}
                onTouchMove={(e) => {
                    if (pointerInteracting.current !== null && e.touches[0]) {
                        const delta = e.touches[0].clientX - pointerInteracting.current;
                        pointerInteractionMovement.current = delta / 100;
                    }
                }}
                style={{
                    width: '100%',
                    height: '100%',
                    cursor: 'grab',
                    opacity: 0.9
                }}
                className="relative z-10 drop-shadow-[0_0_20px_rgba(0,163,54,0.4)] transition-opacity duration-1000"
            />
        </div>
    );
}
