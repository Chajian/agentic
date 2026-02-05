/**
 * Message Store
 *
 * Provides persistent storage for conversation messages.
 * Supports storing user messages, agent responses, and tool call records.
 *
 * _Requirements: 9.2_
 */

import { v4 as uuidv4 } from 'uuid';
import type { Message, Session } from './session.js';

// Local copy of core ToolCallRecord to avoid cross-package type resolution issues during linting
interface ToolCallRecord {
  toolName: string;
  arguments: Record<string, unknown>;
  result: {
    success: boolean;
    content: string;
    data?: unknown;
  };
}

// Minimal AgentResponse shape used by MessageStore
type ExecuteResponse = {
  type: 'execute';
  message: string;
  data?: unknown;
  toolCalls?: ToolCallRecord[];
};

type GenericAgentResponse = {
  type: string;
  message?: string;
  data?: unknown;
  toolCalls?: ToolCallRecord[];
};

type AgentResponse = ExecuteResponse | GenericAgentResponse;

/**
 * Stored message with additional persistence metadata
 */
export interface StoredMessage extends Message {
  /** Session ID this message belongs to */
  sessionId: string;
  /** Whether the message has been persisted */
  persisted: boolean;
  /** Persistence timestamp */
  persistedAt?: Date;
}

/**
 * Stored session with persistence metadata
 */
export interface StoredSession extends Session {
  /** Whether the session has been persisted */
  persisted: boolean;
  /** Persistence timestamp */
  persistedAt?: Date;
}

/**
 * Message query options
 */
export interface MessageQueryOptions {
  /** Filter by session ID */
  sessionId?: string;
  /** Filter by role */
  role?: 'user' | 'assistant' | 'system';
  /** Filter by response type (for assistant messages) */
  responseType?: string;
  /** Filter by timestamp (after) */
  after?: Date;
  /** Filter by timestamp (before) */
  before?: Date;
  /** Include tool calls in results */
  includeToolCalls?: boolean;
  /** Maximum number of messages to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order */
  order?: 'asc' | 'desc';
}

/**
 * Tool call query options
 */
export interface ToolCallQueryOptions {
  /** Filter by session ID */
  sessionId?: string;
  /** Filter by tool name */
  toolName?: string;
  /** Filter by success status */
  success?: boolean;
  /** Filter by timestamp (after) */
  after?: Date;
  /** Filter by timestamp (before) */
  before?: Date;
  /** Maximum number of results */
  limit?: number;
}

/**
 * Stored tool call record with additional metadata
 */
export interface StoredToolCall extends ToolCallRecord {
  /** Unique ID for this tool call */
  id: string;
  /** Session ID */
  sessionId: string;
  /** Message ID this tool call belongs to */
  messageId: string;
  /** Timestamp of the tool call */
  timestamp: Date;
}

/**
 * Message Store
 *
 * In-memory message store with support for persistence hooks.
 * Can be extended with database persistence by implementing the
 * MessagePersistence interface.
 */
export class MessageStore {
  private messages: Map<string, StoredMessage> = new Map();
  private sessions: Map<string, StoredSession> = new Map();
  private toolCalls: Map<string, StoredToolCall> = new Map();

  // Index for faster lookups
  private messagesBySession: Map<string, Set<string>> = new Map();
  private toolCallsBySession: Map<string, Set<string>> = new Map();
  private toolCallsByMessage: Map<string, Set<string>> = new Map();

  /**
   * Store a user message
   *
   * @param sessionId - Session ID
   * @param content - Message content
   * @param metadata - Optional metadata
   * @returns The stored message
   */
  storeUserMessage(
    sessionId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): StoredMessage {
    this.ensureSession(sessionId);

    const message: StoredMessage = {
      id: uuidv4(),
      sessionId,
      role: 'user',
      content,
      timestamp: new Date(),
      metadata,
      persisted: false,
    };

    this.addMessage(message);
    return message;
  }

  /**
   * Store an assistant message with agent response
   *
   * @param sessionId - Session ID
   * @param response - Agent response
   * @param metadata - Optional metadata
   * @returns The stored message
   */
  storeAssistantMessage(
    sessionId: string,
    response: AgentResponse,
    metadata?: Record<string, unknown>
  ): StoredMessage {
    this.ensureSession(sessionId);

    const message: StoredMessage = {
      id: uuidv4(),
      sessionId,
      role: 'assistant',
      content: ('message' in response ? response.message : JSON.stringify(response)) as string,
      timestamp: new Date(),
      responseType: response.type,
      metadata,
      persisted: false,
    };

    // Store tool calls if present
    if (response.type === 'execute' && response.toolCalls) {
      message.toolCalls = response.toolCalls;
      this.storeToolCalls(sessionId, message.id, response.toolCalls);
    }

    this.addMessage(message);
    return message;
  }

