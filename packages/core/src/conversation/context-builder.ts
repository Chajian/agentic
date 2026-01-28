/**
 * Context Builder
 * 
 * Builds LLM context from conversation history.
 * Handles context length limits and message prioritization.
 * 
 * _Requirements: 9.3_
 */

import type { ChatMessage } from '../llm/adapter.js';
import type { Message } from './session.js';
import type { StoredMessage } from './message-store.js';

/**
 * Context builder configuration
 */
export interface ContextBuilderConfig {
  /** Maximum number of tokens in context (approximate) */
  maxTokens?: number;
  /** Maximum number of messages to include */
  maxMessages?: number;
  /** Whether to include system messages */
  includeSystemMessages?: boolean;
  /** Whether to include tool call details */
  includeToolCalls?: boolean;
  /** System prompt to prepend */
  systemPrompt?: string;
  /** Average characters per token (for estimation) */
  charsPerToken?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ContextBuilderConfig> = {
  maxTokens: 4000,
  maxMessages: 20,
  includeSystemMessages: true,
  includeToolCalls: true,
  systemPrompt: '',
  charsPerToken: 4,
};

/**
 * Built context result
 */
export interface BuiltContext {
  /** Messages formatted for LLM */
  messages: ChatMessage[];
  /** Estimated token count */
  estimatedTokens: number;
  /** Number of messages included */
  messageCount: number;
  /** Whether context was truncated */
  truncated: boolean;
  /** Number of messages that were truncated */
  truncatedCount: number;
}

/**
 * Message with priority for context building
 */
interface PrioritizedMessage {
  message: Message | StoredMessage;
  priority: number;
  tokenEstimate: number;
}


/**
 * Context Builder
 * 
 * Builds LLM context from conversation history with intelligent
 * truncation and prioritization.
 */
export class ContextBuilder {
  private config: Required<ContextBuilderConfig>;

