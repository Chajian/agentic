/**
 * Session Management
 *
 * Manages conversation sessions for the Agent.
 * Each session maintains its own conversation history and metadata.
 *
 * _Requirements: 9.1, 9.4_
 */

import { v4 as uuidv4 } from 'uuid';

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

// Minimal AgentResponse shape used by SessionManager
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
 * Message in conversation history
 */
export interface Message {
  /** Unique message ID */
  id: string;
  /** Message role */
  role: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
  /** Message timestamp */
  timestamp: Date;
  /** Tool calls made during this message (for assistant messages) */
  toolCalls?: ToolCallRecord[];
  /** Response type (for assistant messages) */
  responseType?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Conversation session
 */
export interface Session {
  /** Unique session ID */
  id: string;
  /** Messages in this session */
  messages: Message[];
  /** Session creation time */
  createdAt: Date;
  /** Last update time */
  updatedAt: Date;
  /** Session metadata */
  metadata?: Record<string, unknown>;
  /** Whether the session is active */
  active: boolean;
}

/**
 * Options for creating a new session
 */
export interface CreateSessionOptions {
  /** Custom session ID (auto-generated if not provided) */
  id?: string;
  /** Initial metadata */
  metadata?: Record<string, unknown>;
  /** Initial system message */
  systemMessage?: string;
}

/**
 * Options for querying sessions
 */
export interface SessionQueryOptions {
  /** Filter by active status */
  active?: boolean;
  /** Filter by creation date (after) */
  createdAfter?: Date;
  /** Filter by creation date (before) */
  createdBefore?: Date;
  /** Maximum number of sessions to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Session Manager
 *
 * Manages the lifecycle of conversation sessions.
 * Provides methods for creating, retrieving, and managing sessions.
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private defaultSessionId: string = 'default';

  /**
   * Create a new session
   *
   * @param options - Session creation options
   * @returns The new session ID
   */
  createSession(options?: CreateSessionOptions): string {
    const id = options?.id ?? uuidv4();

    // Check if session already exists
    if (this.sessions.has(id)) {
      throw new Error(`Session with ID "${id}" already exists`);
    }

    const now = new Date();
    const session: Session = {
      id,
      messages: [],
      createdAt: now,
      updatedAt: now,
      metadata: options?.metadata,
      active: true,
    };

    // Add system message if provided
    if (options?.systemMessage) {
      session.messages.push({
        id: uuidv4(),
        role: 'system',
        content: options.systemMessage,
        timestamp: now,
      });
    }

    this.sessions.set(id, session);
    return id;
  }

  /**
   * Get a session by ID
   *
   * @param sessionId - Session ID
   * @returns The session or undefined if not found
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get or create a session
   *
   * @param sessionId - Session ID
   * @param options - Options for creating if not exists
   * @returns The session
   */
  getOrCreateSession(sessionId: string, options?: Omit<CreateSessionOptions, 'id'>): Session {
    let session = this.sessions.get(sessionId);
    if (!session) {
      this.createSession({ ...options, id: sessionId });
      session = this.sessions.get(sessionId)!;
    }
    return session;
  }

  /**
   * Check if a session exists
   *
   * @param sessionId - Session ID
   * @returns True if session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get all sessions matching query options
   *
   * @param options - Query options
   * @returns Array of matching sessions
   */
  querySessions(options?: SessionQueryOptions): Session[] {
    let sessions = Array.from(this.sessions.values());

    // Apply filters
    if (options?.active !== undefined) {
      sessions = sessions.filter((s) => s.active === options.active);
    }
    if (options?.createdAfter) {
      sessions = sessions.filter((s) => s.createdAt >= options.createdAfter!);
    }
    if (options?.createdBefore) {
      sessions = sessions.filter((s) => s.createdAt <= options.createdBefore!);
    }

    // Sort by creation date (newest first)
    sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    if (options?.offset) {
      sessions = sessions.slice(options.offset);
    }
    if (options?.limit) {
      sessions = sessions.slice(0, options.limit);
    }

    return sessions;
  }

  /**
   * Get conversation history for a session
   * Messages are returned in chronological order (oldest first)
   *
   * @param sessionId - Session ID
   * @returns Array of messages ordered by timestamp
   */
  getHistory(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }
    // Return a copy sorted by timestamp (chronological order)
    return [...session.messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Add a user message to a session
   *
   * @param sessionId - Session ID
   * @param content - Message content
   * @param metadata - Optional metadata
   * @returns The created message
   */
  addUserMessage(sessionId: string, content: string, metadata?: Record<string, unknown>): Message {
    const session = this.getOrCreateSession(sessionId);
    const message: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
      metadata,
    };
    session.messages.push(message);
    session.updatedAt = new Date();
    return message;
  }

  /**
   * Add an assistant message to a session
   *
   * @param sessionId - Session ID
   * @param response - Agent response
   * @param metadata - Optional metadata
   * @returns The created message
   */
  addAssistantMessage(
    sessionId: string,
    response: AgentResponse,
    metadata?: Record<string, unknown>
  ): Message {
    const session = this.getOrCreateSession(sessionId);
    const message: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: ('message' in response ? response.message : JSON.stringify(response)) as string,
      timestamp: new Date(),
      responseType: response.type,
      metadata,
    };

    // Add tool calls if present
    if (response.type === 'execute' && response.toolCalls) {
      message.toolCalls = response.toolCalls;
    }

    session.messages.push(message);
    session.updatedAt = new Date();
    return message;
  }

  /**
   * Add a system message to a session
   *
   * @param sessionId - Session ID
   * @param content - Message content
   * @returns The created message
   */
  addSystemMessage(sessionId: string, content: string): Message {
    const session = this.getOrCreateSession(sessionId);
    const message: Message = {
      id: uuidv4(),
      role: 'system',
      content,
      timestamp: new Date(),
    };
    session.messages.push(message);
    session.updatedAt = new Date();
    return message;
  }

  /**
   * Close a session (mark as inactive)
   *
   * @param sessionId - Session ID
   * @returns True if session was closed
   */
  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    session.active = false;
    session.updatedAt = new Date();
    return true;
  }

  /**
   * Delete a session
   *
   * @param sessionId - Session ID
   * @returns True if session was deleted
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Clear all messages in a session
   *
   * @param sessionId - Session ID
   * @returns True if session was cleared
   */
  clearSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    session.messages = [];
    session.updatedAt = new Date();
    return true;
  }

  /**
   * Update session metadata
   *
   * @param sessionId - Session ID
   * @param metadata - New metadata (merged with existing)
   * @returns True if session was updated
   */
  updateMetadata(sessionId: string, metadata: Record<string, unknown>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    session.metadata = { ...session.metadata, ...metadata };
    session.updatedAt = new Date();
    return true;
  }

  /**
   * Get the default session ID
   */
  getDefaultSessionId(): string {
    return this.defaultSessionId;
  }

  /**
   * Set the default session ID
   */
  setDefaultSessionId(sessionId: string): void {
    this.defaultSessionId = sessionId;
  }

  /**
   * Get total number of sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get total number of messages across all sessions
   */
  getTotalMessageCount(): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      count += session.messages.length;
    }
    return count;
  }
}

/**
 * Create a new SessionManager instance
 */
export function createSessionManager(): SessionManager {
  return new SessionManager();
}
