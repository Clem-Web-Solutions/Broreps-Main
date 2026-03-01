import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
    ArrowLeft,
    PenLine,
    Mic,
    Video,
    Zap,
    Clock,
    Target,
    Flame,
    TrendingUp,
    ChevronDown,
    Activity,
    Save
} from 'lucide-react';

interface Category {
    id: string;
    name: string;
    desc: string;
    icon: React.ElementType;
    score: number;
}

const initialCategories: Category[] = [
    { id: 'communication', name: 'Communication', desc: 'Clarté et storytelling', icon: Mic, score: 5 },
    { id: 'creation', name: 'Création', desc: 'Qualité et régularité', icon: Video, score: 5 },
    { id: 'discipline', name: 'Discipline', desc: 'Rigueur au quotidien', icon: Zap, score: 5 },
    { id: 'productivite', name: 'Productivité', desc: 'Efficacité et focus', icon: Clock, score: 5 },
    { id: 'strategie', name: 'Stratégie', desc: 'Vision long terme', icon: Target, score: 5 },
    { id: 'energie', name: 'Énergie', desc: 'Motivation et drive', icon: Flame, score: 5 },
    { id: 'impact', name: 'Impact', desc: 'Résultats et croissance', icon: TrendingUp, score: 5 },
];

function SVGRadar({ data, max = 10 }: { data: { name: string, score: number }[], max?: number }) {
    const size = 300;
    const center = size / 2;
    const radius = center - 40;
    const numPoints = data.length;

    const getPoint = (value: number, index: number) => {
        const r = (value / max) * radius;
        const angle = (Math.PI * 2 * index) / numPoints - Math.PI / 2;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    const points = data.map((d, i) => {
        const p = getPoint(d.score, i);
        return `${p.x},${p.y}`;
    }).join(' ');

    const levels = [2, 4, 6, 8, 10];

    return (
        <div className="relative w-full max-w-[400px] aspect-square mx-auto">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
                {levels.map(level => {
                    const levelPoints = data.map((_, i) => Object.values(getPoint(level, i)).join(',')).join(' ');
                    return <polygon key={level} points={levelPoints} fill="none" stroke="#18181b" strokeWidth="1" />
                })}
                {data.map((_, i) => {
                    const p = getPoint(max, i);
                    return <line key={`line-${i}`} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#18181b" strokeWidth="1" />
                })}
                <polygon points={points} fill="rgba(234, 179, 8, 0.15)" stroke="#eab308" strokeWidth="2" className="transition-all duration-500" />
                {data.map((d, i) => {
                    const p = getPoint(d.score, i);
                    return <circle key={`dot-${i}`} cx={p.x} cy={p.y} r="3" fill="#eab308" className="transition-all duration-500" />
                })}
                {data.map((d, i) => {
                    const p = getPoint(max + 1.8, i);
                    return (
                        <text key={`text-${i}`} x={p.x} y={p.y} fill="#a1a1aa" fontSize="10" textAnchor="middle" dominantBaseline="middle" className="font-medium">
                            {d.name}
                        </text>
                    )
                })}
            </svg>
        </div>
    )
}

export default function NotesPage() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>(initialCategories);

    const updateScore = (id: string, delta: number) => {
        setCategories(prev =>
            prev.map(cat => {
                if (cat.id === id) {
                    const newScore = Math.max(0, Math.min(10, cat.score + delta));
                    return { ...cat, score: newScore };
                }
                return cat;
            })
        );
    };

    const globalScore = useMemo(() => {
        const total = categories.reduce((sum, cat) => sum + cat.score, 0);
        return Math.round((total / (categories.length * 10)) * 100);
    }, [categories]);

    return (
        <div className="animate-in fade-in duration-500 pb-20">

            {/* Top Header */}
            <div className="flex items-center absolute top-0 mt-6 lg:mt-0 lg:relative z-10 w-full mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="text-[#a1a1aa] hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                </button>
            </div>

            <div className="relative">
                {/* Title Section */}
                <div className="flex flex-col items-center mb-12">
                    <div className="w-16 h-16 rounded-2xl bg-[#00A336] flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,163,54,0.3)]">
                        <PenLine className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-[32px] font-bold text-white mb-2 tracking-tight">Mes Notes</h1>
                    <p className="text-[#a1a1aa] font-medium">Évalue tes compétences de créateur</p>
                </div>

                {/* Global Score Panel */}
                <div className="bg-[#050505]/80 backdrop-blur-xl border border-[#18181b] rounded-2xl p-6 mb-8 hover:border-[#27272a] transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[#a1a1aa] font-medium text-sm">Score global</span>
                        <span className="text-2xl font-black text-[#eab308]">{globalScore}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#111111] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#eab308] transition-all duration-700 ease-out shadow-[0_0_10px_rgba(234,179,8,0.5)] rounded-full"
                            style={{ width: `${globalScore}%` }}
                        />
                    </div>
                </div>

                {/* Categories Grid Container */}
                <div className="bg-[#050505]/80 backdrop-blur-xl border border-[#18181b] rounded-3xl p-6 mb-8 hover:border-[#27272a] transition-all">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map((cat, index) => {
                            const Icon = cat.icon;
                            const isLast = index === categories.length - 1;
                            return (
                                <div
                                    key={cat.id}
                                    className={`bg-[#0A0A0A] border border-[#18181b] rounded-xl p-5 relative group hover:border-[#3f3f46] transition-all ${isLast ? 'lg:col-span-3' : ''}`}
                                >
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-10 h-10 rounded-lg bg-[#18181b] flex items-center justify-center text-[#eab308] group-hover:scale-110 group-hover:bg-[#1f1f22] transition-all">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-sm">{cat.name}</h3>
                                            <p className="text-[#a1a1aa] text-xs mt-0.5">{cat.desc}</p>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-[#52525b] group-hover:text-[#a1a1aa] transition-colors" />
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-3 bg-[#111111] border border-[#18181b] rounded-lg px-2 py-1">
                                            <button
                                                onClick={() => updateScore(cat.id, -1)}
                                                className="text-[#a1a1aa] hover:text-white p-1 hover:bg-[#27272a] rounded transition-colors flex items-center justify-center h-6 w-6 font-bold"
                                            >
                                                -
                                            </button>
                                            <span className="text-[15px] font-black text-[#eab308] w-4 text-center">{cat.score}</span>
                                            <button
                                                onClick={() => updateScore(cat.id, 1)}
                                                className="text-[#a1a1aa] hover:text-white p-1 hover:bg-[#27272a] rounded transition-colors flex items-center justify-center h-6 w-6 font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="flex-1 h-1.5 bg-[#111111] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#eab308] transition-all duration-300 ease-out shadow-[0_0_8px_rgba(234,179,8,0.4)] rounded-full"
                                                style={{ width: `${(cat.score / 10) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Radar Chart Panel */}
                <div className="bg-[#050505]/80 backdrop-blur-xl border border-[#18181b] rounded-3xl p-6 mb-8 hover:border-[#27272a] transition-all">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 rounded-lg bg-[#18181b] flex items-center justify-center border border-[#27272a]">
                            <Activity className="w-4 h-4 text-[#eab308]" />
                        </div>
                        <h2 className="text-white font-bold text-base">Suivi visuel</h2>
                    </div>

                    <SVGRadar data={categories.map(c => ({ name: c.name, score: c.score }))} />

                    <div className="flex justify-center items-center gap-2 mt-4 text-[#71717a] text-[11px] font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#00A336] to-[#00FF7F]" />
                        Radar mis à jour en temps réel
                    </div>
                </div>

                {/* Reflexions & Insights Block */}
                <div className="bg-[#050505]/80 backdrop-blur-xl border border-[#18181b] rounded-3xl p-6 mb-8 hover:border-[#27272a] transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#00A336]/10 border border-[#00A336]/20 flex items-center justify-center group-hover:bg-[#00A336]/20 transition-colors">
                            <PenLine className="w-4 h-4 text-[#00FF7F]" />
                        </div>
                        <h2 className="text-white font-bold text-base">Bloc Réflexions & Insights</h2>
                    </div>
                    <p className="text-[#a1a1aa] text-[13px] mb-4 font-medium">Note tes idées, stratégies ou observations personnelles.</p>
                    <textarea
                        className="w-full h-32 bg-[#0A0A0A] border border-[#18181b] rounded-xl p-4 text-[14px] text-white placeholder-[#52525b] focus:outline-none focus:border-[#00A336] focus:ring-1 focus:ring-[#00A336] resize-none transition-all shadow-inner"
                        placeholder="Écris librement tes pensées, objectifs, stratégies..."
                    />
                </div>

                {/* Save Button */}
                <button className="w-full bg-[#00A336] hover:bg-[#00E64D] text-white font-bold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,163,54,0.2)] hover:shadow-[0_0_30px_rgba(0,230,77,0.4)] transform hover:-translate-y-0.5 active:translate-y-0">
                    <Save className="w-[18px] h-[18px]" />
                    Sauvegarder mes notes
                </button>

            </div>
        </div>
    );
}
