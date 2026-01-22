import axios from 'axios';

// In development with Vite proxy, use relative URL '/api'
// In production, use the full URL from env variable
const API_BASE_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  : '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/password', data)
};

// Product API
export const productAPI = {
  getCategories: () => api.get('/products/categories'),
  getProductsByCategory: (categoryId, params) => 
    api.get(`/products/category/${categoryId}`, { params }),
  searchProducts: (params) => api.get('/products/search', { params }),
  filterProducts: (params) => api.get('/products/filter', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  getAlternatives: (id) => api.get(`/products/${id}/alternatives`),
  getFeaturedProducts: (params) => api.get('/products/featured', { params }),
  getAllProducts: (params) => api.get('/products', { params })
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (productId, quantity = 1) => 
    api.post('/cart/items', { productId, quantity }),
  updateCartItem: (productId, quantity) => 
    api.put(`/cart/items/${productId}`, { quantity }),
  removeFromCart: (productId, quantity) => 
    api.delete(`/cart/items/${productId}`, { params: { quantity } }),
  clearCart: () => api.delete('/cart')
};

// Address API
export const addressAPI = {
  getAddresses: () => api.get('/addresses'),
  getAddress: (id) => api.get(`/addresses/${id}`),
  createAddress: (data) => api.post('/addresses', data),
  updateAddress: (id, data) => api.put(`/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/addresses/${id}`),
  setDefaultAddress: (id) => api.put(`/addresses/${id}/default`)
};

// Session API
export const sessionAPI = {
  getDeliveryLocation: () => api.get('/session/location'),
  setDeliveryLocation: (addressId) => 
    api.post('/session/location', { addressId }),
  checkPincode: (pincode) => api.get(`/session/check-pincode/${pincode}`)
};

// Checkout API
export const checkoutAPI = {
  proceedToCheckout: (addressId) => 
    api.post('/checkout', { addressId })
};

// Order API
export const orderAPI = {
  getOrderHistory: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  getOrderStatus: (id) => api.get(`/orders/${id}/status`),
  setPaymentMode: (id, paymentMode) => 
    api.put(`/orders/${id}/payment-mode`, { paymentMode }),
  processPayment: (id) => api.post(`/orders/${id}/pay`),
  cancelOrder: (id, reason) => 
    api.post(`/orders/${id}/cancel`, { reason }),
  reorder: (id) => api.post(`/orders/${id}/reorder`)
};

export default api;
