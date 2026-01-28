# @ai-agent/cli

CLI tool for scaffolding AI Agent projects with the [@ai-agent/core](https://github.com/ai-agent-framework/core) framework.

## Installation

```bash
npm install -g @ai-agent/cli
```

Or use directly with npx:

```bash
npx @ai-agent/cli my-agent-project
```

## Usage

### Interactive Mode

Run the CLI without arguments for an interactive setup:

```bash
create-ai-agent
```

You'll be prompted to choose:
- Project name
- Template type (chatbot, Q&A bot, task automation)
- Storage backend (Prisma, in-memory)
- LLM provider (OpenAI, Anthropic, custom)

### Command Line Options

```bash
create-ai-agent [project-name] [options]
```

**Options:**

- `-t, --template <template>` - Template to use
  - `chatbot-prisma` - Chatbot with Prisma database storage
  - `chatbot-memory` - Chatbot with in-memory storage
  - `qa-bot` - Q&A bot with knowledge base
  - `task-automation` - Task automation with custom tools

- `-s, --storage <storage>` - Storage backend
  - `prisma` - Prisma ORM (PostgreSQL/MySQL/SQLite)
  - `memory` - In-memory storage (development)

- `--skip-install` - Skip npm install
- `--skip-git` - Skip git initialization

**Examples:**

```bash
# Create a chatbot with Prisma storage
create-ai-agent my-chatbot -t chatbot-prisma -s prisma

# Create a Q&A bot with in-memory storage
create-ai-agent my-qa-bot -t qa-bot -s memory

# Create a project without installing dependencies
create-ai-agent my-agent --skip-install
```

## Templates

### Chatbot with Prisma

Production-ready chatbot with database persistence using Prisma ORM.

**Features:**
- Conversation history stored in database
- Support for PostgreSQL, MySQL, or SQLite
- Session management
- Ready for production deployment

### Chatbot with Memory

Simple chatbot with in-memory storage for development and testing.

**Features:**
- Fast setup with no database required
- Perfect for development and prototyping
- Easy to understand code structure

### Q&A Bot

Knowledge base bot with RAG (Retrieval-Augmented Generation).

**Features:**
- Load documents from markdown files
- Semantic search over knowledge base
- Answer questions based on your documents
- Extensible knowledge management

### Task Automation

Agent with custom tools for task automation.

**Features:**
- Example calculator tool included
- Easy to add custom tools
- Tool calling and execution
- Workflow automation

## Project Structure

Generated projects follow this structure:

```
my-agent-project/
├── src/
│   ├── index.ts          # Main application entry
│   └── tools/            # Custom tools (task-automation)
├── prisma/               # Database schema (Prisma projects)
│   └── schema.prisma
├── knowledge/            # Knowledge base (Q&A bot)
│   └── example.md
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## After Creation

1. **Configure environment variables:**
   ```bash
   cd my-agent-project
   cp .env.example .env
   # Edit .env and add your API keys
   ```

2. **Set up database (Prisma projects only):**
   ```bash
   npm run db:migrate
   ```

3. **Run the project:**
   ```bash
   npm run dev
   ```

## Requirements

- Node.js >= 18.0.0
- npm or pnpm

## Documentation

- [AI Agent Core Documentation](https://github.com/ai-agent-framework/core)
- [API Reference](https://github.com/ai-agent-framework/core/blob/main/docs/API.md)
- [Usage Guide](https://github.com/ai-agent-framework/core/blob/main/docs/USAGE_GUIDE.md)

## License

MIT
