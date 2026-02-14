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
  const [tokenChangeCounter, setTokenChangeCounter] = useState(0);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectTimeout = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  const connect = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      // Silent: user is not authenticated yet, WebSocket will connect after login
      setConnectionStatus('disconnected');
      return;
    }

    // Avoid creating multiple socket instances
    if (socketRef.current?.connected || isConnectingRef.current) {
      console.log('⚠️ WebSocket: Already connected or connecting, skipping...');
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      console.log('🔌 WebSocket: Disconnecting existing socket...');
      socketRef.current.disconnect();
      setSocket(null);
      socketRef.current = null;
    }

    isConnectingRef.current = true;
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
      isConnectingRef.current = false;
      reconnectAttempts.current = 0;
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ WebSocket: Disconnected', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      isConnectingRef.current = false;
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ WebSocket: Connection error', error.message);
      setConnectionStatus('disconnected');
      isConnectingRef.current = false;
      
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

  // Connect on mount and when token changes
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      // Only connect if not already connected/connecting
      if (!socketRef.current?.connected && !isConnectingRef.current) {
        const cleanup = connect();
        return () => {
          if (cleanup) cleanup();
        };
      }
    } else {
      // No token, disconnect if connected
      if (socketRef.current) {
        socketRef.current.disconnect();
        setSocket(null);
        socketRef.current = null;
        setConnectionStatus('disconnected');
      }
    }
  }, [connect, tokenChangeCounter]);

  // Listen for custom auth events (same-tab login/logout)
  useEffect(() => {
    const handleAuthChange = () => {
      console.log('🔄 WebSocket: Auth changed, triggering reconnect check...');
      setTokenChangeCounter(prev => prev + 1);
    };

    window.addEventListener('auth:login', handleAuthChange);
    window.addEventListener('auth:logout', handleAuthChange);

    return () => {
      window.removeEventListener('auth:login', handleAuthChange);
      window.removeEventListener('auth:logout', handleAuthChange);
    };
  }, []);

  // Listen for storage events (cross-tab login/logout)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        console.log('🔄 WebSocket: Storage event detected');
        setTokenChangeCounter(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
