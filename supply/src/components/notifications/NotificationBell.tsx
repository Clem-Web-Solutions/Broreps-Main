import { Bell, CheckCheck, Clock, Package, RefreshCw, TrendingDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import api from "../../libs/api";
import { cn } from "../../libs/utils";
import { useWebSocket } from "../../contexts/WebSocketContext";

interface Notification {
    id: number;
    type: 'order_created' | 'order_updated' | 'order_completed' | 'low_balance' | 'drip_executed' | 'system';
    title: string;
    message: string;
    data: any;
    is_read: boolean;
    link: string | null;
    created_at: string;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { on, off, isConnected } = useWebSocket();

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await api.getNotifications(false, 20);
            setNotifications(data.notifications);
            setUnreadCount(data.unread_count);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (notificationId: number) => {
        try {
            await api.markNotificationAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleDelete = async (notificationId: number) => {
        try {
            await api.deleteNotification(notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            const notification = notifications.find(n => n.id === notificationId);
            if (notification && !notification.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'order_created':
                return <Package size={18} className="text-blue-400" />;
            case 'order_completed':
                return <CheckCheck size={18} className="text-green-400" />;
            case 'drip_executed':
                return <RefreshCw size={18} className="text-purple-400" />;
            case 'low_balance':
                return <TrendingDown size={18} className="text-red-400" />;
            default:
                return <Bell size={18} className="text-slate-400" />;
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diff < 60) return 'À l\'instant';
        if (diff < 3600) return `${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}j`;
        
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    // WebSocket listeners for real-time notifications
    useEffect(() => {
        if (!isConnected) return;

        const handleNewNotification = (notification: Notification) => {
            console.log('🔔 New notification received:', notification);
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Optional: Play notification sound
            // const audio = new Audio('/notification.mp3');
            // audio.play().catch(e => console.log('Could not play sound:', e));
        };

        const handleNotificationUpdate = (data: { id: number; is_read: boolean }) => {
            console.log('🔄 Notification updated:', data);
            setNotifications(prev =>
                prev.map(n => n.id === data.id ? { ...n, is_read: data.is_read } : n)
            );
            if (data.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        };

        on('notification:new', handleNewNotification);
        on('notification:update', handleNotificationUpdate);

        return () => {
            off('notification:new', handleNewNotification);
            off('notification:update', handleNotificationUpdate);
        };
    }, [isConnected, on, off]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 relative text-slate-400 hover:text-white transition-colors"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-4.5 h-4.5 bg-primary rounded-full ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-black">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-2 w-105 max-h-125 bg-surface border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surface/60 backdrop-blur-sm">
                        <div>
                            <h3 className="text-sm font-bold text-white">Notifications</h3>
                            <p className="text-xs text-slate-400">
                                {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-primary hover:text-secondary font-bold transition-colors flex items-center gap-1"
                                    title="Marquer tout comme lu"
                                >
                                    <CheckCheck size={14} />
                                    Tout lire
                                </button>
                            )}
                            <button
                                onClick={loadNotifications}
                                disabled={loading}
                                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                                title="Rafraîchir"
                            >
                                <RefreshCw size={14} className={cn("text-slate-400", loading && "animate-spin")} />
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto max-h-125">
                        {loading && notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                                <p className="text-sm">Chargement...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <Bell size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">Aucune notification</p>
                                <p className="text-xs mt-1">Vous êtes à jour !</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notification) => {
                                    const NotifIcon = getNotificationIcon(notification.type);
                                    const content = (
                                        <div
                                            className={cn(
                                                "p-4 hover:bg-white/5 transition-colors cursor-pointer group relative",
                                                !notification.is_read && "bg-white/2"
                                            )}
                                            onClick={() => {
                                                if (!notification.is_read) {
                                                    handleMarkAsRead(notification.id);
                                                }
                                                if (notification.link) {
                                                    setShowDropdown(false);
                                                }
                                            }}
                                        >
                                            <div className="flex gap-3">
                                                <div className="shrink-0 mt-1">
                                                    {NotifIcon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h4 className={cn(
                                                            "text-sm font-semibold line-clamp-1",
                                                            notification.is_read ? "text-slate-300" : "text-white"
                                                        )}>
                                                            {notification.title}
                                                        </h4>
                                                        {!notification.is_read && (
                                                            <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1"></div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {formatTimeAgo(notification.created_at)}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(notification.id);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded text-red-400"
                                                            title="Supprimer"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );

                                    if (notification.link) {
                                        return (
                                            <Link key={notification.id} to={notification.link}>
                                                {content}
                                            </Link>
                                        );
                                    }

                                    return <div key={notification.id}>{content}</div>;
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
