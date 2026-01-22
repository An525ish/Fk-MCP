/**
 * logout_user Tool
 * Clears authentication and removes persisted token
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import { getStorageInfo } from '../utils/tokenStorage.js';
import type { ToolResponse } from '../types/index.js';

export const logoutUserDefinition = {
  name: 'logout_user',
  description: `Logout from Flipkart Minutes and clear saved authentication.

This will:
- Clear the current session
- Remove the persisted token (so you'll need to re-authorize in future chats)

Use this if you want to:
- Switch to a different account
- Revoke MCP access to your account
- Troubleshoot authentication issues`,
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function logoutUser(): Promise<ToolResponse> {
  const requestId = logger.toolStart('logout_user', {});

  try {
    const currentUser = apiClient.getCurrentUser();
    const wasAuthenticated = apiClient.isAuthenticated();
    const storageInfo = getStorageInfo();

    // Perform logout
    apiClient.logout();

    if (wasAuthenticated && currentUser) {
      const response: ToolResponse = {
        success: true,
        message: `Logged out ${currentUser.name} (${currentUser.email}). Persisted authentication has been cleared.`,
        data: {
          previousUser: currentUser,
          storageCleared: storageInfo.exists,
        },
      };

      logger.toolSuccess(requestId, 'logout_user', response);
      return response;
    }

    return {
      success: true,
      message: 'No active session to logout from. Any stored credentials have been cleared.',
      data: {
        wasAuthenticated: false,
      },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Logout failed';
    logger.toolError(requestId, 'logout_user', errorMessage);

    return {
      success: false,
      message: `Logout failed: ${errorMessage}`,
    };
  }
}
