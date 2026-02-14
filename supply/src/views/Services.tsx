import { Bookmark, CheckCircle, ChevronLeft, ChevronRight, Eye, Heart, Link2, Package, RefreshCw, Search, Share2, ShoppingCart, Users, X, Zap, type LucideIcon } from "lucide-react";
import { cn } from "../libs/utils";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import api from "../libs/api";

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
            {active && <div className="absolute inset-0 bg-linear-to-br from-white/20 to-transparent pointer-events-none"></div>}
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
    const [selectedProvider, setSelectedProvider] = useState<string>('default'); // Sera mis à jour au chargement
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

                    // Match allowed service IDs with provider services
                    const allowedIds = new Set(allowedServices.map((s: any) => s.service_id));
                    const matchedServices = providerServices
                        .filter((s: any) => allowedIds.has(s.service.toString()))
                        .map((s: any) => ({
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
                            average_time: s.average_time
                        }));

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
                // Plateforme spécifique (tiktok ou instagram)
                if (!nameNormalized.includes(activePlatform.toLowerCase())) return false;
            }
        }

        // Service type filter with aliases (only if a type is selected)
        if (activeServiceType) {
            let matches = false;
            switch (activeServiceType.toLowerCase()) {
                case 'abonnes':
                    // Chercher: followers, abonnes, abonnés, subscriber, follower
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
        // Vérifier si c'est un service d'abonnés
        const nameNormalized = normalizeText(service.name);
        const isFollowersService = nameNormalized.includes('follower') ||
            nameNormalized.includes('abonne') ||
            nameNormalized.includes('subscriber');

        setSelectedService(service);
        setOrderForm({
            link: '',
            quantity: service.min.toString(),
            shopifyOrderNumber: '',
            deliveryMode: isFollowersService ? 'dripfeed' : 'standard' // Drip feed par défaut pour les abonnés
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
            const orderData: any = {
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
                // Configuration fixe: 250 par run (quantité par exécution)
                orderData.dripfeed_enabled = true;
                orderData.dripfeed_quantity = 250; // 250 unités par run
            }

            // Submit order
            const result = await api.createDripFeedOrder(orderData);

            // Check if order was queued or scheduled
            if (result.queued) {
                alert(`⏳ Commande mise en file d'attente\n\n${result.message}\n\nElle sera automatiquement traitée lorsque les commandes en cours seront complétées.`);
            } else if (result.scheduled) {
                alert(`📅 Commande Drip Feed programmée!\n\nOrder ID: ${result.order}\n${result.message}\n\n✅ Première commande envoyée: 250 unités\n⏳ ${result.pending_runs} autres runs programmées (250/jour)`);
            } else {
                alert(`✅ Commande créée avec succès!\n\nOrder ID: ${result.order}\n\nVous allez être redirigé vers l'historique des commandes.`);
            }

            // Close modal
            closeOrderModal();

            // Navigate to orders page to see new order
            navigate('/commandes');
        } catch (error: any) {
            console.error('Error creating order:', error);
            alert(`❌ Erreur lors de la création de la commande: ${error.message}`);
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
                                    Réinitialiser les filtres
                                </button>
                            )}
                            <div className="px-3 py-1 bg-primary text-black text-xs font-bold rounded-full">
                                {currentServices.length} / {services.length} services
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <ServiceTypeCard
                            label="Abonnés"
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

                    {/* Search Bar */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher un service..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface/30 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 outline-none focus:border-primary/50 focus:bg-surface/50 transition-all font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
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
                            <p>Aucun service disponible pour cette catégorie</p>
                        </div>
                    ) : (
                        <>
                            {paginatedServices.map((service: Service) => (
                                <div
                                    key={service.service}
                                    onClick={() => openOrderModal(service)}
                                    className="bg-surface/30 border border-white/5 rounded-2xl p-6 hover:border-primary/30 hover:bg-surface/40 transition-all cursor-pointer group relative overflow-hidden"
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
                                                {service.cancel && ` | Annulation Activée`}
                                                {service.average_time && ` | ${service.average_time}`}
                                                {service.dripfeed && ` | Démarrage Instantané`}
                                            </h3>

                                            {/* Badges */}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                {service.refill && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                        ♻️ Refill
                                                    </span>
                                                )}
                                                {service.cancel && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border bg-red-500/10 text-red-400 border-red-500/20">
                                                        ❌ Annulation
                                                    </span>
                                                )}
                                                {service.dripfeed && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border bg-purple-500/10 text-purple-400 border-purple-500/20">
                                                        💧 Drip Feed
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
                                                    💧 Drip-feed
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hover Gradient Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
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

            {isModalOpen && selectedService && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-surface border-b border-white/10 p-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Commander un service</h2>
                                <p className="text-slate-400 text-sm mt-1">{selectedService.name}</p>
                            </div>
                            <button
                                onClick={closeOrderModal}
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                            >
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Service Info */}
                            <div className="bg-black/20 border border-white/5 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-400 text-sm">Service ID</span>
                                    <span className="font-mono font-bold text-green-400">#{selectedService.service}</span>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-400 text-sm">Prix</span>
                                    <span className="font-bold text-white">${selectedService.rate} / 1000</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-sm">Min/Max</span>
                                    <span className="font-mono text-white text-sm">{selectedService.min} - {typeof selectedService.max === 'number' ? selectedService.max.toLocaleString() : parseInt(selectedService.max).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Link Input */}
                            <div>
                                <label className="block text-sm font-bold text-white mb-2">
                                    <Link2 size={16} className="inline mr-2" />
                                    Lien du réseau social *
                                </label>
                                <input
                                    type="url"
                                    value={orderForm.link}
                                    onChange={(e) => setOrderForm({ ...orderForm, link: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors"
                                    required
                                />
                            </div>

                            {/* Quantity Input */}
                            <div>
                                <label className="block text-sm font-bold text-white mb-2">
                                    Quantité *
                                </label>
                                <input
                                    type="number"
                                    value={orderForm.quantity}
                                    onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                                    min={selectedService.min}
                                    max={selectedService.max}
                                    placeholder={`Min: ${selectedService.min} - Max: ${selectedService.max}`}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors"
                                    required
                                />
                            </div>

                            {/* Shopify Order Number */}
                            <div>
                                <label className="block text-sm font-bold text-white mb-2">
                                    <ShoppingCart size={16} className="inline mr-2" />
                                    Numéro de commande Shopify *
                                </label>
                                <input
                                    type="text"
                                    value={orderForm.shopifyOrderNumber}
                                    onChange={(e) => setOrderForm({ ...orderForm, shopifyOrderNumber: e.target.value })}
                                    placeholder="Ex: #1001"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors"
                                    required
                                />
                            </div>

                            {/* Delivery Mode */}
                            <div>
                                <label className="block text-sm font-bold text-white mb-3">
                                    Mode de livraison
                                </label>
                                <div className="space-y-3">
                                    {/* Masquer l'option Standard pour les services d'abonnés */}
                                    {(() => {
                                        const nameNormalized = normalizeText(selectedService.name);
                                        const isFollowersService = nameNormalized.includes('follower') ||
                                            nameNormalized.includes('abonne') ||
                                            nameNormalized.includes('subscriber');

                                        return !isFollowersService ? (
                                            <button
                                                type="button"
                                                onClick={() => setOrderForm({ ...orderForm, deliveryMode: 'standard' })}
                                                className={cn(
                                                    "w-full p-4 rounded-xl border-2 transition-all text-left",
                                                    orderForm.deliveryMode === 'standard'
                                                        ? "border-primary bg-primary/10"
                                                        : "border-white/10 bg-black/20 hover:border-white/20"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-bold text-white">Standard</div>
                                                        <div className="text-sm text-slate-400">Livraison en 1 fois</div>
                                                    </div>
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-full border-2",
                                                        orderForm.deliveryMode === 'standard'
                                                            ? "border-primary bg-primary"
                                                            : "border-white/20"
                                                    )} />
                                                </div>
                                            </button>
                                        ) : null;
                                    })()}

                                    <button
                                        type="button"
                                        onClick={() => setOrderForm({ ...orderForm, deliveryMode: 'dripfeed' })}
                                        className={cn(
                                            "w-full p-4 rounded-xl border-2 transition-all text-left",
                                            orderForm.deliveryMode === 'dripfeed'
                                                ? "border-blue-500 bg-blue-500/10"
                                                : "border-white/10 bg-black/20 hover:border-white/20"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-white">💧 Drip Feed</div>
                                                <div className="text-sm text-slate-400">
                                                    {(() => {
                                                        const nameNormalized = normalizeText(selectedService.name);
                                                        const isFollowersService = nameNormalized.includes('follower') ||
                                                            nameNormalized.includes('abonne') ||
                                                            nameNormalized.includes('subscriber');
                                                        return isFollowersService
                                                            ? "Mode obligatoire pour les abonnés - Livraison progressive (250/jour)"
                                                            : "Livraison progressive sur plusieurs jours";
                                                    })()}
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border-2",
                                                orderForm.deliveryMode === 'dripfeed'
                                                    ? "border-blue-500 bg-blue-500"
                                                    : "border-white/20"
                                            )} />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Estimated Cost */}
                            <div className="bg-gradient-to-br from-green-500/10 to-primary/10 border border-green-500/20 rounded-2xl p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-slate-400 text-sm mb-1">Coût estimé</div>
                                        <div className="text-3xl font-black text-green-400">
                                            ${calculateEstimatedCost()}
                                        </div>
                                    </div>
                                    <Zap size={48} className="text-green-500 opacity-20" />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="sticky bottom-0 bg-surface border-t border-white/10 p-6 flex gap-3">
                                <button
                                    onClick={closeOrderModal}
                                    className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSubmitOrder}
                                    disabled={!orderForm.link || !orderForm.quantity || isSubmitting}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-green-400 hover:from-primary/90 hover:to-green-400/90 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all shadow-lg shadow-primary/20"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <RefreshCw size={20} className="animate-spin mr-2" />
                                            Commande en cours...
                                        </>
                                    ) : 'Commander'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}