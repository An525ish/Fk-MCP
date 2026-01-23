/**
 * JSON-RPC Logger for MCP Server
 * Logs all tool calls with timestamps, parameters, responses, and execution time
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tool?: string;
  message: string;
  data?: unknown;
  duration?: number;
  error?: string;
}

class Logger {
  private logLevel: LogLevel;
  private startTimes: Map<string, number> = new Map();

  constructor() {
    const level = process.env.MCP_LOG_LEVEL || 'debug';
    this.logLevel = this.parseLogLevel(level);
  }

  private parseLogLevel(level: string): LogLevel {
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return validLevels.includes(level as LogLevel) ? (level as LogLevel) : 'debug';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatLog(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
    ];

    if (entry.tool) {
      parts.push(`[${entry.tool}]`);
    }

    parts.push(entry.message);

    if (entry.duration !== undefined) {
      parts.push(`(${entry.duration}ms)`);
    }

    let output = parts.join(' ');

    if (entry.data !== undefined) {
      output += '\n' + JSON.stringify(entry.data, null, 2);
    }

    if (entry.error) {
      output += '\nError: ' + entry.error;
    }

    return output;
  }

  private log(level: LogLevel, message: string, options?: { tool?: string; data?: unknown; error?: string; duration?: number }) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...options,
    };

    const formatted = this.formatLog(entry);

    // IMPORTANT: Always use stderr for logging in MCP servers
    // stdout is reserved for JSON-RPC communication
    console.error(formatted);
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, { data });
  }

  info(message: string, data?: unknown) {
    this.log('info', message, { data });
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, { data });
  }

  error(message: string, error?: Error | string) {
    this.log('error', message, { error: error instanceof Error ? error.message : error });
  }

  /**
   * Start timing a tool execution
   */
  toolStart(toolName: string, params: unknown) {
    const requestId = `${toolName}-${Date.now()}`;
    this.startTimes.set(requestId, Date.now());

    this.log('info', 'Tool call started', {
      tool: toolName,
      data: { params },
    });

    return requestId;
  }

  /**
   * Log successful tool completion
   */
  toolSuccess(requestId: string, toolName: string, result: unknown) {
    const startTime = this.startTimes.get(requestId);
    const duration = startTime ? Date.now() - startTime : undefined;
    this.startTimes.delete(requestId);

    this.log('info', 'Tool call completed', {
      tool: toolName,
      data: { result },
      duration,
    });
  }

  /**
   * Log tool error
   */
  toolError(requestId: string, toolName: string, error: Error | string) {
    const startTime = this.startTimes.get(requestId);
    const duration = startTime ? Date.now() - startTime : undefined;
    this.startTimes.delete(requestId);

    this.log('error', 'Tool call failed', {
      tool: toolName,
      error: error instanceof Error ? error.message : error,
      duration,
    });
  }

  /**
   * Log API request
   */
  apiRequest(method: string, url: string, data?: unknown) {
    this.log('debug', `API Request: ${method} ${url}`, { data });
  }

  /**
   * Log API response
   */
  apiResponse(method: string, url: string, status: number, data?: unknown) {
    const level: LogLevel = status >= 400 ? 'warn' : 'debug';
    this.log(level, `API Response: ${method} ${url} - ${status}`, { data });
  }

  /**
   * Log API error
   */
  apiError(method: string, url: string, error: Error | string) {
    this.log('error', `API Error: ${method} ${url}`, {
      error: error instanceof Error ? error.message : error,
    });
  }
}

// Export singleton instance
export const logger = new Logger();
