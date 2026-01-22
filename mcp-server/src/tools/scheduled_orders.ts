/**
 * Scheduled Orders Tools
 * Create, manage, and cancel scheduled orders
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import type { ToolResponse, ScheduleOrderParams } from '../types/index.js';

// ============================================
// Schedule Order Tool
// ============================================

export const scheduleOrderDefinition = {
  name: 'schedule_order',
  description: `Schedule an order for future delivery.

Creates a scheduled order from the current cart contents. The order will be automatically placed at the scheduled time.

Requirements:
- Cart must have items
- Scheduled time must be at least 30 minutes in the future
- Address must be serviceable

The system will:
1. Snapshot current cart and prices
2. Send a reminder 30 mins before scheduled time
3. Automatically place the order at the scheduled time
4. Notify user of success/failure

Use this when user wants delivery at a specific time (e.g., "deliver at 6 PM", "order for tomorrow evening").
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      scheduled_time: {
        type: 'string',
        description: 'ISO 8601 datetime string for when to place the order (e.g., "2024-01-15T18:00:00")',
      },
      address_id: {
        type: 'string',
        description: 'Delivery address ID (from get_addresses)',
      },
      payment_type: {
        type: 'string',
        enum: ['COD', 'DIGITAL'],
        description: 'Payment method: COD for Cash on Delivery, DIGITAL for UPI/Online',
      },
      notes: {
        type: 'string',
        description: 'Optional notes for the order',
      },
    },
    required: ['scheduled_time', 'address_id', 'payment_type'],
  },
};

export async function scheduleOrder(params: ScheduleOrderParams): Promise<ToolResponse> {
  const requestId = logger.toolStart('schedule_order', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to schedule an order.',
      };
    }

    // Validate scheduled time
    const scheduledDate = new Date(params.scheduled_time);
    if (isNaN(scheduledDate.getTime())) {
      return {
        success: false,
        message: 'Invalid scheduled time format. Please use ISO 8601 format (e.g., "2024-01-15T18:00:00").',
      };
    }

    const now = new Date();
    const minTime = new Date(now.getTime() + 30 * 60 * 1000);
    if (scheduledDate < minTime) {
      return {
        success: false,
        message: 'Scheduled time must be at least 30 minutes in the future.',
      };
    }

    // Validate payment type
    if (!['COD', 'DIGITAL'].includes(params.payment_type)) {
      return {
        success: false,
        message: 'Payment type must be either "COD" or "DIGITAL".',
      };
    }

    // Create scheduled order
    const result = await apiClient.createScheduledOrder({
      scheduledTime: params.scheduled_time,
      addressId: params.address_id,
      paymentType: params.payment_type,
      notes: params.notes,
    });

    const order = result.scheduledOrder;
    const formattedTime = scheduledDate.toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const response: ToolResponse = {
      success: true,
      message: `Order scheduled for ${formattedTime}. ` +
        `Total: ₹${order.billSnapshot.totalAmount} (${order.cartSnapshot.totalItems} items). ` +
        `You'll receive a reminder 30 minutes before.`,
      data: {
        scheduled_order: {
          id: order._id,
          scheduled_time: order.scheduledTime,
          formatted_time: formattedTime,
          status: order.status,
          payment_type: order.paymentType,
          items: order.cartSnapshot.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          bill: {
            subtotal: order.billSnapshot.subtotal,
            delivery_fee: order.billSnapshot.deliveryFee,
            taxes: order.billSnapshot.taxes,
            total_amount: order.billSnapshot.totalAmount,
          },
        },
      },
    };

    logger.toolSuccess(requestId, 'schedule_order', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to schedule order';
    logger.toolError(requestId, 'schedule_order', errorMessage);

    return {
      success: false,
      message: `Failed to schedule order: ${errorMessage}`,
    };
  }
}

// ============================================
// Get Scheduled Orders Tool
// ============================================

export const getScheduledOrdersDefinition = {
  name: 'get_scheduled_orders',
  description: `Get all scheduled orders for the user.

Returns a list of scheduled orders with their status:
- pending: Waiting to be executed
- processing: Currently being executed
- completed: Successfully placed
- cancelled: Cancelled by user
- failed: Execution failed

Use this to show user their upcoming scheduled deliveries.
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        enum: ['pending', 'processing', 'completed', 'cancelled', 'failed'],
        description: 'Filter by status (optional)',
      },
    },
    required: [],
  },
};

export async function getScheduledOrders(params: { status?: string }): Promise<ToolResponse> {
  const requestId = logger.toolStart('get_scheduled_orders', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to view scheduled orders.',
      };
    }

    const result = await apiClient.getScheduledOrders();
    
    // Filter by status if provided
    let orders = result.scheduledOrders;
    if (params.status) {
      orders = orders.filter(o => o.status === params.status);
    }

    if (orders.length === 0) {
      return {
        success: true,
        message: params.status 
          ? `No ${params.status} scheduled orders found.`
          : 'No scheduled orders found.',
        data: {
          scheduled_orders: [],
        },
      };
    }

    const pendingCount = orders.filter(o => o.status === 'pending').length;
    
    const response: ToolResponse = {
      success: true,
      message: `Found ${orders.length} scheduled order(s)` +
        (pendingCount > 0 ? `. ${pendingCount} pending.` : '.'),
      data: {
        scheduled_orders: orders.map(order => {
          const scheduledDate = new Date(order.scheduledTime);
          return {
            id: order._id,
            scheduled_time: order.scheduledTime,
            formatted_time: scheduledDate.toLocaleString('en-IN', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            status: order.status,
            payment_type: order.paymentType,
            total_items: order.cartSnapshot.totalItems,
            total_amount: order.billSnapshot.totalAmount,
            notes: order.notes,
            executed_at: order.executedAt,
            result_order: order.resultOrderId,
            failure_reason: order.failureReason,
          };
        }),
        summary: {
          total: orders.length,
          pending: orders.filter(o => o.status === 'pending').length,
          completed: orders.filter(o => o.status === 'completed').length,
          cancelled: orders.filter(o => o.status === 'cancelled').length,
          failed: orders.filter(o => o.status === 'failed').length,
        },
      },
    };

    logger.toolSuccess(requestId, 'get_scheduled_orders', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get scheduled orders';
    logger.toolError(requestId, 'get_scheduled_orders', errorMessage);

    return {
      success: false,
      message: `Failed to get scheduled orders: ${errorMessage}`,
    };
  }
}

// ============================================
// Cancel Scheduled Order Tool
// ============================================

export const cancelScheduledOrderDefinition = {
  name: 'cancel_scheduled_order',
  description: `Cancel a pending scheduled order.

Only pending orders can be cancelled. Once an order starts processing or is completed, it cannot be cancelled.

Use this when user wants to cancel a scheduled delivery.
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      order_id: {
        type: 'string',
        description: 'The scheduled order ID to cancel (from get_scheduled_orders)',
      },
    },
    required: ['order_id'],
  },
};

export async function cancelScheduledOrder(params: { order_id: string }): Promise<ToolResponse> {
  const requestId = logger.toolStart('cancel_scheduled_order', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to cancel a scheduled order.',
      };
    }

    if (!params.order_id) {
      return {
        success: false,
        message: 'Order ID is required. Use get_scheduled_orders to see your scheduled orders.',
      };
    }

    await apiClient.cancelScheduledOrder(params.order_id);

    const response: ToolResponse = {
      success: true,
      message: 'Scheduled order cancelled successfully. Your cart items are still saved.',
      data: {
        cancelled_order_id: params.order_id,
      },
    };

    logger.toolSuccess(requestId, 'cancel_scheduled_order', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel scheduled order';
    logger.toolError(requestId, 'cancel_scheduled_order', errorMessage);

    return {
      success: false,
      message: `Failed to cancel scheduled order: ${errorMessage}`,
    };
  }
}

// ============================================
// Execute Scheduled Order Tool (Manual)
// ============================================

export const executeScheduledOrderDefinition = {
  name: 'execute_scheduled_order',
  description: `Manually execute a pending scheduled order immediately.

Use this when user wants to place a scheduled order now instead of waiting.
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      order_id: {
        type: 'string',
        description: 'The scheduled order ID to execute (from get_scheduled_orders)',
      },
    },
    required: ['order_id'],
  },
};

export async function executeScheduledOrderNow(params: { order_id: string }): Promise<ToolResponse> {
  const requestId = logger.toolStart('execute_scheduled_order', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to execute a scheduled order.',
      };
    }

    if (!params.order_id) {
      return {
        success: false,
        message: 'Order ID is required. Use get_scheduled_orders to see your scheduled orders.',
      };
    }

    const result = await apiClient.executeScheduledOrder(params.order_id);

    const response: ToolResponse = {
      success: true,
      message: `Order placed successfully! Order #${result.order.orderNumber}. Your delivery is on the way.`,
      data: {
        order: {
          order_id: result.order.orderId,
          order_number: result.order.orderNumber,
        },
      },
    };

    logger.toolSuccess(requestId, 'execute_scheduled_order', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute scheduled order';
    logger.toolError(requestId, 'execute_scheduled_order', errorMessage);

    return {
      success: false,
      message: `Failed to execute scheduled order: ${errorMessage}`,
    };
  }
}
