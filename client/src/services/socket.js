import { io } from 'socket.io-client';

// Socket.IO client instance
let socket = null;

// Event listeners registry
const listeners = new Map();

/**
 * Initialize Socket.IO connection
 */
export function initializeSocket() {
  if (socket?.connected) {
    console.log('[Socket] Already connected');
    return socket;
  }

  const token = localStorage.getItem('token');
  
  // Connect to the server
  const serverUrl = import.meta.env.PROD 
    ? (import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin)
    : 'http://localhost:5000';

  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Connection events
  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
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
    console.log('[Socket] Disconnected manually');
  }
}

/**
 * Reconnect with new token (after login)
 */
export function reconnectWithToken(token) {
  if (socket) {
    socket.auth = { token };
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
  if (!socket) {
    initializeSocket();
  }

  // Track listeners for cleanup
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);

  socket.on(event, callback);

  // Return unsubscribe function
  return () => {
    socket?.off(event, callback);
    listeners.get(event)?.delete(callback);
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
