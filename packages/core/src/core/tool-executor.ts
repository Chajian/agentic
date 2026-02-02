/**
 * Tool Executor
 * 
 * Handles the execution of tools with parameter validation,
 * context injection, and error handling.
 * 
 * @module core/tool-executor
 */

import type { 
  Tool, 
  ToolContext, 
  ToolResult, 
  ToolParameter,
  ToolLogger 
} from '../types/tool.js';
import type { KnowledgeBase } from '../types/knowledge.js';
import { ToolRegistry, ToolNotFoundError } from './tool-registry.js';

/**
 * Error thrown when tool parameter validation fails
 */
export class ToolValidationError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly parameterName: string,
    public readonly reason: string
  ) {
    super(message);
    this.name = 'ToolValidationError';
  }
}

/**
 * Error thrown when tool execution fails
 */
export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

/**
 * Error thrown when tool execution times out
 */
export class ToolTimeoutError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly timeoutMs: number
  ) {
    super(`Tool execution timed out after ${timeoutMs}ms: ${toolName}`);
    this.name = 'ToolTimeoutError';
  }
}

/**
 * Options for tool execution
 */
export interface ToolExecutorOptions {
  /** Default timeout for tool execution in milliseconds (default: 30000) */
  defaultTimeout?: number;
  /** Whether to validate parameters strictly (default: true) */
  strictValidation?: boolean;
}

/**
 * Context provider for tool execution
 */
export interface ToolContextProvider {
  /** Get the knowledge base instance */
  getKnowledgeBase(): KnowledgeBase;
  /** Get the current session ID */
  getSessionId(): string;
  /** Get the logger instance */
  getLogger(): ToolLogger;
}

/**
 * Result of a tool execution including metadata
 */
export interface ToolExecutionResult {
  /** The tool result */
  result: ToolResult;
  /** Tool name that was executed */
  toolName: string;
  /** Arguments passed to the tool */
  arguments: Record<string, unknown>;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Whether the execution was successful */
  success: boolean;
  /** Error if execution failed */
  error?: Error;
}

/**
 * Default logger implementation
 */
const defaultLogger: ToolLogger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(`[INFO] ${message}`, data ?? '');
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, data ?? '');
  },
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, data ?? '');
  },
  debug: (message: string, data?: Record<string, unknown>) => {
    console.debug(`[DEBUG] ${message}`, data ?? '');
  },
};

/**
 * Validates a single parameter value against its definition
 */
function validateParameterValue(
  param: ToolParameter,
  value: unknown,
  toolName: string
): void {
  // Check required parameters
  if (param.required && (value === undefined || value === null)) {
    throw new ToolValidationError(
      `Missing required parameter: ${param.name}`,
      toolName,
      param.name,
      'Parameter is required but was not provided'
    );
  }

  // Skip validation for optional parameters that are not provided
  if (value === undefined || value === null) {
    return;
  }

  // Type validation
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  
  // Handle type mapping
  const expectedType = param.type;
  if (expectedType === 'object' && actualType === 'object' && !Array.isArray(value)) {
    // Valid object
  } else if (expectedType === 'array' && Array.isArray(value)) {
    // Valid array
  } else if (expectedType === actualType) {
    // Direct type match
  } else {
    throw new ToolValidationError(
      `Invalid type for parameter ${param.name}: expected ${param.type}, got ${actualType}`,
      toolName,
      param.name,
      `Expected type ${param.type} but received ${actualType}`
    );
  }

  // Enum validation
  if (param.enum && param.enum.length > 0) {
    if (!param.enum.includes(String(value))) {
      throw new ToolValidationError(
        `Invalid value for parameter ${param.name}: must be one of [${param.enum.join(', ')}]`,
        toolName,
        param.name,
        `Value must be one of: ${param.enum.join(', ')}`
      );
    }
  }
}

/**
 * Validates all parameters for a tool
 */
function validateParameters(
  tool: Tool,
  args: Record<string, unknown>
): Record<string, unknown> {
  const validatedArgs: Record<string, unknown> = {};

  // Validate each defined parameter
  for (const param of tool.parameters) {
    const value = args[param.name];
    validateParameterValue(param, value, tool.name);
    
    // Use provided value or default
    if (value !== undefined && value !== null) {
      validatedArgs[param.name] = value;
    } else if (param.default !== undefined) {
      validatedArgs[param.name] = param.default;
    }
  }

  // Check for unknown parameters
  const knownParams = new Set(tool.parameters.map(p => p.name));
  for (const key of Object.keys(args)) {
    if (!knownParams.has(key)) {
      // Include unknown parameters but log a warning
      validatedArgs[key] = args[key];
    }
  }

  return validatedArgs;
}

/**
 * Creates a promise that rejects after a timeout
 */
function createTimeout(ms: number, toolName: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new ToolTimeoutError(toolName, ms));
    }, ms);
  });
}

/**
 * Tool Executor
 * 
 * Executes tools with parameter validation, context injection,
 * timeout handling, and error management.
 */
export class ToolExecutor {
  private options: Required<ToolExecutorOptions>;
  private contextProvider?: ToolContextProvider;

  constructor(
    private registry: ToolRegistry,
    options: ToolExecutorOptions = {}
  ) {
    this.options = {
      defaultTimeout: options.defaultTimeout ?? 30000,
      strictValidation: options.strictValidation ?? true,
    };
  }

