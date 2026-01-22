import ScheduledOrder from '../models/ScheduledOrder.model.js';
import Cart from '../models/Cart.model.js';
import Address from '../models/Address.model.js';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { DELIVERY_CONFIG } from '../config/constants.js';

/**
 * @desc    Create a scheduled order
 * @route   POST /api/scheduled-orders
 * @access  Private
 */
export const createScheduledOrder = asyncHandler(async (req, res) => {
  const { scheduledTime, addressId, paymentType, notes } = req.body;
  
  // Validate scheduled time
  const scheduledDate = new Date(scheduledTime);
  const now = new Date();
  const minScheduleTime = new Date(now.getTime() + 30 * 60 * 1000); // At least 30 mins in future
  
  if (isNaN(scheduledDate.getTime())) {
    throw new AppError('Invalid scheduled time format', 400);
  }
  
  if (scheduledDate < minScheduleTime) {
    throw new AppError('Scheduled time must be at least 30 minutes in the future', 400);
  }
  
  // Validate address
  const address = await Address.findOne({ _id: addressId, userId: req.user._id });
  if (!address) {
    throw new AppError('Address not found', 404);
  }
  
  if (!address.isServiceable) {
    throw new AppError('This address is not serviceable by Flipkart Minutes', 400);
  }
  
  // Get current cart
  const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
  
  if (!cart || cart.items.length === 0) {
    throw new AppError('Your cart is empty. Please add items before scheduling an order.', 400);
  }
  
  // Build cart snapshot
  const cartSnapshot = {
    items: cart.items.map(item => ({
      productId: item.productId._id,
      name: item.productId.name,
      image: item.productId.image,
      unit: item.productId.unit,
      price: item.productId.price,
      quantity: item.quantity
    })),
    totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0)
  };
  
  // Calculate bill snapshot
  const subtotal = cart.items.reduce((sum, item) => sum + (item.productId.price * item.quantity), 0);
  const deliveryFee = subtotal >= DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CONFIG.DELIVERY_FEE;
  const taxes = Math.round(subtotal * DELIVERY_CONFIG.TAX_RATE);
  const totalAmount = subtotal + deliveryFee + taxes;
  
  const billSnapshot = {
    subtotal,
    deliveryFee,
    taxes,
    totalAmount,
    freeDeliveryThreshold: DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD,
    amountToFreeDelivery: Math.max(0, DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD - subtotal)
  };
  
  // Create scheduled order
  const scheduledOrder = await ScheduledOrder.create({
    userId: req.user._id,
    scheduledTime: scheduledDate,
    cartSnapshot,
    billSnapshot,
    addressId,
    paymentType,
    notes
  });
  
  res.status(201).json({
    success: true,
    message: `Order scheduled for ${scheduledDate.toLocaleString()}`,
    data: {
      scheduledOrder: {
        _id: scheduledOrder._id,
        scheduledTime: scheduledOrder.scheduledTime,
        status: scheduledOrder.status,
        cartSnapshot: scheduledOrder.cartSnapshot,
        billSnapshot: scheduledOrder.billSnapshot,
        paymentType: scheduledOrder.paymentType,
        notes: scheduledOrder.notes,
        createdAt: scheduledOrder.createdAt
      }
    }
  });
});

/**
 * @desc    Get all scheduled orders for user
 * @route   GET /api/scheduled-orders
 * @access  Private
 */
export const getScheduledOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  const query = { userId: req.user._id };
  if (status) {
    query.status = status;
  }
  
  const scheduledOrders = await ScheduledOrder.find(query)
    .populate('addressId', 'type name addressLine1 city pincode')
    .populate('resultOrderId', 'orderNumber orderStatus')
    .sort({ scheduledTime: -1 });
  
  res.json({
    success: true,
    data: {
      scheduledOrders: scheduledOrders.map(order => ({
        _id: order._id,
        scheduledTime: order.scheduledTime,
        status: order.status,
        cartSnapshot: order.cartSnapshot,
        billSnapshot: order.billSnapshot,
        address: order.addressId,
        paymentType: order.paymentType,
        notes: order.notes,
        executedAt: order.executedAt,
        resultOrder: order.resultOrderId,
        failureReason: order.failureReason,
        createdAt: order.createdAt
      }))
    }
  });
});

/**
 * @desc    Get a single scheduled order
 * @route   GET /api/scheduled-orders/:id
 * @access  Private
 */
export const getScheduledOrder = asyncHandler(async (req, res) => {
  const scheduledOrder = await ScheduledOrder.findOne({
    _id: req.params.id,
    userId: req.user._id
  })
    .populate('addressId')
    .populate('resultOrderId');
  
  if (!scheduledOrder) {
    throw new AppError('Scheduled order not found', 404);
  }
  
  res.json({
    success: true,
    data: {
      scheduledOrder
    }
  });
});

/**
 * @desc    Cancel a scheduled order
 * @route   DELETE /api/scheduled-orders/:id
 * @access  Private
 */
