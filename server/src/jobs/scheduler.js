/**
 * Scheduled Order Processor
 * Background job that processes scheduled orders when they're due
 */

import ScheduledOrder from '../models/ScheduledOrder.model.js';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import Cart from '../models/Cart.model.js';

// Configuration
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
const BUFFER_MINUTES = 5; // Process orders up to 5 mins before scheduled time
const MAX_RETRIES = 3;

let isRunning = false;
let intervalId = null;

/**
 * Process a single scheduled order
 */
async function processScheduledOrder(scheduledOrder) {
  console.log(`[Scheduler] Processing order ${scheduledOrder._id} scheduled for ${scheduledOrder.scheduledTime}`);
  
  try {
    // Mark as processing
    await scheduledOrder.markProcessing();
    
    // Verify products are still available
    const unavailableItems = [];
    const priceChanges = [];
    
    for (const item of scheduledOrder.cartSnapshot.items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        unavailableItems.push({
          name: item.name,
          reason: 'Product no longer exists'
        });
        continue;
      }
      
      if (!product.isAvailable) {
        unavailableItems.push({
          name: item.name,
          reason: 'Product is unavailable'
        });
        continue;
      }
      
      if (product.stock < item.quantity) {
        unavailableItems.push({
          name: item.name,
          reason: `Only ${product.stock} in stock (need ${item.quantity})`
        });
        continue;
      }
      
      // Check for significant price changes (>10%)
      const priceDiff = Math.abs(product.price - item.price) / item.price;
      if (priceDiff > 0.1) {
        priceChanges.push({
          name: item.name,
          oldPrice: item.price,
          newPrice: product.price,
          change: Math.round(priceDiff * 100)
        });
      }
    }
    
    // If items unavailable, fail the order
    if (unavailableItems.length > 0) {
      const reason = `Items unavailable: ${unavailableItems.map(i => `${i.name} (${i.reason})`).join(', ')}`;
      await scheduledOrder.markFailed(reason);
      console.log(`[Scheduler] Order ${scheduledOrder._id} failed: ${reason}`);
      return { success: false, reason };
    }
    
    // Log price changes (but don't fail - user already confirmed)
    if (priceChanges.length > 0) {
      console.log(`[Scheduler] Order ${scheduledOrder._id} has price changes:`, priceChanges);
    }
    
    // Create the actual order
    const orderNumber = `FK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const order = await Order.create({
      userId: scheduledOrder.userId,
      orderNumber,
      items: scheduledOrder.cartSnapshot.items,
      address: {
        name: scheduledOrder.addressId.name,
        phone: scheduledOrder.addressId.phone,
        addressLine1: scheduledOrder.addressId.addressLine1,
        addressLine2: scheduledOrder.addressId.addressLine2,
        landmark: scheduledOrder.addressId.landmark,
        city: scheduledOrder.addressId.city,
        state: scheduledOrder.addressId.state,
        pincode: scheduledOrder.addressId.pincode
      },
      subtotal: scheduledOrder.billSnapshot.subtotal,
      deliveryFee: scheduledOrder.billSnapshot.deliveryFee,
      taxes: scheduledOrder.billSnapshot.taxes,
      totalAmount: scheduledOrder.billSnapshot.totalAmount,
      paymentMode: scheduledOrder.paymentType === 'COD' ? 'cod' : 'upi',
      paymentStatus: scheduledOrder.paymentType === 'COD' ? 'pending' : 'completed',
      orderStatus: 'confirmed',
      estimatedDelivery: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
    
    // Update stock
    for (const item of scheduledOrder.cartSnapshot.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }
    
    // Mark scheduled order as completed
    await scheduledOrder.markCompleted(order._id);
    
    // Clear user's cart (in case they added more items)
    await Cart.findOneAndUpdate(
      { userId: scheduledOrder.userId },
      { $set: { items: [] } }
    );
    
    console.log(`[Scheduler] Order ${scheduledOrder._id} completed. Created order ${order.orderNumber}`);
    
    return { 
      success: true, 
      orderId: order._id, 
      orderNumber: order.orderNumber 
    };
    
  } catch (error) {
    console.error(`[Scheduler] Error processing order ${scheduledOrder._id}:`, error);
    
    // Increment retry count
    await scheduledOrder.incrementRetry();
    
    if (scheduledOrder.retryCount >= MAX_RETRIES) {
      await scheduledOrder.markFailed(`Max retries exceeded: ${error.message}`);
      return { success: false, reason: error.message };
    }
    
    // Reset to pending for retry
    scheduledOrder.status = 'pending';
    await scheduledOrder.save();
    
    return { success: false, reason: error.message, willRetry: true };
  }
}

/**
 * Main job function - checks for and processes due orders
 */
async function processDueOrders() {
  if (isRunning) {
    console.log('[Scheduler] Previous run still in progress, skipping...');
    return;
  }
  
  isRunning = true;
  
  try {
    // Get all due orders
    const dueOrders = await ScheduledOrder.getDueOrders(BUFFER_MINUTES);
    
    if (dueOrders.length === 0) {
      return;
    }
    
    console.log(`[Scheduler] Found ${dueOrders.length} orders due for processing`);
    
    // Process each order
    for (const order of dueOrders) {
      await processScheduledOrder(order);
    }
    
  } catch (error) {
    console.error('[Scheduler] Error in processDueOrders:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Send reminders for upcoming orders (30 mins before)
 */
async function sendReminders() {
  try {
    const ordersNeedingReminder = await ScheduledOrder.getOrdersNeedingReminder();
    
    for (const order of ordersNeedingReminder) {
      // In a real app, this would send a push notification or email
      console.log(`[Scheduler] Reminder: Order ${order._id} for user ${order.userId.email} scheduled in ~30 mins`);
      
      // Mark reminder as sent
      order.reminderSent = true;
      await order.save();
    }
  } catch (error) {
    console.error('[Scheduler] Error sending reminders:', error);
  }
}

/**
 * Start the scheduler
 */
export function startScheduler() {
  if (intervalId) {
    console.log('[Scheduler] Already running');
    return;
  }
  
  console.log(`[Scheduler] Starting... Checking every ${CHECK_INTERVAL_MS / 1000} seconds`);
  
  // Run immediately on start
  processDueOrders();
  sendReminders();
  
  // Then run on interval
  intervalId = setInterval(() => {
    processDueOrders();
    sendReminders();
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Scheduler] Stopped');
  }
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning() {
  return intervalId !== null;
}

// Export for manual testing
export { processScheduledOrder, processDueOrders };
