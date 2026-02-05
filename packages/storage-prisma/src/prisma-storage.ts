/**
 * Prisma Storage Adapter
 *
 * Provides persistent SQL database storage for AI agent conversations.
 * Supports PostgreSQL, MySQL, SQLite, and other Prisma-supported databases.
 *
 * _Requirements: 2.5, 10.3_
 */

import { PrismaClient, Prisma } from '@prisma/client';
import type { AgentResponse, ToolCallRecord } from '@agentic/core';

type ToolCallResult = ToolCallRecord['result'];
type StoredToolCall = ToolCallRecord & {
  id: string;
  messageId: string;
  timestamp: Date;
};

function parseToolCallResult(json: unknown): ToolCallResult | null {
  if (json && typeof json === 'object' && 'success' in json && 'content' in json) {
    const maybeResult = json as {
      success?: unknown;
      content?: unknown;
      data?: unknown;
    };

    if (typeof maybeResult.success === 'boolean' && typeof maybeResult.content === 'string') {
      return {
        success: maybeResult.success,
        content: maybeResult.content,
        data: maybeResult.data,
      };
    }
  }

  return null;
}

/**
 * Message in conversation history
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallRecord[];
  responseType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Conversation session
 */
export interface Session {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
  active: boolean;
}

/**
 * Pending confirmation for tool execution
 */
export interface PendingConfirmation {
  toolName: string;
  arguments: Record<string, unknown>;
  userMessage: string;
  timestamp: Date;
}

/**
 * Options for creating a new session
 */
export interface CreateSessionOptions {
  id?: string;
  metadata?: Record<string, unknown>;
  systemMessage?: string;
}

/**
 * Options for querying sessions
 */
export interface SessionQueryOptions {
  active?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Message query options
 */
export interface MessageQueryOptions {
  sessionId?: string;
  role?: 'user' | 'assistant' | 'system';
  responseType?: string;
  after?: Date;
  before?: Date;
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
}

/**
 * Tool call query options
 */
export interface ToolCallQueryOptions {
  sessionId?: string;
  toolName?: string;
  success?: boolean;
  after?: Date;
  before?: Date;
  limit?: number;
}

/**
 * Configuration for PrismaStorage
 */
export interface PrismaStorageConfig {
  /** Prisma client instance */
  prisma: PrismaClient;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Prisma Storage Adapter
 *
 * Provides persistent storage for agent conversations using Prisma ORM.
 * Supports multiple SQL databases through Prisma's database adapters.
 */
export class PrismaStorage {
  private prisma: PrismaClient;
  private debug: boolean;

  constructor(prisma: PrismaClient, config?: Omit<PrismaStorageConfig, 'prisma'>) {
    this.prisma = prisma;
    this.debug = config?.debug ?? false;
  }

  /**
   * Create a new session
   */
  async createSession(options?: CreateSessionOptions): Promise<string> {
    const session = await this.prisma.session.create({
      data: {
        id: options?.id,
        active: true,
        metadata: options?.metadata as Prisma.InputJsonValue,
      },
    });

    // Add system message if provided
    if (options?.systemMessage) {
      await this.saveSystemMessage(session.id, options.systemMessage);
    }

    this.log('Created session:', session.id);
    return session.id;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      metadata: session.metadata as Record<string, unknown> | undefined,
      active: session.active,
    };
  }

