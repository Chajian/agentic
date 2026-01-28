# Migration Guide: XianCore Agent to @ai-agent/core

Complete guide for migrating from the XianCore-integrated agent to the standalone @ai-agent/core package.

## Overview

The major change in this version is the shift to a **stateless architecture**. The Agent no longer manages conversation storage internally - you now have full control over how and where conversation history is stored.

**Version Information:**
- **Old Package**: `@xiancore/agent` (integrated with XianCore)
- **New Package**: `@ai-agent/core` (standalone framework)
- **Migration Package**: `@xiancore/agent-adapter` (backward compatibility)

## Why Migrate?

### Benefits of the New Architecture

1. **Complete Flexibility**: Use any database or storage solution (PostgreSQL, MongoDB, Redis, etc.)
2. **Horizontal Scalability**: Stateless agents can be easily scaled across multiple instances
3. **Simplified Testing**: No database dependencies required for unit tests
4. **Better Separation of Concerns**: Agent focuses on logic, you control storage
5. **Framework Agnostic**: Works with any Node.js/TypeScript project
6. **Reduced Dependencies**: No forced Prisma or XianCore dependencies

## Breaking Changes

### 1. Package Name Change

**Before:**
```typescript
import { Agent } from '@xiancore/agent';
```

**After:**
```typescript
import { Agent } from '@ai-agent/core';
```

### 2. Storage is Now External (MAJOR CHANGE)

**Before (Old API):**
```typescript
const agent = new Agent({
  llm: config.llm,
  database: {
    url: process.env.DATABASE_URL,
  },
});

// Agent managed sessions internally
const response = await agent.chat('Hello', {
  sessionId: 'user-123',
});
```

**After (New API):**
```typescript
const agent = new Agent({
  llm: config.llm,
  // No database config - you manage storage
});

// Load history from your database
const history = await db.message.findMany({
  where: { sessionId: 'user-123' },
});

// Pass history explicitly
const response = await agent.chat('Hello', {
  sessionId: 'user-123',
  history: history.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.createdAt,
  })),
});

// Save response to your database
await db.message.create({
  data: {
    sessionId: 'user-123',
    role: 'assistant',
    content: response.message,
  },
});
```

### 2. Removed Methods

The following methods have been **completely removed**:

| Old Method | Replacement |
|------------|-------------|
| `agent.createSession()` | Create sessions in your own database |
| `agent.getSession(id)` | Query your database for session data |
| `agent.getHistory(sessionId)` | Load history from your database and pass via `options.history` |
| `agent.importSessionHistory()` | Pass history directly via `options.history` |
| `agent.hasSessionHistory()` | Check your database for session existence |
| `agent.clearHistory(sessionId)` | Delete messages from your database |
| `agent.deleteSession(id)` | Delete session from your database |

### 3. Configuration Changes

**Removed Configuration Options:**
- `database` - No longer accepts database configuration
- `database.url` - Database connection is your responsibility
- `database.type` - Storage type is your choice
- `sessionManager` - Session management is external
- `messageStore` - Message storage is external
- `auditLogger` - Audit logging is optional and external

**New Configuration Options:**
- `logging.logger` - Custom logger support (optional)
- `logging.level` - Log level filtering (optional)
- `logging.enableMetrics` - Performance metrics collection (optional)

### 4. Constructor Signature Changes

**Before:**
```typescript
const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
  },
  database: {
    url: process.env.DATABASE_URL,
    type: 'postgresql',
  },
  sessionManager: sessionManager, // Optional
  messageStore: messageStore,     // Optional
});
```

**After:**
```typescript
const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
  },
  // No database config!
  // Storage is managed externally
  logging: {  // Optional
    logger: customLogger,
    level: 'info',
    enableMetrics: true,
  },
});
```

### 5. Chat Method Changes

**Before:**
```typescript
// Agent managed history internally
const response = await agent.chat('Hello', {
  sessionId: 'user-123',
});
```

