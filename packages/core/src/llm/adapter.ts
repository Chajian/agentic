/**
 * LLM Adapter Interface
 *
 * Defines the common interface for all LLM providers.
 * Each provider (OpenAI, Claude, Qwen, etc.) implements this interface.
 */

import type { ToolDefinition } from '../types/tool.js';

/**
 * Options for text generation
 */
export interface GenerateOptions {
  /** Temperature for response generation (0-2) */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** System prompt */
  systemPrompt?: string;
  /** Additional provider-specific options */
  options?: Record<string, unknown>;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

/**
 * Message in a conversation
 */
export interface ChatMessage {
  /** Role of the message sender */
  role: 'system' | 'user' | 'assistant' | 'tool';
  /** Message content */
  content: string;
  /** Tool call ID (for tool responses) */
  toolCallId?: string;
  /** Tool name (for tool responses) */
  toolName?: string;
  /** Tool calls requested by assistant (for assistant messages) */
  toolCalls?: ToolCall[];
}

/**
 * Tool call requested by the LLM
 */
export interface ToolCall {
  /** Unique ID for this tool call */
  id: string;
  /** Name of the tool to call */
  name: string;
  /** Arguments for the tool */
  arguments: Record<string, unknown>;
}

/**
 * Response from LLM generation with tools
 */
export interface LLMResponse {
  /** Text content of the response */
  content: string;
  /** Tool calls requested by the LLM */
  toolCalls?: ToolCall[];
  /** Whether the response is complete or needs tool results */
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  /** Token usage information */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Stream chunk from LLM
 */
export interface StreamChunk {
  /** Type of the chunk */
  type: 'content' | 'tool_call' | 'done';
  /** Content delta (for content chunks) */
  content?: string;
  /** Tool call delta (for tool_call chunks) */
  toolCall?: {
    index: number;
    id?: string;
    name?: string;
    arguments?: string;
  };
  /** Final response (for done chunks) */
  response?: LLMResponse;
}

/**
 * Callback for streaming chunks
 */
export type StreamCallback = (chunk: StreamChunk) => void;

/**
 * Embedding result
 */
export interface EmbeddingResult {
  /** The embedding vector */
  embedding: number[];
  /** Token count of the input */
  tokenCount?: number;
}

/**
 * LLM Adapter Interface
 *
 * All LLM providers must implement this interface to be used with the Agent.
 */
export interface LLMAdapter {
  /** Provider name for identification */
  readonly provider: string;

  /** Model name being used */
  readonly model: string;

  /**
   * Generate text from a prompt
   *
   * @param prompt - The input prompt or conversation messages
   * @param options - Generation options
   * @returns Generated text
   */
  generate(prompt: string | ChatMessage[], options?: GenerateOptions): Promise<string>;

  /**
   * Generate text with tool calling support
   *
   * @param prompt - The input prompt or conversation messages
   * @param tools - Available tools for the LLM to call
   * @param options - Generation options
   * @returns LLM response with potential tool calls
   */
  generateWithTools(
    prompt: string | ChatMessage[],
    tools: ToolDefinition[],
    options?: GenerateOptions
  ): Promise<LLMResponse>;

  /**
   * Generate text with tool calling support (streaming)
   *
   * @param prompt - The input prompt or conversation messages
   * @param tools - Available tools for the LLM to call
   * @param onChunk - Callback for each streaming chunk
   * @param options - Generation options
   * @returns Final LLM response with potential tool calls
   */
  generateWithToolsStream(
    prompt: string | ChatMessage[],
    tools: ToolDefinition[],
    onChunk: StreamCallback,
    options?: GenerateOptions
  ): Promise<LLMResponse>;

  /**
   * Check if the adapter supports streaming
   */
  supportsStreaming(): boolean;

  /**
   * Generate embedding for text
   *
   * @param text - Text to embed
   * @returns Embedding vector
   */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * Check if the adapter supports embeddings
   */
  supportsEmbeddings(): boolean;

  /**
   * Check if the adapter supports tool calling
   */
  supportsToolCalling(): boolean;
}

/**
 * Base configuration for creating an LLM adapter
 */
export interface LLMAdapterConfig {
  /** API key for authentication */
  apiKey: string;
  /** Model identifier */
  model: string;
  /** Custom API endpoint */
  baseUrl?: string;
  /** Default temperature */
  temperature?: number;
  /** Default max tokens */
  maxTokens?: number;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Error thrown by LLM adapters
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: LLMErrorCode,
    public readonly provider: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * LLM error codes
 */
export type LLMErrorCode =
  | 'AUTHENTICATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INVALID_REQUEST'
  | 'MODEL_NOT_FOUND'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'CONTENT_FILTER'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'CANCELLED'
  | 'UNKNOWN_ERROR';

/**
 * Helper to convert string prompt to chat messages
 */
export function promptToMessages(prompt: string, systemPrompt?: string): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  return messages;
}

/**
 * Helper to extract text content from messages
 */
export function messagesToPrompt(messages: ChatMessage[]): string {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');
}
