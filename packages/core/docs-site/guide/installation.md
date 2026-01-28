# Installation

This guide covers installing **@ai-agent/core** and its optional dependencies.

## Requirements

- **Node.js**: 18.0.0 or higher
- **TypeScript**: 5.0.0 or higher (recommended)
- **Package Manager**: npm, pnpm, or yarn

## Core Package

Install the main framework:

::: code-group

```bash [npm]
npm install @ai-agent/core
```

```bash [pnpm]
pnpm add @ai-agent/core
```

```bash [yarn]
yarn add @ai-agent/core
```

:::

## LLM Provider SDKs

The framework requires LLM provider SDKs as peer dependencies. Install the ones you need:

### OpenAI

```bash
npm install openai
```

### Anthropic Claude

```bash
npm install @anthropic-ai/sdk
```

### Both

```bash
npm install openai @anthropic-ai/sdk
```

## Optional Storage Helpers

If you want ready-made storage solutions:

### Prisma Storage

```bash
npm install @ai-agent/storage-prisma @prisma/client
```

### Memory Storage (Development)

```bash
npm install @ai-agent/storage-memory
```

## CLI Tool

For scaffolding new projects:

```bash
npm install -g @ai-agent/cli
```

Or use with npx:

```bash
npx @ai-agent/cli create my-agent-app
```

## TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

## Environment Variables

Create a `.env` file:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Database (if using Prisma)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
```

## Verify Installation

Create a test file `test.ts`:

```typescript
import { Agent } from '@ai-agent/core';

const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  }
});

const response = await agent.chat('Hello!');
console.log(response.content);
```

Run it:

```bash
npx tsx test.ts
```

## Next Steps

- **[Quick Start](/guide/quick-start)** - Build your first agent
- **[Configuration](/api/configuration)** - Configure the agent
- **[Examples](/examples/)** - See complete examples
