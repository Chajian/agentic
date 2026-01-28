# @ai-agent/storage-prisma

Production-ready Prisma storage adapter for the AI Agent framework. This package provides persistent SQL database storage for conversation sessions and messages, supporting PostgreSQL, MySQL, SQLite, and other databases supported by Prisma.

## Installation

```bash
npm install @ai-agent/storage-prisma @prisma/client
npm install -D prisma
```

## Database Setup

### 1. Copy the Prisma schema

Copy the provided `schema.prisma` file to your project:

```bash
mkdir -p prisma
cp node_modules/@ai-agent/storage-prisma/prisma/schema.prisma prisma/
```

### 2. Configure your database

Edit `prisma/schema.prisma` to set your database provider:

```prisma
datasource db {
  provider = "postgresql"  // or "mysql", "sqlite", etc.
  url      = env("DATABASE_URL")
}
```

### 3. Set database URL

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

### 4. Run migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## Usage

### Basic Usage

```typescript
import { Agent } from '@ai-agent/core';
import { PrismaStorage } from '@ai-agent/storage-prisma';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Create storage adapter
const storage = new PrismaStorage(prisma);

// Create agent
const agent = new Agent(config);

// Create a new session
const sessionId = await storage.createSession({
  metadata: { userId: '123' }
});

// Process a message
const userMessage = 'Hello, agent!';
await storage.saveUserMessage(sessionId, userMessage);

const response = await agent.chat(userMessage, {
  sessionId,
  history: await storage.getHistory(sessionId)
});

// Store the response
await storage.saveAssistantMessage(sessionId, response);

// Cleanup
await storage.disconnect();
```

### Session Management

```typescript
// Create session with metadata
const sessionId = await storage.createSession({
  metadata: { 
    userId: '123',
    channel: 'web'
  }
});

// Get session
const session = await storage.getSession(sessionId);

// Query sessions
const activeSessions = await storage.querySessions({
  active: true,
  limit: 10
});

// Update session metadata
await storage.updateSessionMetadata(sessionId, {
  lastActivity: new Date()
});

// Close session
await storage.closeSession(sessionId);

// Delete session
await storage.deleteSession(sessionId);
```

### Message Operations

```typescript
// Save messages
await storage.saveUserMessage(sessionId, 'Hello!', {
  source: 'web'
});

await storage.saveSystemMessage(sessionId, 'Welcome to the chat!');

// Get conversation history
const history = await storage.getHistory(sessionId);

// Query messages with filters
const recentMessages = await storage.queryMessages({
  sessionId,
  role: 'user',
  limit: 10,
  order: 'desc'
});

// Get message count
const count = await storage.getMessageCount(sessionId);

// Delete messages
await storage.deleteMessage(messageId);
await storage.deleteSessionMessages(sessionId);
```

### Tool Call Tracking

```typescript
// Tool calls are automatically stored with assistant messages
const response = await agent.chat('Search for AI news', {
  sessionId,
  history: await storage.getHistory(sessionId)
});

await storage.saveAssistantMessage(sessionId, response);

// Query tool calls
const toolCalls = await storage.queryToolCalls({
  sessionId,
  toolName: 'search',
  success: true
});

// Get tool calls for a message
const calls = await storage.getToolCallsForMessage(messageId);
```

### Pending Confirmations

```typescript
// Save pending confirmation
await storage.savePendingConfirmation(sessionId, {
  toolName: 'deleteFile',
  arguments: { path: '/important.txt' },
  userMessage: 'Delete the file',
  timestamp: new Date()
});

// Get pending confirmation
const pending = await storage.getPendingConfirmation(sessionId);

// Clear pending confirmation
await storage.clearPendingConfirmation(sessionId);
```

## Features

- **Production-ready**: Persistent SQL database storage
- **Multi-database**: Supports PostgreSQL, MySQL, SQLite, SQL Server, MongoDB
- **Type-safe**: Full TypeScript support with Prisma
- **Efficient**: Optimized queries with proper indexing
- **Flexible**: Rich query API for messages and tool calls
- **Transactional**: ACID guarantees for data integrity

