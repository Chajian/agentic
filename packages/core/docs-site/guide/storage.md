# Storage Management

Learn how to manage conversation storage with **@ai-agent/core**.

## Overview

@ai-agent/core follows a **stateless architecture** where you control storage completely. The agent doesn't manage conversation history internally - you load it from your database, pass it to the agent, and save the response back.

## Storage Responsibility

```typescript
// Your responsibility:
// 1. Load history from database
const history = await yourDatabase.getHistory(sessionId);

// 2. Pass to agent
const response = await agent.chat(message, { history });

// 3. Save response
await yourDatabase.saveMessage(sessionId, {
  role: 'assistant',
  content: response.content
});
```

## Storage Options

### Option 1: Manage Storage Yourself

Use any database or ORM:

```typescript
// Prisma
const history = await prisma.message.findMany({
  where: { sessionId }
});

// MongoDB
const history = await db.collection('messages').find({
  sessionId
}).toArray();

// PostgreSQL (raw)
const history = await pool.query(
  'SELECT * FROM messages WHERE session_id = $1',
  [sessionId]
);

// Redis
const history = await redis.lrange(`session:${sessionId}`, 0, -1);
```

### Option 2: Use Storage Helpers

We provide optional storage helpers for common backends:

```bash
npm install @ai-agent/storage-prisma
# or
npm install @ai-agent/storage-memory
```

```typescript
import { PrismaStorage } from '@ai-agent/storage-prisma';

const storage = new PrismaStorage(prisma);

// Load history
const history = await storage.getHistory(sessionId);

// Save message
await storage.saveMessage(sessionId, {
  role: 'user',
  content: message,
  timestamp: new Date()
});
```

## Message Structure

Messages follow this interface:

```typescript
interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallRecord[];
  metadata?: Record<string, unknown>;
}
```

## Storage Patterns

### Pattern 1: Simple In-Memory (Development)

```typescript
const sessions = new Map<string, Message[]>();

async function chat(sessionId: string, message: string) {
  // Load
  const history = sessions.get(sessionId) || [];
  
  // Process
  const response = await agent.chat(message, { history });
  
  // Save
  history.push(
    { role: 'user', content: message, timestamp: new Date() },
    { role: 'assistant', content: response.content, timestamp: new Date() }
  );
  sessions.set(sessionId, history);
  
  return response;
}
```

### Pattern 2: Database with ORM

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function chat(sessionId: string, message: string) {
  // Load
  const history = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' }
  });
  
  // Process
  const response = await agent.chat(message, { history });
  
  // Save
  await prisma.message.createMany({
    data: [
      { sessionId, role: 'user', content: message, timestamp: new Date() },
      { sessionId, role: 'assistant', content: response.content, timestamp: new Date() }
    ]
  });
  
  return response;
}
```

### Pattern 3: Redis Cache + Database

```typescript
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const redis = new Redis();
const prisma = new PrismaClient();

async function chat(sessionId: string, message: string) {
  // Try cache first
  let history = await redis.get(`session:${sessionId}`);
  
  if (!history) {
    // Load from database
    history = await prisma.message.findMany({
      where: { sessionId }
    });
    
    // Cache for 1 hour
    await redis.setex(
      `session:${sessionId}`,
      3600,
      JSON.stringify(history)
    );
  } else {
    history = JSON.parse(history);
  }
  
  // Process
  const response = await agent.chat(message, { history });
  
  // Save to database
  await prisma.message.createMany({
    data: [
      { sessionId, role: 'user', content: message, timestamp: new Date() },
      { sessionId, role: 'assistant', content: response.content, timestamp: new Date() }
    ]
  });
  
  // Invalidate cache
  await redis.del(`session:${sessionId}`);
  
  return response;
}
```

## Best Practices

### 1. Limit History Size

Don't load entire conversation history:

```typescript
// ✅ Good: Load recent messages
const history = await prisma.message.findMany({
  where: { sessionId },
  orderBy: { timestamp: 'desc' },
  take: 50 // Last 50 messages
});

// ❌ Bad: Load everything
const history = await prisma.message.findMany({
  where: { sessionId }
});
```

### 2. Handle Context Window

Truncate history to fit LLM context window:

```typescript
function truncateHistory(history: Message[], maxTokens: number): Message[] {
  let tokens = 0;
  const truncated = [];
  
  // Keep most recent messages
  for (let i = history.length - 1; i >= 0; i--) {
    const messageTokens = estimateTokens(history[i].content);
    if (tokens + messageTokens > maxTokens) break;
    
    truncated.unshift(history[i]);
    tokens += messageTokens;
  }
  
  return truncated;
}

const history = await loadHistory(sessionId);
const truncated = truncateHistory(history, 8000);
const response = await agent.chat(message, { history: truncated });
```

### 3. Use Transactions

Ensure consistency when saving multiple messages:

```typescript
await prisma.$transaction(async (tx) => {
  await tx.message.create({
    data: { sessionId, role: 'user', content: message }
  });
  
  await tx.message.create({
    data: { sessionId, role: 'assistant', content: response.content }
  });
});
```

### 4. Index for Performance

Add database indexes:

```sql
CREATE INDEX idx_messages_session_timestamp 
ON messages(session_id, timestamp);
```

### 5. Archive Old Sessions

Move old conversations to archive:

```typescript
async function archiveOldSessions() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30); // 30 days ago
  
  await prisma.message.updateMany({
    where: {
      timestamp: { lt: cutoff }
    },
    data: {
      archived: true
    }
  });
}
```

## Storage Helpers

### @ai-agent/storage-prisma

```bash
npm install @ai-agent/storage-prisma
```

```typescript
import { PrismaStorage } from '@ai-agent/storage-prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const storage = new PrismaStorage(prisma);

// Save message
await storage.saveMessage(sessionId, message);

// Get history
const history = await storage.getHistory(sessionId);

// Get pending confirmation
const pending = await storage.getPendingConfirmation(sessionId);

// Save pending confirmation
await storage.savePendingConfirmation(sessionId, confirmation);
```

### @ai-agent/storage-memory

For development and testing:

```bash
npm install @ai-agent/storage-memory
```

```typescript
import { MemoryStorage } from '@ai-agent/storage-memory';

const storage = new MemoryStorage();

// Same API as PrismaStorage
await storage.saveMessage(sessionId, message);
const history = await storage.getHistory(sessionId);
```

## Custom Storage Adapter

Create your own storage adapter:

```typescript
interface StorageAdapter {
  saveMessage(sessionId: string, message: Message): Promise<void>;
  getHistory(sessionId: string): Promise<Message[]>;
  savePendingConfirmation(sessionId: string, confirmation: PendingConfirmation): Promise<void>;
  getPendingConfirmation(sessionId: string): Promise<PendingConfirmation | null>;
}

class MongoStorage implements StorageAdapter {
  constructor(private db: Db) {}
  
  async saveMessage(sessionId: string, message: Message) {
    await this.db.collection('messages').insertOne({
      sessionId,
      ...message
    });
  }
  
  async getHistory(sessionId: string): Promise<Message[]> {
    return await this.db.collection('messages')
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .toArray();
  }
  
  // ... implement other methods
}
```

## Next Steps

- **[Stateless Architecture](/guide/stateless-architecture)** - Understand the design
- **[Scaling](/guide/scaling)** - Scale your storage
- **[Examples](/examples/custom-storage)** - See storage examples
- **[API Reference](/api/types)** - Message types
