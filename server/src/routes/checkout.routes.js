import { Router } from 'express';
import { proceedToCheckout, checkCodEligibility } from '../controllers/checkout.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { body } from 'express-validator';

const router = Router();

// All checkout routes require authentication
router.use(protect);

// MCP: Check COD eligibility for current cart/address
router.get('/cod-eligibility', checkCodEligibility);

// Proceed to checkout
router.post('/', [
  body('addressId')
    .notEmpty()
    .withMessage('Delivery address is required')
    .isMongoId()
    .withMessage('Invalid address ID')
], validate, proceedToCheckout);

export default router;