  constructor(config?: ContextBuilderConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Build context from messages
   * 
   * @param messages - Conversation messages (should be in chronological order)
   * @param currentMessage - Optional current user message to append
   * @returns Built context with LLM-formatted messages
   */
  build(
    messages: (Message | StoredMessage)[],
    currentMessage?: string
  ): BuiltContext {
    // Filter and prioritize messages
    const prioritized = this.prioritizeMessages(messages);
    
    // Calculate available tokens
    let availableTokens = this.config.maxTokens;
    const result: ChatMessage[] = [];
    let truncated = false;
    let truncatedCount = 0;

    // Add system prompt if configured
    if (this.config.systemPrompt) {
      const systemTokens = this.estimateTokens(this.config.systemPrompt);
      result.push({
        role: 'system',
        content: this.config.systemPrompt,
      });
      availableTokens -= systemTokens;
    }

    // Reserve tokens for current message if provided
    let currentMessageTokens = 0;
    if (currentMessage) {
      currentMessageTokens = this.estimateTokens(currentMessage);
      availableTokens -= currentMessageTokens;
    }

    // Select messages that fit within token limit
    const selectedMessages: PrioritizedMessage[] = [];
    let totalTokens = 0;

    // Process messages from most recent to oldest (higher priority first)
    const sortedByPriority = [...prioritized].sort((a, b) => b.priority - a.priority);

    for (const pm of sortedByPriority) {
      if (selectedMessages.length >= this.config.maxMessages) {
        truncated = true;
        truncatedCount++;
        continue;
      }

      if (totalTokens + pm.tokenEstimate <= availableTokens) {
        selectedMessages.push(pm);
        totalTokens += pm.tokenEstimate;
      } else {
        truncated = true;
        truncatedCount++;
      }
    }

    // Sort selected messages back to chronological order
    selectedMessages.sort((a, b) => 
      a.message.timestamp.getTime() - b.message.timestamp.getTime()
    );

    // Convert to ChatMessage format
    for (const pm of selectedMessages) {
      const chatMessage = this.toChatMessage(pm.message);
      if (chatMessage) {
        result.push(chatMessage);
      }
    }

    // Add current message if provided
    if (currentMessage) {
      result.push({
        role: 'user',
        content: currentMessage,
      });
      totalTokens += currentMessageTokens;
    }

    return {
      messages: result,
      estimatedTokens: totalTokens + (this.config.systemPrompt ? this.estimateTokens(this.config.systemPrompt) : 0),
      messageCount: result.length,
      truncated,
      truncatedCount,
    };
  }

  /**
   * Build context from messages with a specific token budget
   * 
   * @param messages - Conversation messages
   * @param tokenBudget - Maximum tokens to use
   * @returns Built context
   */
  buildWithBudget(
    messages: (Message | StoredMessage)[],
    tokenBudget: number
  ): BuiltContext {
    const originalMaxTokens = this.config.maxTokens;
    this.config.maxTokens = tokenBudget;
    const result = this.build(messages);
    this.config.maxTokens = originalMaxTokens;
    return result;
  }

  /**
   * Convert messages to ChatMessage format without truncation
   * 
   * @param messages - Conversation messages
   * @returns Array of ChatMessage
   */
  toChat(messages: (Message | StoredMessage)[]): ChatMessage[] {
    const result: ChatMessage[] = [];

    // Add system prompt if configured
    if (this.config.systemPrompt) {
      result.push({
        role: 'system',
        content: this.config.systemPrompt,
      });
    }

    // Sort by timestamp to ensure chronological order
    const sorted = [...messages].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    for (const message of sorted) {
      const chatMessage = this.toChatMessage(message);
      if (chatMessage) {
        result.push(chatMessage);
      }
    }

    return result;
  }

  /**
   * Estimate token count for a string
   * 
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / this.config.charsPerToken);
  }

  /**
   * Estimate total tokens for messages
   * 
   * @param messages - Messages to estimate
   * @returns Total estimated tokens
   */
  estimateTotalTokens(messages: (Message | StoredMessage)[]): number {
    let total = 0;
    if (this.config.systemPrompt) {
      total += this.estimateTokens(this.config.systemPrompt);
    }
    for (const message of messages) {
      total += this.estimateTokens(message.content);
      if (this.config.includeToolCalls && message.toolCalls) {
        total += this.estimateTokens(JSON.stringify(message.toolCalls));
      }
    }
    return total;
  }

  /**
   * Update configuration
   * 
   * @param config - New configuration (merged with existing)
   */
  updateConfig(config: Partial<ContextBuilderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ContextBuilderConfig> {
    return { ...this.config };
  }

  /**
   * Prioritize messages for context building
   */
  private prioritizeMessages(
    messages: (Message | StoredMessage)[]
  ): PrioritizedMessage[] {
    const result: PrioritizedMessage[] = [];
    const now = Date.now();

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      // Skip system messages if not configured to include them
      if (message.role === 'system' && !this.config.includeSystemMessages) {
        continue;
      }

      // Calculate priority based on:
      // 1. Recency (more recent = higher priority)
      // 2. Position (later in conversation = higher priority)
      // 3. Role (user messages slightly higher priority)
      const recencyScore = 1 - (now - message.timestamp.getTime()) / (24 * 60 * 60 * 1000);
      const positionScore = i / messages.length;
      const roleScore = message.role === 'user' ? 0.1 : 0;

      const priority = recencyScore * 0.5 + positionScore * 0.4 + roleScore;

      // Estimate tokens
      let tokenEstimate = this.estimateTokens(message.content);
      if (this.config.includeToolCalls && message.toolCalls) {
        tokenEstimate += this.estimateTokens(JSON.stringify(message.toolCalls));
      }

      result.push({
        message,
        priority,
        tokenEstimate,
      });
    }

    return result;
  }

  /**
   * Convert a Message to ChatMessage format
   */
  private toChatMessage(message: Message | StoredMessage): ChatMessage | null {
    let content = message.content;

    // Append tool call information if configured
    if (this.config.includeToolCalls && message.toolCalls && message.toolCalls.length > 0) {
      const toolCallSummary = message.toolCalls
        .map(tc => `[Tool: ${tc.toolName}] ${tc.result.success ? '✓' : '✗'} ${tc.result.content}`)
        .join('\n');
      content = `${content}\n\n${toolCallSummary}`;
    }

    return {
      role: message.role === 'assistant' ? 'assistant' : message.role,
      content,
    };
  }
}

/**
 * Create a new ContextBuilder instance
 */
export function createContextBuilder(config?: ContextBuilderConfig): ContextBuilder {
  return new ContextBuilder(config);
}

/**
 * Utility function to quickly build context from messages
 */
export function buildContext(
  messages: (Message | StoredMessage)[],
  options?: ContextBuilderConfig & { currentMessage?: string }
): BuiltContext {
  const builder = new ContextBuilder(options);
  return builder.build(messages, options?.currentMessage);
}
