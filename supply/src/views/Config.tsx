import { Plus, Trash2, Settings, Check } from "lucide-react";
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
    created_at: string;
}

export function Config() {
    const [activeTab, setActiveTab] = useState<TabType>('alerts');

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
        dripfeed_custom: ''
    });

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
            const dripfeedQty = serviceFormData.delivery_mode === 'dripfeed' && serviceFormData.dripfeed_quantity === -1
                ? parseInt(serviceFormData.dripfeed_custom)
                : serviceFormData.dripfeed_quantity;

            await api.addAllowedService(
                serviceFormData.service_id,
                serviceFormData.service_name,
                serviceFormData.provider,
                serviceFormData.delivery_mode,
                dripfeedQty
            );
            setShowServiceModal(false);
            setServiceFormData({ service_id: '', service_name: '', provider: 'BulkMedya', delivery_mode: 'standard', dripfeed_quantity: 250, dripfeed_custom: '' });
            fetchAllowedServices();
        } catch (error: any) {
            console.error('Failed to save service:', error);
            window.alert(error.message || 'Failed to save service');
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

    const handleEditService = (service: AllowedService) => {
        setServiceFormData({
            service_id: service.service_id,
            service_name: service.service_name,
            provider: service.provider
        });
        setShowServiceModal(true);
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
                            setServiceFormData({ service_id: '', service_name: '', provider: 'BulkMedya', delivery_mode: 'standard', dripfeed_quantity: 250, dripfeed_custom: '' });
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
                                    <div>
                                        <h3 className="font-semibold text-white">{provider.name}</h3>
                                        <p className="text-sm text-slate-400">{provider.api_url || 'URL non configurée'}</p>
                                        <span className={cn(
                                            "inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium",
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
                                <div
                                    key={service.id}
                                    className="flex items-center justify-between p-4 bg-background rounded-xl border border-white/5 hover:border-primary/30 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4">
                                            <div>
                                                <h3 className="font-semibold text-white">{service.service_id}</h3>
                                                <p className="text-sm text-slate-400">{service.service_name}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                                                        {service.provider}
                                                    </span>
                                                    {service.delivery_mode === 'dripfeed' ? (
                                                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                            💧 {service.dripfeed_quantity === -1 ? 'Personnalisé' : `${service.dripfeed_quantity} / jour`}
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
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleDeleteService(service.id)}
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
                                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary min-h-[100px] resize-none"
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
                                    <option value="BulkMedya">BulkMedya</option>
                                    <option value="JAP">JAP</option>
                                    <option value="SMMRocket">SMM Rocket</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-3">Mode de livraison</label>
                                <div className="space-y-3">
                                    {/* Standard */}
                                    <button
                                        type="button"
                                        onClick={() => setServiceFormData({ ...serviceFormData, delivery_mode: 'standard' })}
                                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                            serviceFormData.delivery_mode === 'standard'
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
                                                serviceFormData.delivery_mode === 'standard'
                                                    ? "border-primary bg-primary"
                                                    : "border-white/20"
                                            }`} />
                                        </div>
                                    </button>

                                    {/* Drip Feed */}
                                    <button
                                        type="button"
                                        onClick={() => setServiceFormData({ ...serviceFormData, delivery_mode: 'dripfeed' })}
                                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                            serviceFormData.delivery_mode === 'dripfeed'
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
                                                serviceFormData.delivery_mode === 'dripfeed'
                                                    ? "border-purple-500 bg-purple-500"
                                                    : "border-white/20"
                                            }`} />
                                        </div>
                                    </button>

                                    {/* Drip Feed Options */}
                                    {serviceFormData.delivery_mode === 'dripfeed' && (
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
                                        setServiceFormData({ service_id: '', service_name: '', provider: 'BulkMedya', delivery_mode: 'standard', dripfeed_quantity: 250, dripfeed_custom: '' });
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
