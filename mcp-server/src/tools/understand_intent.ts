/**
 * Understand Intent Tool
 * Parses natural language to understand user's shopping intent
 * and generates appropriate clarifying questions
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import { findRecipes, getAllRecipeNames } from '../data/recipes.js';
import type { ToolResponse, UnderstandIntentParams, ParsedIntent } from '../types/index.js';

// Keywords for intent detection
const RECIPE_KEYWORDS = [
  'make', 'cook', 'prepare', 'recipe', 'biryani', 'sandwich', 'breakfast',
  'lunch', 'dinner', 'snack', 'meal', 'dish', 'food', 'eat', 'cooking'
];

const REORDER_KEYWORDS = [
  'reorder', 'again', 'same', 'usual', 'regular', 'last time', 'previous',
  'weekly', 'monthly', 'routine', 'always', 'every'
];

const SCHEDULE_KEYWORDS = [
  'schedule', 'later', 'tomorrow', 'evening', 'morning', 'afternoon',
  'tonight', 'weekend', 'pm', 'am', 'clock', 'time', 'deliver at',
  'by', 'before', 'after', 'around'
];

const QUICK_ADD_KEYWORDS = [
  'add', 'buy', 'get', 'need', 'want', 'order', 'purchase'
];

const DIETARY_KEYWORDS = {
  veg: ['veg', 'vegetarian', 'veggie', 'no meat', 'without meat'],
  non_veg: ['non-veg', 'nonveg', 'non veg', 'chicken', 'mutton', 'egg', 'meat', 'fish'],
  vegan: ['vegan', 'plant-based', 'no dairy', 'dairy-free']
};

const SERVING_PATTERNS = [
  /(\d+)\s*(?:people|persons|servings|pax|guests)/i,
  /for\s*(\d+)/i,
  /(\d+)\s*(?:of us|members)/i,
  /family\s*of\s*(\d+)/i
];

const TIME_PATTERNS = [
  /(\d{1,2})\s*(?:pm|am)/i,
  /(\d{1,2}):(\d{2})\s*(?:pm|am)?/i,
  /tomorrow\s*(?:morning|afternoon|evening|night)?/i,
  /tonight/i,
  /this\s*(?:evening|afternoon|morning)/i,
  /in\s*(\d+)\s*(?:hours?|mins?|minutes?)/i
];

export const understandIntentDefinition = {
  name: 'understand_intent',
  description: `Analyze user's message to understand their shopping intent and generate clarifying questions if needed.

This tool helps parse ambiguous requests like:
- "I want to make a sandwich" -> Asks: veg/non-veg? how many people? when?
- "Order my usual groceries" -> Identifies reorder intent
- "Get snacks for tomorrow's party" -> Identifies schedule + party context

Returns:
- Detected intent type (recipe, reorder, browse, schedule, quick_add)
- Extracted entities (recipe name, servings, dietary preference, time)
- Clarifying questions needed before proceeding

Use this as the first step when user's request is ambiguous or needs more context.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      message: {
        type: 'string',
        description: 'The user\'s natural language message to analyze',
      },
      context: {
        type: 'object',
        properties: {
          previous_intent: {
            type: 'string',
            description: 'The previous detected intent (for multi-turn conversations)',
          },
          cart_items: {
            type: 'number',
            description: 'Number of items currently in cart',
          },
        },
        description: 'Optional context from previous interactions',
      },
    },
    required: ['message'],
  },
};

function detectIntentType(message: string): { type: ParsedIntent['type']; confidence: number } {
  const lowerMessage = message.toLowerCase();
  
  // Check for recipe intent
  const recipeScore = RECIPE_KEYWORDS.filter(kw => lowerMessage.includes(kw)).length;
  const matchedRecipes = findRecipes(message);
  const recipeNameMatch = matchedRecipes.length > 0;
  
  // Check for reorder intent
  const reorderScore = REORDER_KEYWORDS.filter(kw => lowerMessage.includes(kw)).length;
  
  // Check for schedule intent
  const scheduleScore = SCHEDULE_KEYWORDS.filter(kw => lowerMessage.includes(kw)).length;
  const hasTimePattern = TIME_PATTERNS.some(pattern => pattern.test(lowerMessage));
  
  // Check for quick add intent
  const quickAddScore = QUICK_ADD_KEYWORDS.filter(kw => lowerMessage.includes(kw)).length;
  
  // Calculate confidence scores
  const scores = {
    recipe: (recipeScore * 0.3) + (recipeNameMatch ? 0.5 : 0),
    reorder: reorderScore * 0.4,
    schedule: (scheduleScore * 0.3) + (hasTimePattern ? 0.4 : 0),
    quick_add: quickAddScore * 0.25,
  };
  
  // Find highest score
  let maxType: ParsedIntent['type'] = 'unknown';
  let maxScore = 0.2; // Minimum threshold
  
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxType = type as ParsedIntent['type'];
    }
  }
  
  // Combine schedule with other intents
  if (scores.schedule > 0.3 && maxType !== 'schedule') {
    // User wants to schedule something else
    return { type: maxType, confidence: Math.min(maxScore + scores.schedule * 0.5, 1) };
  }
  
  return { type: maxType, confidence: Math.min(maxScore, 1) };
}

function extractEntities(message: string): ParsedIntent['entities'] {
  const lowerMessage = message.toLowerCase();
  const entities: ParsedIntent['entities'] = {};
  
  // Extract recipe name
  const matchedRecipes = findRecipes(message);
  if (matchedRecipes.length > 0) {
    entities.recipe = matchedRecipes[0].name;
  }
  
  // Extract servings
  for (const pattern of SERVING_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      entities.servings = parseInt(match[1], 10);
      break;
    }
  }
  
  // Extract dietary preference
  for (const [pref, keywords] of Object.entries(DIETARY_KEYWORDS)) {
    if (keywords.some(kw => lowerMessage.includes(kw))) {
      entities.dietaryPreference = pref as 'veg' | 'non_veg' | 'vegan';
      break;
    }
  }
  
  // Extract scheduled time (simplified)
  for (const pattern of TIME_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      entities.scheduledTime = match[0];
      break;
    }
  }
  
  // Extract item names for quick add
  const itemPatterns = [
    /(?:add|buy|get|need|want|order)\s+(?:some\s+)?(.+?)(?:\s+to\s+cart)?$/i,
    /^(.+?)\s+(?:please|pls)?$/i
  ];
  
  for (const pattern of itemPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length < 50) {
      const items = match[1].split(/,\s*|\s+and\s+/);
      if (items.length > 0) {
        entities.items = items.map(i => i.trim()).filter(i => i.length > 0);
        break;
      }
    }
  }
  
  return entities;
}

function generateClarifications(
  intentType: ParsedIntent['type'],
  entities: ParsedIntent['entities'],
  userPreferences?: { 
    dietaryPreference?: string | null; 
    typicalOrderSize?: number | null;
    inferredDietaryConfidence?: number | null;
  },
  preferenceHints: string[] = []
): ParsedIntent['clarificationsNeeded'] {
  const clarifications: ParsedIntent['clarificationsNeeded'] = [];
  
  if (intentType === 'recipe') {
    // Check if we need recipe name
    if (!entities.recipe) {
      clarifications.push({
        field: 'recipe',
        question: 'What would you like to make? Here are some popular options:',
        options: getAllRecipeNames().slice(0, 6),
      });
    }
    
    // Check if we need dietary preference
    // Even if we have inferred preference, ASK but provide hint
    if (!entities.dietaryPreference) {
      let question = 'Would you prefer vegetarian or non-vegetarian?';
      
      // Add hint from order history if available
      if (userPreferences?.dietaryPreference && userPreferences.inferredDietaryConfidence) {
        const dietLabel = userPreferences.dietaryPreference === 'veg' ? 'vegetarian' : 'non-vegetarian';
        question = `Would you prefer vegetarian or non-vegetarian? (Last time you mostly ordered ${dietLabel})`;
      }
      
      clarifications.push({
        field: 'dietaryPreference',
        question,
        options: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 
          ...(userPreferences?.dietaryPreference ? [`Same as last time (${userPreferences.dietaryPreference === 'veg' ? 'Veg' : 'Non-Veg'})`] : [])
        ],
      });
    }
    
    // Always ask for servings - it varies per order
    if (!entities.servings) {
      let question = 'How many people are you cooking for?';
      
      // Add hint if we know typical order size
      if (userPreferences?.typicalOrderSize) {
        question = `How many people are you cooking for? (Your typical order serves around ${userPreferences.typicalOrderSize} people)`;
      }
      
      clarifications.push({
        field: 'servings',
        question,
        options: ['1-2 people', '3-4 people', '5-6 people', '7+ people'],
      });
    }
    
    // Ask about allergies for recipe/food orders - SAFETY CRITICAL
    clarifications.push({
      field: 'allergies',
      question: 'Do you have any food allergies I should know about?',
      options: ['No allergies', 'Nuts', 'Dairy/Lactose', 'Gluten', 'Other (please specify)'],
      optional: true, // Can be skipped
    });
  }
  
  if (intentType === 'schedule' || entities.scheduledTime) {
    // Confirm scheduled time
    if (!entities.scheduledTime) {
      clarifications.push({
        field: 'scheduledTime',
        question: 'When would you like the delivery?',
        options: ['As soon as possible', 'This evening', 'Tomorrow morning', 'Tomorrow evening', 'Specific time'],
      });
    }
  }
  
  return clarifications;
}

export async function understandIntent(params: UnderstandIntentParams): Promise<ToolResponse> {
  const requestId = logger.toolStart('understand_intent', params);

  try {
    const { message, context } = params;
    
    if (!message || message.trim().length === 0) {
      return {
        success: false,
        message: 'Please provide a message to analyze.',
      };
    }

    // Detect intent type
    const { type: intentType, confidence } = detectIntentType(message);
    
    // Extract entities
    const entities = extractEntities(message);
    
    // Get user preferences if authenticated (derived from order history)
    let userPreferences: { 
      dietaryPreference?: string | null; 
      typicalOrderSize?: number | null;
      inferredDietaryConfidence?: number | null;
    } | undefined;
    let preferenceHints: string[] = [];
    
    if (apiClient.isAuthenticated()) {
      try {
        const prefsResult = await apiClient.getPreferences();
        const prefs = prefsResult.preferences;
        
        // Get inferred dietary preference (only if strong signal)
        const inferredDiet = prefs.inferredDietaryPreference;
        userPreferences = {
          dietaryPreference: inferredDiet && inferredDiet.type !== 'mixed' ? inferredDiet.type : null,
          typicalOrderSize: prefs.typicalOrderSize,
          inferredDietaryConfidence: inferredDiet?.confidence || null,
        };
        
        // Build preference hints to show user
        if (inferredDiet && inferredDiet.type !== 'mixed' && inferredDiet.confidence) {
          const dietLabel = inferredDiet.type === 'veg' ? 'vegetarian' : 'non-vegetarian';
          preferenceHints.push(
            `Based on your order history, you usually prefer ${dietLabel} items (${Math.round(inferredDiet.confidence)}% of orders).`
          );
        }
        
        if (prefs.typicalOrderSize) {
          preferenceHints.push(`Your typical order has around ${prefs.typicalOrderSize} items.`);
        }
        
        // DON'T auto-apply dietary preference - let user confirm
        // We'll include it as a hint in clarifications instead
      } catch {
        // Preferences not available, continue without them
      }
    }
    
    // Generate clarifications (with preference hints)
    const clarifications = generateClarifications(intentType, entities, userPreferences, preferenceHints);
    
    // Build suggested action
    let suggestedAction: string | undefined;
    
    switch (intentType) {
      case 'recipe':
        if (entities.recipe && clarifications.length === 0) {
          suggestedAction = `Use recipe_to_cart with recipe_name="${entities.recipe}"` +
            (entities.servings ? `, servings=${entities.servings}` : '') +
            (entities.dietaryPreference ? `, dietary_preference="${entities.dietaryPreference}"` : '');
        } else if (entities.recipe) {
          suggestedAction = `Ask clarifying questions, then use recipe_to_cart`;
        } else {
          suggestedAction = `Use list_recipes to show available options`;
        }
        break;
      
      case 'reorder':
        suggestedAction = `Use get_frequent_items or get_order_history to find previous orders`;
        break;
      
      case 'schedule':
        suggestedAction = `Confirm cart contents, then use schedule_order with the specified time`;
        break;
      
      case 'quick_add':
        if (entities.items && entities.items.length > 0) {
          suggestedAction = `Use search_catalog for each item: ${entities.items.join(', ')}`;
        } else {
          suggestedAction = `Ask what items the user wants to add`;
        }
        break;
      
      default:
        suggestedAction = `Ask the user to clarify their request`;
    }

    const parsedIntent: ParsedIntent = {
      type: intentType,
      confidence,
      entities,
      clarificationsNeeded: clarifications,
      suggestedAction,
      preferenceHints: preferenceHints.length > 0 ? preferenceHints : undefined,
    };

    // Build response message
    let responseMessage = `Detected intent: ${intentType} (${Math.round(confidence * 100)}% confidence)`;
    
    if (Object.keys(entities).length > 0) {
      const entityParts: string[] = [];
      if (entities.recipe) entityParts.push(`recipe: ${entities.recipe}`);
      if (entities.servings) entityParts.push(`servings: ${entities.servings}`);
      if (entities.dietaryPreference) entityParts.push(`dietary: ${entities.dietaryPreference}`);
      if (entities.scheduledTime) entityParts.push(`time: ${entities.scheduledTime}`);
      if (entities.items) entityParts.push(`items: ${entities.items.join(', ')}`);
      
      responseMessage += `. Extracted: ${entityParts.join(', ')}`;
    }
    
    // Add preference hints to response
    if (preferenceHints.length > 0) {
      responseMessage += `\n\nFrom your order history: ${preferenceHints.join(' ')}`;
    }
    
    if (clarifications.length > 0) {
      responseMessage += `. Need to clarify: ${clarifications.map(c => c.field).join(', ')}`;
    }

    const response: ToolResponse = {
      success: true,
      message: responseMessage,
      data: {
        intent: parsedIntent,
        original_message: message,
        user_preferences_applied: !!userPreferences,
      },
      requiresUserAction: clarifications.length > 0,
      actionType: clarifications.length > 0 ? 'clarify_intent' : undefined,
      clarifications: clarifications.length > 0 ? clarifications : undefined,
    };

    logger.toolSuccess(requestId, 'understand_intent', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to understand intent';
    logger.toolError(requestId, 'understand_intent', errorMessage);

    return {
      success: false,
      message: `Failed to understand intent: ${errorMessage}`,
    };
  }
}
