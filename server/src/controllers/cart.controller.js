import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { DELIVERY_CONFIG } from '../config/constants.js';

// Helper to calculate bill details
const calculateBillDetails = (cart) => {
  const subtotal = cart.subtotal;
  const deliveryFee = subtotal >= DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CONFIG.DELIVERY_FEE;
  const taxes = Math.round(subtotal * DELIVERY_CONFIG.TAX_RATE * 100) / 100;
  const totalAmount = Math.round((subtotal + deliveryFee + taxes) * 100) / 100;

  return {
    subtotal,
    deliveryFee,
    taxes,
    totalAmount,
    freeDeliveryThreshold: DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD,
    amountToFreeDelivery: subtotal < DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD 
      ? DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD - subtotal 
      : 0
  };
};

// @desc    Get cart contents
// @route   GET /api/cart
// @access  Private
export const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    cart = await Cart.create({ userId: req.user._id, items: [] });
  }

  const billDetails = calculateBillDetails(cart);

  res.json({
    success: true,
    data: {
      cart: {
        items: cart.items,
        totalItems: cart.totalItems
      },
      bill: billDetails
    }
  });
});

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // Validate product exists and is available
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (!product.isAvailable) {
    throw new AppError('Product is currently unavailable', 400);
  }

  if (product.stock < quantity) {
    throw new AppError(`Only ${product.stock} items available in stock`, 400);
  }

  // Get or create cart
  let cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) {
    cart = new Cart({ userId: req.user._id, items: [] });
  }

  // Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex(
    item => item.productId.toString() === productId
  );

  if (existingItemIndex > -1) {
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    if (newQuantity > 10) {
      throw new AppError('Maximum 10 items per product allowed', 400);
    }
    if (newQuantity > product.stock) {
      throw new AppError(`Only ${product.stock} items available in stock`, 400);
    }
    cart.items[existingItemIndex].quantity = newQuantity;
    cart.items[existingItemIndex].price = product.price; // Update price in case it changed
  } else {
    cart.items.push({
      productId: product._id,
      quantity,
      price: product.price,
      name: product.name,
      image: product.image,
      unit: product.unit
    });
  }

  await cart.save();

  const billDetails = calculateBillDetails(cart);

  res.status(201).json({
    success: true,
    message: 'Item added to cart',
    data: {
      cart: {
        items: cart.items,
        totalItems: cart.totalItems
      },
      bill: billDetails
    }
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:productId
// @access  Private
export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  const itemIndex = cart.items.findIndex(
    item => item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    throw new AppError('Item not found in cart', 404);
  }

  if (quantity <= 0) {
    // Remove item
    cart.items.splice(itemIndex, 1);
  } else {
    // Validate stock
    const product = await Product.findById(productId);
    if (product && quantity > product.stock) {
      throw new AppError(`Only ${product.stock} items available in stock`, 400);
    }

    cart.items[itemIndex].quantity = quantity;
    // Update price in case it changed
    if (product) {
      cart.items[itemIndex].price = product.price;
    }
  }

  await cart.save();

  const billDetails = calculateBillDetails(cart);

  res.json({
    success: true,
    message: quantity <= 0 ? 'Item removed from cart' : 'Cart updated',
    data: {
      cart: {
        items: cart.items,
        totalItems: cart.totalItems
      },
      bill: billDetails
    }
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:productId
// @access  Private
export const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.query; // Optional: remove specific quantity

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  const itemIndex = cart.items.findIndex(
    item => item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    throw new AppError('Item not found in cart', 404);
  }

  if (quantity && parseInt(quantity) < cart.items[itemIndex].quantity) {
    // Reduce quantity
    cart.items[itemIndex].quantity -= parseInt(quantity);
  } else {
    // Remove entire item
    cart.items.splice(itemIndex, 1);
  }

  await cart.save();

  const billDetails = calculateBillDetails(cart);

  res.json({
    success: true,
    message: 'Item removed from cart',
    data: {
      cart: {
        items: cart.items,
        totalItems: cart.totalItems
      },
      bill: billDetails
    }
  });
});

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });
  
  if (cart) {
    cart.items = [];
    await cart.save();
  }

  res.json({
    success: true,
    message: 'Cart cleared',
    data: {
      cart: {
        items: [],
        totalItems: 0
      },
      bill: {
        subtotal: 0,
        deliveryFee: DELIVERY_CONFIG.DELIVERY_FEE,
        taxes: 0,
        totalAmount: DELIVERY_CONFIG.DELIVERY_FEE,
        freeDeliveryThreshold: DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD,
        amountToFreeDelivery: DELIVERY_CONFIG.FREE_DELIVERY_THRESHOLD
      }
    }
  });
});
