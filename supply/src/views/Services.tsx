import { Bookmark, CheckCircle, ChevronLeft, ChevronRight, Eye, Heart, Link2, Package, RefreshCw, Search, Share2, ShoppingCart, Users, X, Zap, type LucideIcon } from "lucide-react";
import { cn } from "../libs/utils";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import api from "../libs/api";

// ─── Pack types ──────────────────────────────────────────────────────────────
interface PackSubOrder {
    label: string;
    keywords: string[];
    quantity: number;
    deliveryMode: 'standard' | 'dripfeed';
}

interface PackVariant {
    label: string;
    price: number;
    subOrders: PackSubOrder[];
}

interface PackPreset {
    id: string;
    title: string;
    platform: string;
    icon: string;
    color: string;
    isPack: true;
    variants: PackVariant[];
}

interface PlatformCardProps {
    name: string;
    active?: boolean;
    count?: number;
    onClick: () => void;
    color: string;
    backgroundImage?: string;
}

interface Service {
    service: string;
    name: string;
    type?: string;
    category?: string;
    rate: string;
    min: string | number;
    max: string | number;
    refill?: boolean;
    cancel?: boolean;
    dripfeed?: boolean;
    average_time?: string;
    // From allowed_services DB config
    delivery_mode?: 'standard' | 'dripfeed';
    dripfeed_quantity?: number;
}

interface ServiceTypeCardProps {
    label: string;
    icon: LucideIcon;
    count?: number;
    active?: boolean;
    onClick: () => void;
}

function PlatformCard({ active, count, onClick, color, backgroundImage }: PlatformCardProps) {
    const isActive = active;

    return (
        <button
            onClick={onClick}
            className={cn(
                "relative h-40 rounded-2xl border transition-all duration-300 overflow-hidden group w-full text-left",
                isActive ? "border-primary shadow-[0_0_20px_rgba(190,242,100,0.2)]" : "border-white/10 hover:border-white/20 bg-surface/30"
            )}
        >
            {/* Background Image / Gradient Placeholder */}
            <div className={cn("absolute inset-0 transition-opacity duration-300", isActive ? "opacity-100" : "opacity-40 group-hover:opacity-60")}
                style={{
                    background: backgroundImage ? `url(${backgroundImage}) center/cover no-repeat` : `linear-gradient(45deg, ${color}, transparent)`
                }}
            >
                {/* Gradient Overlay for better visibility of badge/check if needed, or just slight darken */}
                <div className={cn("absolute inset-0 bg-black/20 transition-colors", isActive ? "bg-black/0" : "bg-black/40")}></div>
            </div>

            {/* Counter Badge */}
            <div className="absolute top-3 right-3 bg-primary text-black text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center z-20 shadow-lg">
                {count || 0}
            </div>

            {/* Selection Indicator */}
            {isActive && (
                <div className="absolute top-3 left-3 text-primary z-20 drop-shadow-md">
                    <CheckCircle size={20} fill="black" />
                </div>
            )}
        </button>
    );
}

function ServiceTypeCard({ label, icon: Icon, count, active, onClick }: ServiceTypeCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative group rounded-2xl p-6 flex flex-col items-center justify-center transition-all active:scale-95 border overflow-hidden w-full",
                active
                    ? "bg-primary border-primary shadow-[0_0_20px_rgba(190,242,100,0.4)]"
                    : "bg-surface/30 border-white/5 hover:bg-surface/50 hover:border-white/20"
            )}
        >
            <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                active ? "bg-black/10 text-black" : "bg-white/5 text-slate-400 group-hover:bg-primary/20 group-hover:text-primary"
            )}>
                <Icon size={20} className={cn("transition-colors", active ? "text-black" : "text-slate-400 group-hover:text-primary")} />
            </div>
            <span className={cn(
                "text-xs font-bold uppercase tracking-wider transition-colors",
                active ? "text-black" : "text-slate-400 group-hover:text-white"
            )}>{label}</span>

            {/* Counter Badge */}
            <div className={cn(
                "absolute top-2 right-2 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center transition-opacity border-2",
                active ? "bg-black text-primary border-transparent opacity-100" : "bg-primary text-black border-background opacity-0 group-hover:opacity-100"
            )}>
                {count || 0}
            </div>

            {/* Glow effect for active state */}
            {active && <div className="absolute inset-0 bg-primary/10 pointer-events-none"></div>}
        </button>
    );
}

