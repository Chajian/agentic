import { PrismaClient } from '@prisma/client';
import type { Message } from '@ai-agent/core';

const prisma = new PrismaClient();

export class ChatStorage {
  /**
   * Create a new session
   */
  async createSession(): Promise<string> {
    const session = await prisma.session.create({
      data: {
        active: true
      }
    });
    return session.id;
  }

  /**
   * Load conversation history from database
   */
  async loadHistory(sessionId: string): Promise<Message[]> {
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    });

    return messages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: msg.metadata as Record<string, unknown> | undefined
    }));
  }

  /**
   * Save a message to database
   */
  async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await prisma.message.create({
      data: {
        sessionId,
        role,
        content,
        timestamp: new Date(),
        metadata: metadata || null
      }
    });
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<Array<{ id: string; createdAt: Date; messageCount: number }>> {
    const sessions = await prisma.session.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return sessions.map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      messageCount: s._count.messages
    }));
  }

  /**
   * Close a session
   */
  async closeSession(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { active: false }
    });
  }

  /**
   * Cleanup
   */
  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

export const storage = new ChatStorage();
