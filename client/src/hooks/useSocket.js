import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    // Initialize socket when authenticated
    if (isAuthenticated && token && !initialized.current) {
      initializeSocket();
      initialized.current = true;

      // Subscribe to cart updates
      const unsubCart = subscribe('cart:updated', (data) => {
        console.log('[Socket] Cart updated:', data);
        dispatch(setCartFromSocket(data));
        
        // Show toast notification if update came from MCP
        if (data.source === 'server') {
          const itemCount = data.cart?.totalItems || 0;
          toast.success(`Cart updated (${itemCount} items)`, {
            icon: '🛒',
            duration: 2000,
          });
        }
      });

      // Subscribe to order updates
      const unsubOrder = subscribe('order:created', (data) => {
        console.log('[Socket] Order created:', data);
        toast.success(`New order created: ${data.order?.orderNumber}`, {
          icon: '📦',
          duration: 3000,
        });
      });

      // Subscribe to notifications
      const unsubNotification = subscribe('notification', (data) => {
        console.log('[Socket] Notification:', data);
        toast(data.message, {
          icon: data.icon || 'ℹ️',
          duration: data.duration || 4000,
        });
      });

      // Cleanup on unmount
      return () => {
        unsubCart();
        unsubOrder();
        unsubNotification();
      };
    }

    // Disconnect when logged out
    if (!isAuthenticated && initialized.current) {
      disconnectSocket();
      initialized.current = false;
    }
  }, [isAuthenticated, token, dispatch]);

  // Reconnect when token changes
  useEffect(() => {
    if (token && initialized.current) {
      reconnectWithToken(token);
    }
  }, [token]);

  return null;
}

export default useSocket;