  /**
   * Store a system message
   *
   * @param sessionId - Session ID
   * @param content - Message content
   * @returns The stored message
   */
  storeSystemMessage(sessionId: string, content: string): StoredMessage {
    this.ensureSession(sessionId);

    const message: StoredMessage = {
      id: uuidv4(),
      sessionId,
      role: 'system',
      content,
      timestamp: new Date(),
      persisted: false,
    };

    this.addMessage(message);
    return message;
  }

  /**
   * Store tool call records
   *
   * @param sessionId - Session ID
   * @param messageId - Message ID
   * @param toolCalls - Tool call records
   */
  private storeToolCalls(sessionId: string, messageId: string, toolCalls: ToolCallRecord[]): void {
    for (const call of toolCalls) {
      const storedCall: StoredToolCall = {
        ...call,
        id: uuidv4(),
        sessionId,
        messageId,
        timestamp: new Date(),
      };

      this.toolCalls.set(storedCall.id, storedCall);

      // Update indexes
      if (!this.toolCallsBySession.has(sessionId)) {
        this.toolCallsBySession.set(sessionId, new Set());
      }
      this.toolCallsBySession.get(sessionId)!.add(storedCall.id);

      if (!this.toolCallsByMessage.has(messageId)) {
        this.toolCallsByMessage.set(messageId, new Set());
      }
      this.toolCallsByMessage.get(messageId)!.add(storedCall.id);
    }
  }

  /**
   * Get a message by ID
   *
   * @param messageId - Message ID
   * @returns The message or undefined
   */
  getMessage(messageId: string): StoredMessage | undefined {
    return this.messages.get(messageId);
  }

  /**
   * Query messages with filters
   *
   * @param options - Query options
   * @returns Array of matching messages
   */
  queryMessages(options?: MessageQueryOptions): StoredMessage[] {
    let messages: StoredMessage[];

    // Start with session filter if provided (uses index)
    if (options?.sessionId) {
      const messageIds = this.messagesBySession.get(options.sessionId);
      if (!messageIds) {
        return [];
      }
      messages = Array.from(messageIds)
        .map((id) => this.messages.get(id)!)
        .filter(Boolean);
    } else {
      messages = Array.from(this.messages.values());
    }

    // Apply filters
    if (options?.role) {
      messages = messages.filter((m) => m.role === options.role);
    }
    if (options?.responseType) {
      messages = messages.filter((m) => m.responseType === options.responseType);
    }
    if (options?.after) {
      messages = messages.filter((m) => m.timestamp >= options.after!);
    }
    if (options?.before) {
      messages = messages.filter((m) => m.timestamp <= options.before!);
    }

    // Sort by timestamp
    const order = options?.order ?? 'asc';
    messages.sort((a, b) => {
      const diff = a.timestamp.getTime() - b.timestamp.getTime();
      return order === 'asc' ? diff : -diff;
    });

    // Apply pagination
    if (options?.offset) {
      messages = messages.slice(options.offset);
    }
    if (options?.limit) {
      messages = messages.slice(0, options.limit);
    }

    // Optionally exclude tool calls
    if (options?.includeToolCalls === false) {
      messages = messages.map((m) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { toolCalls, ...rest } = m;
        return rest as StoredMessage;
      });
    }

