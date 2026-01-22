/**
 * Recipe to Cart Tool
 * Converts recipes to shopping cart with smart product matching
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import { recipes, findRecipes, getRecipeById, scaleRecipeIngredients, getAllRecipeNames } from '../data/recipes.js';
import type { ToolResponse, RecipeToCartParams, Recipe, RecipeCartItem } from '../types/index.js';

export const recipeToCartDefinition = {
  name: 'recipe_to_cart',
  description: `Convert a recipe to a shopping cart with all required ingredients.

Features:
- Search for recipes by name or browse available recipes
- Scale ingredients based on number of servings
- Filter by dietary preference (veg/non-veg/vegan)
- Finds best matching products for each ingredient
- Suggests substitutes for unavailable items
- Shows estimated total cost before adding to cart

Available recipes include: ${getAllRecipeNames().slice(0, 10).join(', ')}...

Use this when user wants to cook something specific or asks for recipe ingredients.
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      recipe_id: {
        type: 'string',
        description: 'Recipe ID if known (e.g., "chicken-biryani", "veg-sandwich")',
      },
      recipe_name: {
        type: 'string',
        description: 'Recipe name to search for (e.g., "biryani", "sandwich", "breakfast")',
      },
      servings: {
        type: 'number',
        description: 'Number of servings needed (will scale ingredients accordingly)',
      },
      dietary_preference: {
        type: 'string',
        enum: ['veg', 'non_veg', 'vegan'],
        description: 'Filter recipes by dietary preference',
      },
      add_to_cart: {
        type: 'boolean',
        description: 'If true, automatically add items to cart. If false (default), just show the list.',
      },
    },
    required: [],
  },
};

interface MatchedProduct {
  productId: string;
  name: string;
  price: number;
  unit: string;
  brand: string;
  isAvailable: boolean;
  stock: number;
  rating: number;
}

async function findProductForIngredient(searchQuery: string): Promise<MatchedProduct | null> {
  try {
    const result = await apiClient.smartSearch(searchQuery);
    
    if (result.products.length === 0) {
      return null;
    }
    
    // Get the best match (first result from smart search is already scored)
    const product = result.products[0];
    
    return {
      productId: product._id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      brand: product.brand,
      isAvailable: product.isAvailable && product.stock > 0,
      stock: product.stock,
      rating: product.rating,
    };
  } catch (error) {
    logger.warn(`Failed to find product for "${searchQuery}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

export async function recipeToCart(params: RecipeToCartParams & { add_to_cart?: boolean }): Promise<ToolResponse> {
  const requestId = logger.toolStart('recipe_to_cart', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool to use recipe features.',
      };
    }

    let selectedRecipe: Recipe | undefined;
    let matchedRecipes: Recipe[] = [];

    // Find recipe by ID
    if (params.recipe_id) {
      selectedRecipe = getRecipeById(params.recipe_id);
      if (!selectedRecipe) {
        return {
          success: false,
          message: `Recipe with ID "${params.recipe_id}" not found. Use recipe_name to search for recipes.`,
        };
      }
    }
    // Search for recipe by name
    else if (params.recipe_name) {
      matchedRecipes = findRecipes(params.recipe_name);
      
      // Filter by dietary preference if specified
      if (params.dietary_preference) {
        matchedRecipes = matchedRecipes.filter(recipe => {
          if (params.dietary_preference === 'veg') {
            return recipe.dietaryType === 'veg' || recipe.dietaryType === 'vegan';
          }
          if (params.dietary_preference === 'vegan') {
            return recipe.dietaryType === 'vegan';
          }
          return true; // non_veg includes all
        });
      }
      
      if (matchedRecipes.length === 0) {
        // No matches - suggest available recipes
        const suggestions = recipes
          .filter(r => !params.dietary_preference || 
            (params.dietary_preference === 'veg' ? (r.dietaryType === 'veg' || r.dietaryType === 'vegan') : true))
          .slice(0, 5)
          .map(r => ({ id: r.id, name: r.name, servings: r.servings, dietary_type: r.dietaryType }));
        
        return {
          success: false,
          message: `No recipes found for "${params.recipe_name}". Here are some suggestions:`,
          requiresUserAction: true,
          actionType: 'select_recipe',
          data: {
            query: params.recipe_name,
            suggestions,
          },
          options: suggestions,
        };
      }
      
      if (matchedRecipes.length === 1) {
        selectedRecipe = matchedRecipes[0];
      } else {
        // Multiple matches - ask user to select
        const options = matchedRecipes.slice(0, 5).map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          servings: r.servings,
          dietary_type: r.dietaryType,
          prep_time: r.prepTime,
          difficulty: r.difficulty,
        }));
        
        return {
          success: true,
          message: `Found ${matchedRecipes.length} recipes matching "${params.recipe_name}". Please select one:`,
          requiresUserAction: true,
          actionType: 'select_recipe',
          data: {
            query: params.recipe_name,
            matches: options,
          },
          options,
        };
      }
    }
    // No recipe specified - list available recipes
    else {
      let availableRecipes = recipes;
      
      // Filter by dietary preference
      if (params.dietary_preference) {
        availableRecipes = availableRecipes.filter(recipe => {
          if (params.dietary_preference === 'veg') {
            return recipe.dietaryType === 'veg' || recipe.dietaryType === 'vegan';
          }
          if (params.dietary_preference === 'vegan') {
            return recipe.dietaryType === 'vegan';
          }
          return true;
        });
      }
      
      const recipeList = availableRecipes.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        servings: r.servings,
        dietary_type: r.dietaryType,
        difficulty: r.difficulty,
        tags: r.tags.slice(0, 3),
      }));
      
      return {
        success: true,
        message: `Here are ${recipeList.length} available recipes. Tell me which one you'd like to make:`,
        requiresUserAction: true,
        actionType: 'select_recipe',
        data: {
          recipes: recipeList,
        },
        options: recipeList,
      };
    }

    // Scale recipe if servings specified
    const targetServings = params.servings || selectedRecipe.servings;
    const scaledRecipe = targetServings !== selectedRecipe.servings 
      ? scaleRecipeIngredients(selectedRecipe, targetServings)
      : selectedRecipe;

    // Find products for each ingredient
    const cartItems: RecipeCartItem[] = [];
    const unavailableItems: Array<{
      ingredient: string;
      reason: string;
      substitutes?: RecipeCartItem[];
    }> = [];
    
    let estimatedTotal = 0;
    let maxDeliveryTime = 0;

    for (const ingredient of scaledRecipe.ingredients) {
      const product = await findProductForIngredient(ingredient.searchQuery);
      
      if (!product) {
        unavailableItems.push({
          ingredient: ingredient.searchQuery,
          reason: 'Product not found in catalog',
        });
        continue;
      }
      
      if (!product.isAvailable) {
        // Try to find substitute
        let substituteFound = false;
        if (ingredient.substitutes && ingredient.substitutes.length > 0) {
          for (const sub of ingredient.substitutes) {
            const subProduct = await findProductForIngredient(sub);
            if (subProduct && subProduct.isAvailable) {
              cartItems.push({
                productId: subProduct.productId,
                name: subProduct.name,
                price: subProduct.price,
                unit: subProduct.unit,
                quantity: 1,
                ingredientFor: ingredient.searchQuery,
                isSubstitute: true,
                isOptional: ingredient.optional,
                isAvailable: true,
              });
              estimatedTotal += subProduct.price;
              substituteFound = true;
              break;
            }
          }
        }
        
        if (!substituteFound) {
          unavailableItems.push({
            ingredient: ingredient.searchQuery,
            reason: `"${product.name}" is out of stock`,
          });
        }
        continue;
      }
      
      cartItems.push({
        productId: product.productId,
        name: product.name,
        price: product.price,
        unit: product.unit,
        quantity: 1,
        ingredientFor: ingredient.searchQuery,
        isSubstitute: false,
        isOptional: ingredient.optional,
        isAvailable: true,
      });
      
      estimatedTotal += product.price;
    }

    // Calculate max delivery time (simplified)
    maxDeliveryTime = 15; // Default estimate

    // Build response
    const response: ToolResponse = {
      success: true,
      message: `Recipe: ${scaledRecipe.name} (${targetServings} servings)\n` +
        `Found ${cartItems.length} items. ` +
        (unavailableItems.length > 0 ? `${unavailableItems.length} items unavailable. ` : '') +
        `Estimated total: ₹${estimatedTotal}`,
      data: {
        recipe: {
          id: scaledRecipe.id,
          name: scaledRecipe.name,
          description: scaledRecipe.description,
          original_servings: selectedRecipe.servings,
          scaled_servings: targetServings,
          dietary_type: scaledRecipe.dietaryType,
          prep_time: scaledRecipe.prepTime,
          cook_time: scaledRecipe.cookTime,
          difficulty: scaledRecipe.difficulty,
        },
        items: cartItems.map(item => ({
          product_id: item.productId,
          name: item.name,
          price: item.price,
          unit: item.unit,
          quantity: item.quantity,
          ingredient_for: item.ingredientFor,
          is_substitute: item.isSubstitute,
          is_optional: item.isOptional,
        })),
        unavailable_items: unavailableItems,
        summary: {
          total_items: cartItems.length,
          unavailable_count: unavailableItems.length,
          estimated_total: estimatedTotal,
          estimated_delivery_mins: maxDeliveryTime,
        },
      },
    };

    // Add to cart if requested
    if (params.add_to_cart && cartItems.length > 0) {
      try {
        const itemsToAdd = cartItems
          .filter(item => !item.isOptional || item.isAvailable)
          .map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          }));
        
        const cartResult = await apiClient.bulkAddToCart(itemsToAdd);
        
        response.message = `Added ${cartResult.successItems.length} items for "${scaledRecipe.name}" to cart. ` +
          `Cart total: ₹${cartResult.bill.totalAmount}`;
        
        (response.data as Record<string, unknown>).cart_result = {
          success_count: cartResult.successItems.length,
          failed_count: cartResult.failedItems.length,
          cart_total: cartResult.bill.totalAmount,
        };
      } catch (error) {
        response.message += ` (Failed to add to cart: ${error instanceof Error ? error.message : 'Unknown error'})`;
      }
    } else if (cartItems.length > 0) {
      response.message += '\n\nWould you like me to add these items to your cart?';
      response.requiresUserAction = true;
      response.actionType = 'confirm_price_change'; // Reusing for confirmation
    }

    logger.toolSuccess(requestId, 'recipe_to_cart', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process recipe';
    logger.toolError(requestId, 'recipe_to_cart', errorMessage);

    return {
      success: false,
      message: `Failed to process recipe: ${errorMessage}`,
    };
  }
}

// ============================================
// List Recipes Tool
// ============================================

export const listRecipesDefinition = {
  name: 'list_recipes',
  description: `List all available recipes with optional filtering.

Filters:
- dietary_preference: Filter by veg/non_veg/vegan
- difficulty: Filter by easy/medium/hard
- cuisine: Filter by cuisine type (Indian, Continental, etc.)
- tags: Filter by tags (breakfast, quick, party, etc.)

Use this to show users what recipes are available.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      dietary_preference: {
        type: 'string',
        enum: ['veg', 'non_veg', 'vegan'],
        description: 'Filter by dietary preference',
      },
      difficulty: {
        type: 'string',
        enum: ['easy', 'medium', 'hard'],
        description: 'Filter by difficulty level',
      },
      cuisine: {
        type: 'string',
        description: 'Filter by cuisine (e.g., Indian, Continental)',
      },
      tag: {
        type: 'string',
        description: 'Filter by tag (e.g., breakfast, quick, party)',
      },
    },
    required: [],
  },
};

export async function listRecipes(params: {
  dietary_preference?: 'veg' | 'non_veg' | 'vegan';
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  tag?: string;
}): Promise<ToolResponse> {
  const requestId = logger.toolStart('list_recipes', params);

  try {
    let filteredRecipes = [...recipes];

    // Apply filters
    if (params.dietary_preference) {
      filteredRecipes = filteredRecipes.filter(recipe => {
        if (params.dietary_preference === 'veg') {
          return recipe.dietaryType === 'veg' || recipe.dietaryType === 'vegan';
        }
        if (params.dietary_preference === 'vegan') {
          return recipe.dietaryType === 'vegan';
        }
        return true;
      });
    }

    if (params.difficulty) {
      filteredRecipes = filteredRecipes.filter(recipe => recipe.difficulty === params.difficulty);
    }

    if (params.cuisine) {
      const cuisineLower = params.cuisine.toLowerCase();
      filteredRecipes = filteredRecipes.filter(recipe => 
        recipe.cuisine.toLowerCase().includes(cuisineLower)
      );
    }

    if (params.tag) {
      const tagLower = params.tag.toLowerCase();
      filteredRecipes = filteredRecipes.filter(recipe =>
        recipe.tags.some(t => t.toLowerCase().includes(tagLower))
      );
    }

    const recipeList = filteredRecipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      servings: recipe.servings,
      dietary_type: recipe.dietaryType,
      prep_time: recipe.prepTime,
      cook_time: recipe.cookTime,
      difficulty: recipe.difficulty,
      cuisine: recipe.cuisine,
      tags: recipe.tags,
    }));

    const response: ToolResponse = {
      success: true,
      message: `Found ${recipeList.length} recipes` + 
        (Object.keys(params).length > 0 ? ' matching your filters' : '') + '.',
      data: {
        recipes: recipeList,
        total_count: recipeList.length,
        filters_applied: params,
      },
    };

    logger.toolSuccess(requestId, 'list_recipes', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to list recipes';
    logger.toolError(requestId, 'list_recipes', errorMessage);

    return {
      success: false,
      message: `Failed to list recipes: ${errorMessage}`,
    };
  }
}
