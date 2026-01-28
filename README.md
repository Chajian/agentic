# Agentic

[![npm version](https://img.shields.io/npm/v/@agentic/core.svg)](https://www.npmjs.com/package/@agentic/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/Chajian/agentic/workflows/CI/badge.svg)](https://github.com/Chajian/agentic/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

> Production-ready AI agent framework with stateless architecture, multi-LLM support, and intelligent tool calling.

English | [简体中文](./README.zh-CN.md)

[Documentation](https://chajian.github.io/agentic/) | [Examples](./packages/core/examples/) | [Contributing](./CONTRIBUTING.md)

A production-ready, stateless AI agent framework for building intelligent conversational applications with LLM support, RAG, and extensible tool systems.

## 🚀 Features

- **Stateless Architecture** - Pure logic processing engine, you control the storage
- **Multi-LLM Support** - OpenAI, Anthropic Claude, custom providers
- **RAG Knowledge Base** - Semantic search with in-memory document storage
- **Extensible Tools** - Plugin system for custom capabilities
- **Streaming Events** - Real-time progress updates and metrics
- **Type-Safe** - Full TypeScript support
- **Production-Ready** - Battle-tested and well-documented

## Why Agentic?

| Feature | Agentic | LangChain | AutoGen |
|---------|-------------------|-----------|---------|
| **Stateless Architecture** | ✅ Built-in | ❌ Stateful | ❌ Stateful |
| **Multi-LLM Task Routing** | ✅ Task-level | ⚠️ Manual | ⚠️ Per-agent |
| **Horizontal Scaling** | ✅ Native | ⚠️ Complex | ⚠️ Complex |
| **Plugin System** | ✅ Namespace isolation | ✅ Rich ecosystem | ⚠️ Basic |
| **Streaming Events** | ✅ 15 event types | ✅ Basic | ⚠️ Limited |
| **Production Ready** | ✅ Yes | ⚠️ Varies | ⚠️ Research-focused |
| **TypeScript** | ✅ Full support | ⚠️ Partial | ❌ Python only |

## 📦 Packages

- **[@agentic/core](./packages/core)** - Core agent framework
- **[@agentic/storage-memory](./packages/storage-memory)** - In-memory storage adapter
- **[@agentic/storage-prisma](./packages/storage-prisma)** - Prisma storage adapter (SQL databases)
- **[@agentic/cli](./packages/cli)** - CLI scaffolding tool

## 🔧 Quick Start

### Installation

```bash
npm install @agentic/core
# or
pnpm add @agentic/core
```

### Basic Usage

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

// Load history from your database
const history = await db.getMessages(sessionId);

// Chat with stateless architecture
const response = await agent.chat('Hello!', {
  sessionId: 'user-123',
  history
});

// Save response back to database
await db.saveMessage(sessionId, response);

console.log(response.message);
```

### With Custom Tools

```typescript
const plugin = {
  name: 'weather',
  version: '1.0.0',
  tools: [{
    name: 'get_weather',
    description: 'Get current weather',
    parameters: [
      { name: 'city', type: 'string', required: true }
    ],
    execute: async ({ city }) => {
      // Your implementation
      return { temperature: 22, condition: 'sunny' };
    },
  }],
};

await agent.loadPlugin(plugin);

const response = await agent.chat('What is the weather in Tokyo?', {
  sessionId: 'user-123',
  history: []
});
```

## 📚 Documentation

- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api-reference.md)
- [Examples](./docs/examples.md)

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 💬 Support

- **Documentation**: https://chajian.github.io/agentic/
- **Issues**: https://github.com/Chajian/agentic/issues
- **Discussions**: https://github.com/Chajian/agentic/discussions