**After:**
```typescript
// You must load and pass history
const history = await loadHistoryFromDatabase('user-123');

const response = await agent.chat('Hello', {
  sessionId: 'user-123',
  history: history, // Required for context
});

// You must save the response
await saveMessageToDatabase('user-123', 'user', 'Hello');
await saveMessageToDatabase('user-123', 'assistant', response.message);
```

### 6. Removed Dependencies

The following dependencies are no longer included:
- `@prisma/client` - Use your own ORM/database library
- XianCore-specific utilities and types
- Built-in session management classes

## Migration Steps

### Step 1: Update Package

```bash
npm install @ai-agent/core@latest
```

### Step 2: Remove Database Config

```typescript
// Remove this
const agent = new Agent({
  llm: config.llm,
  database: {  // ❌ Remove
    url: process.env.DATABASE_URL,
  },
});

// Use this
const agent = new Agent({
  llm: config.llm,
});
```

### Step 3: Implement Storage Layer

Choose a storage solution and implement load/save functions:

**Option A: Keep Existing Prisma Schema**

```typescript
// Your existing schema probably works!
model Message {
  id        String   @id @default(uuid())
  sessionId String
  role      String
  content   String   @db.Text
  createdAt DateTime @default(now())
  
  @@index([sessionId, createdAt])
}
```

```typescript
// Load function
async function loadHistory(sessionId: string) {
  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
  
  return messages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
    timestamp: m.createdAt,
  }));
}

// Save function
async function saveMessage(
  sessionId: string,
  role: string,
  content: string
) {
  await prisma.message.create({
    data: { sessionId, role, content },
  });
}
```

**Option B: Use Storage Helper Package**

```bash
npm install @ai-agent/storage-memory
```

```typescript
import { SessionManager } from '@ai-agent/storage-memory';

const sessions = new SessionManager();

// Use like before
const sessionId = sessions.createSession();
sessions.addUserMessage(sessionId, message);
const history = sessions.getHistory(sessionId);
```

### Step 4: Update Chat Calls

**Before:**
```typescript
const response = await agent.chat(message, {
  sessionId: 'user-123',
});
```

**After:**
```typescript
// Load history
const history = await loadHistory('user-123');

// Chat with history
const response = await agent.chat(message, {
  sessionId: 'user-123',
  history,
});

// Save messages
await saveMessage('user-123', 'user', message);
await saveMessage('user-123', 'assistant', response.message);
```

### Step 5: Handle Confirmations

If you use confirmation features, add pending confirmation storage:

**Schema:**
```prisma
model PendingConfirmation {
  id          String   @id @default(uuid())
  sessionId   String   @unique
  toolName    String
  arguments   String   @db.Text
  userMessage String   @db.Text
  createdAt   DateTime @default(now())
}
```

**Implementation:**
```typescript
async function chat(sessionId: string, message: string) {
  const history = await loadHistory(sessionId);
  
  // Load pending confirmation
  const pending = await prisma.pendingConfirmation.findUnique({
    where: { sessionId },
  });
  
  const response = await agent.chat(message, {
    sessionId,
    history,
    pendingConfirmation: pending ? {
      toolName: pending.toolName,
      arguments: JSON.parse(pending.arguments),
      userMessage: pending.userMessage,
      timestamp: pending.createdAt,
    } : undefined,
  });
  
  // Handle confirmation response
  if (response.type === 'confirm') {
    await prisma.pendingConfirmation.upsert({
      where: { sessionId },
      create: {
        sessionId,
        toolName: response.action.type,
        arguments: JSON.stringify(response.action.params),
        userMessage: message,
      },
      update: {
        toolName: response.action.type,
        arguments: JSON.stringify(response.action.params),
        userMessage: message,
      },
    });
  } else {
    // Clear pending confirmation
    await prisma.pendingConfirmation.deleteMany({
      where: { sessionId },
    });
  }
  
  return response;
}
```

## Complete Migration Example

### Before (Old Code)

```typescript
import { Agent } from '@xiancore/agent';

const agent = new Agent({
  llm: {
    mode: 'single',
    default: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
    },
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
});

// Simple chat
app.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  
  const response = await agent.chat(message, { sessionId });
  
  res.json(response);
});
```

