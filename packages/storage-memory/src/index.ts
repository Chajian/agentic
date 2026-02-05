/**
 * @ai-agent/storage-memory
 *
 * In-memory storage adapter for AI Agent framework.
 * Suitable for development, testing, and simple applications.
 *
 * For production use, consider @ai-agent/storage-prisma or @ai-agent/storage-mongodb.
 */

// Session Management
export {
  SessionManager,
  createSessionManager,
  type Session,
  type Message,
  type CreateSessionOptions,
  type SessionQueryOptions,
} from './session.js';

// Message Storage
export {
  MessageStore,
  createMessageStore,
  type StoredMessage,
  type StoredSession,
  type MessageQueryOptions,
  type ToolCallQueryOptions,
  type StoredToolCall,
} from './message-store.js';
