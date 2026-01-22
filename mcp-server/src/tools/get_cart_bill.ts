/**
 * get_cart_bill Tool
 * Returns the current cart contents with itemized breakdown
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import type { ToolResponse } from '../types/index.js';

export const getCartBillDefinition = {
  name: 'get_cart_bill',
  description: `Get the current shopping cart contents and bill breakdown.

Returns:
- List of items with quantities and prices
- Subtotal, delivery fee, taxes
- Total amount
- Free delivery threshold info

Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function getCartBill(): Promise<ToolResponse> {
  const requestId = logger.toolStart('get_cart_bill', {});

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to view your cart.',
      };
    }

    // Get cart
    const cartResult = await apiClient.getCart();

    // Check if cart is empty
    if (cartResult.cart.items.length === 0) {
      const response: ToolResponse = {
        success: true,
        message: 'Your cart is empty. Use search_catalog to find products and add_to_cart_smart to add them.',
        data: {
          cart: {
            items: [],
            total_items: 0,
          },
          bill: {
            subtotal: 0,
            delivery_fee: cartResult.bill.deliveryFee,
            taxes: 0,
            total_amount: cartResult.bill.deliveryFee,
            free_delivery_threshold: cartResult.bill.freeDeliveryThreshold,
            amount_to_free_delivery: cartResult.bill.freeDeliveryThreshold,
          },
        },
      };

      logger.toolSuccess(requestId, 'get_cart_bill', response);
      return response;
    }

    // Format cart items
    const formattedItems = cartResult.cart.items.map(item => ({
      product_id: item.productId,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      line_total: item.price * item.quantity,
      unit: item.unit,
    }));

    // Build summary message
    const itemSummary = formattedItems
      .map(item => `${item.quantity}x ${item.name} (₹${item.line_total})`)
      .join(', ');

    let deliveryNote = '';
    if (cartResult.bill.deliveryFee === 0) {
      deliveryNote = ' Free delivery applied!';
    } else if (cartResult.bill.amountToFreeDelivery > 0) {
      deliveryNote = ` Add ₹${cartResult.bill.amountToFreeDelivery} more for free delivery.`;
    }

    const response: ToolResponse = {
      success: true,
      message: `Cart has ${cartResult.cart.totalItems} items. Total: ₹${cartResult.bill.totalAmount}.${deliveryNote}`,
      data: {
        cart: {
          items: formattedItems,
          total_items: cartResult.cart.totalItems,
        },
        bill: {
          subtotal: cartResult.bill.subtotal,
          delivery_fee: cartResult.bill.deliveryFee,
          taxes: cartResult.bill.taxes,
          total_amount: cartResult.bill.totalAmount,
          free_delivery_threshold: cartResult.bill.freeDeliveryThreshold,
          amount_to_free_delivery: cartResult.bill.amountToFreeDelivery,
        },
        summary: itemSummary,
      },
    };

    logger.toolSuccess(requestId, 'get_cart_bill', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get cart';
    logger.toolError(requestId, 'get_cart_bill', errorMessage);

    return {
      success: false,
      message: `Failed to get cart: ${errorMessage}`,
    };
  }
}
