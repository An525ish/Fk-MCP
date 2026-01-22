import { Router } from 'express';
import {
  setDeliveryLocation,
  getDeliveryLocation,
  checkPincode,
  validateLocation
} from '../controllers/session.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate, mongoIdValidation } from '../middleware/validate.middleware.js';
import { body, param } from 'express-validator';

const router = Router();

// Public route - check pincode serviceability
router.get('/check-pincode/:pincode', [
  param('pincode')
    .matches(/^\d{6}$/)
    .withMessage('Invalid pincode format')
], validate, checkPincode);

// Protected routes
router.use(protect);

// Get current delivery location
router.get('/location', getDeliveryLocation);

// Set delivery location
router.post('/location', [
  body('addressId')
    .notEmpty()
    .withMessage('Address ID is required')
    .isMongoId()
    .withMessage('Invalid address ID')
], validate, setDeliveryLocation);

// MCP: Validate location for serviceability (comprehensive check)
router.post('/validate-location', [
  body('addressId')
    .notEmpty()
    .withMessage('Address ID is required')
    .isMongoId()
    .withMessage('Invalid address ID')
], validate, validateLocation);

export default router;