### After (New Code)

```typescript
import { Agent } from '@ai-agent/core';
import { PrismaClient } from '@prisma/client';

const agent = new Agent({
  llm: {
    mode: 'single',
    default: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
    },
  },
});

const prisma = new PrismaClient();

// Helper functions
async function loadHistory(sessionId: string) {
  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
  
  return messages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
    timestamp: m.createdAt,
  }));
}

async function saveMessage(
  sessionId: string,
  role: string,
  content: string
) {
  await prisma.message.create({
    data: { sessionId, role, content },
  });
}

// Chat endpoint
app.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  
  // Load history
  const history = await loadHistory(sessionId);
  
  // Process
  const response = await agent.chat(message, {
    sessionId,
    history,
  });
  
  // Save messages
  await saveMessage(sessionId, 'user', message);
  await saveMessage(sessionId, 'assistant', response.message);
  
  res.json(response);
});
```

## Benefits of New Architecture

### 1. Flexibility

You can now use any storage solution:
- **SQL databases**: PostgreSQL, MySQL, SQLite, SQL Server
- **NoSQL databases**: MongoDB, DynamoDB, CouchDB
- **In-memory caches**: Redis, Memcached
- **Custom storage**: Implement your own storage layer
- **Hybrid approaches**: Combine multiple storage solutions

**Example: Using MongoDB instead of Prisma**
```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db('agent');

async function loadHistory(sessionId: string) {
  const messages = await db.collection('messages')
    .find({ sessionId })
    .sort({ timestamp: 1 })
    .toArray();
  
  return messages.map(m => ({
    id: m._id.toString(),
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }));
}
```

### 2. Scalability

Stateless agents can be horizontally scaled:
- **No shared state**: Each agent instance is independent
- **Load balancing**: Distribute requests across multiple instances
- **Serverless-ready**: Deploy to AWS Lambda, Vercel, Cloudflare Workers
- **Container-friendly**: Easy Docker/Kubernetes deployment
- **Auto-scaling**: Scale based on demand without state synchronization issues

**Example: Serverless Deployment**
```typescript
// AWS Lambda handler
export const handler = async (event) => {
  const agent = new Agent(config); // Create fresh instance per request
  
  const { sessionId, message } = JSON.parse(event.body);
  const history = await loadFromDynamoDB(sessionId);
  
  const response = await agent.chat(message, { sessionId, history });
  
  await saveToDynamoDB(sessionId, response);
  
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};
```

### 3. Control

You have full control over:
- **Data retention**: Implement your own cleanup policies
- **Encryption**: Encrypt sensitive data at rest and in transit
- **Backup strategies**: Use your database's backup features
- **Query optimization**: Optimize queries for your use case
- **Compliance**: Meet GDPR, HIPAA, or other regulatory requirements
- **Multi-tenancy**: Implement tenant isolation as needed

**Example: Data Retention Policy**
```typescript
// Delete messages older than 30 days
async function cleanupOldMessages() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await prisma.message.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo,
      },
    },
  });
}
```

### 4. Simplicity

The Agent focuses on what it does best:
- **Processing messages**: Core LLM interaction logic
- **Calling tools**: ReAct pattern execution
- **Generating responses**: Response formatting and handling
- **Knowledge retrieval**: RAG search (in-memory for performance)

Storage is your responsibility, giving you the flexibility to implement it however you need.

### 5. Testability

Testing is much simpler:
- **No database required**: Test with in-memory history arrays
- **Predictable behavior**: Same input + history = same output
- **Easy mocking**: Mock storage layer independently
- **Fast tests**: No database setup/teardown overhead

**Example: Simple Test**
```typescript
import { Agent } from '@ai-agent/core';

test('agent processes message with history', async () => {
  const agent = new Agent(config);
  
  const history = [
    { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
    { id: '2', role: 'assistant', content: 'Hi!', timestamp: new Date() },
  ];
  
  const response = await agent.chat('How are you?', { history });
  
  expect(response.message).toBeDefined();
});
```