export function Services() {
    const itemsPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [activePlatform, setActivePlatform] = useState<string | null>(null);
    const [activeServiceType, setActiveServiceType] = useState<string>('');
    const [services, setServices] = useState<Service[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<string>('default'); // Sera mis Ã  jour au chargement
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Fetch allowed services from database
    useEffect(() => {
        const fetchAllowedServices = async () => {
            setLoading(true);
            try {
                // Get allowed services from database
                const allowedData = await api.getAllowedServices();
                const allowedServices = allowedData.services || [];

                if (allowedServices.length === 0) {
                    setServices([]);
                    setLoading(false);
                    return;
                }

                // Use "default" provider for all services (or first available provider)
                let providerName = 'default';
                try {
                    // Try to get the default provider
                    await api.getProvider('default');
                } catch (err) {
                    // If default doesn't exist, get the first available provider
                    try {
                        const providersData = await api.getProviders();
                        if (providersData.providers && providersData.providers.length > 0) {
                            providerName = providersData.providers[0].name;
                            console.log(`Using provider: ${providerName}`);
                        }
                    } catch (providerErr) {
                        console.error('Error fetching providers:', providerErr);
                    }
                }

                // Fetch services from the provider
                try {
                    const providerData = await api.getServices(providerName);
                    const providerServices = providerData.services || [];

                    // Build a map of service_id â†’ DB config (delivery_mode, dripfeed_quantity)
                    const allowedMap = new Map<string, { delivery_mode: string; dripfeed_quantity: number | null }>(
                        allowedServices.map((s: { service_id: string; delivery_mode: string; dripfeed_quantity: number | null }) =>
                            [s.service_id, { delivery_mode: s.delivery_mode, dripfeed_quantity: s.dripfeed_quantity }]
                        )
                    );

                    // Match allowed service IDs with provider services
                    const allowedIds = new Set(allowedServices.map((s: { service_id: string }) => s.service_id));
                    const matchedServices = providerServices
                        .filter((s: { service: string | number }) => allowedIds.has(s.service.toString()))
                        .map((s: { service: string | number; name: string; type?: string; category?: string; rate: number | string; min: string | number; max: string | number; refill?: boolean; cancel?: boolean; dripfeed?: boolean; average_time?: string }) => {
                            const dbConfig = allowedMap.get(s.service.toString());
                            return {
                                service: s.service.toString(),
                                name: s.name,
                                type: s.type,
                                category: s.category,
                                rate: s.rate.toString(),
                                min: s.min,
                                max: s.max,
                                refill: s.refill,
                                cancel: s.cancel,
                                dripfeed: s.dripfeed,
                                average_time: s.average_time,
                                delivery_mode: (dbConfig?.delivery_mode || 'standard') as 'standard' | 'dripfeed',
                                dripfeed_quantity: dbConfig?.dripfeed_quantity || undefined,
                            };
                        });

                    setServices(matchedServices);
                    setSelectedProvider(providerName); // Update selected provider
                } catch (err) {
                    console.error(`Error fetching services from provider ${providerName}:`, err);
                    setServices([]);
                }
            } catch (error) {
                console.error('Error fetching allowed services:', error);
                setServices([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAllowedServices();
    }, []);

    // â”€â”€â”€ Preset state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [showPresets, setShowPresets] = useState(true);
    const [packModal, setPackModal] = useState<{ open: boolean; preset: PackPreset | null; variant: PackVariant | null }>({
        open: false, preset: null, variant: null
    });
    const [packForm, setPackForm] = useState({ link: '', shopifyOrderNumber: '' });
    const [packSubmitting, setPackSubmitting] = useState(false);
    const [packProgress, setPackProgress] = useState<{ label: string; status: 'pending' | 'ok' | 'error'; msg?: string }[]>([]);
    const [packDone, setPackDone] = useState(false);

    /** Find first service whose name (normalized) contains ALL keywords */
    const findServiceByKeywords = (keywords: string[]): Service | null => {
        const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return services.find(s => keywords.every(k => norm(s.name).includes(norm(k)))) ?? null;
    };



    const handleSubmitPack = async () => {
        if (!packModal.variant || !packModal.preset) return;
        if (!packForm.link) { alert('Veuillez entrer un lien.'); return; }

        const results: { label: string; status: 'pending' | 'ok' | 'error'; msg?: string }[] =
            packModal.variant.subOrders.map(s => ({ label: s.label, status: 'pending' }));
        setPackProgress([...results]);
        setPackSubmitting(true);

        for (let i = 0; i < packModal.variant.subOrders.length; i++) {
            const sub = packModal.variant.subOrders[i];
            const svc = findServiceByKeywords(sub.keywords);

            if (!svc) {
                results[i] = { label: sub.label, status: 'error', msg: 'Service introuvable' };
                setPackProgress([...results]);
                continue;
            }

            try {
                const orderData: {
                    provider: string;
                    service: string;
                    service_name?: string;
                    service_rate?: number;
                    link: string;
                    quantity: number;
                    shopify_order_number?: string;
                    dripfeed_enabled?: boolean;
                    dripfeed_quantity?: number;
                } = {
                    provider: selectedProvider,
                    service: svc.service,
                    service_name: svc.name,
                    service_rate: parseFloat(svc.rate),
                    link: packForm.link,
                    quantity: sub.quantity,
                    shopify_order_number: packForm.shopifyOrderNumber || undefined,
                };
                if (sub.deliveryMode === 'dripfeed') {
                    orderData.dripfeed_enabled = true;
                    // Send dripfeed_quantity only if the service has it configured;
                    // the backend will resolve from its own service config otherwise.
                    if (svc.dripfeed_quantity) orderData.dripfeed_quantity = svc.dripfeed_quantity;
                }
                await api.createDripFeedOrder(orderData);
                results[i] = { label: sub.label, status: 'ok' };
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
                results[i] = { label: sub.label, status: 'error', msg: errorMessage };
            }
            setPackProgress([...results]);
        }

        setPackSubmitting(false);
        setPackDone(true);
    };

    const closePackModal = () => {
        setPackModal({ open: false, preset: null, variant: null });
        setPackProgress([]);
        setPackDone(false);
        if (packDone) navigate('/commandes');
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [orderForm, setOrderForm] = useState({
        link: '',
        quantity: '',
        shopifyOrderNumber: '',
        deliveryMode: 'standard' as 'standard' | 'dripfeed'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePlatformChange = (platform: string) => {
        setActivePlatform(activePlatform === platform ? null : platform);
    };

    const normalizeText = (text: string): string => {
        return text.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    };

    const getServiceCountForType = (type: string): number => {
        return services.filter(service => {
            const nameNormalized = normalizeText(service.name);
            const typeNormalized = normalizeText(service.type || '');
            const categoryNormalized = normalizeText(service.category || '');

            // Apply platform filter if active
            if (activePlatform) {
                if (activePlatform === 'other') {
                    if (nameNormalized.includes('tiktok') || nameNormalized.includes('instagram')) return false;
                } else {
                    if (!nameNormalized.includes(activePlatform.toLowerCase())) return false;
                }
            }

            // Check if service matches the type (in name, type, or category field)
            const searchText = type.toLowerCase();
            return nameNormalized.includes(searchText) ||
                typeNormalized.includes(searchText) ||
                categoryNormalized.includes(searchText);
        }).length;
    };

    const filteredServices = services.filter(service => {
        const nameNormalized = normalizeText(service.name);
        const typeNormalized = normalizeText(service.type || '');
        const categoryNormalized = normalizeText(service.category || '');

        // Search filter (search in name, type, and category)
        if (searchQuery) {
            const searchNormalized = normalizeText(searchQuery);
            if (!nameNormalized.includes(searchNormalized) &&
                !typeNormalized.includes(searchNormalized) &&
                !categoryNormalized.includes(searchNormalized)) {
                return false;
            }
        }

        // Platform filter
        if (activePlatform) {
            if (activePlatform === 'other') {
                // "Autre" = tous sauf TikTok et Instagram
                if (nameNormalized.includes('tiktok') || nameNormalized.includes('instagram')) return false;
            } else {
                // Plateforme spÃ©cifique (tiktok ou instagram)
                if (!nameNormalized.includes(activePlatform.toLowerCase())) return false;
            }
        }

        // Service type filter with aliases (only if a type is selected)
        if (activeServiceType) {
            let matches = false;
            switch (activeServiceType.toLowerCase()) {
                case 'abonnes':
                    // Chercher: followers, abonnes, abonnÃ©s, subscriber, follower
                    matches = nameNormalized.includes('follower') ||
                        nameNormalized.includes('abonne') ||
                        nameNormalized.includes('subscriber') ||
                        typeNormalized.includes('follower') ||
                        typeNormalized.includes('abonne') ||
                        typeNormalized.includes('subscriber') ||
                        categoryNormalized.includes('follower') ||
                        categoryNormalized.includes('abonne') ||
                        categoryNormalized.includes('subscriber');
                    break;
                case 'followers':
                    matches = nameNormalized.includes('follower') ||
                        nameNormalized.includes('abonne') ||
                        nameNormalized.includes('subscriber') ||
                        typeNormalized.includes('follower') ||
                        typeNormalized.includes('abonne') ||
                        typeNormalized.includes('subscriber') ||
                        categoryNormalized.includes('follower') ||
                        categoryNormalized.includes('abonne') ||
                        categoryNormalized.includes('subscriber');
                    break;
                case 'likes':
                    // Chercher: likes, like, j'aime, jaime
                    matches = nameNormalized.includes('like') ||
                        nameNormalized.includes('jaime') ||
                        typeNormalized.includes('like') ||
                        categoryNormalized.includes('like');
                    break;
                case 'vues':
                    // Chercher: views, view, vues, vue
                    matches = nameNormalized.includes('view') ||
                        nameNormalized.includes('vue') ||
                        typeNormalized.includes('view') ||
                        categoryNormalized.includes('view');
                    break;
                case 'partages':
                    // Chercher: shares, share, partages, partage
                    matches = nameNormalized.includes('share') ||
                        nameNormalized.includes('partage') ||
                        typeNormalized.includes('share') ||
                        categoryNormalized.includes('share');
                    break;
                case 'favoris':
                    // Chercher: favorites, favoris, saves, save, bookmark, enregistrement
                    matches = nameNormalized.includes('favorite') ||
                        nameNormalized.includes('favori') ||
                        nameNormalized.includes('save') ||
                        nameNormalized.includes('bookmark') ||
                        nameNormalized.includes('enregistrement') ||
                        nameNormalized.includes('enregistrer') ||
                        typeNormalized.includes('favorite') ||
                        typeNormalized.includes('save') ||
                        typeNormalized.includes('bookmark') ||
                        categoryNormalized.includes('favorite') ||
                        categoryNormalized.includes('save') ||
                        categoryNormalized.includes('bookmark');
                    break;
                default:
                    matches = nameNormalized.includes(activeServiceType.toLowerCase()) ||
                        typeNormalized.includes(activeServiceType.toLowerCase()) ||
                        categoryNormalized.includes(activeServiceType.toLowerCase());
            }
            if (!matches) return false;
        }

        // Ne pas filtrer les services avec cancel
        return true;
    });

    const openOrderModal = (service: Service) => {
        setSelectedService(service);
        setOrderForm({
            link: '',
            quantity: service.min.toString(),
            shopifyOrderNumber: '',
            deliveryMode: service.delivery_mode || 'standard',
        });
        setIsModalOpen(true);
    };

    const closeOrderModal = () => {
        setIsModalOpen(false);
        setSelectedService(null);
        setOrderForm({
            link: '',
            quantity: '',
            shopifyOrderNumber: '',
            deliveryMode: 'standard'
        });
    };

    const calculateEstimatedCost = () => {
        if (!selectedService || !orderForm.quantity) return '0.00';
        const quantity = parseInt(orderForm.quantity);
        if (isNaN(quantity) || quantity <= 0) return '0.00';
        const rate = parseFloat(selectedService.rate);
        if (isNaN(rate)) return '0.00';
        return ((quantity / 1000) * rate).toFixed(2);
    };

    const handleSubmitOrder = async () => {
        if (!selectedService || !selectedProvider) return;

        console.log('=== Submitting Order ===');
        console.log('Provider:', selectedProvider);
        console.log('Service:', selectedService);
        console.log('Order form:', orderForm);

        try {
            setIsSubmitting(true);

            // Build order data
            const orderData: {
                provider: string;
                service: string;
                service_name?: string;
                service_rate?: number;
                link: string;
                quantity: number;
                shopify_order_number?: string;
                dripfeed_enabled?: boolean;
                dripfeed_quantity?: number;
            } = {
                provider: selectedProvider,
                service: selectedService.service,
                service_name: selectedService.name,
                service_rate: parseFloat(selectedService.rate), // Ajouter le taux
                link: orderForm.link,
                quantity: parseInt(orderForm.quantity),
                shopify_order_number: orderForm.shopifyOrderNumber || undefined
            };

            console.log('Prepared order data:', orderData);

            // Add drip feed parameters if delivery mode is dripfeed
            if (orderForm.deliveryMode === 'dripfeed') {
                orderData.dripfeed_enabled = true;
                // Send dripfeed_quantity only if the service has it configured;
                // the backend will resolve from its own service config otherwise.
                if (selectedService.dripfeed_quantity) orderData.dripfeed_quantity = selectedService.dripfeed_quantity;
            }

            // Submit order
            const result = await api.createDripFeedOrder(orderData);

            // Check if order was queued or scheduled
            if (result.queued) {
                alert(`â³ Commande mise en file d'attente\n\n${result.message}\n\nElle sera automatiquement traitÃ©e lorsque les commandes en cours seront complÃ©tÃ©es.`);
            } else if (result.scheduled) {
                const qtyPerRun = selectedService.dripfeed_quantity || result.dripfeed_quantity || '?';
                alert(`ðŸ“… Commande Drip Feed programmÃ©e!\n\nOrder ID: ${result.order}\n${result.message}\n\nâœ… PremiÃ¨re commande envoyÃ©e: ${qtyPerRun} unitÃ©s\nâ³ ${result.pending_runs} autres runs programmÃ©es (${qtyPerRun}/jour)`);
            } else {
                alert(`âœ… Commande crÃ©Ã©e avec succÃ¨s!\n\nOrder ID: ${result.order}\n\nVous allez Ãªtre redirigÃ© vers l'historique des commandes.`);
            }

            // Close modal
            closeOrderModal();

            // Navigate to orders page to see new order
            navigate('/commandes');
        } catch (error: unknown) {
            console.error('Error creating order:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            alert(`âŒ Erreur lors de la crÃ©ation de la commande: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentServices = filteredServices;

    const totalPages = Math.ceil(currentServices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedServices = currentServices.slice(startIndex, endIndex);

    return (
        <div className="flex flex-col gap-8 pb-12">
            <div className="space-y-4">
                <div className="flex justify-end">
                    <button className="flex items-center gap-2 text-xs font-bold text-primary border border-primary/20 bg-primary/5 px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors">
                        <RefreshCw size={14} />
                        Tester la connexion
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PlatformCard
                        name="TikTok"
                        active={activePlatform === 'tiktok'}
                        color="#00f2ea"
                        backgroundImage="/tiktok.jpg"
                        onClick={() => handlePlatformChange('tiktok')}
                        count={services.filter(s => s.name.toLowerCase().includes('tiktok')).length}
                    />
                    <PlatformCard
                        name="Instagram"
                        active={activePlatform === 'instagram'}
                        color="#d62976"
                        backgroundImage="/instagram.jpg"
                        onClick={() => handlePlatformChange('instagram')}
                        count={services.filter(s => s.name.toLowerCase().includes('instagram')).length}
                    />
                    <PlatformCard
                        name="Autre"
                        active={activePlatform === 'other'}
                        color="#8b5cf6"
                        backgroundImage="/twitch.png"
                        onClick={() => handlePlatformChange('other')}
                        count={services.filter(s => {
                            const nameLC = s.name.toLowerCase();
                            return !nameLC.includes('tiktok') && !nameLC.includes('instagram');
                        }).length}
                    />
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-slate-400">
                            Services Disponibles
                        </h2>
                        <div className="flex items-center gap-3">
                            {(activePlatform || activeServiceType || searchQuery) && (
                                <button
                                    onClick={() => {
                                        setActivePlatform(null);
                                        setActiveServiceType('');
                                        setSearchQuery('');
                                    }}
                                    className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-full hover:bg-red-500/20 transition-colors"
                                >
                                    RÃ©initialiser les filtres
                                </button>
                            )}
                            <div className="px-3 py-1 bg-primary text-black text-xs font-bold rounded-full">
                                {currentServices.length} / {services.length} services
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <ServiceTypeCard
                            label="AbonnÃ©s"
                            icon={Users}
                            count={getServiceCountForType('followers') + getServiceCountForType('abonnes')}
                            active={activeServiceType === 'abonnes'}
                            onClick={() => setActiveServiceType(activeServiceType === 'abonnes' ? '' : 'abonnes')}
                        />
                        <ServiceTypeCard
                            label="Likes"
                            icon={Heart}
                            count={getServiceCountForType('likes')}
                            active={activeServiceType === 'likes'}
                            onClick={() => setActiveServiceType(activeServiceType === 'likes' ? '' : 'likes')}
                        />
                        <ServiceTypeCard
                            label="Vues"
                            icon={Eye}
                            count={getServiceCountForType('views') + getServiceCountForType('vues')}
                            active={activeServiceType === 'vues'}
                            onClick={() => setActiveServiceType(activeServiceType === 'vues' ? '' : 'vues')}
                        />
                        <ServiceTypeCard
                            label="Partages"
                            icon={Share2}
                            count={getServiceCountForType('shares') + getServiceCountForType('partages')}
                            active={activeServiceType === 'partages'}
                            onClick={() => setActiveServiceType(activeServiceType === 'partages' ? '' : 'partages')}
                        />
                        <ServiceTypeCard
                            label="Favoris"
                            icon={Bookmark}
                            count={getServiceCountForType('favorites') + getServiceCountForType('favoris')}
                            active={activeServiceType === 'favoris'}
                            onClick={() => setActiveServiceType(activeServiceType === 'favoris' ? '' : 'favoris')}
                        />
                    </div>

                    {/* â”€â”€â”€ Commandes Rapides â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    {(() => {
                        const detectPlt = (name: string) => {
                            const n = normalizeText(name);
                            if (n.includes('tiktok')) return 'tiktok';
                            if (n.includes('instagram')) return 'instagram';
                            if (n.includes('twitch')) return 'twitch';
                            if (n.includes('discord')) return 'discord';
                            return 'other';
                        };

                        const detectType = (name: string): { icon: string; label: string; order: number } => {
                            const n = normalizeText(name);
                            if (n.includes('follower') || n.includes('abonne') || n.includes('subscriber') || n.includes('member'))
                                return { icon: 'ðŸ‘¥', label: 'AbonnÃ©s', order: 1 };
                            if (n.includes('like') || n.includes('jaime'))
                                return { icon: 'â¤ï¸', label: 'Likes', order: 2 };
                            if (n.includes('view') || n.includes('vue'))
                                return { icon: 'ðŸ‘', label: 'Vues', order: 3 };
                            if (n.includes('share') || n.includes('partage'))
                                return { icon: 'â†—ï¸', label: 'Partages', order: 4 };
                            if (n.includes('save') || n.includes('favorite') || n.includes('favori') || n.includes('bookmark'))
                                return { icon: 'ðŸ”–', label: 'Favoris', order: 5 };
                            return { icon: 'âš¡', label: 'Service', order: 6 };
                        };

                        const quickChips = (min: number, max: number) =>
                            [100, 200, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000]
                                .filter(v => v >= min && v <= max).slice(0, 6);

                        const platformDefs = [
                            { key: 'tiktok',    label: 'TikTok',    color: '#00f2ea' },
                            { key: 'instagram', label: 'Instagram', color: '#e1306c' },
                            { key: 'twitch',    label: 'Twitch',    color: '#9146ff' },
                            { key: 'discord',   label: 'Discord',   color: '#5865f2' },
                            { key: 'other',     label: 'Autres',    color: '#8b5cf6' },
                        ];

                        const platformGroups = platformDefs
                            .map(plt => ({
                                ...plt,
                                services: services
                                    .filter(s => detectPlt(s.name) === plt.key)
                                    .sort((a, b) => detectType(a.name).order - detectType(b.name).order),
                            }))
                            .filter(g => g.services.length > 0);

                        return (
                            <div className="space-y-3">
                                {/* Section header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                                            <Zap size={15} className="text-primary" fill="currentColor" />
                                        </div>
                                        <div>
                                            <span className="text-white font-bold text-[15px] leading-none">Commandes Rapides</span>
                                            <p className="text-[#A1A1AA] text-[11px] mt-0.5">SÃ©lectionne un service pour commander en un clic</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowPresets(p => !p)}
                                        className={cn(
                                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border',
                                            showPresets
                                                ? 'bg-primary/10 border-primary/20 text-primary'
                                                : 'bg-white/5 border-white/10 text-[#A1A1AA] hover:text-white'
                                        )}
                                    >
                                        {showPresets ? 'Masquer' : 'Afficher'}
                                        <ChevronRight size={13} className={cn('transition-transform duration-200', showPresets && 'rotate-90')} />
                                    </button>
                                </div>

                                {showPresets && (
                                    platformGroups.length === 0 ? (
                                        <div className="text-center py-8 text-[#A1A1AA] text-[13px]">
                                            Aucun service enregistrÃ© â€” activez des services dans Config â†’ Catalogue.
                                        </div>
                                    ) : (
                                        <div className="space-y-6 pt-1">
                                            {platformGroups.map(plt => (
                                                <div key={plt.key} className="space-y-3">
                                                    {/* Platform label */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: plt.color }} />
                                                        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: plt.color }}>{plt.label}</span>
                                                        <div className="flex-1 h-px bg-white/5" />
                                                    </div>

                                                    {/* Service cards */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                        {plt.services.map(svc => {
                                                            const typeInfo = detectType(svc.name);
                                                            const chips = quickChips(Number(svc.min), Number(svc.max));
                                                            return (
                                                                <div
                                                                    key={svc.service}
                                                                    className="bg-[#0A0A0A] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-all group"
                                                                >
                                                                    {/* Card header */}
                                                                    <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-white/5">
                                                                        <div
                                                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                                                                            style={{ background: plt.color + '18' }}
                                                                        >
                                                                            {typeInfo.icon}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="text-white font-bold text-[13px] leading-tight truncate" title={svc.name}>{svc.name}</div>
                                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                                <span className="text-[10px] font-semibold px-1.5 py-px rounded-md bg-white/5 text-[#A1A1AA]">{typeInfo.label}</span>
                                                                                {svc.delivery_mode === 'dripfeed' && (
                                                                                    <span className="text-[10px] font-semibold px-1.5 py-px rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/15">ðŸ’§ Drip</span>
                                                                                )}
                                                                                <span className="text-[10px] text-[#A1A1AA] font-mono">${svc.rate}/1k</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Quantity chips */}
                                                                    <div className="p-3 flex flex-wrap gap-2">
                                                                        {chips.length > 0 ? chips.map(qty => (
                                                                            <button
                                                                                key={qty}
                                                                                onClick={() => {
                                                                                    setSelectedService(svc);
                                                                                    setOrderForm({
                                                                                        link: '',
                                                                                        quantity: String(qty),
                                                                                        shopifyOrderNumber: '',
                                                                                        deliveryMode: svc.delivery_mode || 'standard',
                                                                                    });
                                                                                    setIsModalOpen(true);
                                                                                }}
                                                                                disabled={loading}
                                                                                className="relative flex flex-col items-center px-3 py-2 rounded-xl border border-white/8 bg-white/3 hover:bg-white/8 hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                                                                            >
                                                                                <span className="text-white font-black text-[12px] leading-none whitespace-nowrap">
                                                                                    {qty >= 1000000 ? (qty / 1000000) + 'M' : qty >= 1000 ? (qty / 1000) + 'k' : qty}
                                                                                </span>
                                                                                <span className="text-[10px] text-[#A1A1AA] mt-0.5 whitespace-nowrap">
                                                                                    ${((qty / 1000) * parseFloat(svc.rate)).toFixed(2)}
                                                                                </span>
                                                                            </button>
                                                                        )) : (
                                                                            <button
                                                                                onClick={() => openOrderModal(svc)}
                                                                                disabled={loading}
                                                                                className="px-3 py-2 rounded-xl border border-white/8 bg-white/3 hover:bg-white/8 hover:border-white/20 transition-all text-white text-[12px] font-bold"
                                                                            >
                                                                                Commander
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                )}
                            </div>
                        );
                    })()}

                    {/* Search Bar */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-white transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher un service..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#050505] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-[#A1A1AA] outline-none focus:border-white/20 transition-all font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="p-12 text-center text-slate-400">
                            <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
                            Chargement...
                        </div>
                    ) : currentServices.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Package size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Aucun service disponible pour cette catÃ©gorie</p>
                        </div>
                    ) : (
                        <>
                            {paginatedServices.map((service: Service) => (
                                <div
                                    key={service.service}
                                    onClick={() => openOrderModal(service)}
                                    className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:scale-[1.01] transition-all cursor-pointer group relative overflow-hidden shadow-sm"
                                >
                                    {/* Service Item Layout */}
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">

                                        <div className="flex items-center gap-4">
                                            <div className="bg-green-900/30 text-green-400 px-3 py-1 rounded-lg font-mono font-bold text-sm border border-green-500/20 shadow-[0_0_15px_rgba(74,222,128,0.1)]">
                                                #{service.service}
                                            </div>
                                            <div className="flex gap-2">
                                                {service.refill && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                        Refill
                                                    </span>
                                                )}
                                                {service.cancel && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border bg-red-500/10 text-red-400 border-red-500/20">
                                                        Cancel
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 md:text-left">
                                            {/* Formatted Service Name with Details */}
                                            <h3 className="text-white font-bold mb-2 text-sm md:text-base leading-relaxed">
                                                {service.name} [ Max {typeof service.max === 'number' ? service.max >= 1000000 ? (service.max / 1000000).toFixed(0) + 'M' : service.max >= 1000 ? (service.max / 1000).toFixed(0) + 'K' : service.max : parseInt(service.max) >= 1000000 ? (parseInt(service.max) / 1000000).toFixed(0) + 'M' : parseInt(service.max) >= 1000 ? (parseInt(service.max) / 1000).toFixed(0) + 'K' : parseInt(service.max)} ]
                                                {service.category && ` | ${service.category}`}
                                                {service.cancel && ` | Annulation ActivÃ©e`}
                                                {service.average_time && ` | ${service.average_time}`}
                                                {service.dripfeed && ` | DÃ©marrage InstantanÃ©`}
                                            </h3>

                                            {/* Badges */}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                {service.refill && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                        â™»ï¸ Refill
                                                    </span>
                                                )}
                                                {service.cancel && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border bg-red-500/10 text-red-400 border-red-500/20">
                                                        âŒ Annulation
                                                    </span>
                                                )}
                                                {service.dripfeed && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border bg-purple-500/10 text-purple-400 border-purple-500/20">
                                                        ðŸ’§ Drip Feed
                                                    </span>
                                                )}
                                                {service.type && (
                                                    <span className="text-xs px-2 py-0.5 bg-slate-700/30 text-slate-400 rounded">
                                                        {service.type}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Min/Max */}
                                            <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                    <span>Min: <span className="text-slate-300">{service.min}</span></span>
                                                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                    <span>Max: <span className="text-slate-300">{typeof service.max === 'number' ? service.max.toLocaleString() : parseInt(service.max).toLocaleString()}</span></span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right flex flex-col gap-2">
                                            {/* Price */}
                                            <div>
                                                <div className="flex items-center gap-1 md:justify-end">
                                                    <Zap size={14} className="text-green-500" fill="currentColor" />
                                                    <span className="text-xl font-black text-green-400 tracking-tight">${service.rate}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">per 1000</div>
                                            </div>

                                            {/* Additional Features */}
                                            {service.dripfeed && (
                                                <span className="px-2 py-0.5 text-xs bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded">
                                                    ðŸ’§ Drip-feed
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hover Gradient Effect */}
                                    <div className="absolute inset-0 bg-linear-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                </div>
                            ))}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                                    <div className="text-sm text-slate-400">
                                        Affichage {startIndex + 1}-{Math.min(endIndex, currentServices.length)} sur {currentServices.length} services
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-2 rounded-lg bg-surface/30 border border-white/5 text-slate-400 hover:text-white hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                            // Show first page, last page, current page, and pages around current
                                            if (
                                                page === 1 ||
                                                page === totalPages ||
                                                (page >= currentPage - 1 && page <= currentPage + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${currentPage === page
                                                            ? 'bg-primary text-black'
                                                            : 'bg-surface/30 border border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            } else if (
                                                page === currentPage - 2 ||
                                                page === currentPage + 2
                                            ) {
                                                return <span key={page} className="text-slate-600">...</span>;
                                            }
                                            return null;
                                        })}

                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-2 rounded-lg bg-surface/30 border border-white/5 text-slate-400 hover:text-white hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* â”€â”€â”€ Pack Confirmation Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {packModal.open && packModal.preset && packModal.variant && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 p-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">{packModal.preset.icon} {packModal.preset.title}</h2>
                                <p className="text-slate-400 text-sm mt-0.5">{packModal.variant.label} â€” <span className="text-primary font-bold">{packModal.variant.price}â‚¬</span></p>
                            </div>
                            {!packSubmitting && (
                                <button onClick={closePackModal} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                    <X size={22} className="text-slate-400" />
                                </button>
                            )}
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Sub-orders breakdown */}
                            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 space-y-2">
                                <div className="text-xs font-bold text-slate-500 uppercase mb-3">Contenu du pack</div>
                                {packModal.variant.subOrders.map((s, i) => {
                                    const found = !loading && findServiceByKeywords(s.keywords);
                                    const prog = packProgress[i];
                                    return (
                                        <div key={s.label} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {prog ? (
                                                    prog.status === 'ok' ? <CheckCircle size={14} className="text-green-400" />
                                                        : prog.status === 'error' ? <X size={14} className="text-red-400" />
                                                            : <RefreshCw size={14} className="text-yellow-400 animate-spin" />
                                                ) : (
                                                    found ? <CheckCircle size={14} className="text-green-500/50" />
                                                        : <X size={14} className="text-red-500/60" />
                                                )}
                                                <span className="text-sm text-white">{s.label}</span>
                                                {prog?.msg && <span className="text-xs text-red-400">({prog.msg})</span>}
                                            </div>
                                            <span className="font-mono text-xs text-slate-400">{s.quantity.toLocaleString()}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {!packDone && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-white mb-2">
                                            <Link2 size={14} className="inline mr-2" />Lien du rÃ©seau social *
                                        </label>
                                        <input
                                            type="text"
                                            value={packForm.link}
                                            onChange={e => setPackForm(f => ({ ...f, link: e.target.value }))}
                                            placeholder="https://..."
                                            disabled={packSubmitting}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-white mb-2">
                                            <ShoppingCart size={14} className="inline mr-2" />NÂ° commande Shopify
                                        </label>
                                        <input
                                            type="text"
                                            value={packForm.shopifyOrderNumber}
                                            onChange={e => setPackForm(f => ({ ...f, shopifyOrderNumber: e.target.value }))}
                                            placeholder="Ex: #1001"
                                            disabled={packSubmitting}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                                        />
                                    </div>
                                </>
                            )}

                            {packDone && (
                                <div className={cn(
                                    'rounded-xl p-4 text-sm font-bold text-center',
                                    packProgress.every(p => p.status === 'ok') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                )}>
                                    {packProgress.filter(p => p.status === 'ok').length}/{packProgress.length} commandes crÃ©Ã©es avec succÃ¨s.
                                </div>
                            )}

                            <div className="flex gap-3">
                                {!packDone ? (
                                    <>
                                        <button onClick={closePackModal} disabled={packSubmitting} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors disabled:opacity-40">
                                            Annuler
                                        </button>
                                        <button
                                            onClick={handleSubmitPack}
                                            disabled={!packForm.link || packSubmitting}
                                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            {packSubmitting ? <><RefreshCw size={16} className="animate-spin" /> CrÃ©ation...</> : 'Commander le pack'}
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => { closePackModal(); navigate('/commandes'); }} className="flex-1 px-4 py-3 bg-primary text-black font-bold rounded-xl transition-colors">
                                        Voir les commandes â†’
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && selectedService && (() => {
                const nameNorm = normalizeText(selectedService.name);
                const isFollowers = nameNorm.includes('follower') || nameNorm.includes('abonne') || nameNorm.includes('subscriber');
                const isTikTok    = nameNorm.includes('tiktok');
                const isInstagram = nameNorm.includes('instagram');
                const isTwitch    = nameNorm.includes('twitch');
                const isDiscord   = nameNorm.includes('discord');
                const platformColor = isTikTok ? '#00f2ea' : isInstagram ? '#e1306c' : isTwitch ? '#9146ff' : isDiscord ? '#5865f2' : '#bef264';
                const platformIcon  = isTikTok ? 'ðŸŽµ' : isInstagram ? 'ðŸ“¸' : isTwitch ? 'ðŸŽ®' : isDiscord ? 'ðŸ’¬' : 'âš¡';
                const estimatedCost = calculateEstimatedCost();

                return (
                    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-160 shadow-[0_24px_80px_rgba(0,0,0,0.7)] flex flex-col max-h-[96vh] overflow-hidden">

                            {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                            <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-white/5 shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 border border-white/8"
                                        style={{ background: platformColor + '18' }}>
                                        {platformIcon}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-white font-bold text-[17px] leading-tight truncate">Commander</h2>
                                        <p className="text-[#A1A1AA] text-[12px] mt-0.5 leading-tight truncate max-w-[320px]">{selectedService.name}</p>
                                    </div>
                                </div>
                                <button onClick={closeOrderModal} className="shrink-0 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#A1A1AA] hover:text-white transition-all ml-3 mt-0.5">
                                    <X size={15} />
                                </button>
                            </div>

                            {/* â”€â”€ Service meta pills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                            <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 shrink-0 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-[11px] font-mono font-bold text-[#A1A1AA]">
                                    #{selectedService.service}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary">
                                    ${selectedService.rate} / 1 000
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-[11px] font-medium text-[#A1A1AA]">
                                    Min {Number(selectedService.min).toLocaleString('fr-FR')} Â· Max {Number(selectedService.max).toLocaleString('fr-FR')}
                                </span>
                                {isFollowers && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-400">
                                        ðŸ’§ Drip Feed uniquement
                                    </span>
                                )}
                            </div>

                            {/* â”€â”€ Scrollable body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                                {/* Link */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[13px] font-bold text-white">
                                        <Link2 size={13} className="text-[#A1A1AA]" />
                                        Lien de destination <span className="text-primary ml-0.5">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="url"
                                            value={orderForm.link}
                                            onChange={(e) => setOrderForm({ ...orderForm, link: e.target.value })}
                                            placeholder="https://www.tiktok.com/@pseudo"
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-[#A1A1AA]/50 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Quantity */}
                                <div className="space-y-2">
                                    <label className="flex items-center justify-between text-[13px] font-bold text-white">
                                        <span>QuantitÃ© <span className="text-primary">*</span></span>
                                        <span className="text-[11px] font-normal text-[#A1A1AA]">
                                            Min {Number(selectedService.min).toLocaleString('fr-FR')} Â· Max {Number(selectedService.max).toLocaleString('fr-FR')}
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        value={orderForm.quantity}
                                        onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                                        min={selectedService.min}
                                        max={selectedService.max}
                                        placeholder={`Ex : ${Number(selectedService.min).toLocaleString('fr-FR')}`}
                                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-[#A1A1AA]/50 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                                    />
                                    {/* Quick-pick quantity chips */}
                                    {(() => {
                                        const min = Number(selectedService.min);
                                        const max = Number(selectedService.max);
                                        const candidates = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
                                        const chips = candidates.filter(v => v >= min && v <= max).slice(0, 6);
                                        if (chips.length === 0) return null;
                                        return (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {chips.map(v => (
                                                    <button key={v} type="button"
                                                        onClick={() => setOrderForm({ ...orderForm, quantity: String(v) })}
                                                        className={cn(
                                                            'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
                                                            orderForm.quantity === String(v)
                                                                ? 'bg-primary/15 border-primary/40 text-primary'
                                                                : 'bg-white/4 border-white/8 text-[#A1A1AA] hover:text-white hover:border-white/20'
                                                        )}>
                                                        {v >= 1000 ? (v / 1000) + 'k' : v}
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Shopify order number */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[13px] font-bold text-white">
                                        <ShoppingCart size={13} className="text-[#A1A1AA]" />
                                        NÂ° commande Shopify <span className="text-[11px] font-normal text-[#A1A1AA]">(optionnel)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={orderForm.shopifyOrderNumber}
                                        onChange={(e) => setOrderForm({ ...orderForm, shopifyOrderNumber: e.target.value })}
                                        placeholder="#1001"
                                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-[#A1A1AA]/50 outline-none focus:border-white/30 transition-all"
                                    />
                                </div>

                                {/* Delivery mode */}
                                {!isFollowers && (
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-white">Mode de livraison</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Standard */}
                                            <button type="button"
                                                onClick={() => setOrderForm({ ...orderForm, deliveryMode: 'standard' })}
                                                className={cn(
                                                    'relative flex flex-col items-start gap-1 p-4 rounded-2xl border-2 text-left transition-all',
                                                    orderForm.deliveryMode === 'standard'
                                                        ? 'border-primary bg-primary/8 shadow-[0_0_16px_rgba(190,242,100,0.08)]'
                                                        : 'border-white/8 bg-white/3 hover:border-white/15'
                                                )}>
                                                <div className="text-[20px] leading-none mb-1">âš¡</div>
                                                <div className="text-white font-bold text-[13px]">Standard</div>
                                                <div className="text-[11px] text-[#A1A1AA] leading-snug">Envoi immÃ©diat en une seule fois</div>
                                                <div className={cn('absolute top-3 right-3 w-4 h-4 rounded-full border-2 transition-all',
                                                    orderForm.deliveryMode === 'standard' ? 'border-primary bg-primary' : 'border-white/20'
                                                )} />
                                            </button>

                                            {/* Drip Feed */}
                                            <button type="button"
                                                onClick={() => setOrderForm({ ...orderForm, deliveryMode: 'dripfeed' })}
                                                className={cn(
                                                    'relative flex flex-col items-start gap-1 p-4 rounded-2xl border-2 text-left transition-all',
                                                    orderForm.deliveryMode === 'dripfeed'
                                                        ? 'border-blue-500 bg-blue-500/8 shadow-[0_0_16px_rgba(59,130,246,0.08)]'
                                                        : 'border-white/8 bg-white/3 hover:border-white/15'
                                                )}>
                                                <div className="text-[20px] leading-none mb-1">ðŸ’§</div>
                                                <div className="text-white font-bold text-[13px]">Drip Feed</div>
                                                <div className="text-[11px] text-[#A1A1AA] leading-snug">{selectedService.dripfeed_quantity ? `${selectedService.dripfeed_quantity} unitÃ©s par jour, progressif` : 'Livraison progressive par jour'}</div>
                                                <div className={cn('absolute top-3 right-3 w-4 h-4 rounded-full border-2 transition-all',
                                                    orderForm.deliveryMode === 'dripfeed' ? 'border-blue-500 bg-blue-500' : 'border-white/20'
                                                )} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Live cost estimate */}
                                <div className="flex items-center justify-between bg-[#050505] border border-white/8 rounded-2xl px-5 py-4">
                                    <div>
                                        <p className="text-[11px] text-[#A1A1AA] uppercase font-bold tracking-wider mb-1">CoÃ»t estimÃ©</p>
                                        <p className="text-[28px] font-black text-white leading-none">${estimatedCost}</p>
                                        <p className="text-[10px] text-[#A1A1AA] mt-1">{orderForm.quantity ? Number(orderForm.quantity).toLocaleString('fr-FR') + ' unitÃ©s Â· $' + selectedService.rate + '/1k' : 'â€“'}</p>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: platformColor + '18' }}>
                                        <Zap size={26} style={{ color: platformColor }} />
                                    </div>
                                </div>
                            </div>

                            {/* â”€â”€ Footer CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                            <div className="px-6 py-5 border-t border-white/5 shrink-0 flex gap-3 bg-[#0A0A0A]">
                                <button onClick={closeOrderModal}
                                    className="px-5 py-3 rounded-xl bg-white/5 border border-white/8 text-white text-[13px] font-semibold hover:bg-white/10 transition-colors">
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSubmitOrder}
                                    disabled={!orderForm.link || !orderForm.quantity || isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                                    style={{ background: isSubmitting || !orderForm.link || !orderForm.quantity ? undefined : `linear-gradient(135deg, ${platformColor}, #bef264)` }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" />
                                            Envoi en coursâ€¦
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={16} fill="currentColor" />
                                            Commander Â· ${estimatedCost}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    )
}
