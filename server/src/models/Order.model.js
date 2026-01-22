import mongoose from 'mongoose';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_MODE, DELIVERY_CONFIG } from '../config/constants.js';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  total: {
    type: Number,
    required: true
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    unique: true
    // Note: Not required because it's auto-generated in pre('validate') hook
  },
  items: [orderItemSchema],
  address: {
    name: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    landmark: String,
    city: String,
    state: String,
    pincode: String
  },
  subtotal: {
    type: Number,
    required: true
  },
  deliveryFee: {
    type: Number,
    default: DELIVERY_CONFIG.DELIVERY_FEE
  },
  taxes: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMode: {
    type: String,
    enum: Object.values(PAYMENT_MODE),
    default: PAYMENT_MODE.COD
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING
  },
  orderStatus: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING
  },
  estimatedDelivery: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String
  }
}, {
  timestamps: true
});

// Generate order number before validation (so it passes required check if we add it back)
orderSchema.pre('validate', function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `FK${timestamp}${random}`;
  }
  next();
});

// Index for order queries
// Note: orderNumber already has unique: true which creates an index
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

// Check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  if (this.orderStatus === ORDER_STATUS.CANCELLED || 
      this.orderStatus === ORDER_STATUS.DELIVERED) {
    return false;
  }
  
  const minutesSinceOrder = (Date.now() - this.createdAt.getTime()) / (1000 * 60);
  return minutesSinceOrder <= DELIVERY_CONFIG.CANCELLATION_WINDOW_MINUTES;
};

// Calculate bill
orderSchema.statics.calculateBill = function(items) {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = subtotal >= DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CONFIG.DELIVERY_FEE;
  const taxes = Math.round(subtotal * DELIVERY_CONFIG.TAX_RATE * 100) / 100;
  const totalAmount = subtotal + deliveryFee + taxes;

  return {
    subtotal,
    deliveryFee,
    taxes,
    totalAmount
  };
};

const Order = mongoose.model('Order', orderSchema);

export default Order;
