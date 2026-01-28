# AI Agent Framework

[![npm version](https://img.shields.io/npm/v/@ai-agent/core.svg)](https://www.npmjs.com/package/@ai-agent/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/Chajian/ai-agent-framework/workflows/CI/badge.svg)](https://github.com/Chajian/ai-agent-framework/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

An intelligent AI Agent framework with LLM support, ReAct pattern execution, RAG knowledge retrieval, and extensible tool system.

## Features

- 🤖 **Multi-LLM Support**: OpenAI, Anthropic Claude, Google Gemini
- 🔧 **Tool Calling System**: Built-in ReAct pattern for autonomous reasoning
- 📚 **RAG Knowledge Base**: Semantic search and document retrieval
- 💬 **Stateless Architecture**: Flexible conversation management
- 📝 **Audit Logging**: Complete operation tracking
- 🔌 **Plugin System**: Extensible architecture for custom tools
- ⚡ **Streaming Support**: Real-time response streaming
- 🎯 **Intent Parsing**: Intelligent request interpretation

## Installation

```bash
npm install @ai-agent/core
```

## Quick Start

```typescript
import { Agent, ToolRegistry } from '@ai-agent/core';

// Initialize agent with OpenAI
const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
  },
});

// Define a tool
agent.tools.register({
  name: 'get_weather',
  description: 'Get weather information for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string' },
    },
    required: ['location'],
  },
  execute: async (params) => {
    // Implement your tool logic
    return `Weather for ${params.location}: ...`;
  },
});

// Use the agent (stateless - pass history from your storage)
const response = await agent.chat('What is the weather in New York?', {
  history: [], // Load from your database
});
console.log(response);
```

## Configuration

### LLM Providers

#### OpenAI
```typescript
new Agent({
  llm: {
    provider: 'openai',
    apiKey: 'sk-...',
    model: 'gpt-4',
  },
});
```

#### Anthropic Claude
```typescript
new Agent({
  llm: {
    provider: 'anthropic',
    apiKey: 'sk-ant-...',
    model: 'claude-3-opus-20240229',
  },
});
```

#### Google Gemini
```typescript
new Agent({
  llm: {
    provider: 'openai', // Use OpenAI adapter for Gemini API compatibility
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-pro',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  },
});
```

### Tool Registry

```typescript
// Register a tool
agent.tools.register({
  name: 'tool_name',
  description: 'Tool description',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string' },
      param2: { type: 'number' },
    },
    required: ['param1'],
  },
  riskLevel: 'low' | 'medium' | 'high',
  execute: async (params, context) => {
    // Implementation
    return result;
  },
});

// Get registered tools
const tools = agent.tools.getAll();

// Deregister a tool
agent.tools.deregister('tool_name');
```

### Plugin System

```typescript
// Create a plugin
const myPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  tools: [/* array of tools */],
  initialize: async (context) => {
    console.log('Plugin initialized');
  },
};

// Load plugin
agent.plugins.load(myPlugin);
```

### Stateless Conversation Management

The agent is stateless - you manage conversation history externally:

```typescript
// Load history from your database
const history = await db.messages.findMany({
  where: { sessionId: 'session-123' }
});

// Pass history to agent
const response = await agent.chat(
  'How can I optimize my code?',
  {
    sessionId: 'session-123',
    history: history, // Pass loaded history
  }
);

// Save response to your database
await db.messages.create({
  data: {
    sessionId: 'session-123',
    role: 'assistant',
    content: response.content,
  }
});
```

For convenience, use optional storage helpers:

```typescript
import { MemoryStorage } from '@ai-agent/storage-memory';

const storage = new MemoryStorage();

// Save and load history
await storage.saveMessage(sessionId, message);
const history = await storage.getHistory(sessionId);
```

### RAG Knowledge Base

```typescript
import { KnowledgeStore, MarkdownLoader } from '@ai-agent/core';

// Create knowledge store
const knowledge = new KnowledgeStore();

// Load documents
const loader = new MarkdownLoader();
const docs = await loader.load('path/to/docs');
await knowledge.addDocuments(docs);

// Search knowledge
const results = await knowledge.search('query', { limit: 5 });
```

### Audit Logging

```typescript
// Audit logs are automatically recorded
const logs = await agent.audit.query({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  operation: 'chat',
});

console.log(logs);
```

## Advanced Usage

### Custom LLM Integration

```typescript
// Extend LLMProvider for custom LLM
class CustomLLM extends LLMProvider {
  async generate(messages, options) {
    // Custom implementation
  }
}

const agent = new Agent({
  llm: new CustomLLM(config),
});
```

### Streaming Responses

```typescript
const stream = await agent.chatStream('Tell me a story', {
  onChunk: (chunk) => {
    console.log('Received:', chunk);
  },
  onToolCall: (toolCall) => {
    console.log('Tool called:', toolCall.name);
  },
});
```

### Intent-Based Routing

```typescript
const intent = await agent.parseIntent('Create a new user account');
// intent.type => 'create'
// intent.entity => 'user'
// intent.confidence => 0.95
```

## Examples

### Custom Plugin Example

```typescript
import { Agent, PluginManager } from '@ai-agent/core';

const agent = new Agent(config);

// Create and load a custom plugin
const customPlugin = {
  name: 'custom-tools',
  version: '1.0.0',
  tools: [
    {
      name: 'calculate',
      description: 'Perform calculations',
      parameters: { /* ... */ },
      execute: async (params) => { /* ... */ }
    }
  ]
};

agent.plugins.load(customPlugin);
```

### Q&A Bot with Knowledge Base

```typescript
const agent = new Agent(config);

// Load knowledge
const knowledge = new KnowledgeStore();
await knowledge.addDocuments(documents);

// Answer questions
const answer = await agent.chat(
  'What are the main features?',
  { knowledge }
);
```

## API Reference

See the [Full API Documentation](./docs/api.md) for detailed information.

## Development & Release

### CI/CD Pipeline

This project uses automated CI/CD with semantic-release for versioning and publishing:

- **Automated Testing**: All PRs run comprehensive tests (unit, property-based, integration)
- **Semantic Versioning**: Version bumps based on conventional commits
- **Automated Publishing**: Releases to npm on merge to main
- **Changelog Generation**: Automatic changelog from commit messages

See [CI/CD Documentation](./.github/CICD.md) for detailed information.

### Release Process

We use [semantic-release](https://github.com/semantic-release/semantic-release) with [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature (minor version bump)
git commit -m "feat: add new feature"

# Bug fix (patch version bump)
git commit -m "fix: resolve issue"

# Breaking change (major version bump)
git commit -m "feat!: breaking change"
```

See [Release Guide](./.github/RELEASE_GUIDE.md) for complete instructions.

## Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md).

### Quick Start for Contributors

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Make your changes following conventional commits
5. Submit a pull request

All PRs must pass:
- ✅ Type checking
- ✅ Unit tests
- ✅ Property-based tests
- ✅ Build verification

## License

MIT License - see LICENSE file for details.

## Support

- 📖 [Documentation](https://ai-agent-framework.dev)
- 🐛 [Issue Tracker](https://github.com/ai-agent-framework/core/issues)
- 💬 [Discussions](https://github.com/ai-agent-framework/core/discussions)
- 🚀 [Release Guide](./.github/RELEASE_GUIDE.md)
- 🔧 [CI/CD Documentation](./.github/CICD.md)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.
