// Order statuses
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// Payment statuses
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Payment modes
export const PAYMENT_MODE = {
  COD: 'cod',
  UPI: 'upi'
};

// Address types
export const ADDRESS_TYPE = {
  HOME: 'home',
  WORK: 'work',
  OTHER: 'other'
};

// Dietary preferences
export const DIETARY_PREFERENCE = {
  VEG: 'veg',
  NON_VEG: 'non_veg',
  VEGAN: 'vegan'
};

// Delivery fee configuration
export const DELIVERY_CONFIG = {
  FREE_DELIVERY_THRESHOLD: 199,
  DELIVERY_FEE: 25,
  TAX_RATE: 0.05, // 5% GST
  CANCELLATION_WINDOW_MINUTES: 5
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};
