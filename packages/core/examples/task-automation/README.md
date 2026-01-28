# Task Automation Example with Custom Tools

This example demonstrates how to build a task automation agent using the `@ai-agent/core` package with custom tools.

## Features

- Custom tool registration
- Agentic loop for autonomous task execution
- File system operations
- API integrations
- Multi-step task planning and execution

## Prerequisites

- Node.js 18+
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

# Start task automation agent
docker-compose up -d task-automation

# View logs
docker-compose logs -f task-automation

# Attach to interact
docker attach agent-task-automation
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

3. Run the automation agent:
```bash
npm start
```

## How It Works

This example demonstrates:

1. **Custom Tools**: Define tools for file operations, calculations, and API calls
2. **Agentic Loop**: Agent autonomously decides which tools to use
3. **Multi-step Tasks**: Agent breaks down complex tasks into steps
4. **Tool Chaining**: Agent uses multiple tools in sequence

### Example Tools

```typescript
// File system tool
const fileTools = {
  name: 'file_operations',
  description: 'Read and write files',
  tools: [
    {
      name: 'read_file',
      description: 'Read contents of a file',
      parameters: { path: 'string' },
      execute: async ({ path }) => {
        return await fs.readFile(path, 'utf-8');
      }
    },
    {
      name: 'write_file',
      description: 'Write content to a file',
      parameters: { path: 'string', content: 'string' },
      execute: async ({ path, content }) => {
        await fs.writeFile(path, content);
        return 'File written successfully';
      }
    }
  ]
};

// Load plugin
await agent.loadPlugin(fileTools);
```

## Example Tasks

Try these commands:

- "Create a file called todo.txt with 3 tasks"
- "Read the todo.txt file and count how many tasks there are"
- "Calculate the sum of 123 and 456, then write the result to result.txt"
- "List all files in the current directory"

## Project Structure

```
task-automation/
├── src/
│   ├── index.ts          # Main automation agent
│   ├── tools/
│   │   ├── file.ts       # File system tools
│   │   ├── calc.ts       # Calculator tools
│   │   └── api.ts        # API integration tools
├── .env.example
├── package.json
└── README.md
```

## Creating Custom Tools

Tools are defined as plugins with the following structure:

```typescript
export const myPlugin: AgentPlugin = {
  name: 'my_plugin',
  description: 'Description of what this plugin does',
  
  async initialize(context: PluginContext) {
    // Setup code
  },
  
  tools: [
    {
      name: 'my_tool',
      description: 'What this tool does',
      parameters: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'First parameter' },
          param2: { type: 'number', description: 'Second parameter' }
        },
        required: ['param1']
      },
      execute: async (params) => {
        // Tool implementation
        return result;
      }
    }
  ],
  
  async cleanup() {
    // Cleanup code
  }
};
```

## Learn More

- [Agent API Documentation](../../docs/API.md)
- [Plugin Development Guide](../../docs/USAGE_GUIDE.md#plugins)
- [Tool Best Practices](../../docs/USAGE_GUIDE.md#tools)
