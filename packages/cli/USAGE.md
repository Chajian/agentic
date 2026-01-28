# @ai-agent/cli Usage Guide

This guide demonstrates how to use the @ai-agent/cli tool to scaffold AI Agent projects.

## Installation

### Global Installation

```bash
npm install -g @ai-agent/cli
```

After installation, you can use the `create-ai-agent` command anywhere:

```bash
create-ai-agent my-project
```

### Using npx (No Installation Required)

```bash
npx @ai-agent/cli my-project
```

## Interactive Mode

The easiest way to create a project is to run the CLI without arguments:

```bash
create-ai-agent
```

You'll be prompted to answer a few questions:

1. **Project name**: The name of your project directory
2. **Template**: Choose from:
   - Chatbot with Prisma (production-ready with database)
   - Chatbot with Memory (simple in-memory storage)
   - Q&A Bot (knowledge base with RAG)
   - Task Automation (custom tools and workflows)
3. **Storage backend**: Choose Prisma or Memory (for chatbot templates)
4. **LLM provider**: Choose OpenAI, Anthropic, or Custom

## Command Line Options

### Basic Usage

```bash
create-ai-agent [project-name] [options]
```

### Options

- `-t, --template <template>` - Specify template type
- `-s, --storage <storage>` - Specify storage backend
- `--skip-install` - Skip npm install
- `--skip-git` - Skip git initialization

### Examples

#### Create a Chatbot with Prisma

```bash
create-ai-agent my-chatbot -t chatbot-prisma -s prisma
```

This creates a production-ready chatbot with:
- Prisma ORM for database storage
- Session management
- Conversation history persistence
- Support for PostgreSQL, MySQL, or SQLite

#### Create a Q&A Bot

```bash
create-ai-agent my-qa-bot -t qa-bot
```

This creates a Q&A bot with:
- Knowledge base from markdown files
- RAG (Retrieval-Augmented Generation)
- Semantic search
- Document management

#### Create a Task Automation Agent

```bash
create-ai-agent my-automation -t task-automation
```

This creates an agent with:
- Custom tool support
- Example calculator tool
- Tool calling and execution
- Workflow automation

#### Create Without Installing Dependencies

```bash
create-ai-agent my-project --skip-install
```

Then install manually:

```bash
cd my-project
npm install
```

## After Creation

### 1. Configure Environment Variables

```bash
cd my-project
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# For OpenAI
OPENAI_API_KEY=your-key-here

# For Anthropic
ANTHROPIC_API_KEY=your-key-here

# For Prisma projects
DATABASE_URL="file:./dev.db"
```

### 2. Set Up Database (Prisma Projects Only)

```bash
npm run db:migrate
```

This creates the database schema and tables.

### 3. Run the Project

Development mode with auto-reload:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## Project Structure

### Chatbot with Prisma

```
my-chatbot/
├── src/
│   └── index.ts          # Main application
├── prisma/
│   └── schema.prisma     # Database schema
├── .env                  # Environment variables
├── .env.example          # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

### Q&A Bot

```
my-qa-bot/
├── src/
│   └── index.ts          # Main application
├── knowledge/            # Knowledge base
│   └── example.md        # Example document
├── .env
├── package.json
└── README.md
```

### Task Automation

```
my-automation/
├── src/
│   ├── index.ts          # Main application
│   └── tools/            # Custom tools
│       └── calculator.ts # Example tool
├── .env
├── package.json
└── README.md
```

## Customization

### Adding Custom Tools

Edit `src/tools/` and create new tool files:

```typescript
import type { Tool } from '@ai-agent/core';

export const myTool: Tool = {
  name: 'my-tool',
  description: 'Description of what the tool does',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description',
      },
    },
    required: ['param1'],
  },
  execute: async (params) => {
    // Tool implementation
    return { result: 'success' };
  },
};
```

### Adding Knowledge Documents

For Q&A bots, add markdown files to the `knowledge/` directory:

```markdown
# My Document

Content here will be automatically loaded into the knowledge base.
```

### Changing LLM Provider

Edit `src/index.ts` and update the agent configuration:

```typescript
const agent = new Agent({
  llm: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
  },
});
```

### Switching Storage Backend

For Prisma projects, edit `prisma/schema.prisma` to change the database:

```prisma
datasource db {
  provider = "postgresql"  // or "mysql" or "sqlite"
  url      = env("DATABASE_URL")
}
```

Then update your `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

## Troubleshooting

### Command Not Found

If `create-ai-agent` is not found after global installation:

1. Check npm global bin directory:
   ```bash
   npm config get prefix
   ```

2. Add it to your PATH if needed

3. Or use npx instead:
   ```bash
   npx @ai-agent/cli
   ```

### Permission Errors

On Unix systems, you may need to make the CLI executable:

```bash
chmod +x /path/to/create-ai-agent
```

### Database Connection Errors

For Prisma projects, ensure:

1. Database URL is correct in `.env`
2. Database server is running
3. You've run `npm run db:migrate`

## Next Steps

- Read the [API Documentation](https://github.com/ai-agent-framework/core/blob/main/docs/API.md)
- Check out [Usage Guide](https://github.com/ai-agent-framework/core/blob/main/docs/USAGE_GUIDE.md)
- Explore [Example Projects](https://github.com/ai-agent-framework/core/tree/main/examples)

## Support

- GitHub Issues: https://github.com/ai-agent-framework/cli/issues
- Documentation: https://github.com/ai-agent-framework/core
