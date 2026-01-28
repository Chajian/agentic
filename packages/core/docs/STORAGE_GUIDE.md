# Storage Guide

This guide explains how to manage conversation history and sessions with the AI Agent framework using the optional storage helper packages.

## Overview

The `@ai-agent/core` package follows a **stateless architecture** where the agent doesn't maintain internal state. Instead, your application is responsible for managing conversation history and passing it to the agent.

To simplify this, we provide optional storage helper packages:

- **[@ai-agent/storage-memory](../../storage-memory/)** - In-memory storage for development and testing
- **[@ai-agent/storage-prisma](../../storage-prisma/)** - Production-ready SQL database storage

## Why Stateless?

The stateless design provides several benefits:

- **Flexibility**: Choose your own storage solution (database, cache, file system, etc.)
- **Scalability**: Horizontally scale agents without state synchronization
- **Simplicity**: Clear separation between logic and storage
- **Testability**: Easy to test without database dependencies

## Storage Helper Packages

### @ai-agent/storage-memory

Best for development, testing, and simple applications.

**Installation:**
```bash
npm install @ai-agent/storage-memory
```

**Features:**
- Fast in-memory storage
- No database setup required
- Rich query API
- Session management
- Tool call tracking

**Limitations:**
- Data lost when process exits
- Not suitable for production
- Single-process only

**Example:**
```typescript
import { Agent } from '@ai-agent/core';
import { SessionManager } from '@ai-agent/storage-memory';

const storage = new SessionManager();
const agent = new Agent(config);

// Create session
const sessionId = storage.createSession();

// Add user message
storage.addUserMessage(sessionId, 'Hello!');

// Get history and chat
const history = storage.getHistory(sessionId);
const response = await agent.chat('Hello!', { sessionId, history });

// Save response
storage.addAssistantMessage(sessionId, response);
```

### @ai-agent/storage-prisma

Best for production applications requiring persistent storage.

**Installation:**
```bash
npm install @ai-agent/storage-prisma @prisma/client
npm install -D prisma
```

**Features:**
- Persistent SQL database storage
- Supports PostgreSQL, MySQL, SQLite, SQL Server, MongoDB
- Type-safe with Prisma
- Optimized queries with indexing
- Transaction support
- Tool call tracking
- Pending confirmation management

**Setup:**
```bash
# Copy schema
mkdir -p prisma
cp node_modules/@ai-agent/storage-prisma/prisma/schema.prisma prisma/

# Configure database
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/mydb"' > .env

# Run migrations
npx prisma migrate dev --name init
npx prisma generate
```

**Example:**
```typescript
import { Agent } from '@ai-agent/core';
import { PrismaStorage } from '@ai-agent/storage-prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const storage = new PrismaStorage(prisma);
const agent = new Agent(config);

// Create session
const sessionId = await storage.createSession();

// Save user message
await storage.saveUserMessage(sessionId, 'Hello!');

// Get history and chat
const history = await storage.getHistory(sessionId);
const response = await agent.chat('Hello!', { sessionId, history });

// Save response
await storage.saveAssistantMessage(sessionId, response);

// Cleanup
await storage.disconnect();
```

## Comparison

| Feature | @ai-agent/storage-memory | @ai-agent/storage-prisma |
|---------|-------------------------|-------------------------|
| **Persistence** | No (in-memory) | Yes (database) |
| **Setup** | None | Database + migrations |
| **Performance** | Very fast | Fast (with proper indexes) |
| **Scalability** | Single process | Multi-process, distributed |
| **Production Ready** | No | Yes |
| **Best For** | Development, testing | Production applications |
| **API** | Synchronous | Asynchronous (Promise-based) |

## Custom Storage Implementation

You can also implement your own storage solution. The agent only requires that you:

1. Load conversation history from your storage
2. Pass it to `agent.chat()` as the `history` option
3. Save new messages after receiving responses

**Example with custom storage:**
```typescript
// Your custom storage
class MyCustomStorage {
  async loadHistory(sessionId: string): Promise<Message[]> {
    // Load from your database, Redis, file system, etc.
    return await db.query('SELECT * FROM messages WHERE session_id = ?', [sessionId]);
  }

  async saveMessage(sessionId: string, message: Message): Promise<void> {
    // Save to your storage
    await db.insert('messages', { session_id: sessionId, ...message });
  }
}

// Use with agent
const storage = new MyCustomStorage();
const history = await storage.loadHistory(sessionId);

const response = await agent.chat(userMessage, {
  sessionId,
  history
});

await storage.saveMessage(sessionId, {
  role: 'user',
  content: userMessage,
  timestamp: new Date()
});

await storage.saveMessage(sessionId, {
  role: 'assistant',
  content: response.content,
  timestamp: new Date()
});
```

