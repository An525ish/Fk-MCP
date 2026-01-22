#!/usr/bin/env node
/**
 * Flipkart Minutes MCP Server
 * 
 * A Model Context Protocol server that bridges Cursor AI with the Flipkart Minutes API.
 * Enables natural language shopping experiences including:
 * - Product search with smart scoring
 * - Recipe-to-cart workflows
 * - Ambiguity handling (variant selection)
 * - Stock anomaly handling
 * - Price protection
 * - COD guardrails
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { toolDefinitions, handleToolCall } from './tools/index.js';
import { logger } from './utils/logger.js';

// Server metadata
const SERVER_NAME = 'flipkart-minutes-mcp';
const SERVER_VERSION = '1.0.0';

/**
 * Create and configure the MCP server
 */
function createServer(): Server {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.info('Listing available tools');
    return {
      tools: toolDefinitions,
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    logger.info(`Tool call received: ${name}`, args);

    try {
      const result = await handleToolCall(name, args as Record<string, unknown> || {});

      // Format response for MCP
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: !result.success,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Tool call failed: ${name}`, error instanceof Error ? error : new Error(errorMessage));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: `Tool execution failed: ${errorMessage}`,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Main entry point
 */
async function main() {
  logger.info(`Starting ${SERVER_NAME} v${SERVER_VERSION}`);
  logger.info(`API URL: ${process.env.FLIPKART_API_URL || 'http://localhost:5000'}`);

  const server = createServer();
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  logger.info('MCP Server running on stdio');

  // Handle shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    await server.close();
    process.exit(0);
  });
}

// Run the server
main().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});
