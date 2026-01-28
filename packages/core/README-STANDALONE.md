# @ai-agent/core

A production-ready, stateless AI agent framework for building intelligent conversational applications with LLM support, RAG (Retrieval-Augmented Generation), and extensible tool systems.

## Features

- **🚀 Stateless Architecture**: Pure logic processing engine - you control the storage
- **🔌 Pluggable Storage**: Use any database (Prisma, MongoDB, Redis, or in-memory)
- **🤖 Multi-LLM Support**: OpenAI, Anthropic Claude, custom providers
- **🧠 RAG Knowledge Base**: Semantic search with in-memory document storage
- **🛠️ Extensible Tools**: Plugin system for custom capabilities
- **📊 Streaming Events**: Real-time progress updates and metrics
- **🔒 Type-Safe**: Full TypeScript support with comprehensive types
- **⚡ Production-Ready**: Battle-tested, well-documented, and actively maintained

## Installation

```bash
npm install @ai-agent/core
```

For storage helpers:
```bash
npm install @ai-agent/storage-memory  # Development/testing
npm install @ai-agent/storage-prisma  # Production (SQL)
npm install @ai-agent/storage-mongodb # Production (NoSQL)
```

## Quick Start

### Basic Usage (Stateless)

```typescript
import { Agent } from '@ai-agent/core';

// Create agent
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

// Process a message (stateless - you manage history)
const response = await agent.chat('Hello, agent!', {
  history: [], // Load from your database
  sessionId: 'user-123',
});

console.log(response.message);
```

### With Storage Helper

```typescript
import { Agent } from '@ai-agent/core';
import { SessionManager } from '@ai-agent/storage-memory';

const agent = new Agent(config);
const sessionManager = new SessionManager();

// Create session
const sessionId = sessionManager.createSession();

// Process message
const userMessage = 'What is the weather like?';
sessionManager.addUserMessage(sessionId, userMessage);

const response = await agent.chat(userMessage, {
  sessionId,
  history: sessionManager.getHistory(sessionId),
});

// Save response
sessionManager.addAssistantMessage(sessionId, response);
```

### With Custom Storage (Database)

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
    role: m.role,
    content: m.content,
    timestamp: m.createdAt,
  }));

  // Process with agent
  const response = await agent.chat(message, {
    sessionId: userId,
    history,
  });

  // Save to database
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

## Core Concepts

### Stateless Architecture

The Agent is a **pure logic processing engine** that doesn't maintain state internally:

- **History is input**: Pass conversation history via `options.history`
- **No internal storage**: Agent doesn't save messages or sessions
- **You control persistence**: Use any database or storage solution
- **Horizontally scalable**: Stateless agents can be easily scaled

```typescript
// Agent doesn't store this
const response = await agent.chat(message, {
  history: loadFromDatabase(sessionId), // You load
  sessionId: sessionId,
});

// You save the response
saveToDatabase(sessionId, message, response);
```

### Storage Responsibility

**Important**: The Agent does NOT manage conversation storage. You are responsible for:

1. **Loading History**: Fetch messages from your database and pass via `options.history`
2. **Saving Messages**: Store user messages and agent responses in your database
3. **Managing Sessions**: Create and track session IDs in your application
4. **Handling Confirmations**: Store and retrieve pending confirmations

This design gives you complete control over:
- Where data is stored (SQL, NoSQL, Redis, etc.)
- How long data is retained
- Data encryption and security
- Backup and recovery strategies

