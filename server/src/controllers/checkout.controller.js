import Cart from '../models/Cart.model.js';
import Order from '../models/Order.model.js';
import OrderStatus from '../models/OrderStatus.model.js';
import Address from '../models/Address.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_MODE, DELIVERY_CONFIG, COD_DEFAULT_LIMIT } from '../config/constants.js';

// @desc    Proceed to checkout - validate cart and create pending order
// @route   POST /api/checkout
// @access  Private
export const proceedToCheckout = asyncHandler(async (req, res) => {
  const { addressId } = req.body;

  // Get user's cart
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  // Validate address
  const address = await Address.findOne({ _id: addressId, userId: req.user._id });
  if (!address) {
    throw new AppError('Invalid delivery address', 400);
  }

  if (!address.isServiceable) {
    throw new AppError('Delivery not available at this address', 400);
  }

  // Validate all products are available and in stock
  const productIds = cart.items.map(item => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map(p => [p._id.toString(), p]));

  const orderItems = [];
  let hasStockIssue = false;
  const stockIssues = [];

  for (const item of cart.items) {
    const product = productMap.get(item.productId.toString());
    
    if (!product) {
      stockIssues.push({ productId: item.productId, name: item.name, issue: 'Product no longer available' });
      hasStockIssue = true;
      continue;
    }

    if (!product.isAvailable) {
      stockIssues.push({ productId: item.productId, name: product.name, issue: 'Product currently unavailable' });
      hasStockIssue = true;
      continue;
    }

    if (product.stock < item.quantity) {
      stockIssues.push({ 
        productId: item.productId, 
        name: product.name, 
        issue: `Only ${product.stock} available`,
        availableStock: product.stock
      });
      hasStockIssue = true;
      continue;
    }

    orderItems.push({
      productId: product._id,
      name: product.name,
      image: product.image,
      unit: product.unit,
      price: product.price,
      quantity: item.quantity,
      total: product.price * item.quantity
    });
  }

  if (hasStockIssue) {
    return res.status(400).json({
      success: false,
      message: 'Some items have stock issues',
      data: { stockIssues }
    });
  }

  // Calculate bill
  const billDetails = Order.calculateBill(orderItems);

  // Create order
  const order = await Order.create({
    userId: req.user._id,
    items: orderItems,
    address: {
      name: address.name,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      pincode: address.pincode
    },
    subtotal: billDetails.subtotal,
    deliveryFee: billDetails.deliveryFee,
    taxes: billDetails.taxes,
    totalAmount: billDetails.totalAmount,
    estimatedDelivery: new Date(Date.now() + 20 * 60 * 1000) // 20 minutes from now
  });

  // Create initial order status
  await OrderStatus.createStatusUpdate(order._id, ORDER_STATUS.PENDING);

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        address: order.address,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        taxes: order.taxes,
        totalAmount: order.totalAmount,
        paymentMode: order.paymentMode,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        estimatedDelivery: order.estimatedDelivery
      }
    }
  });
});

// @desc    Set payment mode for order
// @route   PUT /api/orders/:id/payment-mode
// @access  Private
export const setPaymentMode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentMode } = req.body;

  const order = await Order.findOne({ _id: id, userId: req.user._id });
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.paymentStatus === PAYMENT_STATUS.COMPLETED) {
    throw new AppError('Payment already completed', 400);
  }

  if (order.orderStatus === ORDER_STATUS.CANCELLED) {
    throw new AppError('Order has been cancelled', 400);
  }

  order.paymentMode = paymentMode;
  await order.save();

  res.json({
    success: true,
    message: 'Payment mode updated',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentMode: order.paymentMode,
      totalAmount: order.totalAmount
    }
  });
});

