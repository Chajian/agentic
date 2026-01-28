# Chatbot Example with Prisma Storage

This example demonstrates how to build a conversational chatbot using the `@ai-agent/core` package with `@ai-agent/storage-prisma` for persistent storage.

## Features

- Stateless agent architecture
- External conversation history management with `@ai-agent/storage-prisma`
- PostgreSQL database for message persistence
- Streaming responses
- Tool calling support
- Session management

## Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key

## Setup

### Option 1: Docker (Recommended)

The easiest way to run this example:

```bash
# From the examples directory
cd ..

# Set up environment
cp .env.docker.example .env
# Edit .env with your API keys

# Start database and chatbot
docker-compose up -d postgres chatbot-prisma

# View logs
docker-compose logs -f chatbot-prisma

# Attach to interact
docker attach agent-chatbot-prisma
```

See [DOCKER_DEPLOYMENT.md](../DOCKER_DEPLOYMENT.md) for more details.

### Option 2: Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up your database:
```bash
# Create a .env file
cp .env.example .env

# Edit .env and add your database URL and OpenAI API key
DATABASE_URL="postgresql://user:password@localhost:5432/chatbot"
OPENAI_API_KEY="sk-..."

# Run migrations
npx prisma migrate dev
```

3. Run the chatbot:
```bash
npm start
```

## How It Works

This example shows the **stateless agent pattern** with the `@ai-agent/storage-prisma` helper:

1. **Agent is stateless**: The agent doesn't store conversation history internally
2. **Storage helper**: `@ai-agent/storage-prisma` provides easy database integration
3. **History management**: Load history from database, pass to agent, save responses

### Key Code

```typescript
import { Agent } from '@ai-agent/core';
import { PrismaStorage } from '@ai-agent/storage-prisma';
import { PrismaClient } from '@prisma/client';

// Initialize storage
const prisma = new PrismaClient();
const storage = new PrismaStorage(prisma);

// Create agent (stateless)
const agent = new Agent(config);

// Create session
const sessionId = await storage.createSession();

// Load history from database
const history = await storage.getHistory(sessionId);

// Save user message
await storage.saveUserMessage(sessionId, userMessage);

// Pass history to agent (stateless call)
const response = await agent.chat(userMessage, {
  sessionId,
  history
});

// Save assistant response
await storage.saveAssistantMessage(sessionId, response);
```

## Storage Helper Benefits

Using `@ai-agent/storage-prisma` provides:

- **Simple API**: Easy-to-use methods for common operations
- **Type Safety**: Full TypeScript support
- **Optimized Queries**: Efficient database operations with proper indexing
- **Tool Call Tracking**: Automatic storage of tool executions
- **Session Management**: Built-in session lifecycle management

## Project Structure

```
chatbot-prisma/
├── src/
│   └── index.ts          # Main chatbot application
├── prisma/
│   └── schema.prisma     # Database schema (from @ai-agent/storage-prisma)
├── .env.example          # Environment variables template
├── package.json
└── README.md
```

## Learn More

- [Agent API Documentation](../../docs/API.md)
- [Storage Prisma Documentation](../../../storage-prisma/README.md)
- [Usage Guide](../../docs/USAGE_GUIDE.md)
- [Migration Guide](../../docs/MIGRATION.md)
