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
import shopifyRoutes from './routes/shopify.js';
import tagadapayRoutes from './routes/tagadapay.js';
import saasAuthRoutes from './routes/saas-auth.js';
import saasModulesRoutes from './routes/saas-modules.js';
import saasForumRoutes from './routes/saas-forum.js';
import saasHubRoutes from './routes/saas-hub.js';
import saasNotesRoutes from './routes/saas-notes.js';
import saasAiRoutes from './routes/saas-ai.js';
import saasSocialRoutes from './routes/saas-social.js';
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

// Raw body parser for Shopify webhooks (must be before express.json())
app.use('/api/shopify/webhook', express.raw({ 
  type: 'application/json',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Debug middleware - Log ALL incoming requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  // Special logging for TagadaPay webhooks
  if (req.url.includes('tagadapay')) {
    console.log('🎯 TAGADAPAY WEBHOOK REQUEST DETECTED!');
    console.log('IP:', req.ip || req.connection.remoteAddress);
    console.log('X-Forwarded-For:', req.headers['x-forwarded-for']);
  }
  
  next();
});

// Raw body parser for TagadaPay webhooks (must be before express.json())
app.use('/api/tagadapay/webhook', express.raw({ 
  type: 'application/json',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
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
app.use('/api/shopify', shopifyRoutes);
app.use('/api/tagadapay', tagadapayRoutes);

// SaaS routes
app.use('/api/saas/auth', saasAuthRoutes);
app.use('/api/saas/modules', saasModulesRoutes);
app.use('/api/saas/forum', saasForumRoutes);
app.use('/api/saas/hub', saasHubRoutes);
app.use('/api/saas/notes', saasNotesRoutes);
app.use('/api/saas/ai', saasAiRoutes);
app.use('/api/saas/social', saasSocialRoutes);

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
