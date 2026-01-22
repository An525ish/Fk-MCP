/**
 * Tool Registry
 * Exports all tool definitions and handlers
 */

// Tool definitions
export { loginUserDefinition, loginUser } from './login_user.js';
export { logoutUserDefinition, logoutUser } from './logout_user.js';
export { searchCatalogDefinition, searchCatalog } from './search_catalog.js';
export { addToCartSmartDefinition, addToCartSmart } from './add_to_cart_smart.js';
export { getCartBillDefinition, getCartBill } from './get_cart_bill.js';
export { validateLocationDefinition, validateLocation, getAddressesDefinition, getAddresses } from './validate_location.js';
export { executeOrderDefinition, executeOrder } from './execute_order.js';
export { 
  getUserPreferencesDefinition, getUserPreferences,
  getFrequentItemsDefinition, getFrequentItems,
  getShoppingPatternsDefinition, getShoppingPatterns
} from './user_preferences.js';
export {
  recipeToCartDefinition, recipeToCart,
  listRecipesDefinition, listRecipes
} from './recipe_to_cart.js';
export {
  understandIntentDefinition, understandIntent
} from './understand_intent.js';
export {
  scheduleOrderDefinition, scheduleOrder,
  getScheduledOrdersDefinition, getScheduledOrders,
  cancelScheduledOrderDefinition, cancelScheduledOrder,
  executeScheduledOrderDefinition, executeScheduledOrderNow
} from './scheduled_orders.js';
export {
  getOrderHistoryDefinition, getOrderHistory,
  reorderDefinition, reorder,
  getLastOrderDefinition, getLastOrder
} from './order_history.js';
export {
  getSmartSuggestionsDefinition, getSmartSuggestions
} from './smart_suggestions.js';
export {
  getContextDefinition, getContext,
  updateContextDefinition, updateContext,
  resolveClarificationDefinition, resolveClarificationTool,
  clearContextDefinition, clearContext
} from './conversation.js';

import type { ToolResponse, RecipeToCartParams, UnderstandIntentParams, ScheduleOrderParams, ReorderParams } from '../types/index.js';

// Import all definitions
import { loginUserDefinition, loginUser } from './login_user.js';
import { logoutUserDefinition, logoutUser } from './logout_user.js';
import { searchCatalogDefinition, searchCatalog } from './search_catalog.js';
import { addToCartSmartDefinition, addToCartSmart } from './add_to_cart_smart.js';
import { getCartBillDefinition, getCartBill } from './get_cart_bill.js';
import { validateLocationDefinition, validateLocation, getAddressesDefinition, getAddresses } from './validate_location.js';
import { executeOrderDefinition, executeOrder } from './execute_order.js';
import { 
  getUserPreferencesDefinition, getUserPreferences,
  getFrequentItemsDefinition, getFrequentItems,
  getShoppingPatternsDefinition, getShoppingPatterns
} from './user_preferences.js';
import {
  recipeToCartDefinition, recipeToCart,
  listRecipesDefinition, listRecipes
} from './recipe_to_cart.js';
import {
  understandIntentDefinition, understandIntent
} from './understand_intent.js';
import {
  scheduleOrderDefinition, scheduleOrder,
  getScheduledOrdersDefinition, getScheduledOrders,
  cancelScheduledOrderDefinition, cancelScheduledOrder,
  executeScheduledOrderDefinition, executeScheduledOrderNow
} from './scheduled_orders.js';
import {
  getOrderHistoryDefinition, getOrderHistory,
  reorderDefinition, reorder,
  getLastOrderDefinition, getLastOrder
} from './order_history.js';
import {
  getSmartSuggestionsDefinition, getSmartSuggestions
} from './smart_suggestions.js';
import {
  getContextDefinition, getContext,
  updateContextDefinition, updateContext,
  resolveClarificationDefinition, resolveClarificationTool,
  clearContextDefinition, clearContext
} from './conversation.js';

