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
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  const connect = useCallback(() => {
    // Avoid creating multiple socket instances
    if (socketRef.current?.connected || isConnectingRef.current) {
      console.log('⚠️ WebSocket (Suivis): Already connected or connecting, skipping...');
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      console.log('🔌 WebSocket (Suivis): Disconnecting existing socket...');
      socketRef.current.disconnect();
      setSocket(null);
      socketRef.current = null;
    }

    isConnectingRef.current = true;
    setConnectionStatus('connecting');
    console.log('🔌 WebSocket (Suivis): Connecting...');

    const socketInstance = io('http://localhost:3005', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socketInstance.on('connect', () => {
      console.log('✅ WebSocket (Suivis): Connected', socketInstance.id);
      setIsConnected(true);
      setConnectionStatus('connected');
      isConnectingRef.current = false;
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ WebSocket (Suivis): Disconnected', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      isConnectingRef.current = false;
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ WebSocket (Suivis): Connection error', error.message);
      setConnectionStatus('disconnected');
      isConnectingRef.current = false;
    });

    socketInstance.on('reconnecting', (attemptNumber) => {
      console.log(`🔄 WebSocket (Suivis): Reconnecting (attempt ${attemptNumber})`);
      setConnectionStatus('reconnecting');
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`✅ WebSocket (Suivis): Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ WebSocket (Suivis): Reconnection failed');
      setConnectionStatus('disconnected');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Connect on mount
  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connect]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socket?.on(event, handler);
  }, [socket]);

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    socket?.off(event, handler);
  }, [socket]);

  const emit = useCallback((event: string, data?: any) => {
    if (!socket?.connected) {
      console.warn('⚠️ WebSocket (Suivis): Cannot emit event, not connected', event);
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
