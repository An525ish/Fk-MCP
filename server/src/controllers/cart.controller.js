import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { DELIVERY_CONFIG, PRICE_CHANGE_THRESHOLD } from '../config/constants.js';
import { emitCartUpdate } from '../socket/index.js';

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
  
  const cartData = {
    cart: {
      items: cart.items,
      totalItems: cart.totalItems
    },
    bill: billDetails
  };

  // Emit real-time update to all user's connected clients
  emitCartUpdate(req.user._id, cartData);

  res.status(201).json({
    success: true,
    message: 'Item added to cart',
    data: cartData
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
  
  const cartData = {
    cart: {
      items: cart.items,
      totalItems: cart.totalItems
    },
    bill: billDetails
  };

  // Emit real-time update
  emitCartUpdate(req.user._id, cartData);

  res.json({
    success: true,
    message: quantity <= 0 ? 'Item removed from cart' : 'Cart updated',
    data: cartData
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
  
  const cartData = {
    cart: {
      items: cart.items,
      totalItems: cart.totalItems
    },
    bill: billDetails
  };

  // Emit real-time update
  emitCartUpdate(req.user._id, cartData);

  res.json({
    success: true,
    message: 'Item removed from cart',
    data: cartData
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

  const cartData = {
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
  };

  // Emit real-time update
  emitCartUpdate(req.user._id, cartData);

  res.json({
    success: true,
    message: 'Cart cleared',
    data: cartData
  });
});

// @desc    Bulk add items to cart (for MCP recipe-to-cart flow)
// @route   POST /api/cart/bulk
// @access  Private
export const bulkAddToCart = asyncHandler(async (req, res) => {
  const { items } = req.body; // Array of { productId, quantity }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Items array is required', 400);
  }

  // Get or create cart
  let cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) {
    cart = new Cart({ userId: req.user._id, items: [] });
  }

  // Fetch all products in one query
  const productIds = items.map(item => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map(p => [p._id.toString(), p]));

  const successItems = [];
  const failedItems = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    const quantity = item.quantity || 1;

    if (!product) {
      failedItems.push({
        productId: item.productId,
        reason: 'Product not found',
        alternatives: []
      });
      continue;
    }

    if (!product.isAvailable) {
      // Find alternatives
      const alternatives = await Product.find({
        categoryId: product.categoryId,
        isAvailable: true,
        stock: { $gt: 0 },
        _id: { $ne: product._id }
      })
        .sort({ rating: -1 })
        .limit(3)
        .select('_id name price unit rating image');

      failedItems.push({
        productId: item.productId,
        name: product.name,
        reason: 'Product currently unavailable',
        alternatives
      });
      continue;
    }

    if (product.stock < quantity) {
      // Find alternatives
      const alternatives = await Product.find({
        categoryId: product.categoryId,
        isAvailable: true,
        stock: { $gte: quantity },
        _id: { $ne: product._id }
      })
        .sort({ rating: -1 })
        .limit(3)
        .select('_id name price unit rating image stock');

      failedItems.push({
        productId: item.productId,
        name: product.name,
        reason: `Only ${product.stock} items in stock (requested ${quantity})`,
        availableStock: product.stock,
        alternatives
      });
      continue;
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      cartItem => cartItem.productId.toString() === item.productId
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (newQuantity > 10) {
        failedItems.push({
          productId: item.productId,
          name: product.name,
          reason: 'Maximum 10 items per product allowed',
          currentInCart: cart.items[existingItemIndex].quantity,
          alternatives: []
        });
        continue;
      }
      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].price = product.price;
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

    successItems.push({
      productId: product._id,
      name: product.name,
      quantity,
      price: product.price,
      unit: product.unit
    });
  }

  await cart.save();
  const billDetails = calculateBillDetails(cart);

  const cartData = {
    cart: {
      items: cart.items,
      totalItems: cart.totalItems
    },
    bill: billDetails
  };

  // Emit real-time update (important for MCP bulk adds)
  emitCartUpdate(req.user._id, cartData);

  res.status(201).json({
    success: true,
    message: `${successItems.length} items added, ${failedItems.length} failed`,
    data: {
      successItems,
      failedItems,
      ...cartData
    }
  });
});

// @desc    Check for price changes in cart items (MCP price protection)
// @route   GET /api/cart/price-check
// @access  Private
export const priceCheck = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });
  
  if (!cart || cart.items.length === 0) {
    return res.json({
      success: true,
      data: {
        hasChanges: false,
        priceChanges: [],
        message: 'Cart is empty'
      }
    });
  }

  // Fetch current prices for all cart items
  const productIds = cart.items.map(item => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map(p => [p._id.toString(), p]));

  const priceChanges = [];
  let hasSignificantChange = false;

  for (const cartItem of cart.items) {
    const product = productMap.get(cartItem.productId.toString());
    
    if (!product) {
      priceChanges.push({
        productId: cartItem.productId,
        name: cartItem.name,
        issue: 'Product no longer available',
        cartPrice: cartItem.price,
        currentPrice: null,
        changePercent: null,
        requiresConfirmation: true
      });
      hasSignificantChange = true;
      continue;
    }

    if (product.price !== cartItem.price) {
      const changePercent = ((product.price - cartItem.price) / cartItem.price);
      const isSignificant = Math.abs(changePercent) > PRICE_CHANGE_THRESHOLD;
      
      if (isSignificant) {
        hasSignificantChange = true;
      }

      priceChanges.push({
        productId: product._id,
        name: product.name,
        cartPrice: cartItem.price,
        currentPrice: product.price,
        priceDifference: product.price - cartItem.price,
        changePercent: Math.round(changePercent * 100),
        isIncrease: product.price > cartItem.price,
        requiresConfirmation: isSignificant && product.price > cartItem.price
      });
    }

    // Also check stock
    if (product.stock < cartItem.quantity) {
      priceChanges.push({
        productId: product._id,
        name: product.name,
        issue: 'Stock reduced',
        requestedQuantity: cartItem.quantity,
        availableStock: product.stock,
        requiresConfirmation: true
      });
      hasSignificantChange = true;
    }
  }

  res.json({
    success: true,
    data: {
      hasChanges: priceChanges.length > 0,
      hasSignificantChange,
      priceChanges,
      message: hasSignificantChange 
        ? 'Some items have significant price or availability changes. Please review before checkout.'
        : priceChanges.length > 0 
          ? 'Minor price changes detected'
          : 'All prices are up to date'
    }
  });
});
