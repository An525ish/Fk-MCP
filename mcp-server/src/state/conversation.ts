/**
 * Conversation State Management
 * Tracks context across multi-turn conversations for intelligent assistance
 */

import type { Recipe, CartItem } from '../types/index.js';

// ============================================
// Types
// ============================================

export interface ConversationContext {
  // Current intent being processed
  currentIntent?: 'recipe' | 'reorder' | 'browse' | 'schedule' | 'checkout' | 'unknown';
  
  // Pending clarifications that need user response
  pendingClarifications?: Array<{
    field: string;
    question: string;
    options?: string[];
    askedAt: Date;
  }>;
  
  // Recipe context
  selectedRecipe?: {
    id: string;
    name: string;
    servings: number;
  };
  
  // User-provided context
  servings?: number;
  dietaryPreference?: 'veg' | 'non_veg' | 'vegan';
  scheduledTime?: string;
  
  // Cart preview (before adding)
  cartPreview?: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  
  // Last action taken
  lastAction?: {
    type: string;
    timestamp: Date;
    data?: unknown;
  };
  
  // Conversation metadata
  startedAt: Date;
  lastUpdatedAt: Date;
  turnCount: number;
}

// ============================================
// State Storage (In-Memory)
// ============================================

// Map of user ID to conversation context
const conversationStates: Map<string, ConversationContext> = new Map();

// Session timeout (30 minutes)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// ============================================
// State Management Functions
// ============================================

/**
 * Get or create conversation context for a user
 */
export function getConversationContext(userId: string): ConversationContext {
  let context = conversationStates.get(userId);
  
  // Check if context exists and is not expired
  if (context) {
    const now = new Date();
    const timeSinceUpdate = now.getTime() - context.lastUpdatedAt.getTime();
    
    if (timeSinceUpdate > SESSION_TIMEOUT_MS) {
      // Session expired, create new context
      context = createNewContext();
      conversationStates.set(userId, context);
    }
  } else {
    // No context exists, create new one
    context = createNewContext();
    conversationStates.set(userId, context);
  }
  
  return context;
}

/**
 * Create a new conversation context
 */
function createNewContext(): ConversationContext {
  const now = new Date();
  return {
    startedAt: now,
    lastUpdatedAt: now,
    turnCount: 0,
  };
}

/**
 * Update conversation context
 */
export function updateConversationContext(
  userId: string,
  updates: Partial<ConversationContext>
): ConversationContext {
  const context = getConversationContext(userId);
  
  // Apply updates
  Object.assign(context, updates, {
    lastUpdatedAt: new Date(),
    turnCount: context.turnCount + 1,
  });
  
  conversationStates.set(userId, context);
  return context;
}

/**
 * Set current intent
 */
export function setIntent(
  userId: string,
  intent: ConversationContext['currentIntent']
): ConversationContext {
  return updateConversationContext(userId, { currentIntent: intent });
}

/**
 * Add pending clarification
 */
export function addClarification(
  userId: string,
  field: string,
  question: string,
  options?: string[]
): ConversationContext {
  const context = getConversationContext(userId);
  
  const clarifications = context.pendingClarifications || [];
  clarifications.push({
    field,
    question,
    options,
    askedAt: new Date(),
  });
  
  return updateConversationContext(userId, {
    pendingClarifications: clarifications,
  });
}

/**
 * Resolve a clarification (remove from pending)
 */
export function resolveClarification(
  userId: string,
  field: string,
  value: unknown
): ConversationContext {
  const context = getConversationContext(userId);
  
  // Remove the clarification
  const clarifications = (context.pendingClarifications || [])
    .filter(c => c.field !== field);
  
  // Update the corresponding field
  const updates: Partial<ConversationContext> = {
    pendingClarifications: clarifications,
  };
  
  // Map field to context property
  switch (field) {
    case 'servings':
      updates.servings = value as number;
      break;
    case 'dietaryPreference':
      updates.dietaryPreference = value as 'veg' | 'non_veg' | 'vegan';
      break;
    case 'scheduledTime':
      updates.scheduledTime = value as string;
      break;
    case 'recipe':
      updates.selectedRecipe = value as ConversationContext['selectedRecipe'];
      break;
  }
  
  return updateConversationContext(userId, updates);
}

/**
 * Set selected recipe
 */
export function setSelectedRecipe(
  userId: string,
  recipe: { id: string; name: string; servings: number }
): ConversationContext {
  return updateConversationContext(userId, {
    selectedRecipe: recipe,
    currentIntent: 'recipe',
  });
}

/**
 * Set cart preview
 */
export function setCartPreview(
  userId: string,
  items: ConversationContext['cartPreview']
): ConversationContext {
  return updateConversationContext(userId, { cartPreview: items });
}

/**
 * Record last action
 */
export function recordAction(
  userId: string,
  actionType: string,
  data?: unknown
): ConversationContext {
  return updateConversationContext(userId, {
    lastAction: {
      type: actionType,
      timestamp: new Date(),
      data,
    },
  });
}

/**
 * Clear conversation context
 */
export function clearConversationContext(userId: string): void {
  conversationStates.delete(userId);
}

/**
 * Check if there are pending clarifications
 */
export function hasPendingClarifications(userId: string): boolean {
  const context = conversationStates.get(userId);
  return (context?.pendingClarifications?.length || 0) > 0;
}

/**
 * Get pending clarifications
 */
export function getPendingClarifications(userId: string): ConversationContext['pendingClarifications'] {
  const context = conversationStates.get(userId);
  return context?.pendingClarifications || [];
}

/**
 * Get conversation summary for debugging/logging
 */
export function getConversationSummary(userId: string): string {
  const context = conversationStates.get(userId);
  
  if (!context) {
    return 'No active conversation';
  }
  
  const parts: string[] = [];
  
  if (context.currentIntent) {
    parts.push(`Intent: ${context.currentIntent}`);
  }
  
  if (context.selectedRecipe) {
    parts.push(`Recipe: ${context.selectedRecipe.name}`);
  }
  
  if (context.servings) {
    parts.push(`Servings: ${context.servings}`);
  }
  
  if (context.dietaryPreference) {
    parts.push(`Diet: ${context.dietaryPreference}`);
  }
  
  if (context.scheduledTime) {
    parts.push(`Scheduled: ${context.scheduledTime}`);
  }
  
  if (context.pendingClarifications?.length) {
    parts.push(`Pending: ${context.pendingClarifications.map(c => c.field).join(', ')}`);
  }
  
  parts.push(`Turns: ${context.turnCount}`);
  
  return parts.join(' | ');
}

/**
 * Clean up expired sessions (call periodically)
 */
export function cleanupExpiredSessions(): number {
  const now = new Date();
  let cleaned = 0;
  
  for (const [userId, context] of conversationStates.entries()) {
    const timeSinceUpdate = now.getTime() - context.lastUpdatedAt.getTime();
    
    if (timeSinceUpdate > SESSION_TIMEOUT_MS) {
      conversationStates.delete(userId);
      cleaned++;
    }
  }
  
  return cleaned;
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredSessions, 10 * 60 * 1000);
