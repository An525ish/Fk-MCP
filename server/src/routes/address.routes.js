import { Router } from 'express';
import {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../controllers/address.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate, addressValidation, mongoIdValidation } from '../middleware/validate.middleware.js';

const router = Router();

// All address routes require authentication
router.use(protect);

// Get all addresses
router.get('/', getAddresses);

// Create new address
router.post('/', addressValidation, validate, createAddress);

// Get single address
router.get('/:id', mongoIdValidation('id'), validate, getAddress);

// Update address
router.put('/:id', mongoIdValidation('id'), validate, updateAddress);

// Delete address
router.delete('/:id', mongoIdValidation('id'), validate, deleteAddress);

// Set as default address
router.put('/:id/default', mongoIdValidation('id'), validate, setDefaultAddress);

export default router;
