# Quick Start

Get up and running with **@ai-agent/core** in 5 minutes.

## Installation

```bash
npm install @ai-agent/core openai
```

## Basic Setup

Create a file `agent.ts`:

```typescript
import { Agent } from '@ai-agent/core';

// Create agent
const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  },
  behavior: {
    systemPrompt: 'You are a helpful assistant.',
    maxIterations: 5
  }
});

// Chat with agent
const response = await agent.chat('Hello! What can you do?');
console.log(response.content);
```

Run it:

```bash
export OPENAI_API_KEY=sk-...
npx tsx agent.ts
```

## With Conversation History

```typescript
// Simulate a conversation
const history = [];

// First message
let response = await agent.chat('My name is Alice', {
  history
});
history.push(
  { role: 'user', content: 'My name is Alice', timestamp: new Date() },
  { role: 'assistant', content: response.content, timestamp: new Date() }
);

// Second message (agent remembers)
response = await agent.chat('What is my name?', {
  history
});
console.log(response.content); // "Your name is Alice"
```

## With Database Storage

Using Prisma:

```typescript
import { Agent } from '@ai-agent/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const agent = new Agent({ /* config */ });

async function chat(sessionId: string, message: string) {
  // Load history
  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' }
  });

  // Process
  const response = await agent.chat(message, {
    sessionId,
    history: messages
  });

  // Save
  await prisma.message.createMany({
    data: [
      {
        sessionId,
        role: 'user',
        content: message,
        timestamp: new Date()
      },
      {
        sessionId,
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      }
    ]
  });

  return response;
}

// Use it
const response = await chat('session-123', 'Hello!');
```

## With Knowledge Base (RAG)

```typescript
// Add knowledge documents
await agent.addKnowledge(
  `Our product supports OAuth 2.0 authentication.
   To authenticate, use the /auth/login endpoint.`,
  'documentation',
  'Authentication Guide'
);

await agent.addKnowledge(
  `Pricing: Basic plan is $10/month, Pro is $50/month.`,
  'documentation',
  'Pricing'
);

// Agent automatically retrieves relevant context
const response = await agent.chat('How do I authenticate?');
console.log(response.content);
// Uses knowledge from "Authentication Guide"
```

## With Custom Tools

```typescript
// Define a weather tool
const weatherPlugin = {
  name: 'weather',
  description: 'Weather information plugin',
  
  tools: [{
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name'
        }
      },
      required: ['location']
    },
    execute: async ({ location }) => {
      // Your implementation
      const weather = await fetchWeather(location);
      return {
        temperature: weather.temp,
        condition: weather.condition
      };
    }
  }]
};

// Load plugin
await agent.loadPlugin(weatherPlugin);

// Agent can now use the tool
const response = await agent.chat('What is the weather in London?');
// Agent calls get_weather tool automatically
```

## With Streaming Events

```typescript
const response = await agent.chat('Tell me a story', {
  onEvent: (event) => {
    switch (event.type) {
      case 'processing:start':
        console.log('🤖 Agent started thinking...');
        break;
      
      case 'tool:call':
        console.log(`🔧 Calling tool: ${event.toolName}`);
        break;
      
      case 'tool:complete':
        console.log(`✅ Tool completed: ${event.toolName}`);
        break;
      
      case 'processing:complete':
        console.log('✨ Agent finished!');
        break;
      
      case 'error':
        console.error('❌ Error:', event.error);
        break;
    }
  }
});
```

## Complete Example

Here's a complete chatbot with all features:

```typescript
import { Agent } from '@ai-agent/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create agent with configuration
const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  },
  behavior: {
    systemPrompt: 'You are a helpful assistant with access to weather information.',
    maxIterations: 5,
    requireConfirmation: false
  },
  logging: {
    level: 'info',
    enableMetrics: true
  }
});

// Add knowledge
await agent.addKnowledge(
  'Company policy: All employees get 20 days vacation per year.',
  'hr-policies',
  'Vacation Policy'
);

// Add tools
await agent.loadPlugin({
  name: 'weather',
  tools: [{
    name: 'get_weather',
    description: 'Get weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' }
      },
      required: ['location']
    },
    execute: async ({ location }) => {
      return { temp: 72, condition: 'sunny' };
    }
  }]
});

// Chat function
async function chat(sessionId: string, userMessage: string) {
  // Load history
  const history = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' },
    take: 50 // Last 50 messages
  });

  // Process with streaming
  const response = await agent.chat(userMessage, {
    sessionId,
    history,
    onEvent: (event) => {
      console.log(`[${event.type}]`, event);
    }
  });

  // Save messages
  await prisma.message.createMany({
    data: [
      {
        sessionId,
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      },
      {
        sessionId,
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      }
    ]
  });

  return response;
}

// Use it
const response = await chat('user-123', 'What is the weather in Paris?');
console.log(response.content);
```

## Next Steps

- **[Stateless Architecture](/guide/stateless-architecture)** - Understand the design
- **[Storage Management](/guide/storage)** - Learn about storage options
- **[Tool System](/guide/tools)** - Build custom tools
- **[Examples](/examples/)** - See complete examples
- **[API Reference](/api/)** - Explore the full API

## Using the CLI

Scaffold a new project quickly:

```bash
npx @ai-agent/cli create my-agent-app
```

Choose from templates:
- Chatbot with Prisma
- Q&A bot with RAG
- Task automation
- Custom storage

## Common Patterns

### REST API

```typescript
import express from 'express';

const app = express();
app.use(express.json());

app.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  const response = await chat(sessionId, message);
  res.json(response);
});

app.listen(3000);
```

### WebSocket

```typescript
import { Server } from 'socket.io';

const io = new Server(3000);

io.on('connection', (socket) => {
  socket.on('chat', async ({ sessionId, message }) => {
    const response = await chat(sessionId, message);
    socket.emit('response', response);
  });
});
```

### Serverless

```typescript
export async function handler(event) {
  const { sessionId, message } = JSON.parse(event.body);
  const response = await chat(sessionId, message);
  
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
}
```

## Troubleshooting

### API Key Issues

```typescript
// ❌ Bad
const agent = new Agent({
  llm: { provider: 'openai' } // Missing API key
});

// ✅ Good
const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY
  }
});
```

### History Not Working

```typescript
// ❌ Bad: Not passing history
const response = await agent.chat(message);

// ✅ Good: Pass history
const history = await loadHistory(sessionId);
const response = await agent.chat(message, { history });
```

### Tool Not Being Called

```typescript
// ❌ Bad: Vague description
tools: [{
  name: 'tool',
  description: 'Does stuff',
  // ...
}]

// ✅ Good: Clear description
tools: [{
  name: 'get_weather',
  description: 'Get current weather for a specific location. Use this when the user asks about weather, temperature, or conditions.',
  // ...
}]
```

## Need Help?

- [GitHub Discussions](https://github.com/ai-agent-framework/core/discussions)
- [Issue Tracker](https://github.com/ai-agent-framework/core/issues)
- [Examples](https://github.com/ai-agent-framework/core/tree/main/examples)
