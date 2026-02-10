import { Agent, type Message } from '@agenticc/core';
import { filePlugin } from './tools/file.js';
import { calcPlugin } from './tools/calc.js';
import { apiPlugin } from './tools/api.js';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt: string): Promise<string> => {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
};

async function main() {
  console.log('🤖 Task Automation Agent\n');
  console.log('This example demonstrates autonomous task execution:');
  console.log('- Agent has access to file, calculator, and API tools');
  console.log('- Agent autonomously decides which tools to use');
  console.log('- Agent can chain multiple tools to complete complex tasks\n');

  // Initialize agent with agentic loop enabled
  const agent = new Agent({
    llm: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
      temperature: 0.2  // Lower temperature for more deterministic tool use
    },
    behavior: {
      systemPrompt: `You are a helpful task automation assistant with access to file operations, calculations, and API tools.
When given a task, break it down into steps and use the available tools to complete it.
Always confirm what you've done and provide clear results.`,
      maxIterations: 10,  // Allow multiple tool calls
      requireConfirmation: false  // Auto-execute tools
    }
  });

  // Load plugins
  console.log('🔧 Loading tools...');
  await agent.loadPlugin(filePlugin);
  await agent.loadPlugin(calcPlugin);
  await agent.loadPlugin(apiPlugin);
  console.log('✅ Loaded 3 plugins with 10 tools\n');

  // Show available tools
  console.log('Available tools:');
  console.log('  📁 File: read_file, write_file, list_files, delete_file');
  console.log('  🔢 Calculator: calculate, sum, average');
  console.log('  🌐 API: http_get, http_post, get_current_time\n');

  console.log('Example tasks:');
  console.log('  - "Create a file called notes.txt with 5 bullet points about AI"');
  console.log('  - "Calculate 15% of 250 and write the result to result.txt"');
  console.log('  - "List all files in the workspace"');
  console.log('  - "Get the current time and save it to timestamp.txt"\n');

  // In-memory conversation history
  const history: Message[] = [];

  console.log('Enter a task (or "exit" to quit, "clear" to reset)\n');

  // Task loop
  while (true) {
    const userInput = await question('Task: ');

    if (userInput.toLowerCase() === 'exit') {
      break;
    }

    if (userInput.toLowerCase() === 'clear') {
      history.length = 0;
      console.log('\n🔄 Conversation history cleared\n');
      continue;
    }

    if (!userInput.trim()) {
      continue;
    }

    try {
      console.log('\n🔄 Processing...\n');

      // Call agent with history
      const response = await agent.chat(userInput, {
        history,
        onEvent: (event) => {
          if (event.type === 'tool:call') {
            console.log(`🔧 Using tool: ${event.toolName}`);
            if (event.arguments) {
              console.log(`   Parameters:`, JSON.stringify(event.arguments, null, 2));
            }
          } else if (event.type === 'tool:complete') {
            console.log(`✅ Tool completed`);
            if (event.result) {
              console.log(`   Result:`, JSON.stringify(event.result, null, 2));
            }
            console.log('');
          } else if (event.type === 'tool:error') {
            console.log(`❌ Tool error: ${event.error}`);
            console.log('');
          } else if (event.type === 'content:delta' && event.delta) {
            process.stdout.write(event.delta);
          }
        }
      });

      console.log('\n');

      // Update history
      history.push({
        id: `user-${Date.now()}`,
        role: 'user',
        content: userInput,
        timestamp: new Date()
      });

      history.push({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        toolCalls: response.toolCalls
      });

    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      console.log('');
    }
  }

  rl.close();
  console.log('\n👋 Goodbye!\n');
}

main().catch(console.error);
