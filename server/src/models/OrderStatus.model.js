import mongoose from 'mongoose';
import { ORDER_STATUS } from '../config/constants.js';

const orderStatusSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  riderName: {
    type: String,
    default: null
  },
  riderPhone: {
    type: String,
    default: null
  },
  riderProximityKm: {
    type: Number,
    default: null
  },
  estimatedMinutes: {
    type: Number,
    default: null
  },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  }
}, {
  timestamps: true
});

// Index for fetching status history
orderStatusSchema.index({ orderId: 1, createdAt: -1 });

// Static method to create status update
orderStatusSchema.statics.createStatusUpdate = async function(orderId, status, details = {}) {
  const statusMessages = {
    [ORDER_STATUS.PENDING]: 'Order placed successfully',
    [ORDER_STATUS.CONFIRMED]: 'Order confirmed by store',
    [ORDER_STATUS.PREPARING]: 'Your order is being prepared',
    [ORDER_STATUS.OUT_FOR_DELIVERY]: 'Rider is on the way',
    [ORDER_STATUS.DELIVERED]: 'Order delivered successfully',
    [ORDER_STATUS.CANCELLED]: 'Order has been cancelled'
  };

  return this.create({
    orderId,
    status,
    message: details.message || statusMessages[status] || '',
    riderName: details.riderName || null,
    riderPhone: details.riderPhone || null,
    riderProximityKm: details.riderProximityKm || null,
    estimatedMinutes: details.estimatedMinutes || null,
    location: details.location || null
  });
};

// Get latest status for an order
orderStatusSchema.statics.getLatestStatus = async function(orderId) {
  return this.findOne({ orderId }).sort({ createdAt: -1 });
};

// Get full status history for an order
orderStatusSchema.statics.getStatusHistory = async function(orderId) {
  return this.find({ orderId }).sort({ createdAt: 1 });
};

const OrderStatus = mongoose.model('OrderStatus', orderStatusSchema);

export default OrderStatus;
