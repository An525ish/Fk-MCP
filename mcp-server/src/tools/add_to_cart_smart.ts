/**
 * add_to_cart_smart Tool
 * Adds items to cart with intelligent handling of:
 * - Stock anomalies (auto-suggest alternatives)
 * - Price protection (>10% increase triggers confirmation)
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import type { AddToCartParams, ToolResponse, Product } from '../types/index.js';

export const addToCartSmartDefinition = {
  name: 'add_to_cart_smart',
  description: `Add a product to the shopping cart with smart handling.

Features:
- Validates stock availability before adding
- If out of stock, automatically suggests alternatives
- After adding, checks for price changes (>10% triggers confirmation)
- Returns updated cart total and item count

Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      product_id: {
        type: 'string',
        description: 'The product ID to add (from search_catalog results)',
      },
      qty: {
        type: 'number',
        description: 'Quantity to add (default: 1, max: 10)',
      },
    },
    required: ['product_id'],
  },
};

interface AlternativeProduct {
  product_id: string;
  name: string;
  price: number;
  unit: string;
  rating: number;
  in_stock: boolean;
}

function formatAlternative(product: Product): AlternativeProduct {
  return {
    product_id: product._id,
    name: product.name,
    price: product.price,
    unit: product.unit,
    rating: product.rating,
    in_stock: product.stock > 0 && product.isAvailable,
  };
}

export async function addToCartSmart(params: AddToCartParams): Promise<ToolResponse> {
  const requestId = logger.toolStart('add_to_cart_smart', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool before adding items to cart.',
      };
    }

    // Validate parameters
    if (!params.product_id) {
      throw new Error('Product ID is required');
    }

    const quantity = params.qty || 1;
    if (quantity < 1 || quantity > 10) {
      throw new Error('Quantity must be between 1 and 10');
    }

    // First, get product details to check stock
    let productName = 'Unknown Product';
    try {
      const productResult = await apiClient.getProduct(params.product_id);
      productName = productResult.product.name;

      // Check if product is available
      if (!productResult.product.isAvailable || productResult.product.stock < quantity) {
        // Product is out of stock - fetch alternatives
        logger.info(`Product ${productName} is out of stock, fetching alternatives`);
        
        const alternatives = await apiClient.getAlternatives(params.product_id);
        const formattedAlternatives = alternatives.alternatives
          .filter(p => p.stock >= quantity && p.isAvailable)
          .slice(0, 5)
          .map(formatAlternative);

        const response: ToolResponse = {
          success: false,
          message: `"${productName}" is currently out of stock or has insufficient quantity. Here are some alternatives:`,
          requiresUserAction: true,
          actionType: 'select_alternative',
          data: {
            original_product: {
              product_id: params.product_id,
              name: productName,
              available_stock: productResult.product.stock,
              requested_qty: quantity,
            },
            alternatives: formattedAlternatives,
          },
          options: formattedAlternatives,
        };

        logger.toolSuccess(requestId, 'add_to_cart_smart', response);
        return response;
      }
    } catch (error) {
      // If product fetch fails, try to add anyway and let the cart API handle it
      logger.warn(`Could not fetch product details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Try to add to cart
    try {
      const cartResult = await apiClient.addToCart(params.product_id, quantity);

      // Check for price changes after adding
      const priceCheck = await apiClient.priceCheck();

      // Check if there are significant price changes
      if (priceCheck.hasSignificantChange) {
        const significantChanges = priceCheck.priceChanges.filter(c => c.requiresConfirmation);
        
        const response: ToolResponse = {
          success: true,
          message: `Added "${productName}" to cart, but detected price changes that require confirmation.`,
          requiresUserAction: true,
          actionType: 'confirm_price_change',
          data: {
            item_added: {
              product_id: params.product_id,
              name: productName,
              quantity,
            },
            cart: {
              total_items: cartResult.cart.totalItems,
              subtotal: cartResult.bill.subtotal,
              total_amount: cartResult.bill.totalAmount,
            },
            price_changes: significantChanges.map(change => ({
              product_id: change.productId,
              name: change.name,
              old_price: change.cartPrice,
              new_price: change.currentPrice,
              change_percent: change.changePercent,
              is_increase: change.isIncrease,
            })),
          },
          options: significantChanges,
        };

        logger.toolSuccess(requestId, 'add_to_cart_smart', response);
        return response;
      }

      // Success - no issues
      const response: ToolResponse = {
        success: true,
        message: `Added ${quantity}x "${productName}" to cart. Cart total: ₹${cartResult.bill.totalAmount} (${cartResult.cart.totalItems} items).`,
        data: {
          item_added: {
            product_id: params.product_id,
            name: productName,
            quantity,
          },
          cart: {
            items: cartResult.cart.items.map(item => ({
              product_id: item.productId,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              unit: item.unit,
            })),
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
        },
      };

      logger.toolSuccess(requestId, 'add_to_cart_smart', response);
      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add to cart';

      // Check if it's a stock error
      if (errorMessage.includes('stock') || errorMessage.includes('available')) {
        // Fetch alternatives
        try {
          const alternatives = await apiClient.getAlternatives(params.product_id);
          const formattedAlternatives = alternatives.alternatives
            .filter(p => p.stock >= quantity && p.isAvailable)
            .slice(0, 5)
            .map(formatAlternative);

          const response: ToolResponse = {
            success: false,
            message: `Could not add "${productName}" to cart: ${errorMessage}. Here are some alternatives:`,
            requiresUserAction: true,
            actionType: 'select_alternative',
            data: {
              original_product: {
                product_id: params.product_id,
                name: productName,
              },
              error: errorMessage,
              alternatives: formattedAlternatives,
            },
            options: formattedAlternatives,
          };

          logger.toolSuccess(requestId, 'add_to_cart_smart', response);
          return response;
        } catch {
          // If alternatives fetch fails, return original error
        }
      }

      throw error;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add to cart';
    logger.toolError(requestId, 'add_to_cart_smart', errorMessage);

    return {
      success: false,
      message: `Failed to add to cart: ${errorMessage}`,
    };
  }
}