### 6. Framework Independence

Works with any Node.js/TypeScript project:
- **Express.js**: Traditional REST APIs
- **Fastify**: High-performance APIs
- **NestJS**: Enterprise applications
- **Next.js**: Full-stack React applications
- **tRPC**: Type-safe APIs
- **GraphQL**: Apollo Server, etc.

No XianCore dependencies means you can integrate the agent anywhere.

## Backward Compatibility Package

If you need to maintain the old API temporarily, we provide a compatibility adapter:

```bash
npm install @xiancore/agent-adapter
```

```typescript
import { LegacyAgent } from '@xiancore/agent-adapter';

// Works like the old API
const agent = new LegacyAgent({
  llm: config.llm,
  database: {
    url: process.env.DATABASE_URL!,
  },
});

// Old-style chat (manages storage internally)
const response = await agent.chat(message, {
  sessionId: 'user-123',
});
```

**Note**: The adapter is provided for migration purposes only and will be deprecated in future versions.

### How the Adapter Works

The adapter wraps the new stateless agent and provides the old API:

```typescript
// Internally, the adapter:
// 1. Loads history from database
// 2. Calls the stateless agent
// 3. Saves response to database
// 4. Returns response in old format

// This allows gradual migration:
// - Use adapter in existing code
// - Migrate endpoints one at a time
// - Remove adapter when migration is complete
```

## Common Migration Patterns

### Pattern 1: Express.js REST API

**Before:**
```typescript
import express from 'express';
import { Agent } from '@xiancore/agent';

const app = express();
const agent = new Agent({
  llm: config.llm,
  database: { url: process.env.DATABASE_URL },
});

app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  const response = await agent.chat(message, { sessionId });
  res.json(response);
});
```

**After:**
```typescript
import express from 'express';
import { Agent } from '@ai-agent/core';
import { PrismaClient } from '@prisma/client';

const app = express();
const agent = new Agent({ llm: config.llm });
const prisma = new PrismaClient();

// Helper functions
async function loadHistory(sessionId: string) {
  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
  return messages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    timestamp: m.createdAt,
  }));
}

async function saveMessage(sessionId: string, role: string, content: string) {
  await prisma.message.create({
    data: { sessionId, role, content },
  });
}

app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  
  // Load history
  const history = await loadHistory(sessionId);
  
  // Process
  const response = await agent.chat(message, { sessionId, history });
  
  // Save
  await saveMessage(sessionId, 'user', message);
  await saveMessage(sessionId, 'assistant', response.message);
  
  res.json(response);
});
```

### Pattern 2: WebSocket Chat Server

**Before:**
```typescript
import { Server } from 'socket.io';
import { Agent } from '@xiancore/agent';

const io = new Server(3000);
const agent = new Agent({
  llm: config.llm,
  database: { url: process.env.DATABASE_URL },
});

io.on('connection', (socket) => {
  socket.on('message', async (data) => {
    const response = await agent.chat(data.message, {
      sessionId: socket.id,
    });
    socket.emit('response', response);
  });
});
```

**After:**
```typescript
import { Server } from 'socket.io';
import { Agent } from '@ai-agent/core';
import { MemoryStorage } from '@ai-agent/storage-memory';

const io = new Server(3000);
const agent = new Agent({ llm: config.llm });
const storage = new MemoryStorage(); // Or use database

io.on('connection', (socket) => {
  const sessionId = socket.id;
  
  socket.on('message', async (data) => {
    // Load history
    const history = await storage.getHistory(sessionId);
    
    // Process
    const response = await agent.chat(data.message, {
      sessionId,
      history,
    });
    
    // Save
    await storage.saveMessage(sessionId, {
      id: crypto.randomUUID(),
      role: 'user',
      content: data.message,
      timestamp: new Date(),
    });
    await storage.saveMessage(sessionId, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.message,
      timestamp: new Date(),
    });
    
    socket.emit('response', response);
  });
  
  socket.on('disconnect', async () => {
    // Optional: Clean up session
    await storage.clearHistory(sessionId);
  });
});
```

