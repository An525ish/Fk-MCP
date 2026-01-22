import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  createScheduledOrder,
  getScheduledOrders,
  getScheduledOrder,
  cancelScheduledOrder,
  executeScheduledOrder,
  updateScheduledOrder
} from '../controllers/scheduled.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Main scheduled order routes
router.route('/')
  .get(getScheduledOrders)
  .post(createScheduledOrder);

router.route('/:id')
  .get(getScheduledOrder)
  .put(updateScheduledOrder)
  .delete(cancelScheduledOrder);

// Execute a scheduled order manually
router.route('/:id/execute')
  .post(executeScheduledOrder);

export default router;
