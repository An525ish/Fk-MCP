/**
 * login_user Tool
 * Authenticates user with Flipkart Minutes API and stores session token
 * Supports OAuth-style browser login, direct token, and password-based login
 */

import { apiClient } from '../client/FlipkartAPIClient.js';
import { logger } from '../utils/logger.js';
import type { LoginUserParams, ToolResponse } from '../types/index.js';

export const loginUserDefinition = {
  name: 'login_user',
  description: `Authenticate with Flipkart Minutes to enable shopping. Must be called before any cart or order operations.

Authentication methods (in order of preference):
1. **Browser Auth (Recommended)**: Call with no parameters - opens browser for secure login
2. **Token**: If you have a JWT token, pass it directly
3. **Email + Password**: Traditional login (least secure)

For browser auth, a URL will be provided - user opens it, logs in, and approves the connection.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      email: {
        type: 'string',
        description: 'User email address (for password login)',
      },
      password: {
        type: 'string',
        description: 'User password (for password login)',
      },
      token: {
        type: 'string',
        description: 'JWT token if already obtained',
      },
      auth_code: {
        type: 'string',
        description: 'Authorization code from browser flow (internal use)',
      },
    },
    required: [],
  },
};

interface LoginParams extends Partial<LoginUserParams> {
  token?: string;
  auth_code?: string;
}

// Store pending auth requests
const pendingAuthRequests = new Map<string, { code: string; authUrl: string; startTime: number }>();

export async function loginUser(params: LoginParams): Promise<ToolResponse> {
  const requestId = logger.toolStart('login_user', { 
    email: params.email, 
    hasPassword: !!params.password,
    hasToken: !!params.token,
    hasAuthCode: !!params.auth_code,
  });

  try {
    // Check if already authenticated (including from persisted storage)
    if (apiClient.isAuthenticated() && !params.token && !params.email && !params.auth_code) {
      try {
        // Verify the token is still valid with the server
        const userInfo = await apiClient.getMe();
        
        const response: ToolResponse = {
          success: true,
          message: `Already logged in as ${userInfo.user.name} (${userInfo.user.email})`,
          data: {
            user: userInfo.user,
            sessionActive: true,
            authMethod: 'persisted',
          },
        };
        
        logger.toolSuccess(requestId, 'login_user', response);
        return response;
      } catch {
        // Token expired or invalid, clear it and continue with fresh login
        logger.info('Persisted token invalid, clearing and requesting new auth');
        apiClient.logout();
      }
    }

    // Method 1: Token-based authentication
    if (params.token) {
      apiClient.setSessionToken(params.token);
      
      try {
        const userInfo = await apiClient.getMe();
        
        const response: ToolResponse = {
          success: true,
          message: `Successfully authenticated as ${userInfo.user.name} (${userInfo.user.email})`,
          data: {
            user: {
              id: userInfo.user.id,
              name: userInfo.user.name,
              email: userInfo.user.email,
            },
            sessionActive: true,
            authMethod: 'token',
          },
        };

        logger.toolSuccess(requestId, 'login_user', response);
        return response;
      } catch {
        apiClient.setSessionToken(null);
        throw new Error('Invalid or expired token.');
      }
    }

    // Method 2: Check auth code status (polling for browser auth)
    if (params.auth_code) {
      try {
        const response = await apiClient.checkAuthStatus(params.auth_code);
        
        if (response.status === 'approved' && response.token) {
          // Set token AND persist with user info
          apiClient.setSessionToken(response.token, response.user);
          pendingAuthRequests.delete(params.auth_code);
          
          return {
            success: true,
            message: `Successfully authenticated as ${response.user?.name} (${response.user?.email}). Your session will persist across chats.`,
            data: {
              user: response.user,
              sessionActive: true,
              authMethod: 'browser',
              persisted: true,
            },
          };
        } else if (response.status === 'denied') {
          pendingAuthRequests.delete(params.auth_code);
          return {
            success: false,
            message: 'Authorization was denied by the user.',
          };
        } else {
          // Still pending
          return {
            success: false,
            message: 'Waiting for user to authorize in browser. Please complete the authorization at the provided URL.',
            data: {
              status: 'pending',
              auth_code: params.auth_code,
            },
          };
        }
      } catch {
        return {
          success: false,
          message: 'Auth request expired or invalid. Please start a new login.',
        };
      }
    }

    // Method 3: Email + Password authentication
    if (params.email && params.password) {
      const result = await apiClient.login(params.email, params.password);

      try {
        await apiClient.getMe();
      } catch {
        // Ignore
      }

      const response: ToolResponse = {
        success: true,
        message: `Successfully logged in as ${result.user.name} (${result.user.email})`,
        data: {
          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
          },
          sessionActive: true,
          authMethod: 'password',
        },
      };

      logger.toolSuccess(requestId, 'login_user', response);
      return response;
    }

    // Method 4: Start browser-based OAuth flow (default when no params)
    try {
      const authRequest = await apiClient.requestMcpAuth();
      
      pendingAuthRequests.set(authRequest.code, {
        code: authRequest.code,
        authUrl: authRequest.authUrl,
        startTime: Date.now(),
      });

      return {
        success: true,
        message: `Please open this URL in your browser to login:\n\n${authRequest.authUrl}\n\nAfter authorizing, call login_user again with auth_code: "${authRequest.code}" to complete login.`,
        requiresUserAction: true,
        data: {
          status: 'awaiting_authorization',
          auth_code: authRequest.code,
          auth_url: authRequest.authUrl,
          expires_in: authRequest.expiresIn,
          instructions: [
            '1. Open the URL above in your browser',
            '2. Login to Flipkart Minutes if not already logged in',
            '3. Click "Authorize" to allow Cursor access',
            '4. Come back here - you\'ll be automatically logged in',
          ],
        },
      };
    } catch (error) {
      // If browser auth fails, fall back to suggesting other methods
      return {
        success: false,
        message: `Could not start browser authentication. Please provide either:
1. 'token' - Your JWT token from the browser app
2. 'email' and 'password' - Your login credentials

To get your token: Open Flipkart Minutes app → DevTools (F12) → Application → Local Storage → copy 'token'`,
      };
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    logger.toolError(requestId, 'login_user', errorMessage);

    if (errorMessage.includes('401') || errorMessage.includes('Invalid')) {
      return {
        success: false,
        message: 'Invalid credentials or token. Please check and try again.',
      };
    }

    return {
      success: false,
      message: `Login failed: ${errorMessage}`,
    };
  }
}
