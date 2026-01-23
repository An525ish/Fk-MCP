import { io } from 'socket.io-client';

// Socket.IO client instance
let socket = null;

// Pending subscriptions (for events subscribed before connection)
const pendingSubscriptions = [];

// Event listeners registry
const listeners = new Map();

/**
 * Initialize Socket.IO connection
 */
export function initializeSocket() {
  if (socket) {
    console.log('[Socket] Socket already exists, connected:', socket.connected);
    return socket;
  }

  const token = localStorage.getItem('token');
  
  // Connect to the server
  const serverUrl = import.meta.env.PROD 
    ? (import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin)
    : 'http://localhost:5000';

  console.log('[Socket] Initializing connection to:', serverUrl);

  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  // Connection events
  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
    
    // Apply any pending subscriptions
    pendingSubscriptions.forEach(({ event, callback }) => {
      console.log('[Socket] Applying pending subscription:', event);
      socket.on(event, callback);
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  // Debug: log all incoming events
  socket.onAny((event, ...args) => {
    console.log('[Socket] Received event:', event, args);
  });

  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    listeners.clear();
    pendingSubscriptions.length = 0;
    console.log('[Socket] Disconnected manually');
  }
}

/**
 * Reconnect with new token (after login)
 */
export function reconnectWithToken(newToken) {
  console.log('[Socket] Reconnecting with new token');
  if (socket) {
    socket.auth = { token: newToken };
    socket.disconnect().connect();
  } else {
    initializeSocket();
  }
}

/**
 * Subscribe to an event
 * @returns Unsubscribe function
 */
export function subscribe(event, callback) {
  console.log('[Socket] Subscribing to:', event);
  
  // Track listeners for cleanup
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);

  if (socket) {
    socket.on(event, callback);
  } else {
    // Queue subscription for when socket connects
    pendingSubscriptions.push({ event, callback });
  }

  // Return unsubscribe function
  return () => {
    console.log('[Socket] Unsubscribing from:', event);
    socket?.off(event, callback);
    listeners.get(event)?.delete(callback);
    
    // Remove from pending if exists
    const idx = pendingSubscriptions.findIndex(s => s.event === event && s.callback === callback);
    if (idx > -1) pendingSubscriptions.splice(idx, 1);
  };
}

/**
 * Emit an event
 */
export function emit(event, data) {
  if (!socket?.connected) {
    console.warn('[Socket] Not connected, cannot emit:', event);
    return;
  }
  socket.emit(event, data);
}

/**
 * Check if socket is connected
 */
export function isConnected() {
  return socket?.connected || false;
}

/**
 * Get socket instance
 */
export function getSocket() {
  return socket;
}

export default {
  initializeSocket,
  disconnectSocket,
  reconnectWithToken,
  subscribe,
  emit,
  isConnected,
  getSocket,
};
