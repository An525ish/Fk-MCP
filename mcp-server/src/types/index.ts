// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

// Product Types
export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  mrp: number;
  unit: string;
  image: string;
  brand: string;
  stock: number;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  dietaryPreference: 'veg' | 'non_veg' | 'vegan';
  tags: string[];
  estimatedDeliveryMins: number;
  weightGrams?: number;
  volumeMl?: number;
  variantGroup?: string;
  categoryId?: {
    _id: string;
    name: string;
    slug: string;
  };
  discountPercent?: number;
  weightedScore?: number;
  quantityMatch?: {
    requested: number;
    actual: number;
    unit: string;
    matchPercent: number;
  };
}

export interface SearchResponse {
  query: string;
  cleanQuery: string;
  parsedQuantity: {
    value: number;
    unit: string;
    original: string;
  } | null;
  products: Product[];
  variants: Record<string, ProductVariant[]> | null;
  hasAmbiguity: boolean;
  ambiguityMessage: string | null;
  resultCount: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  unit: string;
  weightGrams?: number;
  volumeMl?: number;
}

export interface AlternativesResponse {
  originalProduct: {
    id: string;
    name: string;
    price: number;
  };
  alternatives: Product[];
}

// Cart Types
export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image: string;
  unit: string;
}

export interface BillDetails {
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  totalAmount: number;
  freeDeliveryThreshold: number;
  amountToFreeDelivery: number;
}

export interface CartResponse {
  cart: {
    items: CartItem[];
    totalItems: number;
  };
  bill: BillDetails;
}

export interface BulkAddResponse {
  successItems: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    unit: string;
  }>;
  failedItems: Array<{
    productId: string;
    name?: string;
    reason: string;
    availableStock?: number;
    alternatives?: Product[];
  }>;
  cart: {
    items: CartItem[];
    totalItems: number;
  };
  bill: BillDetails;
}

export interface PriceChange {
  productId: string;
  name: string;
  issue?: string;
  cartPrice?: number;
  currentPrice?: number | null;
  priceDifference?: number;
  changePercent?: number | null;
  isIncrease?: boolean;
  requiresConfirmation: boolean;
  requestedQuantity?: number;
  availableStock?: number;
}

export interface PriceCheckResponse {
  hasChanges: boolean;
  hasSignificantChange: boolean;
  priceChanges: PriceChange[];
  message: string;
}

// Address Types
export interface Address {
  _id: string;
  userId: string;
  type: 'home' | 'work' | 'other';
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  isServiceable: boolean;
  codLimit: number;
}

export interface LocationValidationResponse {
  addressId: string;
  isServiceable: boolean;
  available: boolean;
  message: string;
  address: {
    type?: string;
    name?: string;
    addressLine1?: string;
    city: string;
    pincode: string;
    state?: string;
  };
  codLimit: number;
  codAvailable: boolean;
  estimatedDeliveryMins?: number;
}

export interface CodEligibilityResponse {
  eligible: boolean;
  reason: string;
  cartTotal: number;
  codLimit: number;
  exceedsBy?: number;
  address?: {
    city: string;
    pincode: string;
  };
  suggestUPI?: boolean;
}

// Order Types
export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  unit: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  address: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
  };
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  totalAmount: number;
  paymentMode: 'cod' | 'upi';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  estimatedDelivery: string;
}

export interface CreateOrderResponse {
  order: Order;
}

export interface PaymentResponse {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  orderStatus: string;
  paymentMode?: string;
  upiLink?: string;
  qrData?: {
    upiId: string;
    amount: number;
    merchantName: string;
    transactionNote: string;
    orderId: string;
  };
}

// ============================================
// User Preferences Types (All Derived from Order History)
// ============================================

/**
 * User Preferences - ALL derived from order history
 * No separate preferences table - everything computed on-the-fly
 */
export interface UserPreferences {
  hasOrderHistory: boolean;
  frequentItems: FrequentItem[];
  shoppingPatterns: ShoppingPatterns | null;
  preferredPaymentMethod: 'cod' | 'upi' | null;
  preferredBrands: Array<{ brand: string; orderCount: number }>;
  inferredDietaryPreference: {
    type: 'veg' | 'non_veg' | 'mixed';
    confidence: number | null;
  } | null;
  typicalOrderSize: number | null;
  totalOrders: number;
  // Guidance for MCP on what to ask
  shouldAsk: {
    dietaryPreference: boolean;
    servings: boolean;
  };
}

export interface ShoppingPatterns {
  preferredOrderDays: string[];
  preferredOrderTime: string;
  averageOrderValue: number;
  averageOrderFrequencyDays: number | null;
  totalOrders: number;
}

export interface PreferencesResponse {
  preferences: UserPreferences;
}

export interface FrequentItem {
  productId: string;
  name: string;
  price: number;
  unit: string;
  image: string;
  brand: string;
  dietaryType?: string;
  isAvailable: boolean;
  orderCount: number;
  avgQuantity: number;
  lastOrdered: string;
}

export interface FrequentItemsResponse {
  frequentItems: FrequentItem[];
  totalOrders: number;
}

