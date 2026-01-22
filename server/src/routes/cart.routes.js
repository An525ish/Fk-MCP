import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  bulkAddToCart,
  priceCheck
} from '../controllers/cart.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate, addToCartValidation, updateCartValidation, mongoIdValidation } from '../middleware/validate.middleware.js';

const router = Router();

// All cart routes require authentication
router.use(protect);

// Get cart contents
router.get('/', getCart);

// MCP: Check for price changes in cart
router.get('/price-check', priceCheck);

// Add item to cart
router.post('/items', addToCartValidation, validate, addToCart);

// MCP: Bulk add items to cart (for recipe-to-cart flow)
router.post('/bulk', bulkAddToCart);

// Update item quantity
router.put('/items/:productId', mongoIdValidation('productId'), updateCartValidation, validate, updateCartItem);

// Remove item from cart
router.delete('/items/:productId', mongoIdValidation('productId'), validate, removeFromCart);

// Clear entire cart
router.delete('/', clearCart);

export default router;