## Database Schema

The package includes a Prisma schema with the following models:

### Session
- `id` - Unique session identifier
- `createdAt` - Session creation timestamp
- `updatedAt` - Last update timestamp
- `active` - Whether session is active
- `metadata` - JSON metadata
- `messages` - Related messages
- `pendingConfirmation` - Optional pending confirmation

### Message
- `id` - Unique message identifier
- `sessionId` - Foreign key to session
- `role` - Message role (user/assistant/system)
- `content` - Message content
- `timestamp` - Message timestamp
- `responseType` - Response type for assistant messages
- `metadata` - JSON metadata
- `toolCalls` - Related tool calls

### ToolCall
- `id` - Unique tool call identifier
- `messageId` - Foreign key to message
- `toolName` - Name of the tool
- `arguments` - JSON arguments
- `result` - JSON result
- `timestamp` - Execution timestamp

### PendingConfirmation
- `id` - Unique identifier
- `sessionId` - Foreign key to session (unique)
- `toolName` - Tool requiring confirmation
- `arguments` - JSON arguments
- `userMessage` - Original user message
- `timestamp` - Creation timestamp

## API Reference

### PrismaStorage

#### Constructor
```typescript
new PrismaStorage(prismaClient: PrismaClient)
```

#### Session Methods
- `createSession(options?)` - Create a new session
- `getSession(sessionId)` - Get session by ID
- `querySessions(options?)` - Query sessions with filters
- `updateSessionMetadata(sessionId, metadata)` - Update session metadata
- `closeSession(sessionId)` - Mark session as inactive
- `deleteSession(sessionId)` - Delete session and all messages

#### Message Methods
- `saveUserMessage(sessionId, content, metadata?)` - Save user message
- `saveAssistantMessage(sessionId, response, metadata?)` - Save assistant message
- `saveSystemMessage(sessionId, content)` - Save system message
- `getHistory(sessionId)` - Get conversation history
- `getMessage(messageId)` - Get message by ID
- `queryMessages(options?)` - Query messages with filters
- `getMessageCount(sessionId)` - Get message count
- `deleteMessage(messageId)` - Delete a message
- `deleteSessionMessages(sessionId)` - Delete all session messages

#### Tool Call Methods
- `queryToolCalls(options?)` - Query tool calls with filters
- `getToolCallsForMessage(messageId)` - Get tool calls for a message

#### Confirmation Methods
- `savePendingConfirmation(sessionId, confirmation)` - Save pending confirmation
- `getPendingConfirmation(sessionId)` - Get pending confirmation
- `clearPendingConfirmation(sessionId)` - Clear pending confirmation

#### Utility Methods
- `disconnect()` - Close database connection

## Migration from In-Memory Storage

If you're migrating from `@ai-agent/storage-memory`:

1. Install this package and set up your database
2. Replace `SessionManager` with `PrismaStorage`
3. Update method calls (API is similar but async)
4. Run database migrations

Example:

```typescript
// Before (memory)
import { SessionManager } from '@ai-agent/storage-memory';
const storage = new SessionManager();
const sessionId = storage.createSession();
storage.addUserMessage(sessionId, 'Hello');

// After (Prisma)
import { PrismaStorage } from '@ai-agent/storage-prisma';
const storage = new PrismaStorage(prisma);
const sessionId = await storage.createSession();
await storage.saveUserMessage(sessionId, 'Hello');
```

## Performance Tips

1. **Connection Pooling**: Configure Prisma connection pool for your workload
2. **Indexes**: The schema includes optimized indexes for common queries
3. **Batch Operations**: Use transactions for multiple operations
4. **Pagination**: Use `limit` and `offset` for large result sets
5. **Cleanup**: Regularly delete old inactive sessions

## Troubleshooting

### Connection Issues
```typescript
// Check database connection
await prisma.$connect();
```

### Migration Errors
```bash
# Reset database (development only!)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name your_migration_name
```

### Type Generation
```bash
# Regenerate Prisma client
npx prisma generate
```

## License

MIT
