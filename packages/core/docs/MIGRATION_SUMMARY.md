# Migration Guide Summary

This document provides a quick overview of the migration from XianCore Agent to @ai-agent/core.

## Quick Reference

### Package Changes
- **Old**: `@xiancore/agent`
- **New**: `@ai-agent/core`
- **Adapter**: `@xiancore/agent-adapter` (temporary, for gradual migration)

### Key Architectural Change

**Stateless Agent Pattern**: The agent no longer manages storage internally. You control where and how conversation history is stored.

## Breaking Changes at a Glance

| Category | Old Behavior | New Behavior |
|----------|-------------|--------------|
| **Storage** | Agent manages internally | You manage externally |
| **History** | Loaded automatically | Pass via `options.history` |
| **Sessions** | `agent.createSession()` | Create in your database |
| **Database** | Required in config | Not in config (external) |
| **Dependencies** | Includes Prisma | No Prisma dependency |

## Migration Strategies

### Strategy 1: Adapter (Fastest)
Use `@xiancore/agent-adapter` as drop-in replacement. No code changes needed.

**Pros**: Immediate, zero code changes
**Cons**: Performance overhead, still uses old patterns

### Strategy 2: Gradual Migration (Recommended)
Use adapter for existing code, migrate new endpoints to stateless API.

**Pros**: Low risk, incremental progress
**Cons**: Temporary complexity of two approaches

### Strategy 3: Full Migration (Best Long-term)
Migrate all code to stateless API at once.

**Pros**: Clean architecture, best performance
**Cons**: More upfront work, requires testing

## Code Comparison

### Before (Old API)
```typescript
import { Agent } from '@xiancore/agent';

const agent = new Agent({
  llm: config.llm,
  database: { url: process.env.DATABASE_URL },
});

const response = await agent.chat(message, { sessionId });
```

### After (New API)
```typescript
import { Agent } from '@ai-agent/core';

const agent = new Agent({ llm: config.llm });

const history = await loadHistory(sessionId);
const response = await agent.chat(message, { sessionId, history });
await saveMessage(sessionId, 'user', message);
await saveMessage(sessionId, 'assistant', response.message);
```

### With Adapter (Temporary)
```typescript
import { LegacyAgent } from '@xiancore/agent-adapter';

const agent = new LegacyAgent({
  llm: config.llm,
  database: { url: process.env.DATABASE_URL },
});

const response = await agent.chat(message, { sessionId });
// Works exactly like before!
```

## Benefits of New Architecture

1. **Flexibility**: Use any database (PostgreSQL, MongoDB, Redis, etc.)
2. **Scalability**: Stateless agents scale horizontally
3. **Simplicity**: Agent focuses on logic, you control storage
4. **Testability**: No database required for tests
5. **Framework Agnostic**: Works with any Node.js project

## Common Patterns

### Load History
```typescript
async function loadHistory(sessionId: string) {
  const messages = await db.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
  return messages.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.createdAt,
  }));
}
```

### Save Message
```typescript
async function saveMessage(sessionId: string, role: string, content: string) {
  await db.message.create({
    data: { sessionId, role, content },
  });
}
```

### Complete Chat Flow
```typescript
async function handleChat(sessionId: string, message: string) {
  // 1. Load history
  const history = await loadHistory(sessionId);
  
  // 2. Process with agent
  const response = await agent.chat(message, { sessionId, history });
  
  // 3. Save messages
  await saveMessage(sessionId, 'user', message);
  await saveMessage(sessionId, 'assistant', response.message);
  
  return response;
}
```

## Storage Options

### Option 1: Prisma (Recommended for SQL)
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

### Option 2: MongoDB
```typescript
import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI);
```

### Option 3: Redis (for caching)
```typescript
import { createClient } from 'redis';
const redis = createClient({ url: process.env.REDIS_URL });
```

### Option 4: Storage Helper Packages
```typescript
import { MemoryStorage } from '@ai-agent/storage-memory';
import { PrismaStorage } from '@ai-agent/storage-prisma';
```

## Migration Checklist

- [ ] Install `@ai-agent/core`
- [ ] Update imports
- [ ] Remove `database` config
- [ ] Implement `loadHistory()` function
- [ ] Implement `saveMessage()` function
- [ ] Update all `chat()` calls to pass history
- [ ] Remove deprecated method calls
- [ ] Update tests
- [ ] Test thoroughly
- [ ] Deploy

## Resources

- **Full Migration Guide**: [MIGRATION.md](./MIGRATION.md)
- **API Documentation**: [API.md](./API.md)
- **Usage Guide**: [USAGE_GUIDE.md](./USAGE_GUIDE.md)
- **Storage Guide**: [STORAGE_GUIDE.md](./STORAGE_GUIDE.md)
- **Examples**: `/examples` directory
- **Adapter Package**: `@xiancore/agent-adapter`

## Support

- **Issues**: https://github.com/ai-agent-framework/core/issues
- **Discussions**: https://github.com/ai-agent-framework/core/discussions
- **Discord**: https://discord.gg/ai-agent-framework

## Timeline Recommendation

- **Week 1**: Install adapter, test with existing code
- **Week 2-3**: Migrate 1-2 endpoints to stateless API
- **Week 4-6**: Migrate remaining endpoints
- **Week 7**: Remove adapter, final testing
- **Week 8**: Deploy to production

Adjust timeline based on your codebase size and complexity.
