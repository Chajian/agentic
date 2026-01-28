# Getting Started

Welcome to **@ai-agent/core** - a stateless, production-ready AI agent framework for building intelligent LLM-powered applications.

## What is @ai-agent/core?

@ai-agent/core is a TypeScript framework that provides:

- **Stateless agent architecture** - You control storage, we handle intelligence
- **Multi-LLM support** - OpenAI, Anthropic, and custom providers
- **Extensible tool system** - Build custom capabilities with plugins
- **RAG built-in** - Semantic search over knowledge bases
- **Production-ready** - Logging, metrics, error handling, and more

## Philosophy

Unlike traditional agent frameworks that manage storage internally, @ai-agent/core follows a **stateless pattern**:

```
Traditional Framework:          @ai-agent/core:
┌─────────────────┐            ┌─────────────────┐
│  Your App       │            │  Your App       │
│  ┌───────────┐  │            │  ┌───────────┐  │
│  │  Agent    │  │            │  │  Agent    │  │
│  │  ┌─────┐  │  │            │  │ (stateless)│  │
│  │  │ DB  │  │  │            │  └───────────┘  │
│  │  └─────┘  │  │            │  ┌───────────┐  │
│  └───────────┘  │            │  │  Your DB  │  │
└─────────────────┘            │  └───────────┘  │
                               └─────────────────┘
```

**Benefits:**
- ✅ Use any database or ORM
- ✅ Horizontal scaling (stateless = scalable)
- ✅ Simple testing (no database mocking)
- ✅ Flexible deployment (serverless, containers, etc.)

## Prerequisites

- Node.js 18 or higher
- TypeScript 5.0 or higher (recommended)
- An LLM API key (OpenAI, Anthropic, etc.)

## Installation

::: code-group

```bash [npm]
npm install @ai-agent/core
```

```bash [pnpm]
pnpm add @ai-agent/core
```

```bash [yarn]
yarn add @ai-agent/core
```

:::

## Optional Storage Helpers

If you want ready-made storage solutions:

::: code-group

```bash [Prisma]
npm install @ai-agent/storage-prisma
```

```bash [Memory (Dev)]
npm install @ai-agent/storage-memory
```

:::

## Quick Start

### 1. Create an Agent

```typescript
import { Agent } from '@ai-agent/core';

const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  },
  behavior: {
    systemPrompt: 'You are a helpful assistant.',
    maxIterations: 5
  }
});
```

### 2. Process Messages

The agent is stateless - you manage conversation history:

```typescript
// Load history from your database
const history = [
  { role: 'user', content: 'Hello!', timestamp: new Date() },
  { role: 'assistant', content: 'Hi! How can I help?', timestamp: new Date() }
];

// Process new message
const response = await agent.chat('What is the weather?', {
  sessionId: 'user-123',
  history: history
});

// Save response to your database
console.log(response.content);
// Save: { role: 'assistant', content: response.content, ... }
```

### 3. Add Knowledge (RAG)

```typescript
// Add documents for semantic search
await agent.addKnowledge(
  'Our product supports OAuth 2.0 authentication...',
  'documentation',
  'Auth Guide'
);

// Agent automatically retrieves relevant context
const response = await agent.chat('How do I authenticate?');
```

### 4. Add Custom Tools

```typescript
const weatherPlugin = {
  name: 'weather',
  description: 'Weather information',
  
  tools: [{
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name' }
      },
      required: ['location']
    },
    execute: async ({ location }) => {
      // Your implementation
      return { temp: 72, condition: 'sunny' };
    }
  }]
};

await agent.loadPlugin(weatherPlugin);
```

## Complete Example

Here's a complete example with storage:

```typescript
import { Agent } from '@ai-agent/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  }
});

async function chat(sessionId: string, userMessage: string) {
  // 1. Load history from database
  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' }
  });

  // 2. Process with agent
  const response = await agent.chat(userMessage, {
    sessionId,
    history: messages
  });

  // 3. Save user message
  await prisma.message.create({
    data: {
      sessionId,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
  });

  // 4. Save assistant response
  await prisma.message.create({
    data: {
      sessionId,
      role: 'assistant',
      content: response.content,
      timestamp: new Date()
    }
  });

  return response;
}

// Use it
const response = await chat('session-123', 'Hello!');
console.log(response.content);
```

## Using Storage Helpers

If you prefer ready-made storage:

```typescript
import { Agent } from '@ai-agent/core';
import { PrismaStorage } from '@ai-agent/storage-prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const storage = new PrismaStorage(prisma);
const agent = new Agent({ /* config */ });

async function chat(sessionId: string, userMessage: string) {
  // Load history
  const history = await storage.getHistory(sessionId);
  
  // Process
  const response = await agent.chat(userMessage, {
    sessionId,
    history
  });
  
  // Save messages
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
  
  return response;
}
```

## Next Steps

- **[Stateless Architecture](/guide/stateless-architecture)** - Understand the design philosophy
- **[Storage Management](/guide/storage)** - Learn about storage options
- **[LLM Providers](/guide/llm-providers)** - Configure different LLM providers
- **[Tool System](/guide/tools)** - Build custom tools and plugins
- **[Examples](/examples/)** - See complete working examples

## Need Help?

- [GitHub Discussions](https://github.com/ai-agent-framework/core/discussions)
- [Issue Tracker](https://github.com/ai-agent-framework/core/issues)
- [API Reference](/api/)
