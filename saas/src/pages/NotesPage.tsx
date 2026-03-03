import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { notesApi } from '../lib/api';
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

import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import { useToast } from '../contexts/ToastContext';

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
                <polygon points={points} fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="2" className="transition-all duration-500" />
                {data.map((d, i) => {
                    const p = getPoint(d.score, i);
                    return <circle key={`dot-${i}`} cx={p.x} cy={p.y} r="3" fill="rgba(255, 255, 255, 0.8)" className="transition-all duration-500" />
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
    const { toast } = useToast();
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [reflection, setReflection] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNotes = async () => {
            setIsLoading(true);
            try {
                const r = await notesApi.get();
                if (r.scores) {
                    setCategories(prev => prev.map(cat => ({
                        ...cat,
                        score: r.scores[cat.id] ?? cat.score
                    })));
                }
                if (r.reflection) setReflection(r.reflection);
            } catch {
            } finally {
                setIsLoading(false);
            }
        };
        fetchNotes();
    }, []);

    const handleSave = async () => {
        try {
            const scores: Record<string, number> = {};
            categories.forEach(c => { scores[c.id] = c.score; });
            await notesApi.save(scores, reflection);
            toast({
                title: 'Notes sauvegardées',
                description: 'Tes réflexions et scores ont bien été mis à jour.',
                type: 'success'
            });
        } catch {
            toast({
                title: 'Erreur',
                description: 'Impossible de sauvegarder tes notes pour le moment.',
                type: 'error'
            });
        }
    };

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
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[900px] mx-auto pb-24"
        >
            {/* Top Navigation */}
            <div className="flex items-center mb-10 w-full">
                <Button variant="ghost" className="pl-0 text-[#A1A1AA] hover:text-white" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour
                </Button>
            </div>

            {/* Title Area */}
            <div className="flex flex-col items-center mb-12">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-sm">
                    <PenLine className="w-7 h-7 text-white/80" strokeWidth={2} />
                </div>
                <h1 className="text-[32px] md:text-[42px] font-semibold text-white mb-2 tracking-tight">Mes Notes</h1>
                <p className="text-[#a1a1aa] font-medium text-[15px]">Évalue tes compétences de créateur</p>
            </div>

            {isLoading ? (
                <div className="flex flex-col gap-6">
                    <Skeleton className="h-[120px] w-full rounded-2xl bg-[#09090b] border border-white/5" />
                    <Skeleton className="h-[400px] w-full rounded-2xl bg-[#09090b] border border-white/5" />
                    <Skeleton className="h-[300px] w-full rounded-2xl bg-[#09090b] border border-white/5" />
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Global Score Card */}
                    <Card className="shadow-sm bg-[#09090b] border-white/5 rounded-2xl">
                        <CardContent className="p-8">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[#a1a1aa] font-medium text-[15px]">Score global progressif</span>
                                <span className="text-3xl font-semibold text-white tracking-tight">{globalScore}%</span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-700 ease-out rounded-full"
                                    style={{ width: `${globalScore}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Radar & Categories Split Layout */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        {/* Categories List */}
                        <Card className="flex flex-col p-2 bg-[#09090b] border-white/5 rounded-2xl">
                            <div className="grid grid-cols-1 gap-2">
                                {categories.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <div
                                            key={cat.id}
                                            className="bg-white/[0.02] border border-white/5 rounded-xl p-5 group hover:border-white/10 hover:bg-white/[0.04] transition-all"
                                        >
                                            <div className="flex items-start gap-4 mb-5">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 shadow-sm">
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-white font-medium text-[15px]">{cat.name}</h3>
                                                    <p className="text-[#a1a1aa] text-[13px] mt-0.5 font-medium">{cat.desc}</p>
                                                </div>
                                                <ChevronDown className="w-4 h-4 text-[#52525b] group-hover:text-[#a1a1aa] transition-colors" />
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-3 bg-[#050505] border border-white/5 rounded-[8px] px-2 py-1 shadow-inner">
                                                    <button
                                                        onClick={() => updateScore(cat.id, -1)}
                                                        className="text-[#a1a1aa] hover:text-white p-1 hover:bg-white/5 rounded transition-colors flex items-center justify-center h-7 w-7 cursor-pointer"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-[15px] font-semibold text-white w-5 text-center">{cat.score}</span>
                                                    <button
                                                        onClick={() => updateScore(cat.id, 1)}
                                                        className="text-[#a1a1aa] hover:text-white p-1 hover:bg-white/5 rounded transition-colors flex items-center justify-center h-7 w-7 cursor-pointer"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-white transition-all duration-300 ease-out rounded-full"
                                                        style={{ width: `${(cat.score / 10) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Radar Chart Panel */}
                        <Card className="h-full sticky top-[100px] bg-[#09090b] border-white/5 rounded-2xl">
                            <CardHeader className="pb-4 border-b border-white/5">
                                <CardTitle className="flex items-center gap-3 text-white font-medium">
                                    <div className="w-8 h-8 rounded-[8px] bg-white/5 flex items-center justify-center">
                                        <Activity className="w-4 h-4 text-white/80" />
                                    </div>
                                    Suivi visuel
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-8 flex flex-col items-center">
                                <SVGRadar data={categories.map(c => ({ name: c.name, score: c.score }))} />
                                <div className="flex justify-center items-center gap-2 mt-8 text-[#a1a1aa] text-[12px] font-medium border border-white/5 bg-white/[0.02] px-4 py-2 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-pulse" />
                                    Radar synchronisé en direct
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Reflexions & Insights Block */}
                    <Card className="bg-[#09090b] border-white/5 rounded-2xl group">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-3 text-white font-medium">
                                <div className="w-8 h-8 rounded-[8px] bg-white/5 flex items-center justify-center">
                                    <PenLine className="w-4 h-4 text-white/80" />
                                </div>
                                Réflexions personnelles
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                className="h-[140px] text-[15px] bg-[#050505] border-white/5 text-white focus:border-white/20 transition-colors"
                                placeholder="Objectif: atteindre 50K followers sur TikTok d'ic Mars. Stratégie: poster 3 vidéos courtes dynamiques par semaine."
                                value={reflection}
                                onChange={e => setReflection(e.target.value)}
                            />
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex flex-col items-center mt-2">
                        <Button
                            onClick={handleSave}
                            className="w-full text-[16px] h-[56px] bg-white text-black hover:bg-gray-200 transition-all font-semibold rounded-xl"
                        >
                            <Save className="w-[18px] h-[18px] mr-2" />
                            Sauvegarder mes notes
                        </Button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
