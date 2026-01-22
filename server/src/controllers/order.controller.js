import Order from '../models/Order.model.js';
import OrderStatus from '../models/OrderStatus.model.js';
import Product from '../models/Product.model.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_MODE, DELIVERY_CONFIG, PAGINATION } from '../config/constants.js';
import { setPaymentMode, processPayment } from './checkout.controller.js';

// Simulated rider names for demo
const RIDER_NAMES = [
  'Rahul Kumar', 'Amit Singh', 'Priya Sharma', 'Vikram Patel', 
  'Deepak Verma', 'Sunita Devi', 'Rajesh Yadav', 'Neha Gupta'
];

// @desc    Get order history
// @route   GET /api/orders
// @access  Private
export const getOrderHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments({ userId: req.user._id })
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Get single order details
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  res.json({
    success: true,
    data: { order }
  });
});

// @desc    Get order status with simulated real-time updates
// @route   GET /api/orders/:id/status
// @access  Private
export const getOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Get status history
  const statusHistory = await OrderStatus.getStatusHistory(order._id);
  const latestStatus = statusHistory[statusHistory.length - 1];

  // Simulate order progression for demo
  let simulatedUpdate = null;
  
  if (order.orderStatus !== ORDER_STATUS.DELIVERED && 
      order.orderStatus !== ORDER_STATUS.CANCELLED) {
    
    const minutesSinceOrder = (Date.now() - order.createdAt.getTime()) / (1000 * 60);
    
    // Simulate status progression based on time
    let newStatus = order.orderStatus;
    let riderInfo = null;

    if (order.orderStatus === ORDER_STATUS.CONFIRMED && minutesSinceOrder >= 2) {
      newStatus = ORDER_STATUS.PREPARING;
    } else if (order.orderStatus === ORDER_STATUS.PREPARING && minutesSinceOrder >= 5) {
      newStatus = ORDER_STATUS.OUT_FOR_DELIVERY;
      riderInfo = {
        riderName: RIDER_NAMES[Math.floor(Math.random() * RIDER_NAMES.length)],
        riderPhone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        riderProximityKm: 3.5,
        estimatedMinutes: 15
      };
    } else if (order.orderStatus === ORDER_STATUS.OUT_FOR_DELIVERY && minutesSinceOrder >= 15) {
      newStatus = ORDER_STATUS.DELIVERED;
    }

    // Update order if status changed
    if (newStatus !== order.orderStatus) {
      order.orderStatus = newStatus;
      if (newStatus === ORDER_STATUS.DELIVERED) {
        order.deliveredAt = new Date();
      }
      await order.save();

      // Create status update
      const statusUpdate = await OrderStatus.createStatusUpdate(order._id, newStatus, riderInfo || {});
      simulatedUpdate = statusUpdate;
    }

    // If out for delivery, simulate rider proximity updates
    if (order.orderStatus === ORDER_STATUS.OUT_FOR_DELIVERY && latestStatus) {
      const lastProximity = latestStatus.riderProximityKm || 3.5;
      const newProximity = Math.max(0.1, lastProximity - (minutesSinceOrder * 0.2));
      const estimatedMinutes = Math.max(1, Math.ceil(newProximity * 4));

      simulatedUpdate = {
        status: ORDER_STATUS.OUT_FOR_DELIVERY,
        riderName: latestStatus.riderName || RIDER_NAMES[0],
        riderPhone: latestStatus.riderPhone,
        riderProximityKm: Math.round(newProximity * 10) / 10,
        estimatedMinutes,
        message: `Rider is ${newProximity.toFixed(1)} km away`
      };
    }
  }

  // Calculate delivery countdown
  let deliveryCountdown = null;
  if (order.estimatedDelivery && order.orderStatus !== ORDER_STATUS.DELIVERED) {
    const remaining = order.estimatedDelivery.getTime() - Date.now();
    if (remaining > 0) {
      deliveryCountdown = {
        minutes: Math.floor(remaining / 60000),
        seconds: Math.floor((remaining % 60000) / 1000)
      };
    }
  }

  res.json({
    success: true,
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      currentStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMode: order.paymentMode,
      estimatedDelivery: order.estimatedDelivery,
      deliveryCountdown,
      deliveredAt: order.deliveredAt,
      statusHistory: statusHistory.map(s => ({
        status: s.status,
        message: s.message,
        timestamp: s.createdAt,
        riderName: s.riderName,
        riderProximityKm: s.riderProximityKm,
        estimatedMinutes: s.estimatedMinutes
      })),
      liveUpdate: simulatedUpdate
    }
  });
});

// @desc    Cancel order
// @route   POST /api/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.orderStatus === ORDER_STATUS.CANCELLED) {
    throw new AppError('Order is already cancelled', 400);
  }

  if (order.orderStatus === ORDER_STATUS.DELIVERED) {
    throw new AppError('Cannot cancel delivered order', 400);
  }

  // Check cancellation window
  if (!order.canBeCancelled()) {
    throw new AppError(
      `Order can only be cancelled within ${DELIVERY_CONFIG.CANCELLATION_WINDOW_MINUTES} minutes of placing`,
      400
    );
  }

  // Cancel order
  order.orderStatus = ORDER_STATUS.CANCELLED;
  order.cancelledAt = new Date();
  order.cancellationReason = reason || 'Cancelled by customer';

  // If payment was completed, mark for refund
  if (order.paymentStatus === PAYMENT_STATUS.COMPLETED && order.paymentMode === PAYMENT_MODE.UPI) {
    order.paymentStatus = PAYMENT_STATUS.REFUNDED;
  }

  await order.save();

  // Create cancellation status
  await OrderStatus.createStatusUpdate(order._id, ORDER_STATUS.CANCELLED, {
    message: reason || 'Order cancelled by customer'
  });

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.quantity }
    });
  }

  res.json({
    success: true,
    message: 'Order cancelled successfully',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      cancelledAt: order.cancelledAt,
      refundStatus: order.paymentStatus === PAYMENT_STATUS.REFUNDED ? 'Refund initiated' : null
    }
  });
});

// @desc    Re-order (create new order from previous order)
// @route   POST /api/orders/:id/reorder
// @access  Private
export const reorder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Check product availability
  const productIds = order.items.map(item => item.productId);
  const products = await Product.find({ _id: { $in: productIds }, isAvailable: true });
  
  const availableItems = [];
  const unavailableItems = [];

  for (const item of order.items) {
    const product = products.find(p => p._id.toString() === item.productId.toString());
    if (product && product.stock >= item.quantity) {
      availableItems.push({
        productId: product._id,
        name: product.name,
        image: product.image,
        unit: product.unit,
        price: product.price,
        quantity: item.quantity
      });
    } else {
      unavailableItems.push({
        name: item.name,
        reason: product ? 'Insufficient stock' : 'Product unavailable'
      });
    }
  }

  res.json({
    success: true,
    data: {
      availableItems,
      unavailableItems,
      message: unavailableItems.length > 0 
        ? 'Some items are unavailable' 
        : 'All items available for reorder'
    }
  });
});

// Export payment functions from checkout controller
export { setPaymentMode, processPayment };
