import { Router } from 'express';
import {
  getOrderHistory,
  getOrder,
  getOrderStatus,
  cancelOrder,
  reorder,
  setPaymentMode,
  processPayment
} from '../controllers/order.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate, mongoIdValidation, paymentModeValidation } from '../middleware/validate.middleware.js';
import { body } from 'express-validator';

const router = Router();

// All order routes require authentication
router.use(protect);

// Get order history
router.get('/', getOrderHistory);

// Get single order
router.get('/:id', mongoIdValidation('id'), validate, getOrder);

// Get order status (with live updates)
router.get('/:id/status', mongoIdValidation('id'), validate, getOrderStatus);

// Set payment mode
router.put('/:id/payment-mode', mongoIdValidation('id'), paymentModeValidation, validate, setPaymentMode);

// Process payment
router.post('/:id/pay', mongoIdValidation('id'), validate, processPayment);

// Cancel order
router.post('/:id/cancel', mongoIdValidation('id'), [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
], validate, cancelOrder);

// Reorder
router.post('/:id/reorder', mongoIdValidation('id'), validate, reorder);

export default router;
