# Examples

Complete working examples demonstrating different use cases and patterns with **@ai-agent/core**.

## Quick Examples

### Basic Chat

```typescript
import { Agent } from '@ai-agent/core';

const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  }
});

const response = await agent.chat('Hello!', {
  history: []
});

console.log(response.content);
```

### With History

```typescript
const history = [
  { role: 'user', content: 'My name is Alice', timestamp: new Date() },
  { role: 'assistant', content: 'Nice to meet you, Alice!', timestamp: new Date() }
];

const response = await agent.chat('What is my name?', {
  history
});

console.log(response.content); // "Your name is Alice"
```

### With Streaming

```typescript
const response = await agent.chat('Tell me a story', {
  onEvent: (event) => {
    if (event.type === 'processing:start') {
      console.log('Agent started processing...');
    }
    if (event.type === 'tool:call') {
      console.log(`Calling tool: ${event.toolName}`);
    }
    if (event.type === 'processing:complete') {
      console.log('Agent finished!');
    }
  }
});
```

## Complete Examples

### [Chatbot with Prisma Storage](/examples/chatbot-prisma)

A complete chatbot implementation using Prisma for conversation persistence.

**Features:**
- Prisma database integration
- Session management
- Message history
- RESTful API

[View Example →](/examples/chatbot-prisma)

### [Q&A Bot with RAG](/examples/qa-bot)

A question-answering bot that uses RAG to answer questions from a knowledge base.

**Features:**
- Document ingestion
- Semantic search
- Knowledge base management
- Context-aware responses

[View Example →](/examples/qa-bot)

### [Task Automation Agent](/examples/task-automation)

An agent that automates tasks using custom tools.

**Features:**
- Custom tool plugins
- File operations
- API integrations
- Calculator tools

[View Example →](/examples/task-automation)

### [Custom Storage Implementation](/examples/custom-storage)

Build your own storage adapter for any database.

**Features:**
- Custom storage interface
- MongoDB example
- Redis example
- In-memory example

[View Example →](/examples/custom-storage)

### [Custom Tools and Plugins](/examples/custom-tools)

Create custom tools and plugins for domain-specific functionality.

**Features:**
- Tool definition
- Parameter validation
- Error handling
- Plugin lifecycle

[View Example →](/examples/custom-tools)

## Example Projects Repository

All examples are available in the [examples directory](https://github.com/ai-agent-framework/core/tree/main/examples) of the repository.

Each example includes:
- ✅ Complete source code
- ✅ README with setup instructions
- ✅ Docker configuration
- ✅ Environment variable templates
- ✅ TypeScript configuration

## Running Examples Locally

### Clone the Repository

```bash
git clone https://github.com/ai-agent-framework/core.git
cd core/examples
```

### Choose an Example

```bash
cd chatbot-prisma
```

### Install Dependencies

```bash
npm install
```

### Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### Run the Example

```bash
npm run dev
```

## Docker Examples

All examples include Docker support:

```bash
cd examples
docker-compose up
```

This starts:
- The example application
- PostgreSQL database (if needed)
- Redis cache (if needed)

See [Docker Deployment Guide](/examples/docker) for details.

## Example Use Cases

### Customer Support Bot

```typescript
const supportAgent = new Agent({
  llm: { provider: 'openai', model: 'gpt-4' },
  behavior: {
    systemPrompt: `You are a helpful customer support agent.
    Be polite, professional, and solve customer issues efficiently.`
  }
});

// Load customer history and context
const history = await loadCustomerHistory(customerId);
const response = await supportAgent.chat(customerMessage, { history });
```

### Code Assistant

```typescript
const codeAgent = new Agent({
  llm: { provider: 'anthropic', model: 'claude-3-opus-20240229' },
  behavior: {
    systemPrompt: `You are an expert programmer.
    Help users write, debug, and optimize code.`
  }
});

// Add code documentation as knowledge
await codeAgent.addKnowledge(apiDocs, 'documentation');

const response = await codeAgent.chat('How do I use the API?');
```

### Data Analysis Agent

```typescript
const dataAgent = new Agent({
  llm: { provider: 'openai', model: 'gpt-4' }
});

// Add data analysis tools
await dataAgent.loadPlugin({
  name: 'data-tools',
  tools: [
    {
      name: 'query_database',
      description: 'Query the database',
      execute: async ({ query }) => {
        return await db.query(query);
      }
    },
    {
      name: 'generate_chart',
      description: 'Generate a chart from data',
      execute: async ({ data, type }) => {
        return await chartGenerator.create(data, type);
      }
    }
  ]
});

const response = await dataAgent.chat('Show me sales trends for Q4');
```

## Testing Examples

All examples include tests:

```bash
npm test
```

See [Testing Guide](/guide/testing) for writing tests for your agents.

## Contributing Examples

Have a great example? We'd love to include it!

1. Fork the repository
2. Create your example in `examples/your-example`
3. Include README, tests, and Docker support
4. Submit a pull request

See [Contributing Guide](/guide/contributing) for details.

## Next Steps

- **[Getting Started](/guide/getting-started)** - Learn the basics
- **[API Reference](/api/)** - Explore the API
- **[Plugin Directory](/plugins/)** - Find plugins
- **[GitHub Examples](https://github.com/ai-agent-framework/core/tree/main/examples)** - Browse all examples