export const cancelScheduledOrder = asyncHandler(async (req, res) => {
  const scheduledOrder = await ScheduledOrder.findOne({
    _id: req.params.id,
    userId: req.user._id
  });
  
  if (!scheduledOrder) {
    throw new AppError('Scheduled order not found', 404);
  }
  
  if (scheduledOrder.status !== 'pending') {
    throw new AppError(`Cannot cancel order with status: ${scheduledOrder.status}`, 400);
  }
  
  await scheduledOrder.cancel();
  
  res.json({
    success: true,
    message: 'Scheduled order cancelled successfully',
    data: {
      scheduledOrder: {
        _id: scheduledOrder._id,
        status: scheduledOrder.status
      }
    }
  });
});

/**
 * @desc    Manually execute a scheduled order (for testing or manual trigger)
 * @route   POST /api/scheduled-orders/:id/execute
 * @access  Private
 */
export const executeScheduledOrder = asyncHandler(async (req, res) => {
  const scheduledOrder = await ScheduledOrder.findOne({
    _id: req.params.id,
    userId: req.user._id
  }).populate('addressId');
  
  if (!scheduledOrder) {
    throw new AppError('Scheduled order not found', 404);
  }
  
  if (scheduledOrder.status !== 'pending') {
    throw new AppError(`Cannot execute order with status: ${scheduledOrder.status}`, 400);
  }
  
  // Mark as processing
  await scheduledOrder.markProcessing();
  
  try {
    // Verify products are still available
    const unavailableItems = [];
    for (const item of scheduledOrder.cartSnapshot.items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isAvailable || product.stock < item.quantity) {
        unavailableItems.push({
          name: item.name,
          reason: !product ? 'Product no longer exists' : 
                  !product.isAvailable ? 'Product is unavailable' : 
                  `Only ${product.stock} in stock`
        });
      }
    }
    
    if (unavailableItems.length > 0) {
      await scheduledOrder.markFailed(`Some items are unavailable: ${unavailableItems.map(i => i.name).join(', ')}`);
      throw new AppError(`Cannot execute order: ${unavailableItems.length} items unavailable`, 400);
    }
    
    // Create the actual order
    const orderNumber = `FK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const order = await Order.create({
      userId: req.user._id,
      orderNumber,
      items: scheduledOrder.cartSnapshot.items,
      address: {
        name: scheduledOrder.addressId.name,
        phone: scheduledOrder.addressId.phone,
        addressLine1: scheduledOrder.addressId.addressLine1,
        addressLine2: scheduledOrder.addressId.addressLine2,
        landmark: scheduledOrder.addressId.landmark,
        city: scheduledOrder.addressId.city,
        state: scheduledOrder.addressId.state,
        pincode: scheduledOrder.addressId.pincode
      },
      subtotal: scheduledOrder.billSnapshot.subtotal,
      deliveryFee: scheduledOrder.billSnapshot.deliveryFee,
      taxes: scheduledOrder.billSnapshot.taxes,
      totalAmount: scheduledOrder.billSnapshot.totalAmount,
      paymentMode: scheduledOrder.paymentType === 'COD' ? 'cod' : 'upi',
      paymentStatus: scheduledOrder.paymentType === 'COD' ? 'pending' : 'completed',
      orderStatus: 'confirmed',
      estimatedDelivery: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
    
    // Update stock
    for (const item of scheduledOrder.cartSnapshot.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }
    
    // Mark scheduled order as completed
    await scheduledOrder.markCompleted(order._id);
    
    // Clear user's cart
    await Cart.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { items: [] } }
    );
    
    res.json({
      success: true,
      message: 'Scheduled order executed successfully',
      data: {
        order: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          totalAmount: order.totalAmount
        },
        scheduledOrder: {
          _id: scheduledOrder._id,
          status: scheduledOrder.status,
          executedAt: scheduledOrder.executedAt
        }
      }
    });
    
  } catch (error) {
    // If not already failed, mark as failed
    if (scheduledOrder.status === 'processing') {
      await scheduledOrder.markFailed(error.message);
    }
    throw error;
  }
});

/**
 * @desc    Update scheduled order time
 * @route   PUT /api/scheduled-orders/:id
 * @access  Private
 */
export const updateScheduledOrder = asyncHandler(async (req, res) => {
  const { scheduledTime, notes } = req.body;
  
  const scheduledOrder = await ScheduledOrder.findOne({
    _id: req.params.id,
    userId: req.user._id
  });
  
  if (!scheduledOrder) {
    throw new AppError('Scheduled order not found', 404);
  }
  
  if (scheduledOrder.status !== 'pending') {
    throw new AppError(`Cannot update order with status: ${scheduledOrder.status}`, 400);
  }
  
  if (scheduledTime) {
    const scheduledDate = new Date(scheduledTime);
    const now = new Date();
    const minScheduleTime = new Date(now.getTime() + 30 * 60 * 1000);
    
    if (isNaN(scheduledDate.getTime())) {
      throw new AppError('Invalid scheduled time format', 400);
    }
    
    if (scheduledDate < minScheduleTime) {
      throw new AppError('Scheduled time must be at least 30 minutes in the future', 400);
    }
    
    scheduledOrder.scheduledTime = scheduledDate;
  }
  
  if (notes !== undefined) {
    scheduledOrder.notes = notes;
  }
  
  await scheduledOrder.save();
  
  res.json({
    success: true,
    message: 'Scheduled order updated successfully',
    data: {
      scheduledOrder: {
        _id: scheduledOrder._id,
        scheduledTime: scheduledOrder.scheduledTime,
        status: scheduledOrder.status,
        notes: scheduledOrder.notes
      }
    }
  });
});
