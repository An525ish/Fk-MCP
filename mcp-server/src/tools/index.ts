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

import type { ToolResponse } from '../types/index.js';

// Import all definitions
import { loginUserDefinition, loginUser } from './login_user.js';
import { logoutUserDefinition, logoutUser } from './logout_user.js';
import { searchCatalogDefinition, searchCatalog } from './search_catalog.js';
import { addToCartSmartDefinition, addToCartSmart } from './add_to_cart_smart.js';
import { getCartBillDefinition, getCartBill } from './get_cart_bill.js';
import { validateLocationDefinition, validateLocation, getAddressesDefinition, getAddresses } from './validate_location.js';
import { executeOrderDefinition, executeOrder } from './execute_order.js';

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
