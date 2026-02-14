import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  emit: (event: string, data?: any) => void;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'reconnecting'>('disconnected');
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('❌ WebSocket: No token found, cannot connect');
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');
    console.log('🔌 WebSocket: Connecting...');

    const socketInstance = io('http://localhost:3005', {
      auth: { token },
      transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socketInstance.on('connect', () => {
      console.log('✅ WebSocket: Connected', socketInstance.id);
      setIsConnected(true);
      setConnectionStatus('connected');
      reconnectAttempts.current = 0;
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ WebSocket: Disconnected', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ WebSocket: Connection error', error.message);
      setConnectionStatus('disconnected');
      
      // If authentication failed, clear token and don't retry
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        console.error('❌ WebSocket: Authentication failed, clearing token');
        localStorage.removeItem('token');
        socketInstance.disconnect();
        return;
      }

      // Exponential backoff for reconnection
      reconnectAttempts.current += 1;
      if (reconnectAttempts.current <= maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`🔄 WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
        setConnectionStatus('reconnecting');
        
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
        reconnectTimeout.current = setTimeout(() => {
          socketInstance.connect();
        }, delay);
      } else {
        console.error('❌ WebSocket: Max reconnection attempts reached');
        setConnectionStatus('disconnected');
      }
    });

    socketInstance.on('reconnecting', (attemptNumber) => {
      console.log(`🔄 WebSocket: Reconnecting (attempt ${attemptNumber})`);
      setConnectionStatus('reconnecting');
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`✅ WebSocket: Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionStatus('connected');
      reconnectAttempts.current = 0;
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ WebSocket: Reconnection failed');
      setConnectionStatus('disconnected');
    });

    // Ping-pong heartbeat
    socketInstance.on('ping', () => {
      socketInstance.emit('pong');
    });

    setSocket(socketInstance);

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connect]);

  // Reconnect when token changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        if (e.newValue) {
          console.log('🔄 WebSocket: Token changed, reconnecting...');
          socket?.disconnect();
          connect();
        } else {
          console.log('❌ WebSocket: Token removed, disconnecting...');
          socket?.disconnect();
          setConnectionStatus('disconnected');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [socket, connect]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socket?.on(event, handler);
  }, [socket]);

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    socket?.off(event, handler);
  }, [socket]);

  const emit = useCallback((event: string, data?: any) => {
    if (!socket?.connected) {
      console.warn('⚠️ WebSocket: Cannot emit event, not connected', event);
      return;
    }
    socket.emit(event, data);
  }, [socket]);

  const contextValue: WebSocketContextType = {
    socket,
    isConnected,
    on,
    off,
    emit,
    connectionStatus,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
