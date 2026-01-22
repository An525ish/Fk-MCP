import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import store from './store';
import router from './router';
import './index.css';

// Initialize app data
import { fetchCategories } from './store/slices/productSlice';
import { fetchCart } from './store/slices/cartSlice';
import { fetchActiveAddress } from './store/slices/addressSlice';

// Fetch initial data
store.dispatch(fetchCategories());

// Check if user is authenticated and fetch their data
const state = store.getState();
if (state.auth.isAuthenticated) {
  store.dispatch(fetchCart());
  store.dispatch(fetchActiveAddress());
}

// Subscribe to auth changes to fetch user data on login
let previousAuthState = state.auth.isAuthenticated;
store.subscribe(() => {
  const currentState = store.getState();
  const currentAuthState = currentState.auth.isAuthenticated;
  
  if (currentAuthState && !previousAuthState) {
    // User just logged in
    store.dispatch(fetchCart());
    store.dispatch(fetchActiveAddress());
  }
  
  previousAuthState = currentAuthState;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
      <Toaster 
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </Provider>
  </StrictMode>
);