// Tool definitions array for MCP server registration
export const toolDefinitions = [
  loginUserDefinition,
  logoutUserDefinition,
  searchCatalogDefinition,
  addToCartSmartDefinition,
  getCartBillDefinition,
  getAddressesDefinition,
  validateLocationDefinition,
  executeOrderDefinition,
  // User Preferences Tools (all derived from order history)
  getUserPreferencesDefinition,
  getFrequentItemsDefinition,
  getShoppingPatternsDefinition,
  // Recipe Tools
  recipeToCartDefinition,
  listRecipesDefinition,
  // Intent Understanding
  understandIntentDefinition,
  // Scheduled Orders
  scheduleOrderDefinition,
  getScheduledOrdersDefinition,
  cancelScheduledOrderDefinition,
  executeScheduledOrderDefinition,
  // Order History
  getOrderHistoryDefinition,
  reorderDefinition,
  getLastOrderDefinition,
  // Smart Suggestions
  getSmartSuggestionsDefinition,
  // Conversation Management
  getContextDefinition,
  updateContextDefinition,
  resolveClarificationDefinition,
  clearContextDefinition,
];

// Tool handler map
type ToolHandler = (params: Record<string, unknown>) => Promise<ToolResponse>;

export const toolHandlers: Record<string, ToolHandler> = {
  login_user: (params) => loginUser(params as { email: string; password: string }),
  logout_user: () => logoutUser(),
  search_catalog: (params) => searchCatalog(params as { query: string; qty_hint?: string }),
  add_to_cart_smart: (params) => addToCartSmart(params as { product_id: string; qty: number }),
  get_cart_bill: () => getCartBill(),
  get_addresses: () => getAddresses(),
  validate_location: (params) => validateLocation(params as { address_id: string }),
  execute_order: (params) => executeOrder(params as { payment_type: 'COD' | 'DIGITAL'; address_id: string }),
  // User Preferences Tools (all derived from order history)
  get_user_preferences: (params) => getUserPreferences(params as { orders?: number }),
  get_frequent_items: (params) => getFrequentItems(params as { limit?: number }),
  get_shopping_patterns: () => getShoppingPatterns(),
  // Recipe Tools
  recipe_to_cart: (params) => recipeToCart(params as RecipeToCartParams & { add_to_cart?: boolean }),
  list_recipes: (params) => listRecipes(params as { dietary_preference?: 'veg' | 'non_veg' | 'vegan'; difficulty?: 'easy' | 'medium' | 'hard'; cuisine?: string; tag?: string }),
  // Intent Understanding
  understand_intent: (params) => understandIntent(params as unknown as UnderstandIntentParams),
  // Scheduled Orders
  schedule_order: (params) => scheduleOrder(params as unknown as ScheduleOrderParams),
  get_scheduled_orders: (params) => getScheduledOrders(params as { status?: string }),
  cancel_scheduled_order: (params) => cancelScheduledOrder(params as { order_id: string }),
  execute_scheduled_order: (params) => executeScheduledOrderNow(params as { order_id: string }),
  // Order History
  get_order_history: (params) => getOrderHistory(params as { include_analysis?: boolean; limit?: number }),
  reorder: (params) => reorder(params as unknown as ReorderParams),
  get_last_order: () => getLastOrder(),
  // Smart Suggestions
  get_smart_suggestions: (params) => getSmartSuggestions(params as { context?: string }),
  // Conversation Management
  get_conversation_context: () => getContext(),
  update_conversation_context: (params) => updateContext(params as {
    intent?: 'recipe' | 'reorder' | 'browse' | 'schedule' | 'checkout' | 'unknown';
    servings?: number;
    dietary_preference?: 'veg' | 'non_veg' | 'vegan';
    scheduled_time?: string;
    recipe_id?: string;
    recipe_name?: string;
  }),
  resolve_clarification: (params) => resolveClarificationTool(params as { field: string; value: string }),
  clear_conversation_context: () => clearContext(),
};

/**
 * Route a tool call to the appropriate handler
 */
export async function handleToolCall(toolName: string, params: Record<string, unknown>): Promise<ToolResponse> {
  const handler = toolHandlers[toolName];
  
  if (!handler) {
    return {
      success: false,
      message: `Unknown tool: ${toolName}. Available tools: ${Object.keys(toolHandlers).join(', ')}`,
    };
  }

  return handler(params);
}
