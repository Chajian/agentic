/**
 * Agentic Loop Type Definitions
 *
 * Defines the interfaces for the Agent's agentic loop execution system.
 * The agentic loop allows LLM to autonomously decide tool calls and iterate until task completion.
 */

import type { ToolResult } from './tool.js';
import type { StreamEvent } from './streaming.js';

/**
 * Configuration for the agentic loop
 */
export interface LoopConfig {
  /**
   * Maximum number of iterations before forcing termination
   * Default: 10
   */
  maxIterations: number;

  /**
   * Timeout for each iteration in milliseconds
   * Default: 30000 (30 seconds)
   */
  iterationTimeout: number;

  /**
   * Whether to allow parallel tool calls when LLM requests multiple tools
   * Default: true
   */
  parallelToolCalls: boolean;

  /**
   * Whether to continue on tool execution errors
   * If true, error results are fed back to LLM for recovery
   * Default: true
   */
  continueOnError: boolean;
}

/**
 * Default loop configuration
 */
export const DEFAULT_LOOP_CONFIG: LoopConfig = {
  maxIterations: 10,
  iterationTimeout: 30000,
  parallelToolCalls: true,
  continueOnError: true,
};

/**
 * Status of the agentic loop
 */
export type LoopStatus =
  | 'running' // Loop is actively processing
  | 'completed' // LLM decided task is complete
  | 'max_iterations' // Reached iteration limit
  | 'timeout' // Iteration timed out
  | 'error' // Unrecoverable error occurred
  | 'cancelled'; // Loop was cancelled externally

/**
 * Record of a tool call made during the loop
 */
export interface ToolCallRecord {
  /** Unique ID for this tool call */
  id: string;
  /** Name of the tool called */
  toolName: string;
  /** Arguments passed to the tool */
  arguments: Record<string, unknown>;
  /** Result of the tool execution */
  result: ToolResult;
  /** Timestamp when the call was made */
  timestamp: Date;
  /** Duration of the call in milliseconds */
  duration: number;
}

/**
 * Message in the loop conversation
 */
export interface LoopMessage {
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'tool' | 'system';
  /** Message content */
  content: string;
  /** Tool calls requested by assistant (if any) */
  toolCalls?: LLMToolCall[];
  /** Tool call ID this message responds to (for tool role) */
  toolCallId?: string;
}

/**
 * Tool call requested by LLM
 */
export interface LLMToolCall {
  /** Unique ID for this tool call */
  id: string;
  /** Type of the call (always 'function' for now) */
  type: 'function';
  /** Function details */
  function: {
    /** Name of the function to call */
    name: string;
    /** JSON string of arguments */
    arguments: string;
  };
}

/**
 * Current state of the agentic loop
 */
export interface LoopState {
  /** Current iteration number (0-indexed) */
  iteration: number;
  /** All messages in the conversation */
  messages: LoopMessage[];
  /** All tool calls made during the loop */
  toolCalls: ToolCallRecord[];
  /** Current status */
  status: LoopStatus;
  /** Error message if status is 'error' */
  error?: string;
  /** Start time of the loop */
  startTime: Date;
  /** End time of the loop (if completed) */
  endTime?: Date;
}

/**
 * Result of the agentic loop execution
 */
export interface LoopResult {
  /** Final status of the loop */
  status: LoopStatus;
  /** Final response content from LLM */
  content: string;
  /** All tool calls made during execution */
  toolCalls: ToolCallRecord[];
  /** Number of iterations executed */
  iterations: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for a single loop run
 */
export interface LoopRunOptions {
  /** Override max iterations for this run */
  maxIterations?: number;
  /** Override timeout for this run */
  timeout?: number;
  /** System prompt to prepend */
  systemPrompt?: string;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Callback for streaming events */
  onEvent?: (event: StreamEvent) => void;
  /** Session ID for streaming events */
  sessionId?: string;
  /**
   * Historical messages to inject before current user message.
   * Used for stateless operation where history is loaded from database.
   * Messages are injected after system prompt, before current user message.
   */
  history?: LoopMessage[];
}
