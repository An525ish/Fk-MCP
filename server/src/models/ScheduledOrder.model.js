import mongoose from 'mongoose';
import { PAYMENT_MODE } from '../config/constants.js';

/**
 * Scheduled Order Model
 * Stores orders that are scheduled for future execution
 */
const scheduledOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // When the order should be executed
  scheduledTime: {
    type: Date,
    required: [true, 'Scheduled time is required'],
    index: true
  },
  
  // Status of the scheduled order
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled', 'failed'],
    default: 'pending',
    index: true
  },
  
  // Snapshot of cart at time of scheduling
  cartSnapshot: {
    items: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      name: { type: String, required: true },
      image: { type: String },
      unit: { type: String },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true, min: 1 }
    }],
    totalItems: { type: Number, default: 0 }
  },
  
  // Snapshot of bill at time of scheduling
  billSnapshot: {
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    freeDeliveryThreshold: { type: Number },
    amountToFreeDelivery: { type: Number }
  },
  
  // Delivery address
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: [true, 'Delivery address is required']
  },
  
  // Payment type
  paymentType: {
    type: String,
    enum: ['COD', 'DIGITAL'],
    required: [true, 'Payment type is required']
  },
  
  // Optional notes
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Execution details
  executedAt: {
    type: Date
  },
  
  // Result order ID if successfully executed
  resultOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  // Failure reason if execution failed
  failureReason: {
    type: String
  },
  
  // Retry count
  retryCount: {
    type: Number,
    default: 0
  },
  
  // Last retry time
  lastRetryAt: {
    type: Date
  },
  
  // Reminder sent flag
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for finding pending orders to execute
scheduledOrderSchema.index({ status: 1, scheduledTime: 1 });

// Index for user's scheduled orders
scheduledOrderSchema.index({ userId: 1, status: 1, scheduledTime: -1 });

/**
 * Get all pending scheduled orders that are due for execution
 */
scheduledOrderSchema.statics.getDueOrders = function(bufferMinutes = 5) {
  const now = new Date();
  const bufferTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);
  
  return this.find({
    status: 'pending',
    scheduledTime: { $lte: bufferTime }
  }).populate('userId', 'email name')
    .populate('addressId')
    .sort({ scheduledTime: 1 });
};

/**
 * Get orders that need reminder (30 mins before scheduled time)
 */
scheduledOrderSchema.statics.getOrdersNeedingReminder = function() {
  const now = new Date();
  const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000);
  const fifteenMinsFromNow = new Date(now.getTime() + 15 * 60 * 1000);
  
  return this.find({
    status: 'pending',
    reminderSent: false,
    scheduledTime: { 
      $gte: fifteenMinsFromNow,
      $lte: thirtyMinsFromNow 
    }
  }).populate('userId', 'email name');
};

/**
 * Mark order as processing
 */
scheduledOrderSchema.methods.markProcessing = function() {
  this.status = 'processing';
  return this.save();
};

/**
 * Mark order as completed
 */
scheduledOrderSchema.methods.markCompleted = function(orderId) {
  this.status = 'completed';
  this.executedAt = new Date();
  this.resultOrderId = orderId;
  return this.save();
};

/**
 * Mark order as failed
 */
scheduledOrderSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  this.executedAt = new Date();
  return this.save();
};

/**
 * Increment retry count
 */
scheduledOrderSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  return this.save();
};

/**
 * Cancel the scheduled order
 */
scheduledOrderSchema.methods.cancel = function() {
  if (this.status !== 'pending') {
    throw new Error('Can only cancel pending orders');
  }
  this.status = 'cancelled';
  return this.save();
};

const ScheduledOrder = mongoose.model('ScheduledOrder', scheduledOrderSchema);

export default ScheduledOrder;
