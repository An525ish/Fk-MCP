/**
 * Order History Tools
 * View order history, analyze patterns, and reorder from previous orders
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import type { ToolResponse, ReorderParams } from '../types/index.js';

// ============================================
// Get Order History Tool
// ============================================

export const getOrderHistoryDefinition = {
  name: 'get_order_history',
  description: `Get the user's order history with optional analysis.

Returns:
- List of recent orders with status and totals
- Order analysis (total spent, average order value, most ordered items)
- Order frequency patterns

Use this when user asks about their past orders or wants to reorder.
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      include_analysis: {
        type: 'boolean',
        description: 'Include detailed analysis of order patterns (default: true)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of orders to return (default: 10)',
      },
    },
    required: [],
  },
};

export async function getOrderHistory(params: { include_analysis?: boolean; limit?: number }): Promise<ToolResponse> {
  const requestId = logger.toolStart('get_order_history', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to view your order history.',
      };
    }

    const includeAnalysis = params.include_analysis !== false;
    
    // Get order history
    const historyResult = await apiClient.getOrderHistory();
    const orders = historyResult.orders.slice(0, params.limit || 10);

    if (orders.length === 0) {
      return {
        success: true,
        message: 'No orders found. Start shopping to build your order history!',
        data: {
          orders: [],
          analysis: null,
        },
      };
    }

    // Get analysis if requested
    let analysis = null;
    if (includeAnalysis) {
      try {
        const analysisResult = await apiClient.getOrderAnalysis();
        analysis = analysisResult.analysis;
      } catch {
        // Analysis failed, continue without it
      }
    }

    // Build summary
    const totalSpent = analysis?.totalSpent || orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgOrder = analysis?.averageOrderValue || Math.round(totalSpent / orders.length);

    const response: ToolResponse = {
      success: true,
      message: `Found ${orders.length} orders. Total spent: ₹${totalSpent}. Average order: ₹${avgOrder}.`,
      data: {
        orders: orders.map(order => ({
          order_id: order._id,
          order_number: order.orderNumber,
          date: order.createdAt,
          formatted_date: new Date(order.createdAt).toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          total_amount: order.totalAmount,
          status: order.orderStatus,
        })),
        analysis: analysis ? {
          total_orders: analysis.totalOrders,
          total_spent: analysis.totalSpent,
          average_order_value: analysis.averageOrderValue,
          most_ordered_items: analysis.mostOrderedItems?.slice(0, 5).map(item => ({
            name: item.name,
            order_count: item.orderCount,
            total_quantity: item.totalQuantity,
          })),
          order_frequency: analysis.orderFrequency,
        } : null,
      },
    };

    logger.toolSuccess(requestId, 'get_order_history', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get order history';
    logger.toolError(requestId, 'get_order_history', errorMessage);

    return {
      success: false,
      message: `Failed to get order history: ${errorMessage}`,
    };
  }
}

// ============================================
// Reorder Tool
// ============================================

export const reorderDefinition = {
  name: 'reorder',
  description: `Reorder items from a previous order.

Adds all available items from a previous order to the current cart.
Handles unavailable items gracefully and reports what couldn't be added.

Use this when user says "order the same as last time" or wants to repeat a previous order.
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      order_id: {
        type: 'string',
        description: 'The order ID to reorder from (from get_order_history)',
      },
    },
    required: ['order_id'],
  },
};

export async function reorder(params: ReorderParams): Promise<ToolResponse> {
  const requestId = logger.toolStart('reorder', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to reorder.',
      };
    }

    if (!params.order_id) {
      return {
        success: false,
        message: 'Order ID is required. Use get_order_history to see your past orders.',
      };
    }

    // Reorder to cart
    const result = await apiClient.reorderFromPrevious(params.order_id);

    const addedCount = result.cart.items.length;
    const totalAmount = result.bill.totalAmount;

    const response: ToolResponse = {
      success: true,
      message: `Added ${addedCount} items to cart from your previous order. Cart total: ₹${totalAmount}.`,
      data: {
        cart: {
          items: result.cart.items.map(item => ({
            product_id: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            unit: item.unit,
          })),
          total_items: result.cart.totalItems,
        },
        bill: {
          subtotal: result.bill.subtotal,
          delivery_fee: result.bill.deliveryFee,
          taxes: result.bill.taxes,
          total_amount: result.bill.totalAmount,
          free_delivery_threshold: result.bill.freeDeliveryThreshold,
          amount_to_free_delivery: result.bill.amountToFreeDelivery,
        },
      },
    };

    logger.toolSuccess(requestId, 'reorder', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to reorder';
    logger.toolError(requestId, 'reorder', errorMessage);

    return {
      success: false,
      message: `Failed to reorder: ${errorMessage}`,
    };
  }
}

// ============================================
// Get Last Order Tool
// ============================================

export const getLastOrderDefinition = {
  name: 'get_last_order',
  description: `Get details of the user's most recent order.

Returns full details of the last order including items, amounts, and status.
Useful for quick reorder or checking recent order status.

Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function getLastOrder(): Promise<ToolResponse> {
  const requestId = logger.toolStart('get_last_order', {});

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to view your last order.',
      };
    }

    // Get order history (just the first one)
    const historyResult = await apiClient.getOrderHistory();
    
    if (historyResult.orders.length === 0) {
      return {
        success: true,
        message: 'No orders found. You haven\'t placed any orders yet.',
        data: {
          last_order: null,
        },
      };
    }

    const lastOrder = historyResult.orders[0];
    const orderDate = new Date(lastOrder.createdAt);

    const response: ToolResponse = {
      success: true,
      message: `Your last order #${lastOrder.orderNumber} was placed on ${orderDate.toLocaleDateString('en-IN')}. ` +
        `Total: ₹${lastOrder.totalAmount}. Status: ${lastOrder.orderStatus}.`,
      data: {
        last_order: {
          order_id: lastOrder._id,
          order_number: lastOrder.orderNumber,
          date: lastOrder.createdAt,
          formatted_date: orderDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          total_amount: lastOrder.totalAmount,
          status: lastOrder.orderStatus,
        },
        can_reorder: true,
        reorder_hint: `Use reorder with order_id="${lastOrder._id}" to add these items to your cart.`,
      },
    };

    logger.toolSuccess(requestId, 'get_last_order', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get last order';
    logger.toolError(requestId, 'get_last_order', errorMessage);

    return {
      success: false,
      message: `Failed to get last order: ${errorMessage}`,
    };
  }
}
