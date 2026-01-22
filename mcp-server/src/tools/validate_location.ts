/**
 * validate_location Tool
 * Validates delivery address for Flipkart Minutes serviceability
 * Handles the "Zoning Conflict" edge case
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import type { ValidateLocationParams, ToolResponse } from '../types/index.js';

export const validateLocationDefinition = {
  name: 'validate_location',
  description: `Validate a delivery address for Flipkart Minutes availability.

Checks:
- Whether the address is serviceable by Flipkart Minutes
- COD (Cash on Delivery) availability and limit for the area
- Estimated delivery time

Must be called before placing an order to ensure delivery is possible.
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      address_id: {
        type: 'string',
        description: 'The address ID to validate. Get available addresses using get_addresses tool or from user profile.',
      },
    },
    required: ['address_id'],
  },
};

export const getAddressesDefinition = {
  name: 'get_addresses',
  description: `Get all saved delivery addresses for the logged-in user.

Returns list of addresses with:
- Address ID (needed for validate_location and execute_order)
- Full address details
- Whether it's the default address
- Serviceability status

Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function getAddresses(): Promise<ToolResponse> {
  const requestId = logger.toolStart('get_addresses', {});

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to view your addresses.',
      };
    }

    const result = await apiClient.getAddresses();

    if (result.addresses.length === 0) {
      const response: ToolResponse = {
        success: true,
        message: 'No saved addresses found. Please add an address in the Flipkart Minutes app first.',
        data: {
          addresses: [],
        },
      };

      logger.toolSuccess(requestId, 'get_addresses', response);
      return response;
    }

    const formattedAddresses = result.addresses.map(addr => ({
      address_id: addr._id,
      type: addr.type,
      name: addr.name,
      phone: addr.phone,
      full_address: [
        addr.addressLine1,
        addr.addressLine2,
        addr.landmark,
        `${addr.city}, ${addr.state} - ${addr.pincode}`,
      ].filter(Boolean).join(', '),
      city: addr.city,
      pincode: addr.pincode,
      is_default: addr.isDefault,
      is_serviceable: addr.isServiceable,
      cod_limit: addr.codLimit,
    }));

    const defaultAddr = formattedAddresses.find(a => a.is_default);
    const serviceableCount = formattedAddresses.filter(a => a.is_serviceable).length;

    const response: ToolResponse = {
      success: true,
      message: `Found ${result.addresses.length} saved addresses. ${serviceableCount} are serviceable by Flipkart Minutes.${defaultAddr ? ` Default: ${defaultAddr.type} (${defaultAddr.city})` : ''}`,
      data: {
        addresses: formattedAddresses,
        default_address_id: defaultAddr?.address_id || null,
        serviceable_count: serviceableCount,
      },
    };

    logger.toolSuccess(requestId, 'get_addresses', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get addresses';
    logger.toolError(requestId, 'get_addresses', errorMessage);

    return {
      success: false,
      message: `Failed to get addresses: ${errorMessage}`,
    };
  }
}

export async function validateLocation(params: ValidateLocationParams): Promise<ToolResponse> {
  const requestId = logger.toolStart('validate_location', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool before validating location.',
      };
    }

    // Validate parameters
    if (!params.address_id) {
      throw new Error('Address ID is required. Use get_addresses to see available addresses.');
    }

    // Call validate location API
    const result = await apiClient.validateLocation(params.address_id);

    // Handle non-serviceable location (Zoning Conflict)
    if (!result.isServiceable || !result.available) {
      const response: ToolResponse = {
        success: false,
        message: `Sorry, Flipkart Minutes is not yet available at your selected address (${result.address.city}, ${result.address.pincode}). Please try a different address.`,
        data: {
          address_id: params.address_id,
          is_serviceable: false,
          address: {
            city: result.address.city,
            pincode: result.address.pincode,
            state: result.address.state,
          },
          cod_available: false,
          cod_limit: 0,
        },
      };

      logger.toolSuccess(requestId, 'validate_location', response);
      return response;
    }

    // Location is serviceable
    const response: ToolResponse = {
      success: true,
      message: `Great! Flipkart Minutes delivery is available at ${result.address.city} (${result.address.pincode}). Estimated delivery: ${result.estimatedDeliveryMins || 15} minutes.${result.codAvailable ? ` COD available up to ₹${result.codLimit}.` : ' COD not available for this area.'}`,
      data: {
        address_id: params.address_id,
        is_serviceable: true,
        address: {
          type: result.address.type,
          name: result.address.name,
          address_line: result.address.addressLine1,
          city: result.address.city,
          pincode: result.address.pincode,
          state: result.address.state,
        },
        estimated_delivery_mins: result.estimatedDeliveryMins || 15,
        cod_available: result.codAvailable,
        cod_limit: result.codLimit,
      },
    };

    logger.toolSuccess(requestId, 'validate_location', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to validate location';
    logger.toolError(requestId, 'validate_location', errorMessage);

    // Check for specific error types
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return {
        success: false,
        message: 'Address not found. Please use get_addresses to see your available addresses.',
      };
    }

    return {
      success: false,
      message: `Failed to validate location: ${errorMessage}`,
    };
  }
}
