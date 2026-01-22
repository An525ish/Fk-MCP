/**
 * Flipkart Minutes API Client
 * Handles all HTTP communication with the backend API
 * Manages session tokens and provides typed API methods
 * Supports persistent authentication across sessions
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../utils/logger.js';
import { saveAuth, loadAuth, clearAuth } from '../utils/tokenStorage.js';
import type {
  ApiResponse,
  LoginResponse,
  SearchResponse,
  CartResponse,
  BulkAddResponse,
  PriceCheckResponse,
  AlternativesResponse,
  LocationValidationResponse,
  CodEligibilityResponse,
  CreateOrderResponse,
  PaymentResponse,
  Address,
  Product,
  UserPreferences,
  PreferencesResponse,
  FrequentItemsResponse,
  ShoppingPatternsResponse,
  ScheduledOrder,
  ScheduledOrdersResponse,
  OrderHistoryAnalysis,
} from '../types/index.js';

export class FlipkartAPIClient {
  private client: AxiosInstance;
  private sessionToken: string | null = null;
  private activeAddressId: string | null = null;
  private currentUser: { id: string; name: string; email: string } | null = null;
  private initialized: boolean = false;

  constructor(baseUrl?: string) {
    const apiUrl = baseUrl || process.env.FLIPKART_API_URL || 'http://localhost:5000';
    
    this.client = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging and auth
    this.client.interceptors.request.use((config) => {
      if (this.sessionToken) {
        config.headers.Authorization = `Bearer ${this.sessionToken}`;
      }
      logger.apiRequest(config.method?.toUpperCase() || 'GET', config.url || '', config.data);
      return config;
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.apiResponse(
          response.config.method?.toUpperCase() || 'GET',
          response.config.url || '',
          response.status,
          response.data
        );
        return response;
      },
      (error: AxiosError) => {
        const url = error.config?.url || '';
        const method = error.config?.method?.toUpperCase() || 'GET';
        const responseData = error.response?.data;
        logger.apiError(method, url, error.message);
        if (responseData) {
          logger.error(`Response data: ${JSON.stringify(responseData)}`);
        }
        throw error;
      }
    );

    // Auto-load persisted auth on startup
    this.initializeFromStorage();
  }

  /**
   * Initialize client from persisted storage
   * Called automatically on construction
   */
  private initializeFromStorage(): void {
    if (this.initialized) return;
    
    try {
      const storedAuth = loadAuth();
      if (storedAuth) {
        this.sessionToken = storedAuth.token;
        this.currentUser = storedAuth.user;
        logger.info(`Restored session for ${storedAuth.user.email} from storage`);
      }
    } catch (error) {
      logger.warn('Failed to restore session from storage', error instanceof Error ? error.message : String(error));
    }
    
    this.initialized = true;
  }

  /**
   * Get current authenticated user info (from memory)
   */
  getCurrentUser(): { id: string; name: string; email: string } | null {
    return this.currentUser;
  }

  /**
   * Persist current auth to storage
   */
  private persistAuth(user: { id: string; name: string; email: string }): void {
    if (this.sessionToken) {
      try {
        saveAuth(this.sessionToken, user);
        this.currentUser = user;
      } catch (error) {
        logger.warn('Failed to persist auth', error instanceof Error ? error.message : String(error));
      }
    }
  }

  /**
   * Clear persisted auth (logout)
   */
  logout(): void {
    this.sessionToken = null;
    this.currentUser = null;
    this.activeAddressId = null;
    clearAuth();
    logger.info('Logged out and cleared persisted auth');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.sessionToken !== null;
  }

  /**
   * Get current session token
   */
  getSessionToken(): string | null {
    return this.sessionToken;
  }

  /**
   * Set session token directly (for token-based auth)
   * This allows using a token from the browser app without sharing password
   * Optionally persist with user info
   */
  setSessionToken(token: string | null, user?: { id: string; name: string; email: string }): void {
    this.sessionToken = token;
    
    if (token && user) {
      this.persistAuth(user);
    } else if (!token) {
      // If clearing token, also clear persisted auth
      this.currentUser = null;
    }
  }

  /**
   * Get active address ID
   */
  getActiveAddressId(): string | null {
    return this.activeAddressId;
  }

  /**
   * Set active address ID
   */
  setActiveAddressId(addressId: string) {
    this.activeAddressId = addressId;
  }

  // ============================================
  // Auth APIs
  // ============================================

  /**
   * Login user and store session token
   * Also persists auth for future sessions
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post<ApiResponse<LoginResponse>>('/api/auth/login', {
      email,
      password,
    });

    if (response.data.success && response.data.data.token) {
      this.sessionToken = response.data.data.token;
      
      // Persist auth for future sessions
      const user = response.data.data.user;
      this.persistAuth({
        id: user.id,
        name: user.name,
        email: user.email,
      });
    }

    return response.data.data;
  }

  /**
   * Get current user info
   */
  async getMe(): Promise<{ user: { id: string; email: string; name: string; phone?: string; activeAddressId?: string } }> {
    const response = await this.client.get<ApiResponse<{ user: { id: string; email: string; name: string; phone?: string; activeAddressId?: string } }>>('/api/auth/me');
    
    if (response.data.data.user.activeAddressId) {
      this.activeAddressId = response.data.data.user.activeAddressId;
    }
    
    return response.data.data;
  }

  // ============================================
  // Product APIs
  // ============================================

  /**
   * Smart search with weighted scoring and variant detection
   */
  async smartSearch(query: string): Promise<SearchResponse> {
    const response = await this.client.get<ApiResponse<SearchResponse>>('/api/products/smart-search', {
      params: { q: query },
    });
    return response.data.data;
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string): Promise<{ product: Product }> {
    const response = await this.client.get<ApiResponse<{ product: Product }>>(`/api/products/${productId}`);
    return response.data.data;
  }

  /**
   * Get alternative products for out-of-stock item
   */
  async getAlternatives(productId: string): Promise<AlternativesResponse> {
    const response = await this.client.get<ApiResponse<AlternativesResponse>>(`/api/products/${productId}/alternatives`);
    return response.data.data;
  }

  /**
   * Get product variants by group
   */
  async getProductVariants(variantGroup: string): Promise<{ variantGroup: string; variants: Product[]; priceRange: { min: number; max: number } }> {
    const response = await this.client.get<ApiResponse<{ variantGroup: string; variants: Product[]; priceRange: { min: number; max: number } }>>(`/api/products/variants/${variantGroup}`);
    return response.data.data;
  }

  // ============================================
  // Cart APIs
  // ============================================

  /**
   * Get current cart
   */
  async getCart(): Promise<CartResponse> {
    const response = await this.client.get<ApiResponse<CartResponse>>('/api/cart');
    return response.data.data;
  }

  /**
   * Add single item to cart
   */
  async addToCart(productId: string, quantity: number): Promise<CartResponse> {
    const response = await this.client.post<ApiResponse<CartResponse>>('/api/cart/items', {
      productId,
      quantity,
    });
    return response.data.data;
  }

  /**
   * Bulk add items to cart (for recipe-to-cart flow)
   */
  async bulkAddToCart(items: Array<{ productId: string; quantity: number }>): Promise<BulkAddResponse> {
    const response = await this.client.post<ApiResponse<BulkAddResponse>>('/api/cart/bulk', {
      items,
    });
    return response.data.data;
  }

  /**
   * Check for price changes in cart
   */
  async priceCheck(): Promise<PriceCheckResponse> {
    const response = await this.client.get<ApiResponse<PriceCheckResponse>>('/api/cart/price-check');
    return response.data.data;
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(productId: string, quantity: number): Promise<CartResponse> {
    const response = await this.client.put<ApiResponse<CartResponse>>(`/api/cart/items/${productId}`, {
      quantity,
    });
    return response.data.data;
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(productId: string): Promise<CartResponse> {
    const response = await this.client.delete<ApiResponse<CartResponse>>(`/api/cart/items/${productId}`);
    return response.data.data;
  }

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<CartResponse> {
    const response = await this.client.delete<ApiResponse<CartResponse>>('/api/cart');
    return response.data.data;
  }

  // ============================================
  // Address APIs
  // ============================================

  /**
   * Get all user addresses
   */
  async getAddresses(): Promise<{ addresses: Address[] }> {
    const response = await this.client.get<ApiResponse<{ addresses: Address[] }>>('/api/addresses');
    return response.data.data;
  }

  /**
   * Get single address
   */
  async getAddress(addressId: string): Promise<{ address: Address }> {
    const response = await this.client.get<ApiResponse<{ address: Address }>>(`/api/addresses/${addressId}`);
    return response.data.data;
  }

  // ============================================
  // Session/Location APIs
  // ============================================

  /**
   * Validate location for serviceability
   */
  async validateLocation(addressId: string): Promise<LocationValidationResponse> {
    const response = await this.client.post<ApiResponse<LocationValidationResponse>>('/api/session/validate-location', {
      addressId,
    });
    
    if (response.data.data.isServiceable) {
      this.activeAddressId = addressId;
    }
    
    return response.data.data;
  }

  /**
   * Set delivery location
   */
  async setDeliveryLocation(addressId: string): Promise<{ activeAddress: { id: string; type: string; name: string; addressLine1: string; addressLine2?: string; city: string; pincode: string } }> {
    const response = await this.client.post<ApiResponse<{ activeAddress: { id: string; type: string; name: string; addressLine1: string; addressLine2?: string; city: string; pincode: string } }>>('/api/session/location', {
      addressId,
    });
    
    this.activeAddressId = addressId;
    return response.data.data;
  }

  /**
   * Check pincode serviceability
   */
  async checkPincode(pincode: string): Promise<{ pincode: string; isServiceable: boolean; message: string; estimatedDeliveryMins: number | null }> {
    const response = await this.client.get<ApiResponse<{ pincode: string; isServiceable: boolean; message: string; estimatedDeliveryMins: number | null }>>(`/api/session/check-pincode/${pincode}`);
    return response.data.data;
  }

  // ============================================
  // Checkout APIs
  // ============================================

  /**
   * Check COD eligibility
   */
  async checkCodEligibility(addressId?: string): Promise<CodEligibilityResponse> {
    const params = addressId ? { addressId } : {};
    const response = await this.client.get<ApiResponse<CodEligibilityResponse>>('/api/checkout/cod-eligibility', { params });
    return response.data.data;
  }

  /**
   * Create order (proceed to checkout)
   */
  async createOrder(addressId: string): Promise<CreateOrderResponse> {
    const response = await this.client.post<ApiResponse<CreateOrderResponse>>('/api/checkout', {
      addressId,
    });
    return response.data.data;
  }

  // ============================================
  // Order APIs
  // ============================================

  /**
   * Set payment mode for order
   */
  async setPaymentMode(orderId: string, paymentMode: 'cod' | 'upi'): Promise<{ orderId: string; orderNumber: string; paymentMode: string; totalAmount: number }> {
    const response = await this.client.put<ApiResponse<{ orderId: string; orderNumber: string; paymentMode: string; totalAmount: number }>>(`/api/orders/${orderId}/payment-mode`, {
      paymentMode,
    });
    return response.data.data;
  }

  /**
   * Process payment
   */
  async processPayment(orderId: string): Promise<PaymentResponse> {
    const response = await this.client.post<ApiResponse<PaymentResponse>>(`/api/orders/${orderId}/pay`);
    return response.data.data;
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<{ order: { _id: string; orderNumber: string; orderStatus: string; paymentStatus: string; totalAmount: number } }> {
    const response = await this.client.get<ApiResponse<{ order: { _id: string; orderNumber: string; orderStatus: string; paymentStatus: string; totalAmount: number } }>>(`/api/orders/${orderId}`);
    return response.data.data;
  }

  /**
   * Get order history
   */
  async getOrderHistory(): Promise<{ orders: Array<{ _id: string; orderNumber: string; orderStatus: string; totalAmount: number; createdAt: string }> }> {
    const response = await this.client.get<ApiResponse<{ orders: Array<{ _id: string; orderNumber: string; orderStatus: string; totalAmount: number; createdAt: string }> }>>('/api/orders');
    return response.data.data;
  }

  // ============================================
  // MCP OAuth APIs
  // ============================================

  /**
   * Request MCP authorization (starts browser flow)
   */
  async requestMcpAuth(): Promise<{ code: string; authUrl: string; expiresIn: number; message: string }> {
    const response = await this.client.post<ApiResponse<{ code: string; authUrl: string; expiresIn: number; message: string }>>('/api/mcp-auth/request');
    return response.data.data;
  }

  /**
   * Check MCP auth status (poll for completion)
   */
  async checkAuthStatus(code: string): Promise<{ status: 'pending' | 'approved' | 'denied'; token?: string; user?: { id: string; name: string; email: string }; message?: string }> {
    const response = await this.client.get<ApiResponse<{ status: 'pending' | 'approved' | 'denied'; token?: string; user?: { id: string; name: string; email: string }; message?: string }>>(`/api/mcp-auth/status/${code}`);
    return response.data.data;
  }

  // ============================================
  // User Preferences APIs (all derived from order history)
  // ============================================

  /**
   * Get user preferences (derived from order history)
   */
  async getPreferences(): Promise<PreferencesResponse> {
    const response = await this.client.get<ApiResponse<PreferencesResponse>>('/api/preferences');
    return response.data.data;
  }

  /**
   * Get frequent items (derived from order history)
   */
  async getFrequentItems(limit?: number): Promise<FrequentItemsResponse> {
    const params = limit ? { limit } : {};
    const response = await this.client.get<ApiResponse<FrequentItemsResponse>>('/api/preferences/frequent-items', { params });
    return response.data.data;
  }

  /**
   * Get shopping patterns (derived from order history)
   */
  async getShoppingPatterns(): Promise<ShoppingPatternsResponse> {
    const response = await this.client.get<ApiResponse<ShoppingPatternsResponse>>('/api/preferences/patterns');
    return response.data.data;
  }

  // ============================================
  // Scheduled Orders APIs
  // ============================================

  /**
   * Create a scheduled order
   */
  async createScheduledOrder(data: {
    scheduledTime: string;
    addressId: string;
    paymentType: 'COD' | 'DIGITAL';
    notes?: string;
  }): Promise<{ scheduledOrder: ScheduledOrder }> {
    const response = await this.client.post<ApiResponse<{ scheduledOrder: ScheduledOrder }>>('/api/scheduled-orders', data);
    return response.data.data;
  }

  /**
   * Get all scheduled orders
   */
  async getScheduledOrders(): Promise<ScheduledOrdersResponse> {
    const response = await this.client.get<ApiResponse<ScheduledOrdersResponse>>('/api/scheduled-orders');
    return response.data.data;
  }

  /**
   * Cancel a scheduled order
   */
  async cancelScheduledOrder(orderId: string): Promise<{ message: string }> {
    const response = await this.client.delete<ApiResponse<{ message: string }>>(`/api/scheduled-orders/${orderId}`);
    return response.data.data;
  }

  /**
   * Manually execute a scheduled order
   */
  async executeScheduledOrder(orderId: string): Promise<{ order: { orderId: string; orderNumber: string } }> {
    const response = await this.client.post<ApiResponse<{ order: { orderId: string; orderNumber: string } }>>(`/api/scheduled-orders/${orderId}/execute`);
    return response.data.data;
  }

  // ============================================
  // Order History & Reorder APIs
  // ============================================

  /**
   * Get order history analysis
   */
  async getOrderAnalysis(): Promise<{ analysis: OrderHistoryAnalysis }> {
    const response = await this.client.get<ApiResponse<{ analysis: OrderHistoryAnalysis }>>('/api/orders/analysis');
    return response.data.data;
  }

  /**
   * Reorder from a previous order
   */
  async reorderFromPrevious(orderId: string): Promise<CartResponse> {
    const response = await this.client.post<ApiResponse<CartResponse>>(`/api/orders/reorder/${orderId}`);
    return response.data.data;
  }
}

// Export singleton instance
export const apiClient = new FlipkartAPIClient();
