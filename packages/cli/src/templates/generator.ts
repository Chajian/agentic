import type { ProjectConfig, TemplateFile } from '../types.js';
import { generatePackageJson } from './package-json.js';
import { generateTsConfig } from './tsconfig.js';
import { generateEnvFile } from './env.js';
import { generateReadme } from './readme.js';
import { generateGitignore } from './gitignore.js';
import { generateMainFile } from './main.js';
import { generatePrismaSchema } from './prisma.js';

export function generateTemplateFiles(config: ProjectConfig): TemplateFile[] {
  const files: TemplateFile[] = [];

  // Core files
  files.push({
    path: 'package.json',
    content: generatePackageJson(config),
  });

  files.push({
    path: 'tsconfig.json',
    content: generateTsConfig(config),
  });

  files.push({
    path: '.env.example',
    content: generateEnvFile(config),
  });

  files.push({
    path: 'README.md',
    content: generateReadme(config),
  });

  files.push({
    path: '.gitignore',
    content: generateGitignore(config),
  });

  files.push({
    path: 'src/index.ts',
    content: generateMainFile(config),
  });

  // Template-specific files
  if (config.template === 'chatbot-prisma' || config.storage === 'prisma') {
    files.push({
      path: 'prisma/schema.prisma',
      content: generatePrismaSchema(config),
    });
  }

  if (config.template === 'qa-bot') {
    files.push({
      path: 'knowledge/example.md',
      content: generateExampleKnowledge(),
    });
  }

  if (config.template === 'task-automation') {
    files.push({
      path: 'src/tools/calculator.ts',
      content: generateCalculatorTool(),
    });
  }

  return files;
}

function generateExampleKnowledge(): string {
  return `# Example Knowledge Document

This is an example knowledge document for your AI agent.

## Features

The AI Agent framework provides:
- Stateless architecture for scalability
- Pluggable storage backends
- RAG (Retrieval-Augmented Generation)
- Custom tool support
- Multiple LLM providers

## Usage

Add your own markdown files to this directory, and the agent will automatically load them into the knowledge base.
`;
}

function generateCalculatorTool(): string {
  return `import type { Tool } from '@ai-agent/core';

export const calculatorTool: Tool = {
  name: 'calculator',
  description: 'Perform basic arithmetic operations',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'The arithmetic operation to perform',
      },
      a: {
        type: 'number',
        description: 'First number',
      },
      b: {
        type: 'number',
        description: 'Second number',
      },
    },
    required: ['operation', 'a', 'b'],
  },
  execute: async (params: { operation: string; a: number; b: number }) => {
    const { operation, a, b } = params;
    
    switch (operation) {
      case 'add':
        return { result: a + b };
      case 'subtract':
        return { result: a - b };
      case 'multiply':
        return { result: a * b };
      case 'divide':
        if (b === 0) {
          throw new Error('Cannot divide by zero');
        }
        return { result: a / b };
      default:
        throw new Error(\`Unknown operation: \${operation}\`);
    }
  },
};
`;
}
