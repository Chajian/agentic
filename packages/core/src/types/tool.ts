/**
 * Tool System Type Definitions
 * 
 * Defines the interfaces for the Agent's tool registration and execution system.
 * Tools are the primary way the Agent interacts with external systems.
 */

import type { KnowledgeBase } from './knowledge.js';

/**
 * Parameter type for tool definitions
 */
export type ToolParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array';

/**
 * Defines a single parameter for a tool
 */
export interface ToolParameter {
  /** Parameter name */
  name: string;
  /** Parameter data type */
  type: ToolParameterType;
  /** Human-readable description of the parameter */
  description: string;
  /** Whether this parameter is required */
  required: boolean;
  /** Optional list of allowed values */
  enum?: string[];
  /** Default value if not provided */
  default?: unknown;
}

/**
 * Context provided to tool execution
 */
export interface ToolContext {
  /** Access to the knowledge base for RAG operations */
  knowledgeBase: KnowledgeBase;
  /** Current conversation session ID */
  sessionId: string;
  /** Logger for tool operations */
  logger: ToolLogger;
}

/**
 * Logger interface for tool operations
 */
export interface ToolLogger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
}

/**
 * Result of a tool execution
 */
export interface ToolResult {
  /** Whether the execution was successful */
  success: boolean;
  /** Human-readable result message */
  content: string;
  /** Optional structured data from the execution */
  data?: unknown;
  /** Error details if execution failed */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Tool execution function signature
 */
export type ToolExecutor = (
  args: Record<string, unknown>,
  context: ToolContext
) => Promise<ToolResult>;

/**
 * Complete tool definition
 */
export interface Tool {
  /** Unique tool name (used for Function Calling) */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** List of parameters the tool accepts */
  parameters: ToolParameter[];
  /** The function that executes the tool */
  execute: ToolExecutor;
  /** Optional category for grouping tools */
  category?: string;
  /** Whether this tool requires confirmation before execution */
  requiresConfirmation?: boolean;
  /** Risk level of this tool's operations */
  riskLevel?: 'low' | 'medium' | 'high';
}

/**
 * Tool definition format for LLM Function Calling
 * This is the format expected by OpenAI/Claude APIs
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ToolPropertySchema>;
      required: string[];
    };
  };
}

/**
 * JSON Schema property definition for tool parameters
 */
export interface ToolPropertySchema {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}

/**
 * Converts a Tool to a ToolDefinition for LLM Function Calling
 */
export function toolToDefinition(tool: Tool): ToolDefinition {
  const properties: Record<string, ToolPropertySchema> = {};
  const required: string[] = [];

  for (const param of tool.parameters) {
    const propSchema: ToolPropertySchema = {
      type: param.type,
      description: param.description,
    };
    if (param.enum) {
      propSchema.enum = param.enum;
    }
    if (param.default !== undefined) {
      propSchema.default = param.default;
    }
    properties[param.name] = propSchema;
    
    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  };
}
