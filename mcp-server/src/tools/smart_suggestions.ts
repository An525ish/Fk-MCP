/**
 * Smart Suggestions Tool
 * Provides context-aware product and action recommendations
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import type { ToolResponse, SmartSuggestion } from '../types/index.js';

// Time-based suggestion mappings
const TIME_BASED_SUGGESTIONS: Record<string, { category: string; products: string[]; message: string }> = {
  morning: {
    category: 'breakfast',
    products: ['milk', 'bread', 'eggs', 'butter', 'tea', 'coffee'],
    message: 'Good morning! Here are some breakfast essentials:',
  },
  afternoon: {
    category: 'lunch',
    products: ['rice', 'dal', 'vegetables', 'curd'],
    message: 'Lunch time! Need any ingredients?',
  },
  evening: {
    category: 'snacks',
    products: ['tea', 'biscuits', 'chips', 'namkeen', 'coffee'],
    message: 'Tea time! How about some snacks?',
  },
  night: {
    category: 'dinner',
    products: ['vegetables', 'rice', 'chapati', 'paneer'],
    message: 'Planning dinner? Here are some suggestions:',
  },
};

// Complementary product mappings
const COMPLEMENTARY_PRODUCTS: Record<string, string[]> = {
  'bread': ['butter', 'cheese', 'eggs', 'jam'],
  'rice': ['dal', 'ghee', 'curd', 'pickle'],
  'biryani masala': ['rice', 'chicken', 'onions', 'curd', 'ghee', 'saffron'],
  'chicken': ['onions', 'tomatoes', 'ginger garlic paste', 'spices'],
  'paneer': ['onions', 'tomatoes', 'capsicum', 'cream'],
  'maggi': ['vegetables', 'eggs', 'cheese'],
  'tea': ['milk', 'sugar', 'biscuits'],
  'coffee': ['milk', 'sugar'],
  'eggs': ['bread', 'butter', 'onions', 'tomatoes'],
  'milk': ['bread', 'cornflakes', 'oats'],
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 20) return 'evening';
  return 'night';
}

function getDayContext(): { isWeekend: boolean; dayName: string } {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const isWeekend = dayName === 'saturday' || dayName === 'sunday';
  return { isWeekend, dayName };
}

export const getSmartSuggestionsDefinition = {
  name: 'get_smart_suggestions',
  description: `Get intelligent, context-aware product suggestions.

Provides suggestions based on:
- Time of day (breakfast items in morning, snacks in evening)
- Current cart contents (complementary products)
- User preferences and order history
- Free delivery threshold (suggest items to reach it)
- Day of week (party suggestions on weekends)

Use this to proactively help users discover relevant products.
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      context: {
        type: 'string',
        enum: ['time_based', 'cart_based', 'budget', 'all'],
        description: 'Type of suggestions to get (default: all)',
      },
    },
    required: [],
  },
};

export async function getSmartSuggestions(params: { context?: string }): Promise<ToolResponse> {
  const requestId = logger.toolStart('get_smart_suggestions', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to get personalized suggestions.',
      };
    }

    const suggestions: SmartSuggestion[] = [];
    const contextType = params.context || 'all';
    
    // Get current cart
    let cartValue = 0;
    let cartItems: string[] = [];
    let freeDeliveryGap = 0;
    
    try {
      const cart = await apiClient.getCart();
      cartValue = cart.bill.totalAmount;
      cartItems = cart.cart.items.map(item => item.name.toLowerCase());
      freeDeliveryGap = cart.bill.amountToFreeDelivery || 0;
    } catch {
      // Cart might be empty or error, continue
    }

    // Get user preferences (derived from order history)
    let userPreferences: { dietaryPreference?: string | null } | null = null;
    try {
      const prefs = await apiClient.getPreferences();
      // Use inferred dietary preference if strong signal exists
      const inferred = prefs.preferences.inferredDietaryPreference;
      userPreferences = {
        dietaryPreference: inferred && inferred.type !== 'mixed' ? inferred.type : null,
      };
    } catch {
      // Preferences might not exist, continue
    }

    const timeOfDay = getTimeOfDay();
    const { isWeekend, dayName } = getDayContext();

    // 1. Time-based suggestions
    if (contextType === 'all' || contextType === 'time_based') {
      const timeSuggestion = TIME_BASED_SUGGESTIONS[timeOfDay];
      if (timeSuggestion) {
        const productsToSuggest = timeSuggestion.products
          .filter(p => !cartItems.some(ci => ci.includes(p)))
          .slice(0, 4);
        
        if (productsToSuggest.length > 0) {
          // Search for actual products
          const productResults: Array<{ productId: string; name: string; price: number; unit: string; reason: string }> = [];
          
          for (const query of productsToSuggest.slice(0, 3)) {
            try {
              const result = await apiClient.smartSearch(query);
              if (result.products.length > 0) {
                const product = result.products[0];
                // Filter by dietary preference if set
                if (userPreferences?.dietaryPreference === 'veg' && product.dietaryPreference === 'non_veg') {
                  continue;
                }
                productResults.push({
                  productId: product._id,
                  name: product.name,
                  price: product.price,
                  unit: product.unit,
                  reason: `Popular ${timeOfDay} item`,
                });
              }
            } catch {
              // Skip if search fails
            }
          }
          
          if (productResults.length > 0) {
            suggestions.push({
              type: 'time_based',
              title: `${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)} Essentials`,
              message: timeSuggestion.message,
              products: productResults,
            });
          }
        }
      }
    }

    // 2. Cart-based complementary suggestions
    if ((contextType === 'all' || contextType === 'cart_based') && cartItems.length > 0) {
      const complementaryItems: Set<string> = new Set();
      
      for (const cartItem of cartItems) {
        for (const [key, complements] of Object.entries(COMPLEMENTARY_PRODUCTS)) {
          if (cartItem.includes(key)) {
            complements.forEach(c => {
              if (!cartItems.some(ci => ci.includes(c))) {
                complementaryItems.add(c);
              }
            });
          }
        }
      }
      
      if (complementaryItems.size > 0) {
        const productResults: Array<{ productId: string; name: string; price: number; unit: string; reason: string }> = [];
        
        for (const query of Array.from(complementaryItems).slice(0, 3)) {
          try {
            const result = await apiClient.smartSearch(query);
            if (result.products.length > 0) {
              const product = result.products[0];
              if (userPreferences?.dietaryPreference === 'veg' && product.dietaryPreference === 'non_veg') {
                continue;
              }
              productResults.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                unit: product.unit,
                reason: 'Goes well with items in your cart',
              });
            }
          } catch {
            // Skip if search fails
          }
        }
        
        if (productResults.length > 0) {
          suggestions.push({
            type: 'complementary',
            title: 'You Might Also Need',
            message: 'These items complement what\'s in your cart:',
            products: productResults,
          });
        }
      }
    }

    // 3. Budget/Free delivery suggestions
    if ((contextType === 'all' || contextType === 'budget') && freeDeliveryGap > 0 && freeDeliveryGap <= 100) {
      try {
        // Search for items around the gap price
        const result = await apiClient.smartSearch('snacks');
        const affordableProducts = result.products
          .filter(p => p.price <= freeDeliveryGap + 20 && p.price >= freeDeliveryGap - 20)
          .slice(0, 3);
        
        if (affordableProducts.length > 0) {
          suggestions.push({
            type: 'budget',
            title: 'Unlock Free Delivery',
            message: `Add ₹${freeDeliveryGap} more to get free delivery! Here are some options:`,
            products: affordableProducts.map(p => ({
              productId: p._id,
              name: p.name,
              price: p.price,
              unit: p.unit,
              reason: `Just ₹${p.price} - perfect to reach free delivery`,
            })),
          });
        }
      } catch {
        // Skip if search fails
      }
    }

    // 4. Weekend/Occasion suggestions
    if (contextType === 'all' && isWeekend) {
      try {
        const result = await apiClient.smartSearch('party snacks');
        const partyProducts = result.products.slice(0, 3);
        
        if (partyProducts.length > 0) {
          suggestions.push({
            type: 'occasion',
            title: 'Weekend Treats',
            message: 'It\'s the weekend! Planning something special?',
            products: partyProducts.map(p => ({
              productId: p._id,
              name: p.name,
              price: p.price,
              unit: p.unit,
              reason: 'Popular weekend choice',
            })),
          });
        }
      } catch {
        // Skip if search fails
      }
    }

    // 5. Reorder suggestions from frequent items
    if (contextType === 'all') {
      try {
        const frequentItems = await apiClient.getFrequentItems(5);
        const availableFrequent = frequentItems.frequentItems
          .filter(item => item.isAvailable && !cartItems.some(ci => ci.includes(item.name.toLowerCase())))
          .slice(0, 3);
        
        if (availableFrequent.length > 0) {
          suggestions.push({
            type: 'reorder',
            title: 'Your Favorites',
            message: 'Items you order frequently:',
            products: availableFrequent.map(item => ({
              productId: item.productId,
              name: item.name,
              price: item.price,
              unit: item.unit,
              reason: `Ordered ${item.orderCount} times`,
            })),
          });
        }
      } catch {
        // Skip if fetch fails
      }
    }

    if (suggestions.length === 0) {
      return {
        success: true,
        message: 'No specific suggestions at the moment. Browse our catalog or search for what you need!',
        data: {
          suggestions: [],
          context: {
            time_of_day: timeOfDay,
            cart_value: cartValue,
            is_weekend: isWeekend,
          },
        },
      };
    }

    const response: ToolResponse = {
      success: true,
      message: `Found ${suggestions.length} suggestion categories for you.`,
      data: {
        suggestions,
        context: {
          time_of_day: timeOfDay,
          cart_value: cartValue,
          free_delivery_gap: freeDeliveryGap,
          is_weekend: isWeekend,
          day_name: dayName,
        },
      },
    };

    logger.toolSuccess(requestId, 'get_smart_suggestions', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get suggestions';
    logger.toolError(requestId, 'get_smart_suggestions', errorMessage);

    return {
      success: false,
      message: `Failed to get suggestions: ${errorMessage}`,
    };
  }
}