### Pattern 3: Next.js API Route

**Before:**
```typescript
// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Agent } from '@xiancore/agent';

const agent = new Agent({
  llm: config.llm,
  database: { url: process.env.DATABASE_URL },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { sessionId, message } = req.body;
  const response = await agent.chat(message, { sessionId });
  res.json(response);
}
```

**After:**
```typescript
// app/api/chat/route.ts (App Router)
import { NextRequest, NextResponse } from 'next/server';
import { Agent } from '@ai-agent/core';
import { prisma } from '@/lib/prisma';

const agent = new Agent({ llm: config.llm });

export async function POST(req: NextRequest) {
  const { sessionId, message } = await req.json();
  
  // Load history
  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
  
  const history = messages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    timestamp: m.createdAt,
  }));
  
  // Process
  const response = await agent.chat(message, { sessionId, history });
  
  // Save
  await prisma.message.createMany({
    data: [
      { sessionId, role: 'user', content: message },
      { sessionId, role: 'assistant', content: response.message },
    ],
  });
  
  return NextResponse.json(response);
}
```

### Pattern 4: Streaming Responses

**Before:**
```typescript
const response = await agent.chatStream(message, {
  sessionId: 'user-123',
  onChunk: (chunk) => {
    console.log(chunk);
  },
});
```

**After:**
```typescript
const history = await loadHistory('user-123');

const response = await agent.chat(message, {
  sessionId: 'user-123',
  history,
  onEvent: (event) => {
    if (event.type === 'chunk') {
      console.log(event.data);
    }
  },
});

// Save after streaming completes
await saveMessage('user-123', 'user', message);
await saveMessage('user-123', 'assistant', response.message);
```

### Pattern 5: Multi-User Chat Application

**Before:**
```typescript
// Each user had their own session managed by agent
const response = await agent.chat(message, {
  sessionId: userId,
});
```

**After:**
```typescript
// You control session management
async function handleUserMessage(userId: string, message: string) {
  // Load user's conversation history
  const history = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: 50, // Limit context window
  });
  
  // Process with agent
  const response = await agent.chat(message, {
    sessionId: userId,
    history: history.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.createdAt,
    })),
  });
  
  // Save to database
  await prisma.message.createMany({
    data: [
      { userId, role: 'user', content: message },
      { userId, role: 'assistant', content: response.message },
    ],
  });
  
  return response;
}
```

## Need Help?

- **Documentation**: See [API.md](./API.md) and [USAGE_GUIDE.md](./USAGE_GUIDE.md)
- **Examples**: Check `/examples` directory for complete applications
- **Issues**: https://github.com/ai-agent-framework/core/issues
- **Discord**: https://discord.gg/ai-agent-framework

## Troubleshooting

### Common Migration Issues

#### Issue: "Cannot find module '@ai-agent/core'"

**Solution**: Install the new package
```bash
npm install @ai-agent/core
```

#### Issue: "Property 'database' does not exist on type 'AgentConfig'"

**Solution**: Remove the `database` configuration. Storage is now external.

```typescript
// ❌ Old
const agent = new Agent({
  llm: config.llm,
  database: { url: '...' }, // Remove this
});

// ✅ New
const agent = new Agent({
  llm: config.llm,
});
```

#### Issue: "Agent.getHistory is not a function"

**Solution**: Load history from your database instead.

```typescript
// ❌ Old
const history = await agent.getHistory(sessionId);

// ✅ New
const history = await prisma.message.findMany({
  where: { sessionId },
  orderBy: { createdAt: 'asc' },
});
```

#### Issue: "History is not being maintained between requests"

**Solution**: Make sure you're loading and passing history to each chat call.

```typescript
// ❌ Wrong - no history passed
const response = await agent.chat(message, { sessionId });

// ✅ Correct - load and pass history
const history = await loadHistory(sessionId);
const response = await agent.chat(message, { sessionId, history });
```

#### Issue: "Performance is slower than before"

**Solution**: Optimize your history loading queries.

