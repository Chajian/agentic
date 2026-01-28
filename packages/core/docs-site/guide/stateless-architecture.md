# Stateless Architecture

The core design principle of **@ai-agent/core** is **statelessness**. This guide explains what that means, why it matters, and how to work with it effectively.

## What is Stateless Architecture?

A stateless agent is a **pure function** that processes inputs without maintaining internal state:

```typescript
// Stateless: Pure function
function agent(message: string, history: Message[]): Response {
  // Process message with history
  // Return response
  // No internal state modified
}
```

Compare this to traditional stateful agents:

```typescript
// Stateful: Maintains internal state
class StatefulAgent {
  private sessions: Map<string, Session> = new Map();
  
  async chat(sessionId: string, message: string) {
    // Loads from internal storage
    const session = this.sessions.get(sessionId);
    // Modifies internal state
    session.messages.push(message);
  }
}
```

## Why Stateless?

### 1. **Flexibility**

You control storage completely:

```typescript
// Use any database
const history = await mongodb.find({ sessionId });
const history = await redis.lrange(`session:${sessionId}`);
const history = await prisma.message.findMany({ where: { sessionId } });
const history = await yourCustomStorage.load(sessionId);

// All work the same way
const response = await agent.chat(message, { history });
```

### 2. **Scalability**

Stateless agents scale horizontally without coordination:

```
Load Balancer
     │
     ├─→ Agent Instance 1 (stateless)
     ├─→ Agent Instance 2 (stateless)
     ├─→ Agent Instance 3 (stateless)
     └─→ Agent Instance N (stateless)
          │
          └─→ Shared Database
```

No session affinity needed - any instance can handle any request.

### 3. **Simplicity**

Testing is straightforward:

```typescript
// No database mocking needed
test('agent processes message', async () => {
  const agent = new Agent(config);
  
  const response = await agent.chat('Hello', {
    history: [
      { role: 'user', content: 'Hi', timestamp: new Date() }
    ]
  });
  
  expect(response.content).toBeDefined();
});
```

### 4. **Deployment Flexibility**

Works anywhere:

- ✅ **Serverless** (AWS Lambda, Vercel Functions)
- ✅ **Containers** (Docker, Kubernetes)
- ✅ **Traditional servers**
- ✅ **Edge runtime** (Cloudflare Workers)

## How It Works

### The Agent Core

The agent is a pure logic processor:

```typescript
export class Agent {
  /**
   * Process a message (stateless)
   * @param message - User message
   * @param options - Includes history from external storage
   * @returns Response to save to external storage
   */
  async chat(message: string, options?: ChatOptions): Promise<AgentResponse> {
    // 1. Load history from options (not internal state)
    const history = options?.history || [];
    
    // 2. Process message with LLM
    const response = await this.processMessage(message, history);
    
    // 3. Return response (caller saves to storage)
    return response;
  }
}
```

### Your Responsibility: Storage

You manage conversation persistence:

```typescript
class ConversationManager {
  constructor(
    private agent: Agent,
    private database: Database
  ) {}
  
  async chat(sessionId: string, message: string) {
    // 1. Load history from YOUR database
    const history = await this.database.getHistory(sessionId);
    
    // 2. Process with stateless agent
    const response = await this.agent.chat(message, {
      sessionId,
      history
    });
    
    // 3. Save to YOUR database
    await this.database.saveMessage(sessionId, {
      role: 'user',
      content: message
    });
    
    await this.database.saveMessage(sessionId, {
      role: 'assistant',
      content: response.content
    });
    
    return response;
  }
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   @ai-agent/core                             │
│                  (Stateless Agent)                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Agent      │  │  Plugin      │  │  Agentic     │      │
│  │   Core       │──│  Manager     │──│  Loop        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  LLM         │  │  Tool        │  │  Response    │      │
│  │  Manager     │  │  Registry    │  │  Handler     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────┐      │
│  │    Knowledge Store (In-Memory for RAG only)      │      │
│  └──────────────────────────────────────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ chat(message, { history })
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Layer (Your Code)                   │
│                                                               │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Storage Management (Your Responsibility)         │      │
│  │  - Load conversation history from DB              │      │
│  │  - Pass history to Agent.chat()                   │      │
│  │  - Save responses back to DB                      │      │
│  └──────────────────────────────────────────────────┘      │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐          │
│  │ Prisma   │      │ MongoDB  │      │PostgreSQL│          │
│  └──────────┘      └──────────┘      └──────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## What About Knowledge Store?

The **Knowledge Store** is the only stateful component, but it's different:

- **Purpose**: In-memory cache for RAG documents
- **Why in-memory**: Fast semantic search requires embeddings in memory
- **Lifecycle**: Loaded at startup, persists during agent lifetime
- **Not for conversations**: Only for knowledge base documents

```typescript
// Knowledge is in-memory (for performance)
await agent.addKnowledge('Document content...', 'category');

