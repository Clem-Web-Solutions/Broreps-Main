import { CheckCircle, Clock, RefreshCw, XCircle, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../libs/api";
import { cn } from "../libs/utils";
import { useWebSocket } from "../contexts/WebSocketContext";

interface StatCardProps {
    id: 'pending' | 'approved' | 'rejected';
    label: string;
    count: number;
    icon: LucideIcon;
    colorClass: string;
    activeClass: string;
}

interface Employee {
    id?: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

export function Teams() {
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const { on, off, isConnected } = useWebSocket();

    const [pendingUsers, setPendingUsers] = useState<Employee[]>([]);
    const [approvedUsers, setApprovedUsers] = useState<Employee[]>([]);
    const [rejectedUsers, setRejectedUsers] = useState<Employee[]>([]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            
            // Load all three lists in parallel
            const [pending, approved, rejected] = await Promise.all([
                api.getUsersByStatus('pending'),
                api.getUsersByStatus('approved'),
                api.getUsersByStatus('rejected')
            ]);
            
            setPendingUsers(pending.users || []);
            setApprovedUsers(approved.users || []);
            setRejectedUsers(rejected.users || []);
        } catch (error) {
            console.error('Erreur lors du chargement des utilisateurs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId: number) => {
        try {
            setProcessingId(userId);
            await api.approveUser(userId);
            
            // Reload users
            await loadUsers();
            
            console.log('✅ Utilisateur approuvé:', userId);
        } catch (error) {
            console.error('Erreur lors de l\'approbation:', error);
            alert('Erreur lors de l\'approbation de l\'utilisateur');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (userId: number) => {
        if (!confirm('Êtes-vous sûr de vouloir refuser cet utilisateur ?')) {
            return;
        }

        try {
            setProcessingId(userId);
            await api.rejectUser(userId);
            
            // Reload users
            await loadUsers();
            
            console.log('❌ Utilisateur refusé:', userId);
        } catch (error) {
            console.error('Erreur lors du refus:', error);
            alert('Erreur lors du refus de l\'utilisateur');
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Paris' 
        });
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // WebSocket listeners for real-time updates
    useEffect(() => {
        if (!isConnected) return;

        const handleUserRegistered = (data: any) => {
            console.log('👤 WebSocket: New user registered', data);
            // Reload users to reflect the new registration
            loadUsers();
        };

        const handleUserApproved = (data: any) => {
            console.log('✅ WebSocket: User approved', data);
            // Reload users to reflect the approval
            loadUsers();
        };

        const handleUserRejected = (data: any) => {
            console.log('❌ WebSocket: User rejected', data);
            // Reload users to reflect the rejection
            loadUsers();
        };

        on('user:registered', handleUserRegistered);
        on('user:approved', handleUserApproved);
        on('user:rejected', handleUserRejected);

        return () => {
            off('user:registered', handleUserRegistered);
            off('user:approved', handleUserApproved);
            off('user:rejected', handleUserRejected);
        };
    }, [isConnected, on, off]);

    const getCurrentUsers = () => {
        switch (activeTab) {
            case 'pending':
                return pendingUsers;
            case 'approved':
                return approvedUsers;
            case 'rejected':
                return rejectedUsers;
        }
    };

    const currentUsers = getCurrentUsers();

    const StatCard = ({ id, label, count, icon: Icon, colorClass, activeClass }: StatCardProps) => (
        <button
            onClick={() => setActiveTab(id)}
            className={cn(
                "flex items-center justify-between p-6 rounded-2xl border transition-all duration-200 w-full group text-left relative overflow-hidden",
                activeTab === id
                    ? cn("bg-surface/40", activeClass)
                    : "bg-surface/20 border-white/5 hover:bg-surface/30"
            )}
        >
            <div className="relative z-10">
                <div className="text-slate-400 text-sm font-medium mb-1">{label}</div>
                <div className="text-3xl font-black text-white">{count}</div>
            </div>
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center relative z-10 transition-transform group-hover:scale-110", colorClass)}>
                <Icon size={24} />
            </div>
            {/* Glow Effect */}
            {activeTab === id && (
                <div className={cn("absolute inset-0 opacity-10 blur-xl transition-opacity", colorClass.split(' ')[0])}></div>
            )}
        </button>
    );

    return (
        <div className="flex flex-col gap-8 pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Demandes d'Accès</h1>
                        {isConnected && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-bold rounded-lg border border-green-500/20 flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                Temps réel
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400">Gérez les demandes d'accès au panel</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    id="pending"
                    label="En Attente"
                    count={pendingUsers.length}
                    icon={Clock}
                    colorClass="bg-yellow-500/20 text-yellow-500"
                    activeClass="border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.1)]"
                />
                <StatCard
                    id="approved"
                    label="Approuvées"
                    count={approvedUsers.length}
                    icon={CheckCircle}
                    colorClass="bg-green-500/20 text-green-500"
                    activeClass="border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                />
                <StatCard
                    id="rejected"
                    label="Refusées"
                    count={rejectedUsers.length}
                    icon={XCircle}
                    colorClass="bg-red-500/20 text-red-500"
                    activeClass="border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                />
            </div>

            {/* Users List */}
            <div className="bg-surface/20 border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                        {activeTab === 'pending' && '⏳ Demandes en attente'}
                        {activeTab === 'approved' && '✅ Utilisateurs approuvés'}
                        {activeTab === 'rejected' && '❌ Demandes refusées'}
                    </h2>
                    <button
                        onClick={loadUsers}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        Actualiser
                    </button>
                </div>

                <div className="divide-y divide-white/5">
                    {loading ? (
                        <div className="p-12 text-center text-slate-400">
                            <RefreshCw className="animate-spin mx-auto mb-3" size={32} />
                            Chargement...
                        </div>
                    ) : currentUsers.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <div className="text-4xl mb-3">📭</div>
                            Aucun utilisateur à afficher
                        </div>
                    ) : (
                        currentUsers.map((user) => (
                            <div key={user.id} className="p-6 hover:bg-white/2 transition-colors flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-white">{user.name}</h3>
                                        <span className={cn(
                                            "px-2 py-1 rounded-lg text-xs font-bold",
                                            user.role === 'admin' ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                                        )}>
                                            {user.role === 'admin' ? 'Admin' : 'Utilisateur'}
                                        </span>
                                    </div>
                                    <div className="text-slate-400 text-sm">{user.email}</div>
                                    <div className="text-slate-500 text-xs mt-1">
                                        Demande créée le {formatDate(user.created_at)}
                                    </div>
                                </div>

                                {/* Actions */}
                                {activeTab === 'pending' && (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleApprove(user.id!)}
                                            disabled={processingId === user.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                                        >
                                            {processingId === user.id ? (
                                                <RefreshCw size={16} className="animate-spin" />
                                            ) : (
                                                <CheckCircle size={16} />
                                            )}
                                            Approuver
                                        </button>
                                        <button
                                            onClick={() => handleReject(user.id!)}
                                            disabled={processingId === user.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                                        >
                                            {processingId === user.id ? (
                                                <RefreshCw size={16} className="animate-spin" />
                                            ) : (
                                                <XCircle size={16} />
                                            )}
                                            Refuser
                                        </button>
                                    </div>
                                )}

                                {activeTab === 'approved' && (
                                    <div className="flex items-center gap-2 text-green-400">
                                        <CheckCircle size={20} />
                                        <span className="font-bold">Actif</span>
                                    </div>
                                )}

                                {activeTab === 'rejected' && (
                                    <div className="flex items-center gap-2 text-red-400">
                                        <XCircle size={20} />
                                        <span className="font-bold">Refusé</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}