  /**
   * Query sessions with filters
   */
  async querySessions(options?: SessionQueryOptions): Promise<Session[]> {
    const where: {
      active?: boolean;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (options?.active !== undefined) {
      where.active = options.active;
    }
    if (options?.createdAfter) {
      where.createdAt = { ...where.createdAt, gte: options.createdAfter };
    }
    if (options?.createdBefore) {
      where.createdAt = { ...where.createdAt, lte: options.createdBefore };
    }

    const sessions = await this.prisma.session.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: options?.offset,
      take: options?.limit,
    });

    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      metadata: s.metadata as Record<string, unknown> | undefined,
      active: s.active,
    }));
  }

  /**
   * Get conversation history for a session
   */
  async getHistory(sessionId: string): Promise<Message[]> {
    const messages = await this.prisma.message.findMany({
      where: { sessionId },
      include: {
        toolCalls: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    return messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      timestamp: m.timestamp,
      responseType: m.responseType ?? undefined,
      metadata: m.metadata as Record<string, unknown> | undefined,
      toolCalls:
        m.toolCalls.length > 0
          ? m.toolCalls.map((tc) => ({
              toolName: tc.toolName,
              arguments: tc.arguments as Record<string, unknown>,
              result: parseToolCallResult(tc.result) ?? {
                success: false,
                content: 'Invalid tool call result format',
                data: tc.result,
              },
            }))
          : undefined,
    }));
  }

  /**
   * Save a user message
   */
  async saveUserMessage(
    sessionId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const message = await this.prisma.message.create({
      data: {
        sessionId,
        role: 'user',
        content,
        timestamp: new Date(),
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    // Update session timestamp
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    this.log('Saved user message:', message.id);
    return message.id;
  }

  /**
   * Save an assistant message
   */
  async saveAssistantMessage(
    sessionId: string,
    response: AgentResponse,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const content = 'message' in response ? response.message : JSON.stringify(response);

    const message = await this.prisma.message.create({
      data: {
        sessionId,
        role: 'assistant',
        content,
        timestamp: new Date(),
        responseType: response.type,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    // Save tool calls if present
    if (response.type === 'execute' && response.toolCalls) {
      await this.saveToolCalls(message.id, response.toolCalls);
    }

    // Update session timestamp
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    this.log('Saved assistant message:', message.id);
    return message.id;
  }

  /**
   * Save a system message
   */
  async saveSystemMessage(sessionId: string, content: string): Promise<string> {
    const message = await this.prisma.message.create({
      data: {
        sessionId,
        role: 'system',
        content,
        timestamp: new Date(),
      },
    });

    // Update session timestamp
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    this.log('Saved system message:', message.id);
    return message.id;
  }

  /**
   * Save tool calls for a message
   */
  private async saveToolCalls(messageId: string, toolCalls: ToolCallRecord[]): Promise<void> {
    await this.prisma.toolCall.createMany({
      data: toolCalls.map((tc) => ({
        messageId,
        toolName: tc.toolName,
        arguments: tc.arguments as Prisma.InputJsonValue,
        result: tc.result as unknown as Prisma.InputJsonValue,
        timestamp: new Date(),
      })),
    });
  }

  /**
   * Get a message by ID
   */
  async getMessage(messageId: string): Promise<Message | null> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { toolCalls: true },
    });

    if (!message) {
      return null;
    }

    return {
      id: message.id,
      role: message.role as 'user' | 'assistant' | 'system',
      content: message.content,
      timestamp: message.timestamp,
      responseType: message.responseType ?? undefined,
      metadata: message.metadata as Record<string, unknown> | undefined,
      toolCalls:
        message.toolCalls.length > 0
          ? message.toolCalls.map((tc) => ({
              toolName: tc.toolName,
              arguments: tc.arguments as Record<string, unknown>,
              result: parseToolCallResult(tc.result) ?? {
                success: false,
                content: 'Invalid tool call result format',
                data: tc.result,
              },
            }))
          : undefined,
    };
  }

  /**
   * Query messages with filters
   */
  async queryMessages(options?: MessageQueryOptions): Promise<Message[]> {
    const where: {
      sessionId?: string;
      role?: 'user' | 'assistant' | 'system';
      responseType?: string;
      timestamp?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (options?.sessionId) {
      where.sessionId = options.sessionId;
    }
    if (options?.role) {
      where.role = options.role;
    }
    if (options?.responseType) {
      where.responseType = options.responseType;
    }
    if (options?.after) {
      where.timestamp = { ...where.timestamp, gte: options.after };
    }
    if (options?.before) {
      where.timestamp = { ...where.timestamp, lte: options.before };
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: { toolCalls: true },
      orderBy: { timestamp: options?.order ?? 'asc' },
      skip: options?.offset,
      take: options?.limit,
    });

    return messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      timestamp: m.timestamp,
      responseType: m.responseType ?? undefined,
      metadata: m.metadata as Record<string, unknown> | undefined,
      toolCalls:
        m.toolCalls.length > 0
          ? m.toolCalls.map((tc) => ({
              toolName: tc.toolName,
              arguments: tc.arguments as Record<string, unknown>,
              result: parseToolCallResult(tc.result) ?? {
                success: false,
                content: 'Invalid tool call result format',
                data: tc.result,
              },
            }))
          : undefined,
    }));
  }

  /**
   * Query tool calls with filters
   */
  async queryToolCalls(
    options?: ToolCallQueryOptions
  ): Promise<Array<ToolCallRecord & { id: string; messageId: string; timestamp: Date }>> {
    const where: {
      message?: { sessionId: string };
      toolName?: string;
      timestamp?: { gte?: Date; lte?: Date };
    } = {};

    if (options?.sessionId) {
      where.message = { sessionId: options.sessionId };
    }
    if (options?.toolName) {
      where.toolName = options.toolName;
    }
    if (options?.after) {
      where.timestamp = { ...where.timestamp, gte: options.after };
    }
    if (options?.before) {
      where.timestamp = { ...where.timestamp, lte: options.before };
    }

    const toolCalls = await this.prisma.toolCall.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options?.limit,
    });

    let results: StoredToolCall[] = toolCalls.map((tc) => {
      const parsedResult = parseToolCallResult(tc.result);

      return {
        id: tc.id,
        messageId: tc.messageId,
        toolName: tc.toolName,
        arguments: tc.arguments as Record<string, unknown>,
        result: parsedResult ?? {
          success: false,
          content: 'Invalid tool call result format',
          data: tc.result,
        },
        timestamp: tc.timestamp,
      };
    });

    // Filter by success if specified
    if (options?.success !== undefined) {
      results = results.filter((tc) => tc.result.success === options.success);
    }

    return results;
  }

  /**
   * Get tool calls for a specific message
   */
  async getToolCallsForMessage(messageId: string): Promise<ToolCallRecord[]> {
    const toolCalls = await this.prisma.toolCall.findMany({
      where: { messageId },
      orderBy: { timestamp: 'asc' },
    });

    return toolCalls.map((tc) => ({
      toolName: tc.toolName,
      arguments: tc.arguments as Record<string, unknown>,
      result: parseToolCallResult(tc.result) ?? {
        success: false,
        content: 'Invalid tool call result format',
        data: tc.result,
      },
    }));
  }

  /**
   * Get message count for a session
   */
  async getMessageCount(sessionId: string): Promise<number> {
    return await this.prisma.message.count({
      where: { sessionId },
    });
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return false;
      }

      const existingMetadata = (session.metadata as Record<string, unknown> | null) ?? {};
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          metadata: { ...existingMetadata, ...metadata } as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      this.log('Error updating session metadata:', error);
      return false;
    }
  }

  /**
   * Close a session (mark as inactive)
   */
  async closeSession(sessionId: string): Promise<boolean> {
    try {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          active: false,
          updatedAt: new Date(),
        },
      });
      this.log('Closed session:', sessionId);
      return true;
    } catch (error) {
      this.log('Error closing session:', error);
      return false;
    }
  }

  /**
   * Delete a session and all its messages
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await this.prisma.session.delete({
        where: { id: sessionId },
      });
      this.log('Deleted session:', sessionId);
      return true;
    } catch (error) {
      this.log('Error deleting session:', error);
      return false;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      await this.prisma.message.delete({
        where: { id: messageId },
      });
      this.log('Deleted message:', messageId);
      return true;
    } catch (error) {
      this.log('Error deleting message:', error);
      return false;
    }
  }

  /**
   * Delete all messages in a session
   */
  async deleteSessionMessages(sessionId: string): Promise<number> {
    try {
      const result = await this.prisma.message.deleteMany({
        where: { sessionId },
      });
      this.log('Deleted messages for session:', sessionId, 'count:', result.count);
      return result.count;
    } catch (error) {
      this.log('Error deleting session messages:', error);
      return 0;
    }
  }

  /**
   * Save pending confirmation
   */
  async savePendingConfirmation(
    sessionId: string,
    confirmation: PendingConfirmation
  ): Promise<void> {
    await this.prisma.pendingConfirmation.upsert({
      where: { sessionId },
      create: {
        sessionId,
        toolName: confirmation.toolName,
        arguments: confirmation.arguments as Prisma.InputJsonValue,
        userMessage: confirmation.userMessage,
        timestamp: confirmation.timestamp,
      },
      update: {
        toolName: confirmation.toolName,
        arguments: confirmation.arguments as Prisma.InputJsonValue,
        userMessage: confirmation.userMessage,
        timestamp: confirmation.timestamp,
      },
    });
    this.log('Saved pending confirmation for session:', sessionId);
  }

  /**
   * Get pending confirmation
   */
  async getPendingConfirmation(sessionId: string): Promise<PendingConfirmation | null> {
    const pending = await this.prisma.pendingConfirmation.findUnique({
      where: { sessionId },
    });

    if (!pending) {
      return null;
    }

    return {
      toolName: pending.toolName,
      arguments: pending.arguments as Record<string, unknown>,
      userMessage: pending.userMessage,
      timestamp: pending.timestamp,
    };
  }

  /**
   * Clear pending confirmation
   */
  async clearPendingConfirmation(sessionId: string): Promise<boolean> {
    try {
      await this.prisma.pendingConfirmation.delete({
        where: { sessionId },
      });
      this.log('Cleared pending confirmation for session:', sessionId);
      return true;
    } catch {
      // Not found is OK
      return false;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    this.log('Disconnected from database');
  }

  /**
   * Log debug messages
   */
  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[PrismaStorage]', ...args);
    }
  }
}

/**
 * Create a new PrismaStorage instance
 */
export function createPrismaStorage(
  prisma: PrismaClient,
  config?: Omit<PrismaStorageConfig, 'prisma'>
): PrismaStorage {
  return new PrismaStorage(prisma, config);
}
