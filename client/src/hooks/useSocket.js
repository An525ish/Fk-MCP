import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { initializeSocket, disconnectSocket, subscribe, reconnectWithToken } from '../services/socket';
import { setCartFromSocket } from '../store/slices/cartSlice';

/**
 * Hook to manage Socket.IO connection and real-time updates
 */
export function useSocket() {
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector((state) => state.auth);
  const initialized = useRef(false);
  const unsubscribers = useRef([]);

  // Cart update handler
  const handleCartUpdate = useCallback((data) => {
    console.log('[useSocket] Cart updated received:', data);
    
    if (data && data.cart) {
      dispatch(setCartFromSocket(data));
      
      // Show toast notification
      if (data.source === 'server') {
        const itemCount = data.cart?.totalItems || 0;
        toast.success(`Cart updated (${itemCount} items)`, {
          icon: '🛒',
          duration: 2000,
        });
      }
    }
  }, [dispatch]);

  // Order created handler
  const handleOrderCreated = useCallback((data) => {
    console.log('[useSocket] Order created:', data);
    toast.success(`New order created: ${data.order?.orderNumber}`, {
      icon: '📦',
      duration: 3000,
    });
  }, []);

  // Notification handler
  const handleNotification = useCallback((data) => {
    console.log('[useSocket] Notification:', data);
    toast(data.message, {
      icon: data.icon || 'ℹ️',
      duration: data.duration || 4000,
    });
  }, []);

  useEffect(() => {
    console.log('[useSocket] Effect running, isAuthenticated:', isAuthenticated, 'initialized:', initialized.current);
    
    // Initialize socket when authenticated
    if (isAuthenticated && token && !initialized.current) {
      console.log('[useSocket] Initializing socket...');
      
      // Initialize socket first
      initializeSocket();
      initialized.current = true;

      // Then subscribe to events
      console.log('[useSocket] Setting up subscriptions...');
      
      const unsubCart = subscribe('cart:updated', handleCartUpdate);
      const unsubOrder = subscribe('order:created', handleOrderCreated);
      const unsubNotification = subscribe('notification', handleNotification);
      
      unsubscribers.current = [unsubCart, unsubOrder, unsubNotification];
      
      console.log('[useSocket] Subscriptions set up');
    }

    // Disconnect when logged out
    if (!isAuthenticated && initialized.current) {
      console.log('[useSocket] Logging out, disconnecting socket...');
      
      // Cleanup subscriptions
      unsubscribers.current.forEach(unsub => unsub());
      unsubscribers.current = [];
      
      disconnectSocket();
      initialized.current = false;
    }
    
    // Cleanup on unmount
    return () => {
      if (initialized.current) {
        console.log('[useSocket] Cleanup on unmount');
        unsubscribers.current.forEach(unsub => unsub());
        unsubscribers.current = [];
      }
    };
  }, [isAuthenticated, token, handleCartUpdate, handleOrderCreated, handleNotification]);

  // Reconnect when token changes
  useEffect(() => {
    if (token && initialized.current) {
      console.log('[useSocket] Token changed, reconnecting...');
      reconnectWithToken(token);
    }
  }, [token]);

  return null;
}

export default useSocket;
