import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  getPreferences,
  getFrequentItems,
  getShoppingPatterns
} from '../controllers/preferences.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// All preferences derived from order history - no writes needed
router.route('/')
  .get(getPreferences);

// Derived data from order history
router.route('/frequent-items')
  .get(getFrequentItems);

router.route('/patterns')
  .get(getShoppingPatterns);

export default router;
