# Q&A Bot Example with RAG

This example demonstrates how to build a question-answering bot using the `@ai-agent/core` package with Retrieval-Augmented Generation (RAG) and `@ai-agent/storage-memory` for conversation management.

## Features

- Knowledge base integration with RAG
- Document ingestion from multiple formats
- Semantic search over documents
- In-memory conversation history with `@ai-agent/storage-memory`
- Context-aware responses
- Session management

## Prerequisites

- Node.js 18+
- OpenAI API key (for embeddings and chat)

## Setup

### Option 1: Docker (Recommended)

The easiest way to run this example:

```bash
# From the examples directory
cd ..

# Set up environment
cp .env.docker.example .env
# Edit .env with your API keys

# Start Q&A bot
docker-compose up -d qa-bot

# View logs
docker-compose logs -f qa-bot

# Attach to interact
docker attach agent-qa-bot
```

To use custom knowledge documents:

```bash
# Mount your own knowledge directory
docker run -it --rm \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -v $(pwd)/my-knowledge:/app/knowledge \
  agent-qa-bot
```

See [DOCKER_DEPLOYMENT.md](../DOCKER_DEPLOYMENT.md) for more details.

### Option 2: Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment:
```bash
# Create a .env file
cp .env.example .env

# Edit .env and add your OpenAI API key
OPENAI_API_KEY="sk-..."
```

3. Add your knowledge documents to the `knowledge/` directory

4. Run the Q&A bot:
```bash
npm start
```

## How It Works

This example demonstrates:

1. **Knowledge ingestion**: Load documents into the agent's knowledge store
2. **Semantic search**: Agent automatically searches relevant documents
3. **RAG responses**: Agent answers questions based on your documents
4. **History management**: Uses `@ai-agent/storage-memory` for session management

### Key Code

```typescript
import { Agent } from '@ai-agent/core';
import { SessionManager } from '@ai-agent/storage-memory';

// Initialize storage
const storage = new SessionManager();

// Create session
const sessionId = storage.createSession();

// Load knowledge documents
const docs = await loadDocuments('./knowledge');
for (const doc of docs) {
  await agent.addKnowledge(doc.content, doc.category, doc.title);
}

// Add user message
storage.addUserMessage(sessionId, 'What is the refund policy?');

// Get history and ask question
const history = storage.getHistory(sessionId);
const response = await agent.chat('What is the refund policy?', {
  sessionId,
  history
});

// Save response
storage.addAssistantMessage(sessionId, response);
```

## Project Structure

```
qa-bot/
├── src/
│   ├── index.ts          # Main Q&A bot application
│   └── loader.ts         # Document loader utility
├── knowledge/            # Your knowledge documents
│   ├── policies.md
│   ├── faq.md
│   └── guides/
├── .env.example
├── package.json
└── README.md
```

## Adding Knowledge

Add markdown, text, or JSON files to the `knowledge/` directory:

```markdown
# knowledge/policies.md

## Refund Policy
We offer a 30-day money-back guarantee...

## Shipping Policy
Orders are processed within 24 hours...
```

The bot will automatically load and index these documents on startup.

## Learn More

- [Agent API Documentation](../../docs/API.md)
- [Storage Memory Documentation](../../../storage-memory/README.md)
- [Usage Guide](../../docs/USAGE_GUIDE.md)
- [RAG Best Practices](../../docs/USAGE_GUIDE.md#knowledge-base-rag)
