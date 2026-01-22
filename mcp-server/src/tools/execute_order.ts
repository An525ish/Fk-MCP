/**
 * execute_order Tool
 * Finalizes the order with payment type selection
 * Handles COD guardrails and payment flow
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import type { ExecuteOrderParams, ToolResponse } from '../types/index.js';

export const executeOrderDefinition = {
  name: 'execute_order',
  description: `Execute the order and process payment.

Payment types:
- "COD": Cash on Delivery (subject to area limits)
- "DIGITAL": UPI/Online payment

Flow:
1. Validates cart has items
2. Checks COD eligibility if COD selected
3. Creates order with delivery address
4. Processes payment

If COD is not available or exceeds limit, suggests UPI payment.
Requires: User must be logged in and have validated delivery address.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      payment_type: {
        type: 'string',
        enum: ['COD', 'DIGITAL'],
        description: 'Payment method: "COD" for Cash on Delivery, "DIGITAL" for UPI/Online',
      },
      address_id: {
        type: 'string',
        description: 'Delivery address ID (from get_addresses or validate_location)',
      },
    },
    required: ['payment_type', 'address_id'],
  },
};

export async function executeOrder(params: ExecuteOrderParams): Promise<ToolResponse> {
  const requestId = logger.toolStart('execute_order', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool before placing an order.',
      };
    }

    // Validate parameters
    if (!params.payment_type || !['COD', 'DIGITAL'].includes(params.payment_type)) {
      throw new Error('Payment type must be either "COD" or "DIGITAL"');
    }

    if (!params.address_id) {
      throw new Error('Address ID is required. Use get_addresses to see available addresses.');
    }

    // First, check if cart has items
    const cart = await apiClient.getCart();
    if (cart.cart.items.length === 0) {
      return {
        success: false,
        message: 'Your cart is empty. Please add items using add_to_cart_smart before placing an order.',
      };
    }

    // Validate the address
    const locationResult = await apiClient.validateLocation(params.address_id);
    if (!locationResult.isServiceable) {
      return {
        success: false,
        message: `Sorry, Flipkart Minutes is not available at this address (${locationResult.address.city}). Please choose a different address.`,
      };
    }

    // Check COD eligibility if COD is selected
    if (params.payment_type === 'COD') {
      const codEligibility = await apiClient.checkCodEligibility(params.address_id);
      
      if (!codEligibility.eligible) {
        // COD not available - suggest UPI
        const response: ToolResponse = {
          success: false,
          message: codEligibility.reason,
          requiresUserAction: true,
          actionType: 'confirm_payment',
          data: {
            cod_eligible: false,
            cart_total: codEligibility.cartTotal,
            cod_limit: codEligibility.codLimit,
            exceeds_by: codEligibility.exceedsBy,
            suggestion: 'Please use UPI/Digital payment instead.',
            address: codEligibility.address,
          },
          options: [
            { payment_type: 'DIGITAL', label: 'Pay with UPI' },
          ],
        };

        logger.toolSuccess(requestId, 'execute_order', response);
        return response;
      }
    }

    // Check for price changes before finalizing
    const priceCheck = await apiClient.priceCheck();
    if (priceCheck.hasSignificantChange) {
      const significantChanges = priceCheck.priceChanges.filter(c => c.requiresConfirmation);
      
      return {
        success: false,
        message: 'Some items have significant price changes. Please review before proceeding.',
        requiresUserAction: true,
        actionType: 'confirm_price_change',
        data: {
          price_changes: significantChanges.map(change => ({
            product_id: change.productId,
            name: change.name,
            old_price: change.cartPrice,
            new_price: change.currentPrice,
            change_percent: change.changePercent,
          })),
        },
      };
    }

    // Create the order
    const orderResult = await apiClient.createOrder(params.address_id);
    // Handle both 'id' and '_id' since server returns 'id' but type expects '_id'
    const orderId = (orderResult.order as { id?: string; _id?: string }).id || orderResult.order._id;
    const orderNumber = orderResult.order.orderNumber;

    // Set payment mode
    const paymentMode = params.payment_type === 'COD' ? 'cod' : 'upi';
    await apiClient.setPaymentMode(orderId, paymentMode);

    // Process payment
    const paymentResult = await apiClient.processPayment(orderId);

    // Build success response
    const response: ToolResponse = {
      success: true,
      message: params.payment_type === 'COD'
        ? `Order #${orderNumber} placed successfully! Pay ₹${orderResult.order.totalAmount} on delivery. Estimated delivery: ${locationResult.estimatedDeliveryMins || 15} minutes.`
        : `Order #${orderNumber} placed successfully! Payment of ₹${orderResult.order.totalAmount} completed via UPI. Estimated delivery: ${locationResult.estimatedDeliveryMins || 15} minutes.`,
      data: {
        order: {
          order_id: orderId,
          order_number: orderNumber,
          status: paymentResult.orderStatus,
          payment_status: paymentResult.paymentStatus,
          payment_mode: params.payment_type,
          total_amount: orderResult.order.totalAmount,
          items_count: orderResult.order.items.length,
          items: orderResult.order.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          })),
        },
        delivery: {
          address: `${orderResult.order.address.addressLine1}, ${orderResult.order.address.city} - ${orderResult.order.address.pincode}`,
          estimated_time: orderResult.order.estimatedDelivery,
          estimated_mins: locationResult.estimatedDeliveryMins || 15,
        },
        bill: {
          subtotal: orderResult.order.subtotal,
          delivery_fee: orderResult.order.deliveryFee,
          taxes: orderResult.order.taxes,
          total_amount: orderResult.order.totalAmount,
        },
      },
    };

    // Add UPI details if digital payment
    if (params.payment_type === 'DIGITAL' && paymentResult.upiLink) {
      (response.data as Record<string, unknown>).upi = {
        link: paymentResult.upiLink,
        qr_data: paymentResult.qrData,
      };
    }

    logger.toolSuccess(requestId, 'execute_order', response);
    return response;

  } catch (error) {
    // Extract detailed error info from axios response
    let errorMessage = 'Failed to execute order';
    let errorDetails: unknown = null;
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string; errors?: unknown }; status?: number } };
      if (axiosError.response?.data) {
        errorMessage = axiosError.response.data.message || errorMessage;
        errorDetails = axiosError.response.data.errors;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    logger.toolError(requestId, 'execute_order', errorMessage);
    if (errorDetails) {
      logger.error('Error details:', JSON.stringify(errorDetails));
    }

    // Check for specific error types
    if (errorMessage.includes('stock') || errorMessage.includes('available')) {
      return {
        success: false,
        message: 'Some items in your cart are no longer available. Please review your cart and try again.',
      };
    }

    if (errorMessage.includes('address') || errorMessage.includes('404')) {
      return {
        success: false,
        message: 'Invalid delivery address. Please use get_addresses to see your available addresses.',
      };
    }

    return {
      success: false,
      message: `Failed to execute order: ${errorMessage}`,
      data: errorDetails ? { errors: errorDetails } : undefined,
    };
  }
}
