---
layout: home

hero:
  name: "@ai-agent/core"
  text: "AI Agent Framework"
  tagline: Build intelligent LLM-powered applications with a stateless, production-ready framework
  image:
    src: /logo.svg
    alt: AI Agent Framework
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/ai-agent-framework/core
    - theme: alt
      text: API Reference
      link: /api/

features:
  - icon: 🚀
    title: Stateless Architecture
    details: Pure logic processing engine that scales horizontally. You control storage, we handle the intelligence.
  
  - icon: 🔌
    title: Pluggable Storage
    details: Use any database - Prisma, MongoDB, Redis, or in-memory. Storage helpers included for common backends.
  
  - icon: 🤖
    title: Multi-LLM Support
    details: Works with OpenAI, Anthropic Claude, and custom providers. Switch providers without changing code.
  
  - icon: 🛠️
    title: Extensible Tools
    details: Build custom tools and plugins with TypeScript. Full type safety and validation included.
  
  - icon: 📚
    title: RAG Built-in
    details: Semantic search over knowledge bases with automatic chunking and embedding generation.
  
  - icon: ⚡
    title: Streaming Events
    details: Real-time event streaming for tool calls, LLM responses, and agent operations.
  
  - icon: 🔍
    title: Full Observability
    details: Structured logging, performance metrics, and audit trails for production monitoring.
  
  - icon: 📦
    title: Production Ready
    details: TypeScript-first, comprehensive tests, Docker support, and CI/CD workflows included.
  
  - icon: 🎯
    title: ReAct Pattern
    details: Autonomous decision-making with reasoning and action loops for complex tasks.
---

## Quick Start

```bash
npm install @ai-agent/core
```

```typescript
import { Agent } from '@ai-agent/core';

// Create a stateless agent
const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  }
});

// Process a message (you manage history)
const response = await agent.chat('Hello!', {
  history: [] // Load from your database
});

// Save response to your database
console.log(response.content);
```

## Why Stateless?

Traditional agent frameworks manage storage internally, coupling your application to their database choices. **@ai-agent/core** takes a different approach:

- ✅ **You control storage** - Use any database or ORM
- ✅ **Horizontal scaling** - Stateless agents scale effortlessly
- ✅ **Simple testing** - No database mocking required
- ✅ **Flexible deployment** - Works in serverless, containers, or traditional servers

## Key Features

### 🎯 Stateless Agent Pattern

The agent is a pure function: `(message, history) => response`. You load history from your database, pass it to the agent, and save the response back.

```typescript
// Load history from your database
const history = await db.messages.findMany({ 
  where: { sessionId } 
});

// Process with agent
const response = await agent.chat(userMessage, { history });

// Save to your database
await db.messages.create({
  data: {
    sessionId,
    role: 'assistant',
    content: response.content
  }
});
```

### 🔌 Flexible Storage

Optional storage helpers for common backends:

```typescript
// Option 1: Manage storage yourself
const history = await yourDatabase.getHistory(sessionId);

// Option 2: Use storage helpers
import { PrismaStorage } from '@ai-agent/storage-prisma';
const storage = new PrismaStorage(prisma);
const history = await storage.getHistory(sessionId);
```

### 🤖 Multi-LLM Support

Switch between providers seamlessly:

```typescript
// OpenAI
const agent = new Agent({
  llm: { provider: 'openai', model: 'gpt-4' }
});

// Anthropic Claude
const agent = new Agent({
  llm: { provider: 'anthropic', model: 'claude-3-opus-20240229' }
});

// Custom provider
const agent = new Agent({
  llm: { provider: 'custom', adapter: myCustomAdapter }
});
```

### 🛠️ Extensible Tools

Create custom tools with full TypeScript support:

```typescript
const weatherPlugin = {
  name: 'weather',
  description: 'Weather information plugin',
  
  async initialize() {
    // Setup code
  },
  
  tools: [{
    name: 'get_weather',
    description: 'Get current weather',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' }
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

### 📚 RAG Knowledge Base

Add documents for semantic search:

```typescript
// Add knowledge
await agent.addKnowledge(
  'Product documentation content...',
  'docs',
  'Product Guide'
);

// Agent automatically retrieves relevant context
const response = await agent.chat(
  'How do I configure the product?'
);
```

## What's Next?

<div class="vp-doc">

- **[Getting Started](/guide/getting-started)** - Install and configure the framework
- **[Stateless Architecture](/guide/stateless-architecture)** - Understand the design philosophy
- **[Storage Guide](/guide/storage)** - Learn about storage management
- **[Examples](/examples/)** - See complete working examples
- **[API Reference](/api/)** - Explore the full API

</div>

## Community

- [GitHub Discussions](https://github.com/ai-agent-framework/core/discussions) - Ask questions and share ideas
- [Issue Tracker](https://github.com/ai-agent-framework/core/issues) - Report bugs and request features
- [Contributing Guide](/guide/contributing) - Help improve the framework

## License

MIT License - see [LICENSE](https://github.com/ai-agent-framework/core/blob/main/LICENSE) for details.
