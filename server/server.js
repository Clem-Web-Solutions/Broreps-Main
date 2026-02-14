import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import serviceRoutes from './routes/services.js';
import orderRoutes from './routes/orders.js';
import providerRoutes from './routes/providers.js';
import alertRoutes from './routes/alerts.js';
import allowedServicesRoutes from './routes/allowed-services.js';
import smmRoutes from './routes/smm.js';
import dripFeedRoutes from './routes/drip-feed.js';
import dripQueueRoutes from './routes/drip-queue.js';
import balanceRoutes from './routes/balances.js';
import dashboardRoutes from './routes/dashboard.js';
import trackRoutes from './routes/track.js';
import refillRoutes from './routes/refill.js';
import importRoutes from './routes/import.js';
import notificationRoutes from './routes/notifications.js';
import chatRoutes from './routes/chat.js';
import reportsRoutes from './routes/reports.js';
import { initCron } from './lib/cron.js';
import { initWebSocket } from './lib/websocket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3005;

// Initialize WebSocket
initWebSocket(httpServer);

// Initialize CRON jobs
initCron();

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/allowed-services', allowedServicesRoutes);
app.use('/api/smm', smmRoutes);
app.use('/api/drip-feed', dripFeedRoutes);
app.use('/api/drip', dripFeedRoutes); // Alias for frontend compatibility
app.use('/api/drip-queue', dripQueueRoutes);
app.use('/api/balances', balanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/refill', refillRoutes);
app.use('/api/import', importRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportsRoutes);

// Public routes (no authentication required)
app.use('/api/track', trackRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket enabled`);
});