  /**
   * Set the context provider for tool execution
   */
  setContextProvider(provider: ToolContextProvider): void {
    this.contextProvider = provider;
  }

  /**
   * Create a tool context from the provider or defaults
   */
  private createContext(sessionId?: string): ToolContext {
    if (this.contextProvider) {
      return {
        knowledgeBase: this.contextProvider.getKnowledgeBase(),
        sessionId: sessionId ?? this.contextProvider.getSessionId(),
        logger: this.contextProvider.getLogger(),
      };
    }

    // Return a minimal context if no provider is set
    return {
      knowledgeBase: {
        addDocument: async () => '',
        getDocument: async () => null,
        deleteDocument: async () => false,
        search: async () => [],
        listCategories: async () => [],
        getDocumentsByCategory: async () => [],
      },
      sessionId: sessionId ?? 'default',
      logger: defaultLogger,
    };
  }

  /**
   * Execute a tool by name with the given arguments
   * 
   * @param toolName - Name of the tool to execute
   * @param args - Arguments to pass to the tool
   * @param options - Execution options
   * @returns The execution result
   */
  async execute(
    toolName: string,
    args: Record<string, unknown>,
    options?: {
      sessionId?: string;
      timeout?: number;
    }
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const timeout = options?.timeout ?? this.options.defaultTimeout;

    // Get the tool
    const tool = this.registry.get(toolName);
    if (!tool) {
      const error = new ToolNotFoundError(toolName);
      return {
        result: {
          success: false,
          content: `Tool not found: ${toolName}`,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: error.message,
          },
        },
        toolName,
        arguments: args,
        durationMs: Date.now() - startTime,
        success: false,
        error,
      };
    }

    // Validate parameters
    let validatedArgs: Record<string, unknown>;
    try {
      validatedArgs = this.options.strictValidation
        ? validateParameters(tool, args)
        : args;
    } catch (error) {
      if (error instanceof ToolValidationError) {
        return {
          result: {
            success: false,
            content: error.message,
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message,
              details: {
                parameter: error.parameterName,
                reason: error.reason,
              },
            },
          },
          toolName,
          arguments: args,
          durationMs: Date.now() - startTime,
          success: false,
          error,
        };
      }
      throw error;
    }

    // Create context
    const context = this.createContext(options?.sessionId);

    // Execute with timeout
    try {
      const result = await Promise.race([
        tool.execute(validatedArgs, context),
        createTimeout(timeout, toolName),
      ]);

      return {
        result,
        toolName,
        arguments: validatedArgs,
        durationMs: Date.now() - startTime,
        success: result.success,
      };
    } catch (error) {
      const execError = error instanceof Error ? error : new Error(String(error));
      
      // Handle timeout
      if (error instanceof ToolTimeoutError) {
        return {
          result: {
            success: false,
            content: `Tool execution timed out after ${timeout}ms`,
            error: {
              code: 'TIMEOUT',
              message: execError.message,
            },
          },
          toolName,
          arguments: validatedArgs,
          durationMs: Date.now() - startTime,
          success: false,
          error: execError,
        };
      }

      // Handle other errors
      return {
        result: {
          success: false,
          content: `Tool execution failed: ${execError.message}`,
          error: {
            code: 'EXECUTION_ERROR',
            message: execError.message,
            details: execError.stack,
          },
        },
        toolName,
        arguments: validatedArgs,
        durationMs: Date.now() - startTime,
        success: false,
        error: new ToolExecutionError(
          `Tool execution failed: ${execError.message}`,
          toolName,
          execError
        ),
      };
    }
  }

  /**
   * Execute multiple tools in sequence
   * 
   * @param calls - Array of tool calls to execute
   * @param options - Execution options
   * @returns Array of execution results
   */
  async executeSequence(
    calls: Array<{ toolName: string; args: Record<string, unknown> }>,
    options?: {
      sessionId?: string;
      timeout?: number;
      stopOnError?: boolean;
    }
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];
    const stopOnError = options?.stopOnError ?? false;

    for (const call of calls) {
      const result = await this.execute(call.toolName, call.args, {
        sessionId: options?.sessionId,
        timeout: options?.timeout,
      });

      results.push(result);

      if (stopOnError && !result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute multiple tools in parallel
   * 
   * @param calls - Array of tool calls to execute
   * @param options - Execution options
   * @returns Array of execution results
   */
  async executeParallel(
    calls: Array<{ toolName: string; args: Record<string, unknown> }>,
    options?: {
      sessionId?: string;
      timeout?: number;
    }
  ): Promise<ToolExecutionResult[]> {
    const promises = calls.map(call =>
      this.execute(call.toolName, call.args, {
        sessionId: options?.sessionId,
        timeout: options?.timeout,
      })
    );

    return Promise.all(promises);
  }

  /**
   * Check if a tool requires confirmation before execution
   */
  requiresConfirmation(toolName: string): boolean {
    const tool = this.registry.get(toolName);
    return tool?.requiresConfirmation ?? false;
  }

  /**
   * Get the risk level of a tool
   */
  getRiskLevel(toolName: string): 'low' | 'medium' | 'high' | undefined {
    const tool = this.registry.get(toolName);
    return tool?.riskLevel;
  }
}
