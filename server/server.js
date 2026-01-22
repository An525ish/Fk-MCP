import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Route imports
import authRoutes from './src/routes/auth.routes.js';
import productRoutes from './src/routes/product.routes.js';
import cartRoutes from './src/routes/cart.routes.js';
import orderRoutes from './src/routes/order.routes.js';
import addressRoutes from './src/routes/address.routes.js';
import sessionRoutes from './src/routes/session.routes.js';
import checkoutRoutes from './src/routes/checkout.routes.js';
import mcpAuthRoutes from './src/routes/mcp-auth.routes.js';
import preferencesRoutes from './src/routes/preferences.routes.js';
import scheduledRoutes from './src/routes/scheduled.routes.js';

// Middleware imports
import { errorHandler } from './src/middleware/error.middleware.js';

// Job imports
import { startScheduler } from './src/jobs/scheduler.js';

// Socket imports
import { initializeSocket } from './src/socket/index.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/mcp-auth', mcpAuthRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/scheduled-orders', scheduledRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Flipkart Minutes API is running' });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Initialize Socket.IO
    initializeSocket(httpServer);
    
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
      console.log(`WebSocket available at ws://localhost:${PORT}`);
      
      // Start the scheduled order processor
      startScheduler();
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