    return messages;
  }

  /**
   * Get conversation history for a session
   * Messages are returned in chronological order
   *
   * @param sessionId - Session ID
   * @returns Array of messages ordered by timestamp
   */
  getSessionHistory(sessionId: string): StoredMessage[] {
    return this.queryMessages({
      sessionId,
      order: 'asc',
    });
  }

  /**
   * Query tool calls with filters
   *
   * @param options - Query options
   * @returns Array of matching tool calls
   */
  queryToolCalls(options?: ToolCallQueryOptions): StoredToolCall[] {
    let calls: StoredToolCall[];

    // Start with session filter if provided (uses index)
    if (options?.sessionId) {
      const callIds = this.toolCallsBySession.get(options.sessionId);
      if (!callIds) {
        return [];
      }
      calls = Array.from(callIds)
        .map((id) => this.toolCalls.get(id)!)
        .filter(Boolean);
    } else {
      calls = Array.from(this.toolCalls.values());
    }

    // Apply filters
    if (options?.toolName) {
      calls = calls.filter((c) => c.toolName === options.toolName);
    }
    if (options?.success !== undefined) {
      calls = calls.filter((c) => c.result.success === options.success);
    }
    if (options?.after) {
      calls = calls.filter((c) => c.timestamp >= options.after!);
    }
    if (options?.before) {
      calls = calls.filter((c) => c.timestamp <= options.before!);
    }

    // Sort by timestamp (newest first)
    calls.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (options?.limit) {
      calls = calls.slice(0, options.limit);
    }

    return calls;
  }

  /**
   * Get tool calls for a specific message
   *
   * @param messageId - Message ID
   * @returns Array of tool calls
   */
  getToolCallsForMessage(messageId: string): StoredToolCall[] {
    const callIds = this.toolCallsByMessage.get(messageId);
    if (!callIds) {
      return [];
    }
    return Array.from(callIds)
      .map((id) => this.toolCalls.get(id)!)
      .filter(Boolean);
  }

  /**
   * Get a session by ID
   *
   * @param sessionId - Session ID
   * @returns The session or undefined
   */
  getSession(sessionId: string): StoredSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   *
   * @returns Array of all sessions
   */
  getAllSessions(): StoredSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Delete a message
   *
   * @param messageId - Message ID
   * @returns True if deleted
   */
  deleteMessage(messageId: string): boolean {
    const message = this.messages.get(messageId);
    if (!message) {
      return false;
    }

    // Remove from session index
    const sessionMessages = this.messagesBySession.get(message.sessionId);
    if (sessionMessages) {
      sessionMessages.delete(messageId);
    }

    // Remove associated tool calls
    const toolCallIds = this.toolCallsByMessage.get(messageId);
    if (toolCallIds) {
      for (const callId of toolCallIds) {
        this.toolCalls.delete(callId);
        const sessionCalls = this.toolCallsBySession.get(message.sessionId);
        if (sessionCalls) {
          sessionCalls.delete(callId);
        }
      }
      this.toolCallsByMessage.delete(messageId);
    }

    return this.messages.delete(messageId);
  }

  /**
   * Delete all messages in a session
   *
   * @param sessionId - Session ID
   * @returns Number of messages deleted
   */
  deleteSessionMessages(sessionId: string): number {
    const messageIds = this.messagesBySession.get(sessionId);
    if (!messageIds) {
      return 0;
    }

    let count = 0;
    for (const messageId of messageIds) {
      if (this.deleteMessage(messageId)) {
        count++;
      }
    }

    this.messagesBySession.delete(sessionId);
    this.toolCallsBySession.delete(sessionId);
    this.sessions.delete(sessionId);

    return count;
  }

  /**
   * Get message count for a session
   *
   * @param sessionId - Session ID
   * @returns Number of messages
   */
  getMessageCount(sessionId: string): number {
    return this.messagesBySession.get(sessionId)?.size ?? 0;
  }

  /**
   * Get total message count across all sessions
   *
   * @returns Total number of messages
   */
  getTotalMessageCount(): number {
    return this.messages.size;
  }

  /**
   * Get total tool call count
   *
   * @returns Total number of tool calls
   */
  getTotalToolCallCount(): number {
    return this.toolCalls.size;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.messages.clear();
    this.sessions.clear();
    this.toolCalls.clear();
    this.messagesBySession.clear();
    this.toolCallsBySession.clear();
    this.toolCallsByMessage.clear();
  }

  /**
   * Ensure a session exists
   */
  private ensureSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) {
      const now = new Date();
      this.sessions.set(sessionId, {
        id: sessionId,
        messages: [],
        createdAt: now,
        updatedAt: now,
        active: true,
        persisted: false,
      });
    }
  }

  /**
   * Add a message to storage
   */
  private addMessage(message: StoredMessage): void {
    this.messages.set(message.id, message);

    // Update session index
    if (!this.messagesBySession.has(message.sessionId)) {
      this.messagesBySession.set(message.sessionId, new Set());
    }
    this.messagesBySession.get(message.sessionId)!.add(message.id);

    // Update session timestamp
    const session = this.sessions.get(message.sessionId);
    if (session) {
      session.updatedAt = new Date();
      session.messages.push(message);
    }
  }
}

/**
 * Create a new MessageStore instance
 */
export function createMessageStore(): MessageStore {
  return new MessageStore();
}
