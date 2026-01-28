# @ai-agent/core API Reference

Complete API documentation for the AI Agent Framework.

## Table of Contents

- [Agent Class](#agent-class)
- [Configuration](#configuration)
- [Types](#types)
- [Plugin System](#plugin-system)
- [Knowledge System](#knowledge-system)
- [Streaming Events](#streaming-events)
- [Storage Patterns](#storage-patterns)

---

## Agent Class

The `Agent` class is the main entry point for the framework. It's a **stateless** processing engine that doesn't maintain conversation history internally.

### Constructor

```typescript
new Agent(config: AgentConfig)
```

Creates a new Agent instance with the specified configuration.

**Parameters:**
- `config: AgentConfig` - Agent configuration object

**Example:**
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

### Methods

#### `chat(message: string, options?: ChatOptions): Promise<AgentResponse>`

Process a user message and generate a response. This is the primary method for interacting with the agent.

**Stateless Architecture:**
- Does NOT store conversation history internally
- History must be passed via `options.history` (loaded from your database)
- Returns response for you to save to your storage

**Parameters:**
- `message: string` - The user's message to process
- `options?: ChatOptions` - Optional configuration for this chat request
  - `sessionId?: string` - Session identifier for tracking
  - `history?: Message[]` - **Conversation history loaded from your database**
  - `pendingConfirmation?: PendingConfirmation` - Pending confirmation state from database
  - `skipKnowledge?: boolean` - Skip knowledge retrieval for this request
  - `skipConfirmation?: boolean` - Skip confirmation checks for high-risk operations
  - `systemPrompt?: string` - Override the default system prompt
  - `abortSignal?: AbortSignal` - Signal for cancelling the operation
  - `onEvent?: (event: StreamEvent) => void` - Callback for streaming events

**Returns:** `Promise<AgentResponse>` - The agent's response

**Response Types:**
- `execute` - Action completed successfully
- `confirm` - Requires user confirmation before proceeding
- `error` - An error occurred

**Example (Stateless with Database):**
```typescript
// Load history from your database
const history = await db.message.findMany({
  where: { sessionId: 'user-123' },
  orderBy: { createdAt: 'asc' },
});

// Process message
const response = await agent.chat('What is the weather?', {
  sessionId: 'user-123',
  history: history.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.createdAt,
  })),
});

// Save response to database
await db.message.create({
  data: {
    sessionId: 'user-123',
    role: 'assistant',
    content: response.message,
  },
});
```

**Example (With Streaming):**
```typescript
const response = await agent.chat('Analyze this data', {
  history,
  onEvent: (event) => {
    switch (event.type) {
      case 'processing_started':
        console.log('Started processing');
        break;
      case 'tool_call_started':
        console.log(`Calling tool: ${event.data.toolName}`);
        break;
      case 'completed':
        console.log(`Done in ${event.data.totalDuration}ms`);
        break;
    }
  },
});
```


#### `addKnowledge(content: string, category: string, title?: string): Promise<string>`

Add a document to the in-memory knowledge base for RAG (Retrieval-Augmented Generation).

**Parameters:**
- `content: string` - The document content
- `category: string` - Category for organizing documents
- `title?: string` - Optional document title

**Returns:** `Promise<string>` - The document ID

**Example:**
```typescript
const docId = await agent.addKnowledge(
  'Paris is the capital of France.',
  'geography',
  'France Facts'
);
```

#### `loadPlugin(plugin: AgentPlugin): Promise<void>`

Load a plugin to extend the agent with custom tools.

**Parameters:**
- `plugin: AgentPlugin` - The plugin to load

**Example:**
```typescript
const weatherPlugin = {
  name: 'weather',
  version: '1.0.0',
  description: 'Weather information tools',
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
        // Implementation
        return {
          success: true,
          content: `Weather in ${args.location}: Sunny, 72°F`,
        };
      },
    },
  ],
};

await agent.loadPlugin(weatherPlugin);
```

#### `unloadPlugin(pluginName: string): Promise<boolean>`

Unload a previously loaded plugin.

**Parameters:**
- `pluginName: string` - Name of the plugin to unload

**Returns:** `Promise<boolean>` - True if plugin was unloaded, false if not found

#### `listPlugins(): PluginInfo[]`

Get information about all loaded plugins.

**Returns:** `PluginInfo[]` - Array of plugin information objects

#### `getPlugin(name: string): AgentPlugin | undefined`

Get a specific plugin by name.

**Parameters:**
- `name: string` - Plugin name

**Returns:** `AgentPlugin | undefined` - The plugin or undefined if not found


---

## Configuration

### AgentConfig

Complete configuration interface for the Agent.

```typescript
interface AgentConfig {
  llm: LLMConfig;
  knowledge?: KnowledgeConfig;
  behavior?: BehaviorConfig;
  logging?: LoggingConfig;
}
```

### LLMConfig

Configuration for LLM providers.

```typescript
interface LLMConfig {
  mode: 'single' | 'multi';
  default: LLMProviderConfig;
  taskAssignment?: {
    intentParsing?: LLMProviderConfig;
    knowledgeRetrieval?: LLMProviderConfig;
    toolCalling?: LLMProviderConfig;
    responseGeneration?: LLMProviderConfig;
  };
  fallback?: LLMProviderConfig;
}
```

**Single Mode Example:**
```typescript
{
  llm: {
    mode: 'single',
    default: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
    },
  },
}
```

**Multi Mode Example:**
```typescript
{
  llm: {
    mode: 'multi',
    default: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
    },
    taskAssignment: {
      toolCalling: {
        provider: 'claude',
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-opus-20240229',
      },
    },
  },
}
```

### LLMProviderConfig

Configuration for a single LLM provider.

```typescript
interface LLMProviderConfig {
  provider: 'openai' | 'claude' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  options?: Record<string, unknown>;
}
```


### KnowledgeConfig

Configuration for the knowledge system.

```typescript
interface KnowledgeConfig {
  embedding?: {
    model: string;
    dimension: number;
  };
  search?: {
    defaultTopK: number;
    minScore: number;
    defaultMethod: 'keyword' | 'semantic' | 'hybrid';
  };
}
```

**Example:**
```typescript
{
  knowledge: {
    embedding: {
      model: 'text-embedding-ada-002',
      dimension: 1536,
    },
    search: {
      defaultTopK: 5,
      minScore: 0.7,
      defaultMethod: 'hybrid',
    },
  },
}
```

### BehaviorConfig

Configuration for agent behavior.

```typescript
interface BehaviorConfig {
  timeoutMs?: number;
  maxIterations?: number;
  requireConfirmation?: boolean;
  confidenceThreshold?: number;
  systemPrompt?: string;
}
```

**Defaults:**
- `timeoutMs: 30000` (30 seconds)
- `maxIterations: 10`
- `requireConfirmation: true`
- `confidenceThreshold: 0.8`

**Example:**
```typescript
{
  behavior: {
    timeoutMs: 60000,
    maxIterations: 15,
    requireConfirmation: true,
    systemPrompt: 'You are a helpful assistant...',
  },
}
```

### LoggingConfig

Configuration for logging.

```typescript
interface LoggingConfig {
  level?: 'debug' | 'info' | 'warn' | 'error';
  logger?: Logger;
  enableMetrics?: boolean;
}

interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}
```

**Example (Custom Logger):**
```typescript
import winston from 'winston';

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

const agent = new Agent({
  llm: config.llm,
  logging: {
    level: 'info',
    enableMetrics: true,
    logger: {
      debug: (msg, data) => winstonLogger.debug(msg, data),
      info: (msg, data) => winstonLogger.info(msg, data),
      warn: (msg, data) => winstonLogger.warn(msg, data),
      error: (msg, data) => winstonLogger.error(msg, data),
    },
  },
});
```


---

## Types

### Message

Represents a message in conversation history.

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallRecord[];
  responseType?: string;
}
```

**Storage Responsibility:**
Messages are NOT stored by the Agent. You must:
1. Load messages from your database
2. Pass them via `options.history` in `chat()`
3. Save new messages after receiving responses

### AgentResponse

Union type of all possible agent responses.

```typescript
type AgentResponse = 
  | ExecuteResponse 
  | ConfirmResponse 
  | ErrorResponse;
```

#### ExecuteResponse

Returned when the agent successfully completes an action.

```typescript
interface ExecuteResponse {
  type: 'execute';
  message: string;
  data?: unknown;
  toolCalls?: ToolCallRecord[];
}
```

#### ConfirmResponse

Returned when the agent needs user confirmation for a high-risk operation.

```typescript
interface ConfirmResponse {
  type: 'confirm';
  message: string;
  action: {
    type: string;
    target: string;
    params: Record<string, unknown>;
  };
  risk: 'low' | 'medium' | 'high';
  preview?: string;
}
```

**Handling Confirmations:**
```typescript
const response = await agent.chat('Delete all users', { history });

if (response.type === 'confirm') {
  // Ask user for confirmation
  const confirmed = await askUser(response.message);
  
  if (confirmed) {
    // Save pending confirmation to database
    await db.pendingConfirmation.create({
      data: {
        sessionId,
        toolName: response.action.type,
        arguments: response.action.params,
        userMessage: 'Delete all users',
      },
    });
    
    // User responds with "yes"
    const finalResponse = await agent.chat('yes', {
      history,
      pendingConfirmation: {
        toolName: response.action.type,
        arguments: response.action.params,
        userMessage: 'Delete all users',
        timestamp: new Date(),
      },
    });
  }
}
```


### ToolCallRecord

Record of a tool execution.

```typescript
interface ToolCallRecord {
  toolName: string;
  arguments: Record<string, unknown>;
  result: {
    success: boolean;
    content: string;
    data?: unknown;
  };
}
```

### PendingConfirmation

State for pending confirmation operations.

```typescript
interface PendingConfirmation {
  toolName: string;
  arguments: Record<string, unknown>;
  userMessage: string;
  timestamp: Date;
}
```

**Storage Pattern:**
```typescript
// When agent returns confirm response, save to database
if (response.type === 'confirm') {
  await db.pendingConfirmation.upsert({
    where: { sessionId },
    create: {
      sessionId,
      toolName: response.action.type,
      arguments: JSON.stringify(response.action.params),
      userMessage: originalMessage,
    },
  });
}

// When user confirms, load and pass to agent
const pending = await db.pendingConfirmation.findUnique({
  where: { sessionId },
});

if (pending) {
  const response = await agent.chat('yes', {
    history,
    pendingConfirmation: {
      toolName: pending.toolName,
      arguments: JSON.parse(pending.arguments),
      userMessage: pending.userMessage,
      timestamp: pending.createdAt,
    },
  });
  
  // Clear pending confirmation
  await db.pendingConfirmation.delete({
    where: { sessionId },
  });
}
```

---

## Plugin System

### AgentPlugin

Interface for creating plugins.

```typescript
interface AgentPlugin {
  name: string;
  version: string;
  description: string;
  namespace?: string;
  dependencies?: string[];
  tools: Tool[];
  initialize?(context: PluginContext): Promise<void>;
  cleanup?(): Promise<void>;
  healthCheck?(): Promise<boolean>;
}
```

**Lifecycle Hooks:**
- `initialize()` - Called when plugin is loaded (before tools are registered)
- `cleanup()` - Called when plugin is unloaded (after tools are unregistered)
- `healthCheck()` - Optional health check for monitoring


### Tool

Interface for defining tools.

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: ToolExecutor;
  category?: string;
  requiresConfirmation?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
}

interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  enum?: string[];
  default?: unknown;
}

type ToolExecutor = (
  args: Record<string, unknown>,
  context: ToolContext
) => Promise<ToolResult>;

interface ToolResult {
  success: boolean;
  content: string;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

**Complete Plugin Example:**
```typescript
import { AgentPlugin, PluginContext } from '@ai-agent/core';

const databasePlugin: AgentPlugin = {
  name: 'database',
  version: '1.0.0',
  description: 'Database management tools',
  namespace: 'db',
  
  // Lifecycle hook
  async initialize(context: PluginContext) {
    context.logger.info('Database plugin initialized');
    // Setup database connection, etc.
  },
  
  // Cleanup hook
  async cleanup() {
    // Close database connections, etc.
  },
  
  // Tools
  tools: [
    {
      name: 'query',
      description: 'Execute a database query',
      parameters: [
        {
          name: 'sql',
          type: 'string',
          description: 'SQL query to execute',
          required: true,
        },
        {
          name: 'params',
          type: 'array',
          description: 'Query parameters',
          required: false,
        },
      ],
      riskLevel: 'high',
      requiresConfirmation: true,
      execute: async (args, context) => {
        try {
          const results = await executeQuery(
            args.sql as string,
            args.params as unknown[]
          );
          
          return {
            success: true,
            content: `Query returned ${results.length} rows`,
            data: results,
          };
        } catch (error) {
          return {
            success: false,
            content: 'Query failed',
            error: {
              code: 'QUERY_ERROR',
              message: error.message,
            },
          };
        }
      },
    },
  ],
};

// Load the plugin
await agent.loadPlugin(databasePlugin);
```


### PluginContext

Context provided to plugins during initialization.

```typescript
interface PluginContext {
  logger: ToolLogger;
  knowledgeBase: KnowledgeBase;
  config: AppConfig;
  services: Record<string, unknown>;
}
```

**Using Plugin Context:**
```typescript
const plugin: AgentPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'Example plugin',
  
  async initialize(context: PluginContext) {
    // Access logger
    context.logger.info('Plugin starting');
    
    // Access knowledge base
    await context.knowledgeBase.addDocument({
      content: 'Plugin documentation',
      category: 'plugins',
    });
    
    // Access app config
    if (context.config.debug) {
      context.logger.debug('Debug mode enabled');
    }
    
    // Access custom services (injected by application)
    const db = context.services.database;
  },
  
  tools: [/* ... */],
};
```

---

## Knowledge System

### KnowledgeStore

In-memory document storage for RAG.

**Why In-Memory?**
- Fast semantic search (sub-millisecond)
- Documents loaded at startup
- Embeddings cached for performance
- Conversation history stored externally (database)

```typescript
class KnowledgeStore {
  async addDocument(doc: DocumentInput): Promise<string>;
  async getDocument(id: string): Promise<Document | null>;
  async deleteDocument(id: string): Promise<boolean>;
  async updateDocument(id: string, updates: Partial<DocumentInput>): Promise<boolean>;
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  async listCategories(): Promise<string[]>;
  async getDocumentsByCategory(category: string): Promise<Document[]>;
  getDocumentCount(): number;
  clear(): void;
}
```

### Document Types

```typescript
interface DocumentInput {
  content: string;
  category: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

interface Document {
  id: string;
  content: string;
  category: string;
  title?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchOptions {
  method?: 'keyword' | 'semantic' | 'hybrid';
  topK?: number;
  minScore?: number;
  category?: string;
}

interface SearchResult {
  document: Document;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}
```


**Knowledge Management Example:**
```typescript
import { Agent } from '@ai-agent/core';
import fs from 'fs/promises';

const agent = new Agent(config);

// Load documents at startup
async function loadKnowledge() {
  const files = await fs.readdir('./docs');
  
  for (const file of files) {
    const content = await fs.readFile(`./docs/${file}`, 'utf-8');
    await agent.addKnowledge(
      content,
      'documentation',
      file
    );
  }
  
  console.log(`Loaded ${agent.getKnowledgeStore().getDocumentCount()} documents`);
}

await loadKnowledge();

// Agent automatically retrieves relevant knowledge during chat
const response = await agent.chat('How do I configure the database?', {
  history,
});
```

---

## Streaming Events

The agent emits real-time events during processing when `onEvent` callback is provided.

### StreamEvent Types

```typescript
type StreamEvent =
  | ProcessingStartedEvent
  | IterationStartedEvent
  | IterationCompletedEvent
  | ToolCallStartedEvent
  | ToolCallCompletedEvent
  | ToolErrorEvent
  | KnowledgeRetrievedEvent
  | ConfirmationCheckEvent
  | CompletedEvent
  | ErrorEvent
  | CancelledEvent;
```

### Event Examples

#### ProcessingStartedEvent
```typescript
{
  type: 'processing_started',
  id: 'evt_123',
  timestamp: 1234567890,
  sessionId: 'session-123',
  data: {
    messageId: 'msg_456',
  },
}
```

#### ToolCallStartedEvent
```typescript
{
  type: 'tool_call_started',
  id: 'evt_124',
  timestamp: 1234567891,
  sessionId: 'session-123',
  data: {
    toolCallId: 'tc_789',
    toolName: 'get_weather',
    arguments: { location: 'New York' },
  },
}
```

#### ToolCallCompletedEvent
```typescript
{
  type: 'tool_call_completed',
  id: 'evt_125',
  timestamp: 1234567892,
  sessionId: 'session-123',
  data: {
    toolCallId: 'tc_789',
    toolName: 'get_weather',
    success: true,
    duration: 1234,
    result: { temp: 72, condition: 'sunny' },
  },
}
```

#### CompletedEvent
```typescript
{
  type: 'completed',
  id: 'evt_126',
  timestamp: 1234567893,
  sessionId: 'session-123',
  data: {
    messageId: 'msg_456',
    totalDuration: 3000,
    iterations: 2,
    toolCalls: 1,
  },
}
```


### Streaming Example

```typescript
const response = await agent.chat('Analyze this data', {
  history,
  onEvent: (event) => {
    switch (event.type) {
      case 'processing_started':
        console.log('🚀 Processing started');
        break;
        
      case 'iteration_started':
        console.log(`🔄 Iteration ${event.data.iteration}/${event.data.maxIterations}`);
        break;
        
      case 'tool_call_started':
        console.log(`🔧 Calling tool: ${event.data.toolName}`);
        console.log(`   Args:`, event.data.arguments);
        break;
        
      case 'tool_call_completed':
        const status = event.data.success ? '✅' : '❌';
        console.log(`${status} Tool completed: ${event.data.toolName}`);
        console.log(`   Duration: ${event.data.duration}ms`);
        break;
        
      case 'knowledge_retrieved':
        console.log(`📚 Retrieved ${event.data.documentCount} documents`);
        console.log(`   Categories:`, event.data.categories);
        break;
        
      case 'completed':
        console.log(`✨ Completed in ${event.data.totalDuration}ms`);
        console.log(`   Iterations: ${event.data.iterations}`);
        console.log(`   Tool calls: ${event.data.toolCalls}`);
        break;
        
      case 'error':
        console.error(`❌ Error: ${event.data.message}`);
        console.error(`   Code: ${event.data.code}`);
        break;
    }
  },
});
```

### Cancellation with AbortSignal

```typescript
const abortController = new AbortController();

// Set timeout
setTimeout(() => {
  abortController.abort();
}, 30000); // 30 seconds

try {
  const response = await agent.chat('Long running task', {
    history,
    abortSignal: abortController.signal,
    onEvent: (event) => {
      if (event.type === 'cancelled') {
        console.log('Operation cancelled:', event.data.reason);
      }
    },
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was aborted');
  }
}
```

---

## Storage Patterns

The Agent is **stateless** - you control how conversation history is stored.

### Pattern 1: In-Memory (Development/Testing)

```typescript
import { Agent } from '@ai-agent/core';

const sessions = new Map<string, Message[]>();

async function chat(sessionId: string, message: string) {
  // Load history
  const history = sessions.get(sessionId) || [];
  
  // Process
  const response = await agent.chat(message, {
    sessionId,
    history,
  });
  
  // Save history
  history.push({
    id: `msg_${Date.now()}`,
    role: 'user',
    content: message,
    timestamp: new Date(),
  });
  
  history.push({
    id: `msg_${Date.now() + 1}`,
    role: 'assistant',
    content: response.message,
    timestamp: new Date(),
  });
  
  sessions.set(sessionId, history);
  
  return response;
}
```


### Pattern 2: SQL Database with Prisma (Production)

```typescript
import { Agent } from '@ai-agent/core';
import { PrismaClient } from '@prisma/client';

const agent = new Agent(config);
const prisma = new PrismaClient();

async function chat(userId: string, message: string) {
  // Load history from database
  const dbMessages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  
  const history = dbMessages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
    timestamp: m.createdAt,
  }));
  
  // Check for pending confirmation
  const pendingConfirmation = await prisma.pendingConfirmation.findUnique({
    where: { userId },
  });
  
  // Process with agent
  const response = await agent.chat(message, {
    sessionId: userId,
    history,
    pendingConfirmation: pendingConfirmation ? {
      toolName: pendingConfirmation.toolName,
      arguments: JSON.parse(pendingConfirmation.arguments),
      userMessage: pendingConfirmation.userMessage,
      timestamp: pendingConfirmation.createdAt,
    } : undefined,
  });
  
  // Handle confirmation response
  if (response.type === 'confirm') {
    await prisma.pendingConfirmation.upsert({
      where: { userId },
      create: {
        userId,
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
    // Clear pending confirmation if exists
    await prisma.pendingConfirmation.deleteMany({
      where: { userId },
    });
  }
  
  // Save messages to database
  await prisma.message.createMany({
    data: [
      {
        userId,
        role: 'user',
        content: message,
        createdAt: new Date(),
      },
      {
        userId,
        role: 'assistant',
        content: response.message,
        createdAt: new Date(),
      },
    ],
  });
  
  return response;
}
```

### Pattern 3: Redis Cache (High Performance)

```typescript
import { Agent } from '@ai-agent/core';
import Redis from 'ioredis';

const agent = new Agent(config);
const redis = new Redis();

async function chat(sessionId: string, message: string) {
  // Load history from Redis
  const historyJson = await redis.get(`session:${sessionId}:history`);
  const history: Message[] = historyJson ? JSON.parse(historyJson) : [];
  
  // Process
  const response = await agent.chat(message, {
    sessionId,
    history,
  });
  
  // Update history
  history.push({
    id: `msg_${Date.now()}`,
    role: 'user',
    content: message,
    timestamp: new Date(),
  });
  
  history.push({
    id: `msg_${Date.now() + 1}`,
    role: 'assistant',
    content: response.message,
    timestamp: new Date(),
  });
  
  // Save to Redis with TTL
  await redis.setex(
    `session:${sessionId}:history`,
    3600, // 1 hour TTL
    JSON.stringify(history)
  );
  
  return response;
}
```


### Pattern 4: Storage Helper Package

For convenience, use the optional `@ai-agent/storage-memory` package:

```typescript
import { Agent } from '@ai-agent/core';
import { SessionManager } from '@ai-agent/storage-memory';

const agent = new Agent(config);
const sessionManager = new SessionManager();

async function chat(sessionId: string, message: string) {
  // Create session if needed
  if (!sessionManager.hasSession(sessionId)) {
    sessionManager.createSession(sessionId);
  }
  
  // Add user message
  sessionManager.addUserMessage(sessionId, message);
  
  // Get history
  const history = sessionManager.getHistory(sessionId);
  
  // Process
  const response = await agent.chat(message, {
    sessionId,
    history,
  });
  
  // Add assistant message
  sessionManager.addAssistantMessage(sessionId, response.message);
  
  return response;
}
```

---

## Best Practices

### 1. Stateless Architecture

**DO:**
```typescript
// Load history from database
const history = await loadHistoryFromDB(sessionId);

// Pass to agent
const response = await agent.chat(message, { history });

// Save to database
await saveToDatabase(sessionId, message, response);
```

**DON'T:**
```typescript
// Agent doesn't store history internally
const response = await agent.chat(message); // ❌ No history context
```

### 2. Error Handling

```typescript
try {
  const response = await agent.chat(message, { history });
  
  if (response.type === 'error') {
    // Handle agent-level errors
    console.error('Agent error:', response.message);
  }
} catch (error) {
  // Handle system-level errors
  console.error('System error:', error);
}
```

### 3. Confirmation Flow

```typescript
async function handleChat(sessionId: string, message: string) {
  const history = await loadHistory(sessionId);
  const pending = await loadPendingConfirmation(sessionId);
  
  const response = await agent.chat(message, {
    sessionId,
    history,
    pendingConfirmation: pending,
  });
  
  if (response.type === 'confirm') {
    // Save pending confirmation
    await savePendingConfirmation(sessionId, {
      toolName: response.action.type,
      arguments: response.action.params,
      userMessage: message,
      timestamp: new Date(),
    });
    
    return {
      needsConfirmation: true,
      message: response.message,
      risk: response.risk,
    };
  }
  
  // Clear pending confirmation
  await clearPendingConfirmation(sessionId);
  
  return {
    needsConfirmation: false,
    message: response.message,
  };
}
```

### 4. Knowledge Management

```typescript
// Load knowledge at startup
async function initializeAgent() {
  const agent = new Agent(config);
  
  // Load from files
  const docs = await loadDocumentsFromFiles('./knowledge');
  for (const doc of docs) {
    await agent.addKnowledge(doc.content, doc.category, doc.title);
  }
  
  // Load from database
  const dbDocs = await db.knowledgeDocument.findMany();
  for (const doc of dbDocs) {
    await agent.addKnowledge(doc.content, doc.category, doc.title);
  }
  
  console.log(`Loaded ${agent.getKnowledgeStore().getDocumentCount()} documents`);
  
  return agent;
}
```

### 5. Plugin Development

```typescript
// Use plugin factory pattern for dependency injection
function createMyPlugin(dependencies: {
  database: Database;
  cache: Cache;
}): AgentPlugin {
  return {
    name: 'my-plugin',
    version: '1.0.0',
    description: 'My custom plugin',
    
    async initialize(context) {
      context.logger.info('Initializing plugin');
      // Setup with dependencies
    },
    
    tools: [
      {
        name: 'my_tool',
        description: 'Does something useful',
        parameters: [/* ... */],
        execute: async (args, context) => {
          // Use injected dependencies
          const result = await dependencies.database.query(/* ... */);
          return {
            success: true,
            content: 'Done',
            data: result,
          };
        },
      },
    ],
  };
}

// Load with dependencies
const plugin = createMyPlugin({ database, cache });
await agent.loadPlugin(plugin);
```

---

## Migration from Previous Versions

If you're upgrading from an earlier version that had built-in storage:

### Before (Old API)
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

### After (New Stateless API)
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

---

## Additional Resources

- **GitHub Repository**: https://github.com/ai-agent-framework/core
- **NPM Package**: https://www.npmjs.com/package/@ai-agent/core
- **Documentation Site**: https://ai-agent-framework.dev
- **Examples**: See `/examples` directory in the repository
- **Discord Community**: https://discord.gg/ai-agent-framework

## Support

For issues, questions, or contributions:
- **Issues**: https://github.com/ai-agent-framework/core/issues
- **Discussions**: https://github.com/ai-agent-framework/core/discussions
- **Email**: support@ai-agent-framework.dev
