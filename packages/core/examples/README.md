# @ai-agent/core Examples

This directory contains example projects demonstrating different use cases for the `@ai-agent/core` package.

## Storage Helpers

The examples use optional storage helper packages to simplify conversation management:

- **[@ai-agent/storage-memory](../../storage-memory/)** - In-memory storage for development and testing
- **[@ai-agent/storage-prisma](../../storage-prisma/)** - Production-ready SQL database storage

You can also implement your own storage solution by managing conversation history directly.

## Examples

### 1. [Chatbot with Prisma Storage](./chatbot-prisma/)

A conversational chatbot that demonstrates the **stateless agent pattern** with external storage management using Prisma and PostgreSQL.

**Key Concepts:**
- Stateless agent architecture
- External conversation history management
- Database persistence with Prisma (using `@ai-agent/storage-prisma`)
- Session management
- Streaming responses

**Best For:** Production chatbots, customer support bots, conversational AI applications

---

### 2. [Q&A Bot with RAG](./qa-bot/)

A question-answering bot that uses Retrieval-Augmented Generation (RAG) to answer questions based on your documents.

**Key Concepts:**
- Knowledge base integration
- Document ingestion and indexing
- Semantic search
- Context-aware responses
- In-memory history management (using `@ai-agent/storage-memory`)

**Best For:** Documentation bots, FAQ systems, knowledge base assistants

---

### 3. [Task Automation](./task-automation/)

An autonomous agent that can execute multi-step tasks using custom tools for file operations, calculations, and API calls.

**Key Concepts:**
- Custom tool development
- Plugin system
- Agentic loop (autonomous decision-making)
- Tool chaining
- Multi-step task execution

**Best For:** Automation workflows, data processing, API integrations, file management

---

## Getting Started

### Option 1: Docker (Recommended)

The easiest way to run the examples is using Docker:

```bash
# Set up environment variables
cp .env.docker.example .env
# Edit .env with your API keys

# Start all examples with dependencies
docker-compose up -d

# View logs
docker-compose logs -f

# Attach to a specific example
docker attach agent-chatbot-prisma
```

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for detailed Docker deployment instructions.

### Option 2: Local Development

Each example is a standalone project with its own dependencies and setup instructions. To run an example:

1. Navigate to the example directory:
```bash
cd chatbot-prisma  # or qa-bot, or task-automation
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Follow the example-specific setup in its README

5. Run the example:
```bash
npm start
```

## Architecture Overview

All examples follow the **stateless agent pattern**:

```
┌─────────────────────────────────────────┐
│         @ai-agent/core                   │
│       (Stateless Agent)                  │
│                                          │
│  - Processes messages                    │
│  - Executes tools                        │
│  - Generates responses                   │
│  - NO internal state                     │
└─────────────────────────────────────────┘
                  ▲
                  │ chat(message, { history })
                  │
┌─────────────────────────────────────────┐
│      Your Application                    │
│                                          │
│  - Manages conversation history          │
│  - Handles storage (DB, memory, etc.)    │
│  - Controls session lifecycle            │
└─────────────────────────────────────────┘
```

### Why Stateless?

The stateless design provides:

- **Flexibility**: Choose your own storage solution
- **Scalability**: Horizontally scale agents without state synchronization
- **Simplicity**: Clear separation between logic and storage
- **Testability**: Easy to test without database dependencies

## Common Patterns

### 1. Loading History

```typescript
// Load from database
const history = await db.getMessages(sessionId);

// Pass to agent
const response = await agent.chat(message, { history });
```

### 2. Saving Messages

```typescript
// Save user message
await db.saveMessage(sessionId, 'user', message);

// Save assistant response
await db.saveMessage(sessionId, 'assistant', response.content);
```

### 3. Streaming Responses

```typescript
const response = await agent.chat(message, {
  history,
  onEvent: (event) => {
    if (event.type === 'content:delta') {
      process.stdout.write(event.delta);
    }
  }
});
```

### 4. Custom Tools

```typescript
const myPlugin: AgentPlugin = {
  name: 'my_plugin',
  tools: [{
    name: 'my_tool',
    description: 'What this tool does',
    parameters: { /* JSON Schema */ },
    execute: async (params) => {
      // Tool implementation
      return result;
    }
  }]
};

await agent.loadPlugin(myPlugin);
```

## Learn More

- [API Documentation](../docs/API.md)
- [Usage Guide](../docs/USAGE_GUIDE.md)
- [Migration Guide](../docs/MIGRATION.md)

## Need Help?

- Check the [Usage Guide](../docs/USAGE_GUIDE.md) for detailed documentation
- Review the [API Reference](../docs/API.md) for all available options
- Open an issue on GitHub for bugs or feature requests

## Contributing

Have an example you'd like to add? Contributions are welcome! Please:

1. Follow the existing example structure
2. Include a comprehensive README
3. Add setup instructions and prerequisites
4. Provide clear code comments
5. Test your example thoroughly
