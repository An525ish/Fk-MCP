/**
 * User Preferences Tools
 * ALL preferences derived from order history - no separate storage
 * 
 * This approach:
 * - Analyzes last 25 orders to understand user behavior
 * - Infers dietary preference only if there's a strong pattern (>80%)
 * - Always asks for servings (varies per order)
 * - Computes frequent items, brands, payment methods from actual orders
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import type { ToolResponse } from '../types/index.js';

// ============================================
// Get User Preferences Tool
// ============================================

export const getUserPreferencesDefinition = {
  name: 'get_user_preferences',
  description: `Get the user's preferences derived from their order history.

ALL preferences are computed from the last 25 orders - nothing is stored separately.

Returns:
- hasOrderHistory: Whether user has any orders to analyze
- frequentItems: Most ordered products with quantities
- shoppingPatterns: Preferred days, times, avg order value
- preferredBrands: Top brands based on purchase history
- preferredPaymentMethod: Most used payment method
- inferredDietaryPreference: Only if >80% of orders are veg or non-veg
- typicalOrderSize: Median items per order
- shouldAsk: Guidance on what questions to ask the user

Use this to understand user behavior before making recommendations.
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      orders: {
        type: 'number',
        description: 'Number of recent orders to analyze (default: 25, max: 50)',
      },
    },
    required: [],
  },
};

export async function getUserPreferences(params: { orders?: number } = {}): Promise<ToolResponse> {
  const requestId = logger.toolStart('get_user_preferences', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to access your preferences.',
      };
    }

    const result = await apiClient.getPreferences();
    const prefs = result.preferences;

    // Build a human-readable summary
    const summaryParts: string[] = [];
    
    if (!prefs.hasOrderHistory) {
      return {
        success: true,
        message: 'No order history found. I\'ll ask for your preferences as we go.',
        data: {
          has_order_history: false,
          should_ask: {
            dietary_preference: true,
            servings: true,
          },
        },
      };
    }

    summaryParts.push(`Analyzed ${prefs.totalOrders} orders`);
    
    if (prefs.inferredDietaryPreference) {
      if (prefs.inferredDietaryPreference.type === 'veg' && prefs.inferredDietaryPreference.confidence) {
        summaryParts.push(`Mostly vegetarian (${Math.round(prefs.inferredDietaryPreference.confidence)}%)`);
      } else if (prefs.inferredDietaryPreference.type === 'non_veg' && prefs.inferredDietaryPreference.confidence) {
        summaryParts.push(`Mostly non-veg (${Math.round(prefs.inferredDietaryPreference.confidence)}%)`);
      } else {
        summaryParts.push('Mixed dietary preferences');
      }
    }
    
    if (prefs.typicalOrderSize) {
      summaryParts.push(`Typical order: ${prefs.typicalOrderSize} items`);
    }

    if (prefs.shoppingPatterns?.averageOrderValue) {
      summaryParts.push(`Avg order: ₹${prefs.shoppingPatterns.averageOrderValue}`);
    }

    const response: ToolResponse = {
      success: true,
      message: summaryParts.join(' | '),
      data: {
        has_order_history: prefs.hasOrderHistory,
        total_orders: prefs.totalOrders,
        // Inferred preferences
        inferred_dietary: prefs.inferredDietaryPreference,
        typical_order_size: prefs.typicalOrderSize,
        // Shopping behavior
        frequent_items: prefs.frequentItems?.slice(0, 10).map(item => ({
          product_id: item.productId,
          name: item.name,
          price: item.price,
          avg_quantity: item.avgQuantity,
          order_count: item.orderCount,
          dietary_type: item.dietaryType,
        })) || [],
        shopping_patterns: prefs.shoppingPatterns ? {
          preferred_days: prefs.shoppingPatterns.preferredOrderDays,
          preferred_time: prefs.shoppingPatterns.preferredOrderTime,
          average_order_value: prefs.shoppingPatterns.averageOrderValue,
          order_frequency_days: prefs.shoppingPatterns.averageOrderFrequencyDays,
        } : null,
        preferred_payment_method: prefs.preferredPaymentMethod,
        preferred_brands: prefs.preferredBrands?.map(b => b.brand) || [],
        // What to ask user
        should_ask: prefs.shouldAsk,
      },
    };

    logger.toolSuccess(requestId, 'get_user_preferences', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get preferences';
    logger.toolError(requestId, 'get_user_preferences', errorMessage);

    return {
      success: false,
      message: `Failed to get preferences: ${errorMessage}`,
    };
  }
}

// ============================================
// Get Frequent Items Tool
// ============================================

export const getFrequentItemsDefinition = {
  name: 'get_frequent_items',
  description: `Get the user's most frequently ordered items from order history.

Returns products the user orders most often, including:
- Product details (name, price, brand)
- Order count and average quantity
- Dietary type (veg/non-veg)
- Current availability

Useful for:
- Quick reorder suggestions
- "Order my usual" functionality
- Understanding shopping patterns

Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of items to return (default: 10, max: 50)',
      },
    },
    required: [],
  },
};

export async function getFrequentItems(params: { limit?: number }): Promise<ToolResponse> {
  const requestId = logger.toolStart('get_frequent_items', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to see your frequent items.',
      };
    }

    const limit = Math.min(params.limit || 10, 50);
    const result = await apiClient.getFrequentItems(limit);

    if (result.frequentItems.length === 0) {
      return {
        success: true,
        message: 'No order history found yet. Your frequently ordered items will appear here after you place some orders.',
        data: {
          frequent_items: [],
          total_orders: 0,
        },
      };
    }

    const response: ToolResponse = {
      success: true,
      message: `Found ${result.frequentItems.length} frequently ordered items from ${result.totalOrders} orders. Top item: "${result.frequentItems[0].name}" (ordered ${result.frequentItems[0].orderCount} times).`,
      data: {
        frequent_items: result.frequentItems.map(item => ({
          product_id: item.productId,
          name: item.name,
          price: item.price,
          unit: item.unit,
          brand: item.brand,
          dietary_type: item.dietaryType,
          is_available: item.isAvailable,
          order_count: item.orderCount,
          avg_quantity: item.avgQuantity,
          last_ordered: item.lastOrdered,
        })),
        total_orders: result.totalOrders,
      },
    };

    logger.toolSuccess(requestId, 'get_frequent_items', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get frequent items';
    logger.toolError(requestId, 'get_frequent_items', errorMessage);

    return {
      success: false,
      message: `Failed to get frequent items: ${errorMessage}`,
    };
  }
}

// ============================================
// Get Shopping Patterns Tool
// ============================================

export const getShoppingPatternsDefinition = {
  name: 'get_shopping_patterns',
  description: `Get the user's shopping patterns derived from order history.

Analyzes recent orders to show:
- Preferred shopping days (e.g., weekends)
- Preferred shopping time (morning/afternoon/evening)
- Average order value
- Order frequency
- Preferred brands (based on purchases)
- Preferred payment method
- Inferred dietary preference (if strong pattern exists)
- Typical order size

All data computed on-the-fly from order history.
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function getShoppingPatterns(): Promise<ToolResponse> {
  const requestId = logger.toolStart('get_shopping_patterns', {});

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to see your shopping patterns.',
      };
    }

    const result = await apiClient.getShoppingPatterns();

    if (!result.patterns) {
      return {
        success: true,
        message: 'Not enough order history to analyze patterns. Place a few orders and try again.',
        data: {
          patterns: null,
        },
      };
    }

    const patterns = result.patterns;
    const insights: string[] = [];

    if (patterns.preferredOrderDays && patterns.preferredOrderDays.length > 0) {
      insights.push(`Usually shops on ${patterns.preferredOrderDays.join(' and ')}`);
    }
    if (patterns.preferredOrderTime) {
      insights.push(`preferred time: ${patterns.preferredOrderTime}`);
    }
    if (patterns.averageOrderValue) {
      insights.push(`average order: ₹${patterns.averageOrderValue}`);
    }
    if (patterns.averageOrderFrequencyDays) {
      insights.push(`orders every ~${patterns.averageOrderFrequencyDays} days`);
    }

    const response: ToolResponse = {
      success: true,
      message: insights.length > 0 
        ? `Shopping patterns (from ${patterns.totalOrders} orders): ${insights.join(', ')}.`
        : 'Shopping patterns analyzed.',
      data: {
        patterns: {
          preferred_days: patterns.preferredOrderDays,
          preferred_time: patterns.preferredOrderTime,
          average_order_value: patterns.averageOrderValue,
          order_frequency_days: patterns.averageOrderFrequencyDays,
          total_orders: patterns.totalOrders,
        },
        preferred_payment_method: result.preferredPaymentMethod,
        preferred_brands: result.preferredBrands?.map(b => b.brand) || [],
        inferred_dietary: result.inferredDietaryPreference,
        typical_order_size: result.typicalOrderSize,
      },
    };

    logger.toolSuccess(requestId, 'get_shopping_patterns', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get shopping patterns';
    logger.toolError(requestId, 'get_shopping_patterns', errorMessage);

    return {
      success: false,
      message: `Failed to get shopping patterns: ${errorMessage}`,
    };
  }
}
