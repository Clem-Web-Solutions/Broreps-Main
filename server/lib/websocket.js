import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

// Initialize Socket.IO server
export function initWebSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
            credentials: true,
            methods: ['GET', 'POST']
        }
    });

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 WebSocket: User ${socket.user.id} (${socket.user.email}) connected`);

        // Join user-specific room
        socket.join(`user:${socket.user.id}`);

        // Join admin room if user is admin
        if (socket.user.role === 'admin') {
            socket.join('admins');
            console.log(`👑 Admin ${socket.user.id} joined admin room`);
        }

        socket.on('disconnect', () => {
            console.log(`🔌 WebSocket: User ${socket.user.id} disconnected`);
        });

        // Ping-pong for connection health
        socket.on('ping', () => {
            socket.emit('pong');
        });
    });

    console.log('✅ WebSocket server initialized');
    return io;
}

// Get Socket.IO instance
export function getIO() {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
}

// Emit to specific user
export function emitToUser(userId, event, data) {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, data);
    console.log(`📤 WebSocket: Emitted '${event}' to user ${userId}`);
}

// Emit to all admins
export function emitToAdmins(event, data) {
    if (!io) return;
    io.to('admins').emit(event, data);
    console.log(`📤 WebSocket: Emitted '${event}' to all admins`);
}

// Emit to all connected clients
export function emitToAll(event, data) {
    if (!io) return;
    io.emit(event, data);
    console.log(`📤 WebSocket: Emitted '${event}' to all clients`);
}

// Events:
// - notification:new - New notification created
// - notification:update - Notification marked as read
// - order:created - New order created
// - order:updated - Order status updated
// - order:completed - Order completed
// - drip:executed - Drip feed run executed
// - balance:low - Provider balance is low
// - balance:critical - Provider balance is critical

export default {
    initWebSocket,
    getIO,
    emitToUser,
    emitToAdmins,
    emitToAll
};
