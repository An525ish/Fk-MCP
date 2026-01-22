/**
 * search_catalog Tool
 * Smart search with weighted scoring, variant detection, and quantity parsing
 * Handles the "Tomato" case (quantity matching) and "Coke" case (ambiguity)
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import type { SearchCatalogParams, ToolResponse, Product } from '../types/index.js';

export const searchCatalogDefinition = {
  name: 'search_catalog',
  description: `Search the Flipkart Minutes catalog for products. Returns products sorted by a weighted score (60% rating + 40% price efficiency).

Key behaviors:
- Quantity parsing: "1kg tomato" will prioritize products closest to 1000g
- Variant detection: If multiple sizes exist (e.g., Coke 250ml vs 2L), returns them for user selection
- Returns: product_id, name, price, rating, unit, estimated delivery time, and weighted score

Use this to find products before adding to cart.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query (e.g., "tomato", "1kg tomato", "coca cola", "chicken biryani masala")',
      },
      qty_hint: {
        type: 'string',
        description: 'Optional quantity hint (e.g., "1kg", "500ml") if not included in query',
      },
    },
    required: ['query'],
  },
};

interface FormattedProduct {
  product_id: string;
  name: string;
  brand: string;
  price: number;
  mrp: number;
  discount_percent: number;
  unit: string;
  rating: number;
  review_count: number;
  weighted_score: number;
  estimated_delivery_mins: number;
  in_stock: boolean;
  stock_qty: number;
  quantity_match?: {
    requested: string;
    actual: string;
    match_percent: number;
  };
}

function formatProduct(product: Product): FormattedProduct {
  const formatted: FormattedProduct = {
    product_id: product._id,
    name: product.name,
    brand: product.brand,
    price: product.price,
    mrp: product.mrp,
    discount_percent: product.discountPercent || Math.round(((product.mrp - product.price) / product.mrp) * 100),
    unit: product.unit,
    rating: product.rating,
    review_count: product.reviewCount,
    weighted_score: Math.round((product.weightedScore || 0) * 100) / 100,
    estimated_delivery_mins: product.estimatedDeliveryMins,
    in_stock: product.stock > 0 && product.isAvailable,
    stock_qty: product.stock,
  };

  if (product.quantityMatch) {
    formatted.quantity_match = {
      requested: `${product.quantityMatch.requested}${product.quantityMatch.unit}`,
      actual: `${product.quantityMatch.actual}${product.quantityMatch.unit}`,
      match_percent: product.quantityMatch.matchPercent,
    };
  }

  return formatted;
}

export async function searchCatalog(params: SearchCatalogParams): Promise<ToolResponse> {
  const requestId = logger.toolStart('search_catalog', params);

  try {
    // Validate parameters
    if (!params.query || params.query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    // Combine query with qty_hint if provided
    let searchQuery = params.query.trim();
    if (params.qty_hint && !searchQuery.toLowerCase().includes(params.qty_hint.toLowerCase())) {
      searchQuery = `${params.qty_hint} ${searchQuery}`;
    }

    // Call smart search API
    const result = await apiClient.smartSearch(searchQuery);

    // Check if no results
    if (result.products.length === 0) {
      const response: ToolResponse = {
        success: true,
        message: `No products found for "${params.query}". Try a different search term.`,
        data: {
          query: params.query,
          products: [],
          total_results: 0,
        },
      };
      logger.toolSuccess(requestId, 'search_catalog', response);
      return response;
    }

    // Format products for response
    const formattedProducts = result.products.map(formatProduct);

    // Check for ambiguity (multiple variants like Coke case)
    if (result.hasAmbiguity && result.variants) {
      const variantGroups = Object.entries(result.variants).map(([group, variants]) => ({
        variant_group: group,
        options: variants.map(v => ({
          product_id: v.id,
          name: v.name,
          price: v.price,
          unit: v.unit,
        })),
      }));

      const response: ToolResponse = {
        success: true,
        message: result.ambiguityMessage || 'Multiple variants found. Please specify which size/variant you prefer.',
        requiresUserAction: true,
        actionType: 'select_variant',
        data: {
          query: params.query,
          has_ambiguity: true,
          variant_groups: variantGroups,
          all_products: formattedProducts,
          total_results: result.resultCount,
        },
        options: variantGroups.flatMap(g => g.options),
      };

      logger.toolSuccess(requestId, 'search_catalog', response);
      return response;
    }

    // Check if quantity was parsed and matched
    let quantityNote = '';
    if (result.parsedQuantity) {
      const bestMatch = formattedProducts.find(p => p.quantity_match);
      if (bestMatch?.quantity_match) {
        quantityNote = ` Best match for ${result.parsedQuantity.original}: "${bestMatch.name}" (${bestMatch.quantity_match.match_percent}% match).`;
      }
    }

    // Standard response with sorted products
    const topProduct = formattedProducts[0];
    const response: ToolResponse = {
      success: true,
      message: `Found ${result.resultCount} products for "${params.query}".${quantityNote} Top result: "${topProduct.name}" at ₹${topProduct.price} (${topProduct.rating}★).`,
      data: {
        query: params.query,
        parsed_quantity: result.parsedQuantity,
        products: formattedProducts,
        total_results: result.resultCount,
        recommendation: {
          product_id: topProduct.product_id,
          name: topProduct.name,
          price: topProduct.price,
          reason: 'Highest weighted score (rating + price efficiency)',
        },
      },
    };

    logger.toolSuccess(requestId, 'search_catalog', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Search failed';
    logger.toolError(requestId, 'search_catalog', errorMessage);

    return {
      success: false,
      message: `Search failed: ${errorMessage}`,
    };
  }
}
