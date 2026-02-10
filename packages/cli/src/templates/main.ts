import type { ProjectConfig } from '../types.js';

export function generateMainFile(config: ProjectConfig): string {
  const lines: string[] = ["import 'dotenv/config';", "import { Agent } from '@agenticc/core';"];

  // Import storage
  if (config.storage === 'prisma') {
    lines.push("import { PrismaClient } from '@prisma/client';");
    lines.push("import { PrismaStorage } from '@agenticc/storage-prisma';");
  } else if (config.storage === 'memory') {
    lines.push("import { MemoryStorage } from '@agenticc/storage-memory';");
  }

  // Import tools for task automation
  if (config.template === 'task-automation') {
    lines.push("import { calculatorTool } from './tools/calculator.js';");
  }

  lines.push('');
  lines.push('async function main() {');

  // Initialize storage
  if (config.storage === 'prisma') {
    lines.push('  // Initialize Prisma storage');
    lines.push('  const prisma = new PrismaClient();');
    lines.push('  const storage = new PrismaStorage(prisma);');
    lines.push('');
  } else if (config.storage === 'memory') {
    lines.push('  // Initialize in-memory storage');
    lines.push('  const storage = new MemoryStorage();');
    lines.push('');
  }

  // Initialize agent
  lines.push('  // Initialize agent');
  lines.push('  const agent = new Agent({');
  lines.push('    llm: {');

  if (config.llmProvider === 'openai') {
    lines.push("      provider: 'openai',");
    lines.push('      apiKey: process.env.OPENAI_API_KEY!,');
    lines.push("      model: process.env.OPENAI_MODEL || 'gpt-4',");
  } else if (config.llmProvider === 'anthropic') {
    lines.push("      provider: 'anthropic',");
    lines.push('      apiKey: process.env.ANTHROPIC_API_KEY!,');
    lines.push("      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',");
  } else {
    lines.push("      provider: 'custom',");
    lines.push('      apiKey: process.env.LLM_API_KEY!,');
    lines.push('      baseURL: process.env.LLM_BASE_URL,');
  }

  lines.push('    },');
  lines.push('  });');
  lines.push('');

  // Add tools for task automation
  if (config.template === 'task-automation') {
    lines.push('  // Register custom tools');
    lines.push('  await agent.loadPlugin({');
    lines.push("    name: 'calculator-plugin',");
    lines.push('    tools: [calculatorTool],');
    lines.push('    initialize: async () => {');
    lines.push("      console.log('Calculator plugin loaded');");
    lines.push('    },');
    lines.push('  });');
    lines.push('');
  }

  // Add knowledge for qa-bot
  if (config.template === 'qa-bot') {
    lines.push('  // Load knowledge base');
    lines.push("  const fs = await import('fs/promises');");
    lines.push("  const path = await import('path');");
    lines.push("  const knowledgeDir = path.join(process.cwd(), 'knowledge');");
    lines.push('  const files = await fs.readdir(knowledgeDir);');
    lines.push('  ');
    lines.push('  for (const file of files) {');
    lines.push("    if (file.endsWith('.md')) {");
    lines.push("      const content = await fs.readFile(path.join(knowledgeDir, file), 'utf-8');");
    lines.push("      await agent.addKnowledge(content, 'documentation', file);");
    lines.push('      console.log(`Loaded knowledge: ${file}`);');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
  }

  // Main conversation loop
  if (config.template === 'chatbot-prisma' || config.template === 'chatbot-memory') {
    lines.push('  // Start conversation');
    lines.push("  const sessionId = 'default-session';");
    lines.push("  console.log('AI Agent ready! Type your message (or \\'exit\\' to quit)\\n');");
    lines.push('');
    lines.push('  // Simple REPL');
    lines.push("  const readline = await import('readline');");
    lines.push('  const rl = readline.createInterface({');
    lines.push('    input: process.stdin,');
    lines.push('    output: process.stdout,');
    lines.push('  });');
    lines.push('');
    lines.push('  const askQuestion = () => {');
    lines.push("    rl.question('You: ', async (input) => {");
    lines.push('      const message = input.trim();');
    lines.push('');
    lines.push("      if (message.toLowerCase() === 'exit') {");
    lines.push('        rl.close();');
    lines.push('        process.exit(0);');
    lines.push('      }');
    lines.push('');
    lines.push('      if (!message) {');
    lines.push('        askQuestion();');
    lines.push('        return;');
    lines.push('      }');
    lines.push('');
    lines.push('      // Load conversation history');
    lines.push('      const history = await storage.getHistory(sessionId);');
    lines.push('');
    lines.push('      // Get response from agent');
    lines.push('      const response = await agent.chat(message, { sessionId, history });');
    lines.push('');
    lines.push('      console.log(`\\nAgent: ${response.content}\\n`);');
    lines.push('');
    lines.push('      // Save messages to storage');
    lines.push('      await storage.saveMessage(sessionId, {');
    lines.push('        id: crypto.randomUUID(),');
    lines.push("        role: 'user',");
    lines.push('        content: message,');
    lines.push('        timestamp: new Date(),');
    lines.push('      });');
    lines.push('');
    lines.push('      await storage.saveMessage(sessionId, {');
    lines.push('        id: crypto.randomUUID(),');
    lines.push("        role: 'assistant',");
    lines.push('        content: response.content,');
    lines.push('        timestamp: new Date(),');
    lines.push('      });');
    lines.push('');
    lines.push('      askQuestion();');
    lines.push('    });');
    lines.push('  };');
    lines.push('');
    lines.push('  askQuestion();');
  } else {
    lines.push('  // Example usage');
    lines.push("  const response = await agent.chat('Hello! What can you help me with?');");
    lines.push("  console.log('Agent:', response.content);");
  }

  lines.push('}');
  lines.push('');
  lines.push('main().catch(console.error);');

  return lines.join('\n');
}
