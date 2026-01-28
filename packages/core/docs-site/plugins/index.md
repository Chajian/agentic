# Plugin Directory

Discover plugins that extend **@ai-agent/core** with additional capabilities.

## What are Plugins?

Plugins add custom tools and functionality to your agent. They follow a standard interface:

```typescript
interface AgentPlugin {
  name: string;
  description: string;
  initialize?: (context: PluginContext) => Promise<void>;
  cleanup?: () => Promise<void>;
  tools: ToolDefinition[];
}
```

## Official Plugins

### @ai-agent/plugin-web-search

Search the web using various search engines.

```bash
npm install @ai-agent/plugin-web-search
```

```typescript
import { WebSearchPlugin } from '@ai-agent/plugin-web-search';

await agent.loadPlugin(new WebSearchPlugin({
  provider: 'google',
  apiKey: process.env.GOOGLE_API_KEY
}));
```

**Tools:**
- `web_search` - Search the web
- `get_page_content` - Fetch webpage content

### @ai-agent/plugin-database

Query databases with natural language.

```bash
npm install @ai-agent/plugin-database
```

```typescript
import { DatabasePlugin } from '@ai-agent/plugin-database';

await agent.loadPlugin(new DatabasePlugin({
  connection: databaseUrl,
  allowedTables: ['users', 'orders']
}));
```

**Tools:**
- `query_database` - Execute SQL queries
- `describe_schema` - Get table schemas

### @ai-agent/plugin-file-system

File system operations.

```bash
npm install @ai-agent/plugin-file-system
```

```typescript
import { FileSystemPlugin } from '@ai-agent/plugin-file-system';

await agent.loadPlugin(new FileSystemPlugin({
  basePath: './workspace',
  allowedExtensions: ['.txt', '.md', '.json']
}));
```

**Tools:**
- `read_file` - Read file contents
- `write_file` - Write to files
- `list_directory` - List directory contents

### @ai-agent/plugin-http

Make HTTP requests.

```bash
npm install @ai-agent/plugin-http
```

```typescript
import { HttpPlugin } from '@ai-agent/plugin-http';

await agent.loadPlugin(new HttpPlugin({
  allowedDomains: ['api.example.com']
}));
```

**Tools:**
- `http_get` - GET requests
- `http_post` - POST requests
- `http_put` - PUT requests
- `http_delete` - DELETE requests

## Community Plugins

### @community/plugin-email

Send and manage emails.

```bash
npm install @community/plugin-email
```

**Tools:**
- `send_email` - Send emails
- `read_inbox` - Read inbox
- `search_emails` - Search emails

**Author:** [Community Contributor](https://github.com/contributor)

### @community/plugin-calendar

Calendar and scheduling operations.

```bash
npm install @community/plugin-calendar
```

**Tools:**
- `create_event` - Create calendar events
- `list_events` - List upcoming events
- `update_event` - Update events

**Author:** [Community Contributor](https://github.com/contributor)

### @community/plugin-slack

Slack integration.

```bash
npm install @community/plugin-slack
```

**Tools:**
- `send_message` - Send Slack messages
- `list_channels` - List channels
- `read_messages` - Read channel messages

**Author:** [Community Contributor](https://github.com/contributor)

## Creating Your Own Plugin

### Basic Plugin Structure

```typescript
import type { AgentPlugin, ToolDefinition } from '@ai-agent/core';

export const MyPlugin: AgentPlugin = {
  name: 'my-plugin',
  description: 'My custom plugin',
  
  async initialize(context) {
    // Setup code (optional)
    console.log('Plugin initialized');
  },
  
  async cleanup() {
    // Cleanup code (optional)
    console.log('Plugin cleaned up');
  },
  
  tools: [
    {
      name: 'my_tool',
      description: 'Does something useful',
      parameters: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Input parameter'
          }
        },
        required: ['input']
      },
      execute: async ({ input }) => {
        // Your implementation
        return { result: `Processed: ${input}` };
      }
    }
  ]
};
```

### Using Your Plugin

```typescript
import { Agent } from '@ai-agent/core';
import { MyPlugin } from './my-plugin';

const agent = new Agent(config);
await agent.loadPlugin(MyPlugin);

// Agent can now use your tools
const response = await agent.chat('Use my_tool with input "hello"');
```

### Plugin Best Practices

1. **Clear Tool Names**: Use descriptive, action-oriented names
   ```typescript
   // ✅ Good
   name: 'send_email'
   name: 'query_database'
   
   // ❌ Bad
   name: 'email'
   name: 'db'
   ```

2. **Detailed Descriptions**: Help the LLM understand when to use your tool
   ```typescript
   description: 'Send an email to a recipient with subject and body. Use this when the user wants to send an email or notify someone.'
   ```

3. **Validate Parameters**: Check inputs before execution
   ```typescript
   execute: async ({ email }) => {
     if (!isValidEmail(email)) {
       throw new Error('Invalid email address');
     }
     // ...
   }
   ```

4. **Handle Errors Gracefully**: Return useful error messages
   ```typescript
   execute: async (params) => {
     try {
       return await doSomething(params);
     } catch (error) {
       return {
         error: true,
         message: `Failed to execute: ${error.message}`
       };
     }
   }
   ```

5. **Use TypeScript**: Provide type safety
   ```typescript
   interface MyToolParams {
     input: string;
     optional?: number;
   }
   
   execute: async (params: MyToolParams) => {
     // TypeScript ensures params are correct
   }
   ```

### Publishing Your Plugin

1. **Create Package**
   ```bash
   mkdir my-agent-plugin
   cd my-agent-plugin
   npm init
   ```

2. **Add Dependencies**
   ```json
   {
     "name": "@your-org/agent-plugin-name",
     "peerDependencies": {
       "@ai-agent/core": "^1.0.0"
     }
   }
   ```

3. **Write Tests**
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { MyPlugin } from './index';
   
   describe('MyPlugin', () => {
     it('should execute tool', async () => {
       const result = await MyPlugin.tools[0].execute({ input: 'test' });
       expect(result).toBeDefined();
     });
   });
   ```

4. **Publish to npm**
   ```bash
   npm publish
   ```

5. **Submit to Directory**
   - Fork the [core repository](https://github.com/ai-agent-framework/core)
   - Add your plugin to `docs/plugins/community.md`
   - Submit a pull request

## Plugin Development Guide

See the complete [Plugin Development Guide](/guide/plugin-development) for:

- Plugin architecture
- Tool parameter schemas
- Context and dependencies
- Lifecycle hooks
- Testing strategies
- Publishing checklist

## Plugin Template

Use our template to get started quickly:

```bash
npx @ai-agent/cli create-plugin my-plugin
```

This generates:
- Plugin structure
- TypeScript configuration
- Tests
- README template
- Package.json

## Need Help?

- [Plugin Development Guide](/guide/plugin-development)
- [API Reference](/api/plugins)
- [GitHub Discussions](https://github.com/ai-agent-framework/core/discussions)
- [Examples](https://github.com/ai-agent-framework/core/tree/main/examples)

## Contributing

We welcome plugin contributions! See our [Contributing Guide](/guide/contributing) for details.

## Plugin Showcase

Have a plugin you'd like to showcase? [Submit it here](https://github.com/ai-agent-framework/core/issues/new?template=plugin-submission.md)!
