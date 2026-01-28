# @ai-agent/storage-memory

In-memory storage adapter for the AI Agent framework. This package provides simple, fast storage for conversation sessions and messages, suitable for development, testing, and simple applications.

## Installation

```bash
npm install @ai-agent/storage-memory
```

## Usage

### Session Management

```typescript
import { Agent } from '@ai-agent/core';
import { SessionManager } from '@ai-agent/storage-memory';

// Create agent
const agent = new Agent(config);

// Create session manager
const sessionManager = new SessionManager();

// Create a new session
const sessionId = sessionManager.createSession({
  metadata: { userId: '123' }
});

// Process a message
const userMessage = 'Hello, agent!';
sessionManager.addUserMessage(sessionId, userMessage);

const response = await agent.chat(userMessage, {
  sessionId,
  history: sessionManager.getHistory(sessionId)
});

// Store the response
sessionManager.addAssistantMessage(sessionId, response);
```

### Message Storage

```typescript
import { MessageStore } from '@ai-agent/storage-memory';

// Create message store
const messageStore = new MessageStore();

// Store messages
messageStore.storeUserMessage(sessionId, 'Hello!');
const response = await agent.chat('Hello!', { sessionId });
messageStore.storeAssistantMessage(sessionId, response);

// Query messages
const history = messageStore.getSessionHistory(sessionId);
const recentMessages = messageStore.queryMessages({
  sessionId,
  limit: 10,
  order: 'desc'
});

// Query tool calls
const toolCalls = messageStore.queryToolCalls({
  sessionId,
  toolName: 'search',
  success: true
});
```

## Features

- **Fast**: All data stored in memory for instant access
- **Simple**: No database setup required
- **Flexible**: Rich query API for messages and tool calls
- **Type-safe**: Full TypeScript support

## Limitations

- **Not persistent**: Data is lost when the process exits
- **Memory-bound**: Not suitable for large-scale applications
- **Single-process**: Cannot share data across multiple processes

For production applications, consider:
- `@ai-agent/storage-prisma` - SQL database support
- `@ai-agent/storage-mongodb` - MongoDB support
- `@ai-agent/storage-redis` - Redis support

## API Reference

### SessionManager

Manages conversation sessions with message history.

#### Methods

- `createSession(options?)` - Create a new session
- `getSession(sessionId)` - Get session by ID
- `getOrCreateSession(sessionId, options?)` - Get or create session
- `hasSession(sessionId)` - Check if session exists
- `querySessions(options?)` - Query sessions with filters
- `getHistory(sessionId)` - Get conversation history
- `addUserMessage(sessionId, content, metadata?)` - Add user message
- `addAssistantMessage(sessionId, response, metadata?)` - Add assistant message
- `addSystemMessage(sessionId, content)` - Add system message
- `closeSession(sessionId)` - Mark session as inactive
- `deleteSession(sessionId)` - Delete session
- `clearSession(sessionId)` - Clear all messages in session
- `updateMetadata(sessionId, metadata)` - Update session metadata

### MessageStore

Provides persistent storage for messages with rich query capabilities.

#### Methods

- `storeUserMessage(sessionId, content, metadata?)` - Store user message
- `storeAssistantMessage(sessionId, response, metadata?)` - Store assistant message
- `storeSystemMessage(sessionId, content)` - Store system message
- `getMessage(messageId)` - Get message by ID
- `queryMessages(options?)` - Query messages with filters
- `getSessionHistory(sessionId)` - Get conversation history
- `queryToolCalls(options?)` - Query tool calls with filters
- `getToolCallsForMessage(messageId)` - Get tool calls for a message
- `deleteMessage(messageId)` - Delete a message
- `deleteSessionMessages(sessionId)` - Delete all messages in session
- `getMessageCount(sessionId)` - Get message count for session
- `getTotalMessageCount()` - Get total message count
- `getTotalToolCallCount()` - Get total tool call count
- `clear()` - Clear all data

## License

MIT
