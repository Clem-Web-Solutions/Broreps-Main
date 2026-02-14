import { Wifi, WifiOff } from "lucide-react";
import { useWebSocket } from "../../contexts/WebSocketContext";
import { cn } from "../../libs/utils";

export function ConnectionStatus() {
    const { connectionStatus } = useWebSocket();

    if (connectionStatus === 'connected') {
        return null; // Hide when connected
    }

    const statusConfig = {
        disconnected: {
            icon: WifiOff,
            text: 'Déconnecté',
            bgColor: 'bg-red-500/20',
            textColor: 'text-red-400',
            borderColor: 'border-red-500/30',
        },
        connecting: {
            icon: Wifi,
            text: 'Connexion...',
            bgColor: 'bg-yellow-500/20',
            textColor: 'text-yellow-400',
            borderColor: 'border-yellow-500/30',
        },
        reconnecting: {
            icon: Wifi,
            text: 'Reconnexion...',
            bgColor: 'bg-orange-500/20',
            textColor: 'text-orange-400',
            borderColor: 'border-orange-500/30',
        }
    };

    const config = statusConfig[connectionStatus] || statusConfig.disconnected;
    const Icon = config.icon;

    return (
        <div className={cn(
            "fixed top-4 right-4 z-100 px-4 py-2 rounded-lg border backdrop-blur-sm flex items-center gap-2 text-sm font-medium shadow-lg",
            config.bgColor,
            config.textColor,
            config.borderColor
        )}>
            <Icon size={16} className={connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? 'animate-pulse' : ''} />
            <span>{config.text}</span>
        </div>
    );
}
