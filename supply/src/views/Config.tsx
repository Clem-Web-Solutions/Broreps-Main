import { Plus, Trash2, Settings, Check, Eye, EyeOff, ChevronDown, ChevronUp, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../libs/api";
import { cn } from "../libs/utils";

type TabType = 'providers' | 'members' | 'alerts' | 'catalog';

interface Alert {
    id: number;
    type: 'new_order' | 'order_status' | 'low_stock' | 'system' | 'custom';
    enabled: boolean;
    title: string;
    message: string;
    created_at: string;
}

interface Provider {
    id: number;
    name: string;
    api_url: string;
    api_key?: string;
    active: number;
    created_at: string;
}

interface Employee {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

interface AllowedService {
    id: number;
    service_id: string;
    service_name: string;
    provider: string;
    delivery_mode?: 'standard' | 'dripfeed';
    dripfeed_quantity?: number;
    is_pack?: boolean | number;
    created_at: string;
}

interface PackItem {
    id: number;
    pack_id: number;
    sub_service_id: number;
    quantity_override: number | null;
    sort_order: number;
    service_id: string;
    service_name: string;
    provider: string;
    delivery_mode?: string;
    dripfeed_quantity?: number;
}

export function Config() {
    const [activeTab, setActiveTab] = useState<TabType>('providers');

    // Alerts state
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
    const [alertFormData, setAlertFormData] = useState<{
        type: 'new_order' | 'order_status' | 'low_stock' | 'system' | 'custom';
        title: string;
        message: string;
    }>({
        type: 'new_order',
        title: '',
        message: ''
    });

    // Providers state
    const [providers, setProviders] = useState<Provider[]>([]);
    const [providersLoading, setProvidersLoading] = useState(false);
    const [showProviderModal, setShowProviderModal] = useState(false);
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
    const [providerFormData, setProviderFormData] = useState({
        name: '',
        api_key: '',
        api_url: '',
        active: true
    });
    const [testingProvider, setTestingProvider] = useState<number | null>(null);
    const [visibleApiKeys, setVisibleApiKeys] = useState<Set<number>>(new Set());
    const [providerApiKeys, setProviderApiKeys] = useState<Map<number, string>>(new Map());
    const [loadingApiKey, setLoadingApiKey] = useState<number | null>(null);

    // Members state
    const [members, setMembers] = useState<Employee[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [editingMember, setEditingMember] = useState<Employee | null>(null);
    const [memberFormData, setMemberFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'employee'
    });

    // Catalog state
    const [allowedServices, setAllowedServices] = useState<AllowedService[]>([]);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [serviceFormData, setServiceFormData] = useState({
        service_id: '',
        service_name: '',
        provider: 'BulkMedya',
        delivery_mode: 'standard' as 'standard' | 'dripfeed',
        dripfeed_quantity: 250,
        dripfeed_custom: '',
        is_pack: false,
    });

    // Pack items state
    const [packItemsMap, setPackItemsMap] = useState<Record<number, PackItem[]>>({});
    const [packExpandedId, setPackExpandedId] = useState<number | null>(null);
    const [packItemLoading, setPackItemLoading] = useState<number | null>(null);
    const [addPackSubId, setAddPackSubId] = useState<string>('');
    const [addPackQty, setAddPackQty] = useState<string>('');

    // Fetch alerts
    const fetchAlerts = async () => {
        try {
            setAlertsLoading(true);
            const data = await api.getAlerts();
            setAlerts(data.alerts || []);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setAlertsLoading(false);
        }
    };

    // Fetch providers
    const fetchProviders = async () => {
        try {
            setProvidersLoading(true);
            const data = await api.getProviders();
            setProviders(data.providers || []);
        } catch (error) {
            console.error('Failed to fetch providers:', error);
        } finally {
            setProvidersLoading(false);
        }
    };

    // Fetch members
    const fetchMembers = async () => {
        try {
            setMembersLoading(true);
            const data = await api.getEmployees();
            setMembers(data.users || []);
        } catch (error) {
            console.error('Failed to fetch members:', error);
        } finally {
            setMembersLoading(false);
        }
    };

    // Fetch catalog
    const fetchAllowedServices = async () => {
        try {
            setServicesLoading(true);
            const data = await api.getAllowedServices();
            setAllowedServices(data.services || []);
        } catch (error) {
            console.error('Failed to fetch allowed services:', error);
        } finally {
            setServicesLoading(false);
        }
    };

    // Fetch data when tab changes
    useEffect(() => {
        if (activeTab === 'alerts') {
            fetchAlerts();
        } else if (activeTab === 'providers') {
            fetchProviders();
        } else if (activeTab === 'members') {
            fetchMembers();
        } else if (activeTab === 'catalog') {
            fetchAllowedServices();
        }
    }, [activeTab]);

    // Alert handlers
    const handleSaveAlert = async () => {
        try {
            if (editingAlert) {
                await api.updateAlert(editingAlert.id.toString(), alertFormData);
            } else {
                await api.createAlert(alertFormData);
            }
            setShowAlertModal(false);
            setEditingAlert(null);
            setAlertFormData({ type: 'new_order', title: '', message: '' });
            fetchAlerts();
        } catch (error: any) {
            console.error('Failed to save alert:', error);
            window.alert(error.message || 'Failed to save alert');
        }
    };

    const handleDeleteAlert = async (id: number) => {
        if (!confirm('Supprimer cette alerte ?')) return;
        try {
            await api.deleteAlert(id.toString());
            fetchAlerts();
        } catch (error) {
            console.error('Failed to delete alert:', error);
        }
    };

    const handleToggleAlert = async (alertItem: Alert) => {
        try {
            await api.updateAlert(alertItem.id.toString(), {
                type: alertItem.type,
                title: alertItem.title,
                message: alertItem.message,
                enabled: !alertItem.enabled
            });
            fetchAlerts();
        } catch (error) {
            console.error('Failed to toggle alert:', error);
            window.alert('Impossible de mettre à jour l\'alerte');
        }
    };

    const handleEditAlert = (alert: Alert) => {
        setEditingAlert(alert);
        setAlertFormData({
            type: alert.type,
            title: alert.title,
            message: alert.message
        });
        setShowAlertModal(true);
    };

    const getAlertTypeLabel = (type: string) => {
        switch (type) {
            case 'new_order': return 'Nouvelle commande';
            case 'order_status': return 'Statut commande';
            case 'low_stock': return 'Stock faible';
            case 'system': return 'Système';
            case 'custom': return 'Personnalisé';
            default: return 'Autre';
        }
    };

    const getAlertTypeColor = (type: string) => {
        switch (type) {
            case 'new_order': return 'bg-blue-500';
            case 'order_status': return 'bg-purple-500';
            case 'low_stock': return 'bg-orange-500';
            case 'system': return 'bg-red-500';
            case 'custom': return 'bg-surface';
            default: return 'bg-slate-500';
        }
    };

    // Provider handlers
    const handleSaveProvider = async () => {
        try {
            if (editingProvider) {
                await api.updateProvider(editingProvider.id.toString(), providerFormData);
            } else {
                await api.createProvider(providerFormData);
            }
            setShowProviderModal(false);
            setEditingProvider(null);
            setProviderFormData({ name: '', api_key: '', api_url: '', active: true });
            fetchProviders();
        } catch (error: any) {
            console.error('Failed to save provider:', error);
            window.alert(error.message || 'Failed to save provider');
        }
    };

    const handleDeleteProvider = async (id: number) => {
        if (!confirm('Supprimer ce fournisseur ?')) return;
        try {
            await api.deleteProvider(id.toString());
            fetchProviders();
        } catch (error) {
            console.error('Failed to delete provider:', error);
        }
    };

    const handleEditProvider = (provider: Provider) => {
        setEditingProvider(provider);
        setProviderFormData({
            name: provider.name,
            api_key: '',
            api_url: provider.api_url || '',
            active: provider.active === 1
        });
        setShowProviderModal(true);
    };

    const handleTestProvider = async (id: number) => {
        setTestingProvider(id);
        try {
            const result = await api.testProviderConnection(id.toString());
            if (result.success) {
                window.alert('Connexion réussie !');
            } else {
                window.alert(`Échec: ${result.message}`);
            }
        } catch (error: any) {
            console.error('Failed to test provider:', error);
            window.alert(error.message || 'Failed to test provider');
        } finally {
            setTestingProvider(null);
        }
    };

    const handleToggleApiKeyVisibility = async (providerId: number) => {
        const isVisible = visibleApiKeys.has(providerId);
        
        if (isVisible) {
            // Hide the API key
            const newVisibleKeys = new Set(visibleApiKeys);
            newVisibleKeys.delete(providerId);
            setVisibleApiKeys(newVisibleKeys);
        } else {
            // Show the API key - fetch it if not already loaded
            if (!providerApiKeys.has(providerId)) {
                setLoadingApiKey(providerId);
                try {
                    const result = await api.getProvider(providerId.toString());
                    if (result.provider && result.provider.api_key) {
                        const newApiKeys = new Map(providerApiKeys);
                        newApiKeys.set(providerId, result.provider.api_key);
                        setProviderApiKeys(newApiKeys);
                    }
                } catch (error: any) {
                    console.error('Failed to fetch API key:', error);
                    window.alert('Impossible de charger la clé API');
                    setLoadingApiKey(null);
                    return;
                } finally {
                    setLoadingApiKey(null);
                }
            }
            
            const newVisibleKeys = new Set(visibleApiKeys);
            newVisibleKeys.add(providerId);
            setVisibleApiKeys(newVisibleKeys);
        }
    };

    // Member handlers
    const handleSaveMember = async () => {
        try {
            if (editingMember) {
                await api.updateEmployee(editingMember.id.toString(), memberFormData);
            } else {
                await api.createEmployee(memberFormData);
            }
            setShowMemberModal(false);
            setEditingMember(null);
            setMemberFormData({ name: '', email: '', password: '', role: 'employee' });
            fetchMembers();
        } catch (error: any) {
            console.error('Failed to save member:', error);
            window.alert(error.message || 'Failed to save member');
        }
    };

    const handleDeleteMember = async (id: number) => {
        if (!confirm('Supprimer ce membre ?')) return;
        try {
            await api.deleteEmployee(id.toString());
            fetchMembers();
        } catch (error) {
            console.error('Failed to delete member:', error);
        }
    };

    const handleEditMember = (member: Employee) => {
        setEditingMember(member);
        setMemberFormData({
            name: member.name,
            email: member.email,
            password: '',
            role: member.role
        });
        setShowMemberModal(true);
    };

    // Service handlers
    const handleSaveService = async () => {
        try {
            const dripfeedQty = !serviceFormData.is_pack && serviceFormData.delivery_mode === 'dripfeed' && serviceFormData.dripfeed_quantity === -1
                ? parseInt(serviceFormData.dripfeed_custom)
                : serviceFormData.dripfeed_quantity;

            await api.addAllowedService(
                serviceFormData.service_id,
                serviceFormData.service_name,
                serviceFormData.provider,
                serviceFormData.is_pack ? 'standard' : serviceFormData.delivery_mode,
                serviceFormData.is_pack ? undefined : dripfeedQty,
                serviceFormData.is_pack,
            );
            setShowServiceModal(false);
            setServiceFormData({ service_id: '', service_name: '', provider: 'BulkMedya', delivery_mode: 'standard', dripfeed_quantity: 250, dripfeed_custom: '', is_pack: false });
            fetchAllowedServices();
        } catch (error: any) {
            console.error('Failed to save service:', error);
            window.alert(error.message || 'Failed to save service');
        }
    };

    const togglePackExpand = async (serviceId: number) => {
        if (packExpandedId === serviceId) {
            setPackExpandedId(null);
            return;
        }
        setPackExpandedId(serviceId);
        if (!packItemsMap[serviceId]) {
            try {
                const data = await api.getPackItems(serviceId);
                setPackItemsMap(prev => ({ ...prev, [serviceId]: data.items || [] }));
            } catch (e) {
                console.error('Failed to fetch pack items:', e);
            }
        }
    };

    const handleAddPackItem = async (packId: number) => {
        if (!addPackSubId) return;
        setPackItemLoading(packId);
        try {
            await api.addPackItem(packId, parseInt(addPackSubId), addPackQty ? parseInt(addPackQty) : null);
            const data = await api.getPackItems(packId);
            setPackItemsMap(prev => ({ ...prev, [packId]: data.items || [] }));
            setAddPackSubId('');
            setAddPackQty('');
        } catch (e: any) {
            window.alert(e.message || 'Erreur lors de l\'ajout');
        } finally {
            setPackItemLoading(null);
        }
    };

    const handleRemovePackItem = async (itemId: number, packId: number) => {
        try {
            await api.deletePackItem(itemId);
            setPackItemsMap(prev => ({ ...prev, [packId]: (prev[packId] || []).filter(i => i.id !== itemId) }));
        } catch (e) {
            console.error('Failed to remove pack item:', e);
        }
    };

    const handleDeleteService = async (id: number) => {
        if (!confirm('Supprimer ce service ?')) return;
        try {
            await api.deleteAllowedService(id.toString());
            fetchAllowedServices();
        } catch (error) {
            console.error('Failed to delete service:', error);
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Configuration</h1>
                    <p className="text-slate-400 text-sm">Gestion du système</p>
                </div>
                {activeTab === 'providers' && (
                    <button
                        onClick={() => {
                            setEditingProvider(null);
                            setProviderFormData({ name: '', api_key: '', api_url: '', active: true });
                            setShowProviderModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-secondary text-black font-bold rounded-xl transition-colors"
                    >
                        <Plus size={18} />
                        Ajouter Fournisseur
                    </button>
                )}
                {activeTab === 'members' && (
                    <button
                        onClick={() => {
                            setEditingMember(null);
                            setMemberFormData({ name: '', email: '', password: '', role: 'employee' });
                            setShowMemberModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-secondary text-black font-bold rounded-xl transition-colors"
                    >
                        <Plus size={18} />
                        Ajouter Membre
                    </button>
                )}
                {activeTab === 'alerts' && (
                    <button
                        onClick={() => {
                            setEditingAlert(null);
                            setAlertFormData({ type: 'new_order', title: '', message: '' });
                            setShowAlertModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-secondary text-black font-bold rounded-xl transition-colors"
                    >
                        <Plus size={18} />
                        Ajouter Alerte
                    </button>
                )}
                {activeTab === 'catalog' && (
                    <button
                        onClick={() => {
                            // Get first active provider as default
                            const defaultProvider = providers.find(p => p.active) || providers[0];
                            setServiceFormData({ 
                                service_id: '', 
                                service_name: '', 
                                provider: defaultProvider?.name || 'default', 
                                delivery_mode: 'standard', 
                                dripfeed_quantity: 250, 
                                dripfeed_custom: '' 
                            });
                            setShowServiceModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-secondary text-black font-bold rounded-xl transition-colors"
                    >
                        <Plus size={18} />
                        Ajouter Service
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
                <button
                    onClick={() => setActiveTab('providers')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                        activeTab === 'providers'
                            ? "bg-primary text-black"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    Fournisseurs API
                </button>
                <button
                    onClick={() => setActiveTab('members')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                        activeTab === 'members'
                            ? "bg-primary text-black"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    Membres & Accès
                </button>
                <button
                    onClick={() => setActiveTab('alerts')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                        activeTab === 'alerts'
                            ? "bg-primary text-black"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    Alertes
                </button>
                <button
                    onClick={() => setActiveTab('catalog')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                        activeTab === 'catalog'
                            ? "bg-primary text-black"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    Catalogue
                </button>
            </div>

            {/* Providers Content */}
            {activeTab === 'providers' && (
                <div className="bg-surface rounded-2xl p-6 border border-white/5">
                    <h2 className="text-xl font-bold text-white mb-4">Fournisseurs API</h2>
                    {providersLoading ? (
                        <p className="text-slate-400">Chargement...</p>
                    ) : providers.length === 0 ? (
                        <p className="text-slate-400">Aucun fournisseur configuré</p>
                    ) : (
                        <div className="space-y-3">
                            {providers.map((provider) => (
                                <div
                                    key={provider.id}
                                    className="flex items-center justify-between p-4 bg-background rounded-xl border border-white/5 hover:border-primary/30 transition-colors"
                                >
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-white">{provider.name}</h3>
                                        <p className="text-sm text-slate-400 mb-2">{provider.api_url || 'URL non configurée'}</p>
                                        
                                        {/* API Key Display */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs text-slate-500">Clé API:</span>
                                            <code className="text-xs font-mono text-slate-300 bg-black/30 px-2 py-1 rounded">
                                                {loadingApiKey === provider.id ? (
                                                    'Chargement...'
                                                ) : visibleApiKeys.has(provider.id) && providerApiKeys.has(provider.id) ? (
                                                    providerApiKeys.get(provider.id)
                                                ) : (
                                                    '••••••••••••••••'
                                                )}
                                            </code>
                                            <button
                                                onClick={() => handleToggleApiKeyVisibility(provider.id)}
                                                disabled={loadingApiKey === provider.id}
                                                className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors disabled:opacity-50"
                                                title={visibleApiKeys.has(provider.id) ? 'Masquer la clé' : 'Afficher la clé'}
                                            >
                                                {visibleApiKeys.has(provider.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                        
                                        <span className={cn(
                                            "inline-block px-2 py-1 rounded-full text-xs font-medium",
                                            provider.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                        )}>
                                            {provider.active ? 'Actif' : 'Inactif'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleTestProvider(provider.id)}
                                            disabled={testingProvider === provider.id}
                                            className="p-2 text-slate-400 hover:text-green-400 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleEditProvider(provider)}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <Settings size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProvider(provider.id)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Members Content */}
            {activeTab === 'members' && (
                <div className="bg-surface rounded-2xl p-6 border border-white/5">
                    <h2 className="text-xl font-bold text-white mb-4">Membres & Accès</h2>
                    {membersLoading ? (
                        <p className="text-slate-400">Chargement...</p>
                    ) : members.length === 0 ? (
                        <p className="text-slate-400">Aucun membre enregistré</p>
                    ) : (
                        <div className="space-y-3">
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 bg-background rounded-xl border border-white/5 hover:border-primary/30 transition-colors"
                                >
                                    <div>
                                        <h3 className="font-semibold text-white">{member.name}</h3>
                                        <p className="text-sm text-slate-400">{member.email}</p>
                                        <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                                            {member.role === 'admin' ? 'Admin' : 'Employé'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleEditMember(member)}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <Settings size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMember(member.id)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Alerts Content */}
            {activeTab === 'alerts' && (
                <div className="bg-surface rounded-2xl p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">Alertes & Notifications</h2>
                        <button
                            onClick={() => {
                                setEditingAlert(null);
                                setAlertFormData({ type: 'custom', title: '', message: '' });
                                setShowAlertModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 text-white font-semibold rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <Plus size={18} />
                            Nouvelle Alerte
                        </button>
                    </div>

                    {alertsLoading ? (
                        <p className="text-slate-400">Chargement...</p>
                    ) : alerts.length === 0 ? (
                        <p className="text-slate-400">Aucune alerte configurée</p>
                    ) : (
                        <div className="space-y-3">
                            {alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="flex items-center justify-between p-4 bg-background rounded-xl border border-white/5 hover:border-primary/30 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-3 h-3 rounded-full", getAlertTypeColor(alert.type))} />
                                        <div>
                                            <h3 className="font-semibold text-white">{alert.title}</h3>
                                            <p className="text-sm text-slate-400">{alert.message}</p>
                                        </div>
                                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getAlertTypeColor(alert.type))}>
                                            {getAlertTypeLabel(alert.type)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={cn("text-sm", alert.enabled ? "text-white" : "text-slate-500")}>
                                            {alert.enabled ? 'Activé' : 'Désactivé'}
                                        </span>
                                        <button
                                            onClick={() => handleToggleAlert(alert)}
                                            className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                alert.enabled
                                                    ? "bg-primary/20 hover:bg-primary/30 text-black"
                                                    : "bg-white/5 hover:bg-white/10 text-white"
                                            )}
                                        >
                                            {alert.enabled ? 'Désactiver' : 'Activer'}
                                        </button>
                                        <button
                                            onClick={() => handleEditAlert(alert)}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <Settings size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAlert(alert.id)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Catalog Content */}
            {activeTab === 'catalog' && (
                <div className="bg-surface rounded-2xl p-6 border border-white/5">
                    <h2 className="text-xl font-bold text-white mb-4">Catalogue de Services Autorisés</h2>
                    {servicesLoading ? (
                        <p className="text-slate-400">Chargement...</p>
                    ) : allowedServices.length === 0 ? (
                        <p className="text-slate-400">Aucun service autorisé</p>
                    ) : (
                        <div className="space-y-3">
                            {allowedServices.map((service) => (
                                <div key={service.id} className="rounded-xl border border-white/5 hover:border-primary/30 transition-colors overflow-hidden">
                                    <div className="flex items-center justify-between p-4 bg-background">
                                        <div className="flex-1">
                                            <div className="flex items-start gap-4">
                                                <div>
                                                    <h3 className="font-semibold text-white">{service.service_id}</h3>
                                                    <p className="text-sm text-slate-400">{service.service_name}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                                                            {service.provider}
                                                        </span>
                                                        {service.is_pack ? (
                                                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                                                📦 Pack
                                                            </span>
                                                        ) : service.delivery_mode === 'dripfeed' ? (
                                                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                                💧 {service.dripfeed_quantity ? `${service.dripfeed_quantity} / jour` : 'Drip Feed'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                                                Standard
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {service.is_pack && (
                                                <button
                                                    onClick={() => togglePackExpand(service.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors border border-orange-500/30"
                                                >
                                                    <Package size={14} />
                                                    Sous-services
                                                    {packExpandedId === service.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteService(service.id)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Pack items panel */}
                                    {service.is_pack && packExpandedId === service.id && (
                                        <div className="border-t border-white/5 bg-background/50 p-4 space-y-3">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sous-services du pack</p>
                                            {(packItemsMap[service.id] || []).length === 0 ? (
                                                <p className="text-sm text-slate-500 italic">Aucun sous-service — ajoutez-en ci-dessous</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {(packItemsMap[service.id] || []).map(item => (
                                                        <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
                                                            <div>
                                                                <span className="text-sm text-white font-medium">{item.service_name}</span>
                                                                <span className="text-xs text-slate-400 ml-2">#{item.service_id}</span>
                                                                {item.quantity_override && (
                                                                    <span className="text-xs text-blue-400 ml-2">{item.quantity_override} unités</span>
                                                                )}
                                                                {item.delivery_mode === 'dripfeed' && (
                                                                    <span className="text-xs text-purple-400 ml-2">💧 {item.dripfeed_quantity}/j</span>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemovePackItem(item.id, service.id)}
                                                                className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Add sub-service */}
                                            <div className="flex items-center gap-2 pt-1">
                                                <select
                                                    value={addPackSubId}
                                                    onChange={e => setAddPackSubId(e.target.value)}
                                                    className="flex-1 bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                                >
                                                    <option value="">-- Choisir un service --</option>
                                                    {allowedServices
                                                        .filter(s => !s.is_pack && s.id !== service.id)
                                                        .map(s => (
                                                            <option key={s.id} value={String(s.id)}>
                                                                {s.service_id} — {s.service_name}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                                <input
                                                    type="number"
                                                    placeholder="Qté (opt)"
                                                    value={addPackQty}
                                                    onChange={e => setAddPackQty(e.target.value)}
                                                    className="w-28 bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                                />
                                                <button
                                                    onClick={() => handleAddPackItem(service.id)}
                                                    disabled={!addPackSubId || packItemLoading === service.id}
                                                    className="px-3 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-sm hover:bg-orange-500/30 disabled:opacity-40 transition-colors"
                                                >
                                                    {packItemLoading === service.id ? '...' : <Plus size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Provider Modal */}
            {showProviderModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editingProvider ? 'Modifier Fournisseur' : 'Ajouter Fournisseur'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Nom</label>
                                <input
                                    type="text"
                                    value={providerFormData.name}
                                    onChange={(e) => setProviderFormData({ ...providerFormData, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
                                    placeholder="Ex: BulkMedya"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">API URL</label>
                                <input
                                    type="text"
                                    value={providerFormData.api_url}
                                    onChange={(e) => setProviderFormData({ ...providerFormData, api_url: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
                                    placeholder="https://api.example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Clé API</label>
                                <input
                                    type="password"
                                    value={providerFormData.api_key}
                                    onChange={(e) => setProviderFormData({ ...providerFormData, api_key: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
                                    placeholder="••••••••••••"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="providerActive"
                                    checked={providerFormData.active}
                                    onChange={(e) => setProviderFormData({ ...providerFormData, active: e.target.checked })}
                                    className="w-4 h-4 rounded border-white/10 bg-background"
                                />
                                <label htmlFor="providerActive" className="text-sm text-slate-400">Actif</label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowProviderModal(false);
                                        setEditingProvider(null);
                                        setProviderFormData({ name: '', api_key: '', api_url: '', active: true });
                                    }}
                                    className="flex-1 px-4 py-2 bg-surface border border-white/10 text-white font-semibold rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveProvider}
                                    className="flex-1 px-4 py-2 bg-primary text-black font-semibold rounded-xl hover:bg-secondary transition-colors"
                                >
                                    {editingProvider ? 'Modifier' : 'Ajouter'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Member Modal */}
            {showMemberModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editingMember ? 'Modifier Membre' : 'Ajouter Membre'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Nom</label>
                                <input
                                    type="text"
                                    value={memberFormData.name}
                                    onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
                                    placeholder="Jean Dupont"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={memberFormData.email}
                                    onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
                                    placeholder="jean.dupont@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    {editingMember ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
                                </label>
                                <input
                                    type="password"
                                    value={memberFormData.password}
                                    onChange={(e) => setMemberFormData({ ...memberFormData, password: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
                                    placeholder="•••••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Rôle</label>
                                <select
                                    value={memberFormData.role}
                                    onChange={(e) => setMemberFormData({ ...memberFormData, role: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary"
                                >
                                    <option value="employee">Employé</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowMemberModal(false);
                                        setEditingMember(null);
                                        setMemberFormData({ name: '', email: '', password: '', role: 'employee' });
                                    }}
                                    className="flex-1 px-4 py-2 bg-surface border border-white/10 text-white font-semibold rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveMember}
                                    className="flex-1 px-4 py-2 bg-primary text-black font-semibold rounded-xl hover:bg-secondary transition-colors"
                                >
                                    {editingMember ? 'Modifier' : 'Ajouter'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Modal */}
            {showAlertModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editingAlert ? 'Modifier Alerte' : 'Ajouter Alerte'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Type d'alerte</label>
                                <select
                                    value={alertFormData.type}
                                    onChange={(e) => setAlertFormData({ ...alertFormData, type: e.target.value as any })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary"
                                >
                                    <option value="new_order">Nouvelle commande</option>
                                    <option value="order_status">Statut commande</option>
                                    <option value="low_stock">Stock faible</option>
                                    <option value="system">Système</option>
                                    <option value="custom">Personnalisé</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Titre</label>
                                <input
                                    type="text"
                                    value={alertFormData.title}
                                    onChange={(e) => setAlertFormData({ ...alertFormData, title: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
                                    placeholder="Ex: Nouvelle commande reçue"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Message</label>
                                <textarea
                                    value={alertFormData.message}
                                    onChange={(e) => setAlertFormData({ ...alertFormData, message: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary min-h-25 resize-none"
                                    placeholder="Description de l'alerte..."
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowAlertModal(false);
                                        setEditingAlert(null);
                                        setAlertFormData({ type: 'new_order', title: '', message: '' });
                                    }}
                                    className="flex-1 px-4 py-2 bg-surface border border-white/10 text-white font-semibold rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveAlert}
                                    className="flex-1 px-4 py-2 bg-primary text-black font-semibold rounded-xl hover:bg-secondary transition-colors"
                                >
                                    {editingAlert ? 'Modifier' : 'Ajouter'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Service Modal */}
            {showServiceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">
                            Ajouter Service Autorisé
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">ID Service</label>
                                <input
                                    type="text"
                                    value={serviceFormData.service_id}
                                    onChange={(e) => setServiceFormData({ ...serviceFormData, service_id: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
                                    placeholder="Ex: 12345"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Nom du Service</label>
                                <input
                                    type="text"
                                    value={serviceFormData.service_name}
                                    onChange={(e) => setServiceFormData({ ...serviceFormData, service_name: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
                                    placeholder="Ex: Followers Instagram"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Fournisseur</label>
                                <select
                                    value={serviceFormData.provider}
                                    onChange={(e) => setServiceFormData({ ...serviceFormData, provider: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary"
                                >
                                    {providers.length === 0 ? (
                                        <option value="">Aucun fournisseur configuré</option>
                                    ) : (
                                        providers.map((provider) => (
                                            <option key={provider.id} value={provider.name}>
                                                {provider.name} {!provider.active && '(Inactif)'}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-3">Mode de livraison</label>
                                <div className="space-y-3">
                                    {/* Standard */}
                                    <button
                                        type="button"
                                        onClick={() => setServiceFormData({ ...serviceFormData, delivery_mode: 'standard', is_pack: false })}
                                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                            !serviceFormData.is_pack && serviceFormData.delivery_mode === 'standard'
                                                ? "border-primary bg-primary/10"
                                                : "border-white/10 bg-background hover:border-white/20"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-white">Standard</div>
                                                <div className="text-sm text-slate-400">Envois en 1 seule fois</div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 ${
                                                !serviceFormData.is_pack && serviceFormData.delivery_mode === 'standard'
                                                    ? "border-primary bg-primary"
                                                    : "border-white/20"
                                            }`} />
                                        </div>
                                    </button>

                                    {/* Drip Feed */}
                                    <button
                                        type="button"
                                        onClick={() => setServiceFormData({ ...serviceFormData, delivery_mode: 'dripfeed', is_pack: false })}
                                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                            !serviceFormData.is_pack && serviceFormData.delivery_mode === 'dripfeed'
                                                ? "border-purple-500 bg-purple-500/10"
                                                : "border-white/10 bg-background hover:border-white/20"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-white">💧 Drip Feed</div>
                                                <div className="text-sm text-slate-400">Livraison progressive</div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 ${
                                                !serviceFormData.is_pack && serviceFormData.delivery_mode === 'dripfeed'
                                                    ? "border-purple-500 bg-purple-500"
                                                    : "border-white/20"
                                            }`} />
                                        </div>
                                    </button>

                                    {/* Pack */}
                                    <button
                                        type="button"
                                        onClick={() => setServiceFormData({ ...serviceFormData, delivery_mode: 'standard', is_pack: true })}
                                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                            serviceFormData.is_pack
                                                ? "border-orange-500 bg-orange-500/10"
                                                : "border-white/10 bg-background hover:border-white/20"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-white">📦 Pack</div>
                                                <div className="text-sm text-slate-400">Bundle de plusieurs services</div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 ${
                                                serviceFormData.is_pack
                                                    ? "border-orange-500 bg-orange-500"
                                                    : "border-white/20"
                                            }`} />
                                        </div>
                                    </button>

                                    {/* Drip Feed Options */}
                                    {!serviceFormData.is_pack && serviceFormData.delivery_mode === 'dripfeed' && (
                                        <div className="mt-4 space-y-3">
                                            <label className="block text-sm font-medium text-slate-400 mb-2">Quantité par jour</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setServiceFormData({ ...serviceFormData, dripfeed_quantity: 100 })}
                                                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                                                        serviceFormData.dripfeed_quantity === 100
                                                            ? "border-purple-500 bg-purple-500/20 text-purple-400 font-bold"
                                                            : "border-white/10 bg-background text-slate-400 hover:border-white/20"
                                                    }`}
                                                >
                                                    100 / jour
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setServiceFormData({ ...serviceFormData, dripfeed_quantity: 250 })}
                                                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                                                        serviceFormData.dripfeed_quantity === 250
                                                            ? "border-purple-500 bg-purple-500/20 text-purple-400 font-bold"
                                                            : "border-white/10 bg-background text-slate-400 hover:border-white/20"
                                                    }`}
                                                >
                                                    250 / jour
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setServiceFormData({ ...serviceFormData, dripfeed_quantity: 500 })}
                                                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                                                        serviceFormData.dripfeed_quantity === 500
                                                            ? "border-purple-500 bg-purple-500/20 text-purple-400 font-bold"
                                                            : "border-white/10 bg-background text-slate-400 hover:border-white/20"
                                                    }`}
                                                >
                                                    500 / jour
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setServiceFormData({ ...serviceFormData, dripfeed_quantity: 1000 })}
                                                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                                                        serviceFormData.dripfeed_quantity === 1000
                                                            ? "border-purple-500 bg-purple-500/20 text-purple-400 font-bold"
                                                            : "border-white/10 bg-background text-slate-400 hover:border-white/20"
                                                    }`}
                                                >
                                                    1000 / jour
                                                </button>
                                            </div>

                                            {/* Custom quantity input */}
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setServiceFormData({ ...serviceFormData, dripfeed_quantity: -1 })}
                                                    className={`p-3 rounded-xl border-2 transition-all text-center flex-1 ${
                                                        serviceFormData.dripfeed_quantity === -1
                                                            ? "border-purple-500 bg-purple-500/20 text-purple-400 font-bold"
                                                            : "border-white/10 bg-background text-slate-400 hover:border-white/20"
                                                    }`}
                                                >
                                                    Personnalisé
                                                </button>
                                                {serviceFormData.dripfeed_quantity === -1 && (
                                                    <input
                                                        type="number"
                                                        value={serviceFormData.dripfeed_custom}
                                                        onChange={(e) => setServiceFormData({ ...serviceFormData, dripfeed_custom: e.target.value })}
                                                        placeholder="Ex: 2000"
                                                        className="flex-1 px-4 py-2 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowServiceModal(false);
                                        const defaultProvider = providers.find(p => p.active) || providers[0];
                                        setServiceFormData({ service_id: '', service_name: '', provider: defaultProvider?.name || 'default', delivery_mode: 'standard', dripfeed_quantity: 250, dripfeed_custom: '' });
                                    }}
                                    className="flex-1 px-4 py-2 bg-surface border border-white/10 text-white font-semibold rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveService}
                                    className="flex-1 px-4 py-2 bg-primary text-black font-semibold rounded-xl hover:bg-secondary transition-colors"
                                >
                                    Ajouter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
