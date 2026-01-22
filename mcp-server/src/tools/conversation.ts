/**
 * Conversation Management Tools
 * Track and manage multi-turn conversation context
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import {
  getConversationContext,
  updateConversationContext,
  clearConversationContext,
  resolveClarification,
  getConversationSummary,
  hasPendingClarifications,
  getPendingClarifications,
  recordAction,
} from '../state/conversation.js';
import type { ToolResponse } from '../types/index.js';

// ============================================
// Get Conversation Context Tool
// ============================================

export const getContextDefinition = {
  name: 'get_conversation_context',
  description: `Get the current conversation context and state.

Returns:
- Current intent being processed
- Pending clarifications that need user response
- Selected recipe and servings
- Dietary preferences mentioned
- Scheduled time if any
- Last action taken

Use this to understand the current state of the conversation and what information is still needed.
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function getContext(): Promise<ToolResponse> {
  const requestId = logger.toolStart('get_conversation_context', {});

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool.',
      };
    }

    const user = apiClient.getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'User session not found.',
      };
    }

    const context = getConversationContext(user.id);
    const summary = getConversationSummary(user.id);

    const response: ToolResponse = {
      success: true,
      message: summary || 'No active conversation context.',
      data: {
        context: {
          current_intent: context.currentIntent,
          selected_recipe: context.selectedRecipe,
          servings: context.servings,
          dietary_preference: context.dietaryPreference,
          scheduled_time: context.scheduledTime,
          pending_clarifications: context.pendingClarifications?.map(c => ({
            field: c.field,
            question: c.question,
            options: c.options,
          })),
          cart_preview: context.cartPreview,
          last_action: context.lastAction ? {
            type: context.lastAction.type,
            timestamp: context.lastAction.timestamp,
          } : null,
          turn_count: context.turnCount,
        },
        has_pending_clarifications: hasPendingClarifications(user.id),
      },
    };

    logger.toolSuccess(requestId, 'get_conversation_context', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get context';
    logger.toolError(requestId, 'get_conversation_context', errorMessage);

    return {
      success: false,
      message: `Failed to get conversation context: ${errorMessage}`,
    };
  }
}

// ============================================
// Update Conversation Context Tool
// ============================================

export const updateContextDefinition = {
  name: 'update_conversation_context',
  description: `Update the conversation context with new information.

Use this to:
- Set the current intent (recipe, reorder, browse, schedule, checkout)
- Record user's dietary preference
- Set number of servings
- Store scheduled delivery time
- Record any other context from user's messages

This helps maintain context across multiple turns in the conversation.
Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      intent: {
        type: 'string',
        enum: ['recipe', 'reorder', 'browse', 'schedule', 'checkout', 'unknown'],
        description: 'The current intent being processed',
      },
      servings: {
        type: 'number',
        description: 'Number of servings/people',
      },
      dietary_preference: {
        type: 'string',
        enum: ['veg', 'non_veg', 'vegan'],
        description: 'User\'s dietary preference',
      },
      scheduled_time: {
        type: 'string',
        description: 'Scheduled delivery time (ISO format)',
      },
      recipe_id: {
        type: 'string',
        description: 'Selected recipe ID',
      },
      recipe_name: {
        type: 'string',
        description: 'Selected recipe name',
      },
    },
    required: [],
  },
};

export async function updateContext(params: {
  intent?: 'recipe' | 'reorder' | 'browse' | 'schedule' | 'checkout' | 'unknown';
  servings?: number;
  dietary_preference?: 'veg' | 'non_veg' | 'vegan';
  scheduled_time?: string;
  recipe_id?: string;
  recipe_name?: string;
}): Promise<ToolResponse> {
  const requestId = logger.toolStart('update_conversation_context', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool.',
      };
    }

    const user = apiClient.getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'User session not found.',
      };
    }

    // Build updates
    const updates: Record<string, unknown> = {};
    const updatedFields: string[] = [];

    if (params.intent) {
      updates.currentIntent = params.intent;
      updatedFields.push('intent');
    }

    if (params.servings !== undefined) {
      updates.servings = params.servings;
      updatedFields.push('servings');
    }

    if (params.dietary_preference) {
      updates.dietaryPreference = params.dietary_preference;
      updatedFields.push('dietary preference');
    }

    if (params.scheduled_time) {
      updates.scheduledTime = params.scheduled_time;
      updatedFields.push('scheduled time');
    }

    if (params.recipe_id || params.recipe_name) {
      updates.selectedRecipe = {
        id: params.recipe_id || '',
        name: params.recipe_name || '',
        servings: params.servings || 2,
      };
      updatedFields.push('recipe');
    }

    if (updatedFields.length === 0) {
      return {
        success: false,
        message: 'No context updates provided.',
      };
    }

    updateConversationContext(user.id, updates as Parameters<typeof updateConversationContext>[1]);
    const summary = getConversationSummary(user.id);

    const response: ToolResponse = {
      success: true,
      message: `Updated context: ${updatedFields.join(', ')}. Current state: ${summary}`,
      data: {
        updated_fields: updatedFields,
        current_context: summary,
      },
    };

    logger.toolSuccess(requestId, 'update_conversation_context', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update context';
    logger.toolError(requestId, 'update_conversation_context', errorMessage);

    return {
      success: false,
      message: `Failed to update conversation context: ${errorMessage}`,
    };
  }
}

// ============================================
// Resolve Clarification Tool
// ============================================

export const resolveClarificationDefinition = {
  name: 'resolve_clarification',
  description: `Mark a pending clarification as resolved with the user's answer.

Use this when user provides an answer to a clarifying question.
For example, if we asked "veg or non-veg?" and user says "veg", use this to record that.

Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      field: {
        type: 'string',
        description: 'The field that was clarified (e.g., "dietaryPreference", "servings", "recipe")',
      },
      value: {
        type: 'string',
        description: 'The value provided by the user',
      },
    },
    required: ['field', 'value'],
  },
};

export async function resolveClarificationTool(params: { field: string; value: string }): Promise<ToolResponse> {
  const requestId = logger.toolStart('resolve_clarification', params);

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool.',
      };
    }

    const user = apiClient.getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'User session not found.',
      };
    }

    // Parse value based on field type
    let parsedValue: unknown = params.value;
    
    if (params.field === 'servings') {
      parsedValue = parseInt(params.value, 10);
      if (isNaN(parsedValue as number)) {
        return {
          success: false,
          message: 'Invalid servings value. Please provide a number.',
        };
      }
    }

    resolveClarification(user.id, params.field, parsedValue);
    
    // Check if there are more pending clarifications
    const remaining = getPendingClarifications(user.id) || [];
    const summary = getConversationSummary(user.id);

    const response: ToolResponse = {
      success: true,
      message: remaining.length > 0
        ? `Got it! ${remaining.length} more question(s) to answer.`
        : 'All clarifications resolved. Ready to proceed!',
      data: {
        resolved_field: params.field,
        resolved_value: parsedValue,
        remaining_clarifications: remaining.map(c => ({
          field: c.field,
          question: c.question,
        })),
        current_context: summary,
      },
    };

    logger.toolSuccess(requestId, 'resolve_clarification', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to resolve clarification';
    logger.toolError(requestId, 'resolve_clarification', errorMessage);

    return {
      success: false,
      message: `Failed to resolve clarification: ${errorMessage}`,
    };
  }
}

// ============================================
// Clear Context Tool
// ============================================

export const clearContextDefinition = {
  name: 'clear_conversation_context',
  description: `Clear the current conversation context and start fresh.

Use this when:
- User wants to start over
- Conversation topic changes completely
- User explicitly asks to reset

Requires: User must be logged in first (use login_user tool).`,
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function clearContext(): Promise<ToolResponse> {
  const requestId = logger.toolStart('clear_conversation_context', {});

  try {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
      return {
        success: false,
        message: 'Please login first using the login_user tool.',
      };
    }

    const user = apiClient.getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'User session not found.',
      };
    }

    clearConversationContext(user.id);

    const response: ToolResponse = {
      success: true,
      message: 'Conversation context cleared. Ready for a fresh start!',
      data: {
        cleared: true,
      },
    };

    logger.toolSuccess(requestId, 'clear_conversation_context', response);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to clear context';
    logger.toolError(requestId, 'clear_conversation_context', errorMessage);

    return {
      success: false,
      message: `Failed to clear conversation context: ${errorMessage}`,
    };
  }
}