See the [Usage Guide](./docs/USAGE_GUIDE.md#storage-management) for implementation patterns.

### Configuration

```typescript
interface AgentConfig {
  // LLM configuration (required)
  llm: {
    mode: 'single' | 'multi';
    default: {
      provider: 'openai' | 'claude' | 'custom';
      apiKey: string;
      model: string;
      temperature?: number;
      maxTokens?: number;
    };
    fallback?: LLMProviderConfig;
  };

  // Knowledge system (optional)
  knowledge?: {
    embedding?: {
      model: string;
      dimension: number;
    };
    search?: {
      defaultTopK: number;
      minScore: number;
      defaultMethod: 'keyword' | 'semantic' | 'hybrid';
    };
  };

  // Behavior (optional)
  behavior?: {
    timeoutMs?: number;
    maxIterations?: number;
    requireConfirmation?: boolean;
    confidenceThreshold?: number;
    systemPrompt?: string;
  };

  // Logging (optional)
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    logger?: Logger;
    enableMetrics?: boolean;
  };
}
```

### Plugin System

Extend the agent with custom tools:

```typescript
import { AgentPlugin, Tool } from '@ai-agent/core';

const weatherPlugin: AgentPlugin = {
  name: 'weather',
  version: '1.0.0',
  description: 'Weather information tools',
  tools: [
    {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name or coordinates',
          },
        },
        required: ['location'],
      },
      execute: async (args, context) => {
        const weather = await fetchWeather(args.location);
        return {
          success: true,
          content: `Weather in ${args.location}: ${weather.temp}°C, ${weather.condition}`,
          data: weather,
        };
      },
    },
  ],
};

// Load plugin
await agent.loadPlugin(weatherPlugin);
```

### Knowledge Base (RAG)

Add documents for semantic search:

```typescript
// Add knowledge
await agent.addKnowledge(
  'The capital of France is Paris.',
  'geography',
  'France Facts'
);

// Agent automatically retrieves relevant knowledge
const response = await agent.chat('What is the capital of France?');
```

### Streaming Events

Monitor agent operations in real-time:

```typescript
const response = await agent.chat(message, {
  onEvent: (event) => {
    switch (event.type) {
      case 'processing_started':
        console.log('Agent started processing');
        break;
      case 'tool_call':
        console.log(`Calling tool: ${event.data.toolName}`);
        break;
      case 'completed':
        console.log(`Completed in ${event.data.totalDuration}ms`);
        break;
    }
  },
});
```

## Documentation

### Complete API Reference

For detailed API documentation, see:
- **[API Reference](./docs/API.md)** - Complete API documentation with all classes, interfaces, and methods
- **[Usage Guide](./docs/USAGE_GUIDE.md)** - Comprehensive guide with examples and best practices

### Quick API Overview

#### Agent Class

```typescript
// Constructor
new Agent(config: AgentConfig)

// Main method - process messages (stateless)
chat(message: string, options?: ChatOptions): Promise<AgentResponse>

// Knowledge management
addKnowledge(content: string, category: string, title?: string): Promise<string>

// Plugin management
loadPlugin(plugin: AgentPlugin): Promise<void>
unloadPlugin(pluginName: string): Promise<boolean>
listPlugins(): PluginInfo[]
```

#### Key Types

```typescript
// Message in conversation history
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// Agent response
interface AgentResponse {
  type: 'execute' | 'confirm' | 'error';
  message: string;
  data?: unknown;
  toolCalls?: ToolCallRecord[];
}

// Chat options
interface ChatOptions {
  sessionId?: string;
  history?: Message[];  // Load from your database
  pendingConfirmation?: PendingConfirmation;
  skipKnowledge?: boolean;
  skipConfirmation?: boolean;
  systemPrompt?: string;
  abortSignal?: AbortSignal;
  onEvent?: (event: StreamEvent) => void;
}
```

For complete type definitions and detailed examples, see the [API Reference](./docs/API.md).

## Storage Patterns

### Pattern 1: In-Memory (Development)

```typescript
import { SessionManager } from '@ai-agent/storage-memory';

const sessions = new SessionManager();
const sessionId = sessions.createSession();

// Use sessions.getHistory(sessionId) for history
```

### Pattern 2: SQL Database (Production)

```typescript
// Load from database
const history = await db.message.findMany({
  where: { sessionId },
  orderBy: { createdAt: 'asc' },
});

// Pass to agent
const response = await agent.chat(message, { history });

// Save to database
await db.message.create({
  data: { sessionId, role: 'assistant', content: response.message },
});
```

### Pattern 3: Redis Cache

```typescript
// Load from Redis
const history = JSON.parse(await redis.get(`session:${sessionId}`));

// Process
const response = await agent.chat(message, { history });

// Save to Redis
history.push({ role: 'assistant', content: response.message });
await redis.set(`session:${sessionId}`, JSON.stringify(history));
```

## Advanced Features

### Multi-LLM Mode

Use different LLMs for different tasks:

```typescript
const agent = new Agent({
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
});
```

### Custom Logger

```typescript
const agent = new Agent({
  llm: config.llm,
  logging: {
    level: 'info',
    logger: {
      debug: (msg, data) => winston.debug(msg, data),
      info: (msg, data) => winston.info(msg, data),
      warn: (msg, data) => winston.warn(msg, data),
      error: (msg, data) => winston.error(msg, data),
    },
  },
});
```

### Confirmation for High-Risk Operations

```typescript
const response = await agent.chat('Delete all users', {
  history,
});

if (response.type === 'confirm') {
  // Ask user for confirmation
  const confirmed = await askUser(response.message);
  
  if (confirmed) {
    // Re-run with confirmation
    const finalResponse = await agent.chat('yes', {
      history,
      pendingConfirmation: response.pendingConfirmation,
    });
  }
}
```

## Examples

See the `/examples` directory for complete examples:

- **chatbot-prisma** - Conversational agent with Prisma storage
- **qa-bot** - Q&A with RAG knowledge base
- **task-automation** - Agent with custom tools

### Running Examples

#### Docker (Recommended)

```bash
cd examples

# Set up environment
cp .env.docker.example .env
# Edit .env with your API keys

# Start all examples
docker-compose up -d

# Or start specific example
docker-compose up -d chatbot-prisma
```

See [examples/DOCKER_DEPLOYMENT.md](./examples/DOCKER_DEPLOYMENT.md) for detailed Docker instructions.

#### Local Development

```bash
cd examples/chatbot-prisma
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

Each example includes its own README with setup instructions.

## Migration from Previous Versions

If you're migrating from an earlier version:

1. Update package name: `@ai-agent/core`
2. Remove `database` from config (now optional)
3. Pass `history` via `options.history` instead of relying on internal storage
4. Use `@ai-agent/storage-memory` for backward-compatible storage

See [MIGRATION.md](./MIGRATION.md) for detailed guide.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT

## Support

- **Documentation**: https://ai-agent-framework.dev
- **Issues**: https://github.com/ai-agent-framework/core/issues
- **Discord**: https://discord.gg/ai-agent-framework
