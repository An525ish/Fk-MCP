import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

// Map of userId -> Set of socket IDs (user can have multiple tabs/devices)
const userSockets = new Map();

/**
 * Initialize Socket.IO server
 */
export function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      // Allow connection without auth (for public updates)
      socket.userId = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      // Invalid token - still allow connection but without user context
      socket.userId = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}, userId: ${socket.userId || 'anonymous'}`);

    // Track user's socket connections
    if (socket.userId) {
      if (!userSockets.has(socket.userId)) {
        userSockets.set(socket.userId, new Set());
      }
      userSockets.get(socket.userId).add(socket.id);
      
      // Join user-specific room for targeted updates
      socket.join(`user:${socket.userId}`);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      
      if (socket.userId) {
        const sockets = userSockets.get(socket.userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(socket.userId);
          }
        }
      }
    });

    // Client can request current state
    socket.on('request:cart', async () => {
      if (socket.userId) {
        // Emit current cart state - client should fetch via API
        socket.emit('cart:refresh');
      }
    });
  });

  console.log('[Socket] Socket.IO initialized');
  return io;
}

/**
 * Get the Socket.IO instance
 */
export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

/**
 * Emit event to a specific user (all their connected devices)
 */
export function emitToUser(userId, event, data) {
  if (!io) return;
  
  const userIdStr = userId.toString();
  io.to(`user:${userIdStr}`).emit(event, data);
  
  console.log(`[Socket] Emitted ${event} to user ${userIdStr}`);
}

/**
 * Emit cart update to user
 */
export function emitCartUpdate(userId, cartData) {
  emitToUser(userId, 'cart:updated', {
    cart: cartData.cart,
    bill: cartData.bill,
    source: 'server', // Indicates this came from server (MCP or API)
    timestamp: new Date().toISOString()
  });
}

/**
 * Emit order update to user
 */
export function emitOrderUpdate(userId, orderData) {
  emitToUser(userId, 'order:updated', {
    order: orderData,
    timestamp: new Date().toISOString()
  });
}

/**
 * Emit new order created
 */
export function emitOrderCreated(userId, orderData) {
  emitToUser(userId, 'order:created', {
    order: orderData,
    timestamp: new Date().toISOString()
  });
}

/**
 * Emit notification to user
 */
export function emitNotification(userId, notification) {
  emitToUser(userId, 'notification', {
    ...notification,
    timestamp: new Date().toISOString()
  });
}

/**
 * Check if user is online
 */
export function isUserOnline(userId) {
  return userSockets.has(userId.toString());
}

/**
 * Get count of connected users
 */
export function getConnectedUsersCount() {
  return userSockets.size;
}

export default {
  initializeSocket,
  getIO,
  emitToUser,
  emitCartUpdate,
  emitOrderUpdate,
  emitOrderCreated,
  emitNotification,
  isUserOnline,
  getConnectedUsersCount
};