// @desc    Process payment (mock)
// @route   POST /api/orders/:id/pay
// @access  Private
export const processPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findOne({ _id: id, userId: req.user._id });
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.paymentStatus === PAYMENT_STATUS.COMPLETED) {
    throw new AppError('Payment already completed', 400);
  }

  if (order.orderStatus === ORDER_STATUS.CANCELLED) {
    throw new AppError('Order has been cancelled', 400);
  }

  // Mock payment processing
  if (order.paymentMode === PAYMENT_MODE.UPI) {
    // Generate mock UPI intent link
    const upiId = 'flipkart@upi';
    const amount = order.totalAmount;
    const transactionNote = `Order ${order.orderNumber}`;
    const merchantName = 'Flipkart Minutes';
    
    // Mock UPI deep link format
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&tn=${encodeURIComponent(transactionNote)}&cu=INR`;
    
    // Generate mock QR code data (in real app, this would be actual QR)
    const qrData = {
      upiId,
      amount,
      merchantName,
      transactionNote,
      orderId: order._id
    };

    // Simulate payment success after "processing"
    order.paymentStatus = PAYMENT_STATUS.COMPLETED;
    order.orderStatus = ORDER_STATUS.CONFIRMED;
    await order.save();

    // Update order status
    await OrderStatus.createStatusUpdate(order._id, ORDER_STATUS.CONFIRMED);

    // Reduce stock for ordered items
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }

    // Clear user's cart
    await Cart.findOneAndUpdate(
      { userId: req.user._id },
      { items: [], totalItems: 0, subtotal: 0 }
    );

    res.json({
      success: true,
      message: 'Payment successful',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        upiLink,
        qrData
      }
    });
  } else {
    // COD - just confirm order
    order.orderStatus = ORDER_STATUS.CONFIRMED;
    await order.save();

    // Update order status
    await OrderStatus.createStatusUpdate(order._id, ORDER_STATUS.CONFIRMED);

    // Reduce stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }

    // Clear cart
    await Cart.findOneAndUpdate(
      { userId: req.user._id },
      { items: [], totalItems: 0, subtotal: 0 }
    );

    res.json({
      success: true,
      message: 'Order confirmed with Cash on Delivery',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentMode: order.paymentMode,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus
      }
    });
  }
});

// @desc    Check COD eligibility for current cart/address
// @route   GET /api/checkout/cod-eligibility
// @access  Private
export const checkCodEligibility = asyncHandler(async (req, res) => {
  const { addressId } = req.query;

  // Get user's cart
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart || cart.items.length === 0) {
    return res.json({
      success: true,
      data: {
        eligible: false,
        reason: 'Cart is empty',
        cartTotal: 0,
        codLimit: 0
      }
    });
  }

  // Calculate cart total
  const subtotal = cart.subtotal;
  const deliveryFee = subtotal >= DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CONFIG.DELIVERY_FEE;
  const taxes = Math.round(subtotal * DELIVERY_CONFIG.TAX_RATE * 100) / 100;
  const totalAmount = Math.round((subtotal + deliveryFee + taxes) * 100) / 100;

  // Get address (either specified or user's active address)
  let address;
  if (addressId) {
    address = await Address.findOne({ _id: addressId, userId: req.user._id });
  } else {
    const user = await User.findById(req.user._id);
    if (user.activeAddressId) {
      address = await Address.findById(user.activeAddressId);
    }
  }

  if (!address) {
    return res.json({
      success: true,
      data: {
        eligible: false,
        reason: 'No delivery address selected',
        cartTotal: totalAmount,
        codLimit: COD_DEFAULT_LIMIT
      }
    });
  }

  if (!address.isServiceable) {
    return res.json({
      success: true,
      data: {
        eligible: false,
        reason: 'Delivery not available at this address',
        cartTotal: totalAmount,
        codLimit: 0,
        address: {
          city: address.city,
          pincode: address.pincode
        }
      }
    });
  }

  const codLimit = address.codLimit || COD_DEFAULT_LIMIT;
  const isEligible = codLimit > 0 && totalAmount <= codLimit;

  res.json({
    success: true,
    data: {
      eligible: isEligible,
      reason: !isEligible 
        ? totalAmount > codLimit 
          ? `Order amount (₹${totalAmount}) exceeds COD limit (₹${codLimit}) for this area. Please use UPI payment.`
          : 'COD not available for this area'
        : 'COD available for this order',
      cartTotal: totalAmount,
      codLimit,
      exceedsBy: totalAmount > codLimit ? totalAmount - codLimit : 0,
      address: {
        city: address.city,
        pincode: address.pincode
      },
      suggestUPI: !isEligible && totalAmount > codLimit
    }
  });
});
