# AI Agent Framework

A production-ready, stateless AI agent framework for building intelligent conversational applications with LLM support, RAG, and extensible tool systems.

## 🚀 Features

- **Stateless Architecture** - Pure logic processing engine, you control the storage
- **Multi-LLM Support** - OpenAI, Anthropic Claude, custom providers
- **RAG Knowledge Base** - Semantic search with in-memory document storage
- **Extensible Tools** - Plugin system for custom capabilities
- **Streaming Events** - Real-time progress updates and metrics
- **Type-Safe** - Full TypeScript support
- **Production-Ready** - Battle-tested and well-documented

## 📦 Packages

- **[@ai-agent/core](./packages/core)** - Core agent framework
- **[@ai-agent/storage-memory](./packages/storage-memory)** - In-memory storage adapter
- **[@ai-agent/storage-prisma](./packages/storage-prisma)** - Prisma storage adapter (SQL databases)
- **[@ai-agent/cli](./packages/cli)** - CLI scaffolding tool

## 🔧 Quick Start

```bash
npm install @ai-agent/core
```

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

const response = await agent.chat('Hello!', {
  history: [], // Load from your database
  sessionId: 'user-123',
});

console.log(response.message);
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

- **Documentation**: https://ai-agent-framework.dev
- **Issues**: https://github.com/ai-agent-framework/core/issues
- **Discord**: https://discord.gg/ai-agent-framework