## Common Patterns

### Pattern 1: Session Management

```typescript
// Create session with metadata
const sessionId = await storage.createSession({
  metadata: {
    userId: '123',
    channel: 'web',
    startedAt: new Date()
  }
});

// Query sessions
const activeSessions = await storage.querySessions({
  active: true,
  limit: 10
});

// Close session when done
await storage.closeSession(sessionId);
```

### Pattern 2: Message Querying

```typescript
// Get recent messages
const recentMessages = await storage.queryMessages({
  sessionId,
  limit: 10,
  order: 'desc'
});

// Get messages by role
const userMessages = await storage.queryMessages({
  sessionId,
  role: 'user'
});

// Get messages in date range
const todayMessages = await storage.queryMessages({
  sessionId,
  after: new Date('2024-01-01'),
  before: new Date('2024-01-02')
});
```

### Pattern 3: Tool Call Tracking

```typescript
// Query tool calls
const toolCalls = await storage.queryToolCalls({
  sessionId,
  toolName: 'search',
  success: true
});

// Get tool calls for a message
const calls = await storage.getToolCallsForMessage(messageId);
```

### Pattern 4: Pending Confirmations

```typescript
// Save pending confirmation
await storage.savePendingConfirmation(sessionId, {
  toolName: 'deleteFile',
  arguments: { path: '/important.txt' },
  userMessage: 'Delete the file',
  timestamp: new Date()
});

// Check for pending confirmation
const pending = await storage.getPendingConfirmation(sessionId);
if (pending) {
  // Handle confirmation flow
}

// Clear after confirmation
await storage.clearPendingConfirmation(sessionId);
```

## Migration Between Storage Solutions

### From Memory to Prisma

When moving from development to production:

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

Key differences:
- All methods become async (return Promises)
- `addUserMessage` → `saveUserMessage`
- `addAssistantMessage` → `saveAssistantMessage`
- Need to call `await storage.disconnect()` on shutdown

## Best Practices

### 1. Connection Management

**Prisma:**
```typescript
// Create client once
const prisma = new PrismaClient();
const storage = new PrismaStorage(prisma);

// Reuse across requests
app.use((req, res, next) => {
  req.storage = storage;
  next();
});

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await storage.disconnect();
});
```

### 2. Error Handling

```typescript
try {
  const history = await storage.getHistory(sessionId);
  const response = await agent.chat(message, { sessionId, history });
  await storage.saveAssistantMessage(sessionId, response);
} catch (error) {
  if (error.code === 'P2025') {
    // Session not found
    console.error('Session not found');
  } else {
    // Other errors
    console.error('Storage error:', error);
  }
}
```

### 3. Performance Optimization

**Use pagination:**
```typescript
// Don't load entire history
const recentHistory = await storage.queryMessages({
  sessionId,
  limit: 50,  // Last 50 messages
  order: 'desc'
});
```

**Batch operations:**
```typescript
// Use transactions for multiple operations
await prisma.$transaction(async (tx) => {
  await tx.message.create({ data: userMessage });
  await tx.message.create({ data: assistantMessage });
  await tx.session.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
});
```

### 4. Cleanup Old Data

```typescript
// Delete old inactive sessions
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 30);  // 30 days ago

const oldSessions = await storage.querySessions({
  active: false,
  createdBefore: cutoffDate
});

for (const session of oldSessions) {
  await storage.deleteSession(session.id);
}
```

## Troubleshooting

### Memory Storage

**Issue: Data lost on restart**
- Expected behavior - use Prisma storage for persistence

**Issue: Memory usage growing**
- Implement cleanup for old sessions
- Use `storage.deleteSession()` for inactive sessions

### Prisma Storage

**Issue: Connection errors**
```typescript
// Check connection
await prisma.$connect();
```

**Issue: Migration errors**
```bash
# Reset database (development only!)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name your_migration_name
```

**Issue: Type errors**
```bash
# Regenerate Prisma client
npx prisma generate
```

## Learn More

- [Storage Memory API](../../storage-memory/README.md)
- [Storage Prisma API](../../storage-prisma/README.md)
- [Agent API Documentation](./API.md)
- [Usage Guide](./USAGE_GUIDE.md)
- [Examples](../examples/README.md)