// Conversations are external (for flexibility)
const history = await yourDatabase.getHistory(sessionId);
const response = await agent.chat(message, { history });
```

## Comparison: Stateful vs Stateless

| Aspect | Stateful Agent | Stateless Agent (@ai-agent/core) |
|--------|----------------|----------------------------------|
| **Storage** | Built-in, coupled | External, your choice |
| **Scaling** | Requires session affinity | Horizontal scaling |
| **Testing** | Needs database mocking | Pure function testing |
| **Deployment** | Limited options | Works anywhere |
| **Flexibility** | Fixed storage backend | Any database/ORM |
| **Complexity** | Higher (manages state) | Lower (pure logic) |

## Best Practices

### 1. Load History Efficiently

```typescript
// ✅ Good: Load only recent messages
const history = await db.message.findMany({
  where: { sessionId },
  orderBy: { timestamp: 'desc' },
  take: 50 // Last 50 messages
});

// ❌ Bad: Load entire conversation
const history = await db.message.findMany({
  where: { sessionId }
});
```

### 2. Handle Context Window Limits

```typescript
// ✅ Good: Truncate history to fit context window
const MAX_TOKENS = 8000;
const truncatedHistory = truncateToTokenLimit(history, MAX_TOKENS);

const response = await agent.chat(message, {
  history: truncatedHistory
});
```

### 3. Cache History for Multiple Requests

```typescript
// ✅ Good: Cache history for session
class SessionCache {
  private cache = new Map<string, Message[]>();
  
  async getHistory(sessionId: string): Promise<Message[]> {
    if (!this.cache.has(sessionId)) {
      const history = await db.getHistory(sessionId);
      this.cache.set(sessionId, history);
    }
    return this.cache.get(sessionId)!;
  }
  
  invalidate(sessionId: string) {
    this.cache.delete(sessionId);
  }
}
```

### 4. Use Storage Helpers

```typescript
// ✅ Good: Use storage helpers for common patterns
import { PrismaStorage } from '@ai-agent/storage-prisma';

const storage = new PrismaStorage(prisma);
const history = await storage.getHistory(sessionId);
```

## Common Patterns

### Pattern 1: REST API

```typescript
app.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  
  // Load history
  const history = await storage.getHistory(sessionId);
  
  // Process
  const response = await agent.chat(message, { history });
  
  // Save
  await storage.saveMessage(sessionId, {
    role: 'user',
    content: message
  });
  await storage.saveMessage(sessionId, {
    role: 'assistant',
    content: response.content
  });
  
  res.json(response);
});
```

### Pattern 2: WebSocket

```typescript
io.on('connection', (socket) => {
  socket.on('chat', async ({ sessionId, message }) => {
    const history = await storage.getHistory(sessionId);
    
    const response = await agent.chat(message, {
      history,
      onEvent: (event) => {
        // Stream events to client
        socket.emit('agent-event', event);
      }
    });
    
    await storage.saveMessages(sessionId, [
      { role: 'user', content: message },
      { role: 'assistant', content: response.content }
    ]);
  });
});
```

### Pattern 3: Serverless Function

```typescript
export async function handler(event: APIGatewayEvent) {
  const { sessionId, message } = JSON.parse(event.body);
  
  // Each invocation is independent
  const history = await dynamodb.getHistory(sessionId);
  const response = await agent.chat(message, { history });
  await dynamodb.saveMessages(sessionId, [
    { role: 'user', content: message },
    { role: 'assistant', content: response.content }
  ]);
  
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
}
```

## Next Steps

- **[Storage Management](/guide/storage)** - Learn about storage options
- **[Scaling](/guide/scaling)** - Scale your stateless agents
- **[Examples](/examples/)** - See complete implementations
- **[API Reference](/api/agent)** - Explore the Agent API
