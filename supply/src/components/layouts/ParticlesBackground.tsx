import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { type ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

export default function ParticlesBackground() {
    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const options: ISourceOptions = {
        background: {
            color: {
                value: "transparent",
            },
        },
        fpsLimit: 120,
        interactivity: {
            events: {
                onClick: {
                    enable: false,
                    mode: "push",
                },
                onHover: {
                    enable: true,
                    mode: "repulse",
                },
            },
            modes: {
                push: {
                    quantity: 4,
                },
                repulse: {
                    distance: 100,
                    duration: 0.4,
                },
            },
        },
        particles: {
            color: {
                value: ["#ffffff", "#00A336"],
            },
            links: {
                color: "#00A336",
                distance: 150,
                enable: false,
                opacity: 0.1,
                width: 1,
            },
            move: {
                direction: "top",
                enable: true,
                outModes: {
                    default: "out",
                },
                random: true,
                speed: 0.3,
                straight: false,
            },
            number: {
                density: {
                    enable: true,
                },
                value: 150,
            },
            opacity: {
                value: { min: 0.1, max: 0.5 },
            },
            shape: {
                type: "circle",
            },
            size: {
                value: { min: 0.5, max: 2 },
            },
        },
        detectRetina: true,
    };

    if (init) {
        return (
            <Particles
                id="tsparticles"
                className="absolute inset-0 w-full h-full -z-10"
                options={options}
            />
        );
    }

    return <></>;
}
