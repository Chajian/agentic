/**
 * @ai-agent/storage-prisma
 *
 * Prisma storage adapter for AI Agent framework.
 * Provides persistent SQL database storage for production use.
 *
 * Supports PostgreSQL, MySQL, SQLite, SQL Server, and MongoDB.
 */

export {
  PrismaStorage,
  createPrismaStorage,
  type PrismaStorageConfig,
  type CreateSessionOptions,
  type SessionQueryOptions,
  type MessageQueryOptions,
  type ToolCallQueryOptions,
  type PendingConfirmation,
} from './prisma-storage.js';
