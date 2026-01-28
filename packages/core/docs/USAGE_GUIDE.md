# Usage Guide

Complete guide to using the @ai-agent/core framework.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Stateless Architecture](#stateless-architecture)
3. [Storage Management](#storage-management)
4. [Plugin Development](#plugin-development)
5. [Knowledge Base (RAG)](#knowledge-base-rag)
6. [Streaming Events](#streaming-events)
7. [Error Handling](#error-handling)
8. [Production Deployment](#production-deployment)

---

## Getting Started

### Installation

```bash
npm install @ai-agent/core
```

### Basic Setup

```typescript
import { Agent } from '@ai-agent/core';

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
```

### First Conversation

```typescript
const response = await agent.chat('Hello, agent!', {
  history: [], // Empty history for first message
  sessionId: 'user-123',
});

console.log(response.message);
```

---

## Stateless Architecture

The Agent is **stateless** - it doesn't store conversation history internally.

### Why Stateless?

1. **Flexibility**: Use any storage solution (SQL, NoSQL, Redis, etc.)
2. **Scalability**: Stateless agents can be horizontally scaled
3. **Control**: You decide how and where data is stored
4. **Simplicity**: Agent focuses on logic, not storage

### How It Works

```
┌─────────────┐
│ Your App    │
└──────┬──────┘
       │
       │ 1. Load history from DB
       ▼
┌─────────────┐
│  Database   │
└──────┬──────┘
       │
       │ 2. Pass history to agent
       ▼
┌─────────────┐
│   Agent     │ ← Stateless (no storage)
└──────┬──────┘
       │
       │ 3. Return response
       ▼
┌─────────────┐
│  Your App   │
└──────┬──────┘
       │
       │ 4. Save to DB
       ▼
┌─────────────┐
│  Database   │
└─────────────┘
```


### Implementation Pattern

```typescript
async function chat(sessionId: string, userMessage: string) {
  // 1. Load history from your storage
  const history = await loadHistory(sessionId);
  
  // 2. Process with agent
  const response = await agent.chat(userMessage, {
    sessionId,
    history,
  });
  
  // 3. Save to your storage
  await saveMessage(sessionId, 'user', userMessage);
  await saveMessage(sessionId, 'assistant', response.message);
  
  return response;
}
```

---

## Storage Management

### Option 1: SQL Database (Prisma)

**Schema:**
```prisma
model Message {
  id        String   @id @default(uuid())
  sessionId String
  role      String   // 'user' | 'assistant' | 'system'
  content   String   @db.Text
  createdAt DateTime @default(now())
  
  @@index([sessionId, createdAt])
}

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
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
```

### Option 2: MongoDB

```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URL!);
const db = client.db('agent');
const messages = db.collection('messages');

async function loadHistory(sessionId: string) {
  const docs = await messages
    .find({ sessionId })
    .sort({ createdAt: 1 })
    .toArray();
  
  return docs.map(d => ({
    id: d._id.toString(),
    role: d.role,
    content: d.content,
    timestamp: d.createdAt,
  }));
}

async function saveMessage(
  sessionId: string,
  role: string,
  content: string
) {
  await messages.insertOne({
    sessionId,
    role,
    content,
    createdAt: new Date(),
  });
}
```

### Option 3: Redis

```typescript
import Redis from 'ioredis';

const redis = new Redis();

async function loadHistory(sessionId: string) {
  const json = await redis.get(`session:${sessionId}`);
  return json ? JSON.parse(json) : [];
}

async function saveHistory(sessionId: string, history: Message[]) {
  await redis.setex(
    `session:${sessionId}`,
    3600, // 1 hour TTL
    JSON.stringify(history)
  );
}
```

### Option 4: Storage Helper Package

```bash
npm install @ai-agent/storage-memory
```

```typescript
import { SessionManager } from '@ai-agent/storage-memory';

const sessions = new SessionManager();

// Create session
const sessionId = sessions.createSession();

// Add messages
sessions.addUserMessage(sessionId, 'Hello');
sessions.addAssistantMessage(sessionId, 'Hi there!');

// Get history
const history = sessions.getHistory(sessionId);
```

---

## Plugin Development

### Basic Plugin

```typescript
import { AgentPlugin } from '@ai-agent/core';

const calculatorPlugin: AgentPlugin = {
  name: 'calculator',
  version: '1.0.0',
  description: 'Math operations',
  
  tools: [
    {
      name: 'add',
      description: 'Add two numbers',
      parameters: [
        {
          name: 'a',
          type: 'number',
          description: 'First number',
          required: true,
        },
        {
          name: 'b',
          type: 'number',
          description: 'Second number',
          required: true,
        },
      ],
      execute: async (args) => {
        const result = (args.a as number) + (args.b as number);
        return {
          success: true,
          content: `${args.a} + ${args.b} = ${result}`,
          data: { result },
        };
      },
    },
  ],
};

await agent.loadPlugin(calculatorPlugin);
```


### Plugin with Lifecycle Hooks

```typescript
const databasePlugin: AgentPlugin = {
  name: 'database',
  version: '1.0.0',
  description: 'Database operations',
  
  // Initialize hook
  async initialize(context) {
    context.logger.info('Connecting to database...');
    // Setup database connection
    await connectToDatabase();
    context.logger.info('Database connected');
  },
  
  // Cleanup hook
  async cleanup() {
    console.log('Closing database connection...');
    await closeDatabase();
  },
  
  tools: [/* ... */],
};
```

### Plugin with Dependencies

```typescript
// Plugin factory pattern
function createWeatherPlugin(apiKey: string): AgentPlugin {
  return {
    name: 'weather',
    version: '1.0.0',
    description: 'Weather information',
    
    tools: [
      {
        name: 'get_weather',
        description: 'Get current weather',
        parameters: [
          {
            name: 'location',
            type: 'string',
            description: 'City name',
            required: true,
          },
        ],
        execute: async (args, context) => {
          try {
            const weather = await fetchWeather(
              args.location as string,
              apiKey
            );
            
            context.logger.info('Weather fetched', {
              location: args.location,
            });
            
            return {
              success: true,
              content: `Weather in ${args.location}: ${weather.temp}°F, ${weather.condition}`,
              data: weather,
            };
          } catch (error) {
            context.logger.error('Weather fetch failed', {
              error: error.message,
            });
            
            return {
              success: false,
              content: 'Failed to fetch weather',
              error: {
                code: 'WEATHER_API_ERROR',
                message: error.message,
              },
            };
          }
        },
      },
    ],
  };
}

// Load with API key
const plugin = createWeatherPlugin(process.env.WEATHER_API_KEY!);
await agent.loadPlugin(plugin);
```

### High-Risk Tools with Confirmation

```typescript
const adminPlugin: AgentPlugin = {
  name: 'admin',
  version: '1.0.0',
  description: 'Admin operations',
  
  tools: [
    {
      name: 'delete_user',
      description: 'Delete a user account',
      parameters: [
        {
          name: 'userId',
          type: 'string',
          description: 'User ID to delete',
          required: true,
        },
      ],
      riskLevel: 'high',
      requiresConfirmation: true,
      execute: async (args, context) => {
        // This will trigger confirmation flow
        await deleteUser(args.userId as string);
        
        return {
          success: true,
          content: `User ${args.userId} deleted`,
        };
      },
    },
  ],
};
```

---

## Knowledge Base (RAG)

### Adding Documents

```typescript
// Single document
await agent.addKnowledge(
  'Paris is the capital of France.',
  'geography',
  'France Facts'
);

// Multiple documents
const docs = [
  { content: 'Doc 1...', category: 'tech', title: 'API Guide' },
  { content: 'Doc 2...', category: 'tech', title: 'Setup' },
];

for (const doc of docs) {
  await agent.addKnowledge(doc.content, doc.category, doc.title);
}
```

### Loading from Files

```typescript
import fs from 'fs/promises';
import path from 'path';

async function loadKnowledgeFromDirectory(dir: string) {
  const files = await fs.readdir(dir);
  
  for (const file of files) {
    if (file.endsWith('.md')) {
      const content = await fs.readFile(
        path.join(dir, file),
        'utf-8'
      );
      
      await agent.addKnowledge(
        content,
        'documentation',
        file.replace('.md', '')
      );
    }
  }
}

await loadKnowledgeFromDirectory('./docs');
```

### Automatic Retrieval

The agent automatically retrieves relevant knowledge during conversations:

```typescript
// Agent will search knowledge base for relevant info
const response = await agent.chat(
  'What is the capital of France?',
  { history }
);
// Response will include information from knowledge base
```

### Manual Search

```typescript
const store = agent.getKnowledgeStore();

// Semantic search
const results = await store.search('capital of France', {
  method: 'semantic',
  topK: 5,
  minScore: 0.7,
});

for (const result of results) {
  console.log(`Score: ${result.score}`);
  console.log(`Content: ${result.document.content}`);
}
```

### Managing Documents

```typescript
const store = agent.getKnowledgeStore();

// List categories
const categories = await store.listCategories();

// Get documents by category
const docs = await store.getDocumentsByCategory('geography');

// Update document
await store.updateDocument(docId, {
  content: 'Updated content...',
});

// Delete document
await store.deleteDocument(docId);

// Clear all
store.clear();
```

---

## Streaming Events

### Basic Streaming

```typescript
const response = await agent.chat('Analyze data', {
  history,
  onEvent: (event) => {
    console.log(`[${event.type}]`, event.data);
  },
});
```

### Progress Tracking

```typescript
let currentIteration = 0;
let toolCallsCount = 0;

const response = await agent.chat('Complex task', {
  history,
  onEvent: (event) => {
    switch (event.type) {
      case 'iteration_started':
        currentIteration = event.data.iteration;
        console.log(`Progress: ${currentIteration}/${event.data.maxIterations}`);
        break;
        
      case 'tool_call_completed':
        toolCallsCount++;
        console.log(`Tools executed: ${toolCallsCount}`);
        break;
    }
  },
});
```

### Real-time UI Updates

```typescript
// React example
function ChatComponent() {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  
  async function sendMessage(message: string) {
    setStatus('processing');
    
    const response = await agent.chat(message, {
      history,
      onEvent: (event) => {
        switch (event.type) {
          case 'iteration_started':
            setProgress(
              (event.data.iteration / event.data.maxIterations) * 100
            );
            break;
            
          case 'tool_call_started':
            setStatus(`Calling ${event.data.toolName}...`);
            break;
            
          case 'completed':
            setStatus('idle');
            setProgress(100);
            break;
        }
      },
    });
    
    return response;
  }
  
  return (
    <div>
      <div>Status: {status}</div>
      <ProgressBar value={progress} />
    </div>
  );
}
```

### Cancellation

```typescript
const abortController = new AbortController();

// Cancel after 30 seconds
setTimeout(() => abortController.abort(), 30000);

try {
  const response = await agent.chat('Long task', {
    history,
    abortSignal: abortController.signal,
    onEvent: (event) => {
      if (event.type === 'cancelled') {
        console.log('Cancelled:', event.data.reason);
      }
    },
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request aborted');
  }
}
```

---

## Error Handling

### Response-Level Errors

```typescript
const response = await agent.chat(message, { history });

if (response.type === 'error') {
  console.error('Agent error:', response.message);
  // Handle gracefully
}
```

### System-Level Errors

```typescript
try {
  const response = await agent.chat(message, { history });
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.error('LLM API unavailable');
  } else if (error.message.includes('rate limit')) {
    console.error('Rate limit exceeded');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Tool Execution Errors

```typescript
const tool = {
  name: 'risky_operation',
  description: 'Performs risky operation',
  parameters: [/* ... */],
  execute: async (args, context) => {
    try {
      const result = await performOperation(args);
      return {
        success: true,
        content: 'Operation completed',
        data: result,
      };
    } catch (error) {
      context.logger.error('Operation failed', {
        error: error.message,
      });
      
      return {
        success: false,
        content: 'Operation failed',
        error: {
          code: 'OPERATION_ERROR',
          message: error.message,
          details: { args },
        },
      };
    }
  },
};
```

### Streaming Error Events

```typescript
const response = await agent.chat(message, {
  history,
  onEvent: (event) => {
    if (event.type === 'error') {
      console.error('Error:', event.data.code);
      console.error('Message:', event.data.message);
      console.error('Recoverable:', event.data.recoverable);
      
      if (!event.data.recoverable) {
        // Fatal error - stop processing
        abortController.abort();
      }
    }
    
    if (event.type === 'tool_error') {
      console.error(`Tool ${event.data.toolName} failed`);
      console.error('Error:', event.data.error);
    }
  },
});
```

---

## Production Deployment

### Environment Configuration

```typescript
// config.ts
export const config = {
  llm: {
    mode: 'single' as const,
    default: {
      provider: 'openai' as const,
      apiKey: process.env.OPENAI_API_KEY!,
      model: process.env.LLM_MODEL || 'gpt-4',
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000'),
    },
  },
  behavior: {
    timeoutMs: parseInt(process.env.AGENT_TIMEOUT || '30000'),
    maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS || '10'),
    requireConfirmation: process.env.REQUIRE_CONFIRMATION !== 'false',
  },
  logging: {
    level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
  },
};
```

### Singleton Pattern

```typescript
// agent.ts
import { Agent } from '@ai-agent/core';
import { config } from './config';

let agentInstance: Agent | null = null;

export function getAgent(): Agent {
  if (!agentInstance) {
    agentInstance = new Agent(config);
    
    // Load plugins
    loadPlugins(agentInstance);
    
    // Load knowledge
    loadKnowledge(agentInstance);
  }
  
  return agentInstance;
}

async function loadPlugins(agent: Agent) {
  const plugins = [
    weatherPlugin,
    databasePlugin,
    // ...
  ];
  
  for (const plugin of plugins) {
    await agent.loadPlugin(plugin);
  }
}

async function loadKnowledge(agent: Agent) {
  // Load from files or database
  const docs = await loadDocuments();
  for (const doc of docs) {
    await agent.addKnowledge(doc.content, doc.category, doc.title);
  }
}
```

### Health Checks

```typescript
// health.ts
export async function checkAgentHealth(): Promise<boolean> {
  try {
    const agent = getAgent();
    
    // Test basic functionality
    const response = await agent.chat('ping', {
      history: [],
      skipKnowledge: true,
    });
    
    return response.type !== 'error';
  } catch {
    return false;
  }
}

// Express endpoint
app.get('/health', async (req, res) => {
  const healthy = await checkAgentHealth();
  res.status(healthy ? 200 : 503).json({ healthy });
});
```

### Monitoring

```typescript
import { Agent } from '@ai-agent/core';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'agent.log' }),
  ],
});

const agent = new Agent({
  llm: config.llm,
  logging: {
    level: 'info',
    enableMetrics: true,
    logger: {
      debug: (msg, data) => logger.debug(msg, data),
      info: (msg, data) => logger.info(msg, data),
      warn: (msg, data) => logger.warn(msg, data),
      error: (msg, data) => logger.error(msg, data),
    },
  },
});

// Track metrics
const response = await agent.chat(message, {
  history,
  onEvent: (event) => {
    if (event.type === 'completed') {
      logger.info('Chat completed', {
        duration: event.data.totalDuration,
        iterations: event.data.iterations,
        toolCalls: event.data.toolCalls,
      });
    }
  },
});
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests, please try again later',
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  // Handle chat request
});
```

### Graceful Shutdown

```typescript
let isShuttingDown = false;

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  isShuttingDown = true;
  
  // Unload plugins
  const agent = getAgent();
  const plugins = agent.listPlugins();
  
  for (const plugin of plugins) {
    await agent.unloadPlugin(plugin.name);
  }
  
  // Close database connections, etc.
  await cleanup();
  
  process.exit(0);
});

app.post('/api/chat', async (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({
      error: 'Server is shutting down',
    });
  }
  
  // Handle request
});
```

---

## Next Steps

- **Examples**: Check the `/examples` directory for complete applications
- **API Reference**: See [API.md](./API.md) for detailed API documentation
- **Plugin Development**: Create custom plugins for your use case
- **Community**: Join our Discord for support and discussions