export interface ShoppingPatternsResponse {
  patterns: ShoppingPatterns | null;
  preferredPaymentMethod: string | null;
  preferredBrands: Array<{ brand: string; orderCount: number }>;
  inferredDietaryPreference: {
    type: 'veg' | 'non_veg' | 'mixed';
    confidence: number | null;
  } | null;
  typicalOrderSize: number | null;
}

// ============================================
// Scheduled Order Types
// ============================================

export interface ScheduledOrder {
  _id: string;
  userId: string;
  scheduledTime: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';
  cartSnapshot: {
    items: CartItem[];
    totalItems: number;
  };
  billSnapshot: BillDetails;
  addressId: string;
  paymentType: 'COD' | 'DIGITAL';
  notes?: string;
  createdAt: string;
  executedAt?: string;
  resultOrderId?: string;
  failureReason?: string;
}

export interface ScheduledOrdersResponse {
  scheduledOrders: ScheduledOrder[];
}

// ============================================
// Recipe Types
// ============================================

export interface RecipeIngredient {
  searchQuery: string;
  baseQuantity: number;
  unit: string;
  optional: boolean;
  substitutes?: string[];
  category?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  servings: number;
  dietaryType: 'veg' | 'non_veg' | 'vegan';
  ingredients: RecipeIngredient[];
  prepTime: number;
  cookTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  cuisine: string;
}

export interface RecipeCartItem {
  productId: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  ingredientFor: string;
  isSubstitute: boolean;
  isOptional: boolean;
  isAvailable: boolean;
}

export interface RecipeToCartResponse {
  recipe: {
    id: string;
    name: string;
    servings: number;
    scaledServings: number;
  };
  items: RecipeCartItem[];
  unavailableItems: Array<{
    ingredient: string;
    reason: string;
    substitutes?: RecipeCartItem[];
  }>;
  estimatedTotal: number;
  estimatedDeliveryMins: number;
}

// ============================================
// Intent Understanding Types
// ============================================

export interface ParsedIntent {
  type: 'recipe' | 'reorder' | 'browse' | 'schedule' | 'quick_add' | 'unknown';
  confidence: number;
  entities: {
    recipe?: string;
    servings?: number;
    dietaryPreference?: 'veg' | 'non_veg' | 'vegan';
    scheduledTime?: string;
    items?: string[];
  };
  clarificationsNeeded: Array<{
    field: string;
    question: string;
    options?: string[];
  }>;
  suggestedAction?: string;
}

// ============================================
// Smart Suggestions Types
// ============================================

export interface SmartSuggestion {
  type: 'complementary' | 'reorder' | 'budget' | 'time_based' | 'weather' | 'occasion';
  title: string;
  message: string;
  products?: Array<{
    productId: string;
    name: string;
    price: number;
    unit: string;
    reason: string;
  }>;
  action?: {
    type: 'add_to_cart' | 'view_recipe' | 'reorder';
    data: unknown;
  };
}

export interface SmartSuggestionsResponse {
  suggestions: SmartSuggestion[];
  context: {
    timeOfDay: string;
    cartValue: number;
    freeDeliveryGap: number;
  };
}

// ============================================
// Order History Analysis Types
// ============================================

export interface OrderHistoryAnalysis {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  mostOrderedItems: Array<{
    productId: string;
    name: string;
    totalQuantity: number;
    orderCount: number;
  }>;
  orderFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  preferredCategories: Array<{
    category: string;
    orderCount: number;
    percentage: number;
  }>;
  recentOrders: Array<{
    orderId: string;
    orderNumber: string;
    date: string;
    totalAmount: number;
    itemCount: number;
    status: string;
  }>;
}

// ============================================
// Tool Parameter Types
// ============================================

export interface LoginUserParams {
  email: string;
  password: string;
}

export interface SearchCatalogParams {
  query: string;
  qty_hint?: string;
}

export interface AddToCartParams {
  product_id: string;
  qty: number;
}

export interface ValidateLocationParams {
  address_id: string;
}

export interface ExecuteOrderParams {
  payment_type: 'COD' | 'DIGITAL';
  address_id: string;
}

// No UpdatePreferencesParams needed - preferences are derived from orders

export interface RecipeToCartParams {
  recipe_id?: string;
  recipe_name?: string;
  servings?: number;
  dietary_preference?: 'veg' | 'non_veg' | 'vegan';
}

export interface UnderstandIntentParams {
  message: string;
  context?: {
    previous_intent?: string;
    cart_items?: number;
  };
}

export interface ScheduleOrderParams {
  scheduled_time: string;
  address_id: string;
  payment_type: 'COD' | 'DIGITAL';
  notes?: string;
}

export interface ReorderParams {
  order_id: string;
}

// ============================================
// Tool Response Types
// ============================================

export interface ToolResponse {
  success: boolean;
  message: string;
  data?: unknown;
  requiresUserAction?: boolean;
  actionType?: 'select_variant' | 'confirm_price_change' | 'select_alternative' | 'confirm_payment' | 'clarify_intent' | 'select_recipe' | 'confirm_schedule';
  options?: unknown[];
  clarifications?: Array<{
    field: string;
    question: string;
    options?: string[];
  }>;
}