```typescript
// Add database indexes
@@index([sessionId, createdAt])

// Limit history size
const history = await prisma.message.findMany({
  where: { sessionId },
  orderBy: { createdAt: 'desc' },
  take: 50, // Only load last 50 messages
});
```

#### Issue: "Tests are failing after migration"

**Solution**: Update tests to pass history explicitly.

```typescript
// ❌ Old test
test('agent chat', async () => {
  const response = await agent.chat('Hello', { sessionId: 'test' });
  expect(response).toBeDefined();
});

// ✅ New test
test('agent chat', async () => {
  const history = []; // Empty history for new conversation
  const response = await agent.chat('Hello', { sessionId: 'test', history });
  expect(response).toBeDefined();
});
```

### Migration Checklist

Use this checklist to track your migration progress:

- [ ] Install `@ai-agent/core` package
- [ ] Update imports from `@xiancore/agent` to `@ai-agent/core`
- [ ] Remove `database` configuration from Agent constructor
- [ ] Implement history loading function
- [ ] Implement message saving function
- [ ] Update all `agent.chat()` calls to pass history
- [ ] Remove calls to deprecated methods (`getHistory`, `createSession`, etc.)
- [ ] Update tests to pass history explicitly
- [ ] Test all endpoints thoroughly
- [ ] Deploy to staging environment
- [ ] Monitor for issues
- [ ] Deploy to production
- [ ] Remove `@xiancore/agent-adapter` if used

### Performance Optimization Tips

1. **Index your database properly**
   ```sql
   CREATE INDEX idx_messages_session_time 
   ON messages(session_id, created_at);
   ```

2. **Limit history size**
   ```typescript
   // Only load recent messages
   const history = await loadHistory(sessionId, { limit: 50 });
   ```

3. **Use connection pooling**
   ```typescript
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL,
       },
     },
     // Enable connection pooling
     log: ['query', 'error', 'warn'],
   });
   ```

4. **Cache frequently accessed sessions**
   ```typescript
   import { LRUCache } from 'lru-cache';
   
   const historyCache = new LRUCache({
     max: 500,
     ttl: 1000 * 60 * 5, // 5 minutes
   });
   
   async function loadHistory(sessionId: string) {
     const cached = historyCache.get(sessionId);
     if (cached) return cached;
     
     const history = await prisma.message.findMany({
       where: { sessionId },
       orderBy: { createdAt: 'asc' },
     });
     
     historyCache.set(sessionId, history);
     return history;
   }
   ```

5. **Use read replicas for history loading**
   ```typescript
   // Separate read/write connections
   const writeDb = new PrismaClient({ datasources: { db: { url: WRITE_URL } } });
   const readDb = new PrismaClient({ datasources: { db: { url: READ_URL } } });
   
   // Read from replica
   const history = await readDb.message.findMany({ where: { sessionId } });
   
   // Write to primary
   await writeDb.message.create({ data: newMessage });
   ```

## FAQ

**Q: Do I have to migrate all at once?**

A: No! Use the `@xiancore/agent-adapter` package to maintain the old API while you migrate endpoints gradually.

**Q: Can I use a different database than Prisma?**

A: Yes! The new architecture lets you use any database. Just implement load/save functions for your chosen database.

**Q: Will my existing data work with the new version?**

A: Yes, if you keep the same database schema. The adapter uses the same schema as before.

**Q: Is the adapter production-ready?**

A: Yes, but it's meant for migration only. Plan to migrate to the stateless API for best performance.

**Q: How do I handle confirmations in the new API?**

A: Load and pass `pendingConfirmation` from your database, similar to history. See the migration guide examples.

**Q: Can I still use plugins?**

A: Yes! The plugin system works the same way. Just call `agent.loadPlugin(plugin)`.

**Q: What about knowledge base / RAG?**

A: Knowledge is still managed by the agent (in-memory). Use `agent.addKnowledge()` as before.

**Q: How do I deploy the stateless agent?**

A: It's easier! Deploy to serverless (Lambda, Vercel), containers (Docker, K8s), or traditional servers. No state synchronization needed.
