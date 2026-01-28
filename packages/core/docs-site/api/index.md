# API Reference

Complete API documentation for **@ai-agent/core**.

## Core Classes

### [Agent](/api/agent)

The main agent class for processing messages and managing conversations.

```typescript
import { Agent } from '@ai-agent/core';

const agent = new Agent(config);
const response = await agent.chat(message, options);
```

### [KnowledgeStore](/api/knowledge-store)

In-memory knowledge base for RAG (Retrieval-Augmented Generation).

```typescript
await agent.addKnowledge(content, category, title);
const results = await agent.searchKnowledge(query);
```

## Configuration

### [AgentConfig](/api/configuration)

Configuration options for creating an agent.

```typescript
interface AgentConfig {
  llm: LLMConfig;
  behavior?: BehaviorConfig;
  knowledge?: KnowledgeConfig;
  logging?: LoggingConfig;
}
```

## Types

### [Message Types](/api/types#messages)

Message structure for conversations.

```typescript
interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallRecord[];
}
```

### [Response Types](/api/types#responses)

Agent response structure.

```typescript
interface AgentResponse {
  content: string;
  responseType: 'text' | 'tool_call' | 'confirmation_request';
  toolCalls?: ToolCallRecord[];
  pendingConfirmation?: PendingConfirmation;
  metadata?: Record<string, unknown>;
}
```

### [Event Types](/api/types#events)

Streaming event types.

```typescript
type StreamEvent =
  | ProcessingStartEvent
  | ProcessingCompleteEvent
  | ToolCallEvent
  | ToolCompleteEvent
  | ErrorEvent;
```

## Plugins

### [Plugin Interface](/api/plugins)

Create custom plugins and tools.

```typescript
interface AgentPlugin {
  name: string;
  description: string;
  initialize?: (context: PluginContext) => Promise<void>;
  cleanup?: () => Promise<void>;
  tools: ToolDefinition[];
}
```

## LLM Adapters

### [LLM Provider Interface](/api/llm-adapters)

Create custom LLM adapters.

```typescript
interface LLMProvider {
  name: string;
  chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse>;
  streamChat?(messages: Message[], options?: ChatOptions): AsyncIterator<LLMStreamChunk>;
}
```

## Storage Helpers

### [@ai-agent/storage-prisma](/api/storage-prisma)

Prisma-based storage implementation.

```typescript
import { PrismaStorage } from '@ai-agent/storage-prisma';

const storage = new PrismaStorage(prisma);
await storage.saveMessage(sessionId, message);
const history = await storage.getHistory(sessionId);
```

### [@ai-agent/storage-memory](/api/storage-memory)

In-memory storage for development.

```typescript
import { MemoryStorage } from '@ai-agent/storage-memory';

const storage = new MemoryStorage();
await storage.saveMessage(sessionId, message);
```

## Error Types

### [Error Classes](/api/errors)

Framework error types.

```typescript
class AgentError extends Error
class LLMError extends AgentError
class ToolExecutionError extends AgentError
class PluginError extends AgentError
```

## Utilities

### [Type Guards](/api/utilities#type-guards)

Type checking utilities.

```typescript
function isToolCallResponse(response: AgentResponse): boolean
function isConfirmationRequest(response: AgentResponse): boolean
```

### [Helpers](/api/utilities#helpers)

Helper functions.

```typescript
function truncateHistory(history: Message[], maxTokens: number): Message[]
function formatToolCall(toolCall: ToolCallRecord): string
```

## Quick Links

- **[Agent Class](/api/agent)** - Main agent API
- **[Configuration](/api/configuration)** - Configuration options
- **[Types](/api/types)** - TypeScript types
- **[Plugins](/api/plugins)** - Plugin development
- **[LLM Adapters](/api/llm-adapters)** - Custom LLM providers

## Type Definitions

All types are exported from the main package:

```typescript
import type {
  Agent,
  AgentConfig,
  AgentResponse,
  Message,
  ToolDefinition,
  AgentPlugin,
  StreamEvent,
  // ... and more
} from '@ai-agent/core';
```

## Next Steps

- **[Getting Started](/guide/getting-started)** - Learn the basics
- **[Examples](/examples/)** - See complete examples
- **[GitHub](https://github.com/ai-agent-framework/core)** - View source code
