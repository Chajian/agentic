import { Agent } from '@agenticc/core';
import { PrismaStorage } from '@agenticc/storage-prisma';
import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma and storage
const prisma = new PrismaClient();
const storage = new PrismaStorage(prisma);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (prompt: string): Promise<string> => {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
};

async function main() {
  console.log('🤖 Chatbot with Prisma Storage\n');
  console.log('This example demonstrates the stateless agent pattern:');
  console.log('- Agent processes messages without internal state');
  console.log('- History is loaded from Prisma before each request');
  console.log('- Messages are saved to database after each response\n');

  // Initialize agent (stateless - no storage configuration)
  const agent = new Agent({
    llm: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
      temperature: 0.7
    },
    behavior: {
      systemPrompt: 'You are a helpful AI assistant. Be concise and friendly.'
    }
  });

  // Create or select session
  const sessions = await storage.querySessions({ active: true, limit: 10 });
  let sessionId: string;

  if (sessions.length > 0) {
    console.log('Active sessions:');
    for (let i = 0; i < sessions.length; i++) {
      const count = await storage.getMessageCount(sessions[i].id);
      console.log(`  ${i + 1}. Session ${sessions[i].id.slice(0, 8)}... (${count} messages)`);
    }
    console.log(`  ${sessions.length + 1}. Start new session\n`);

    const choice = await question('Select session (or start new): ');
    const index = parseInt(choice) - 1;

    if (index >= 0 && index < sessions.length) {
      sessionId = sessions[index].id;
      console.log(`\n📂 Loaded session: ${sessionId.slice(0, 8)}...\n`);
    } else {
      sessionId = await storage.createSession();
      console.log(`\n✨ Created new session: ${sessionId.slice(0, 8)}...\n`);
    }
  } else {
    sessionId = await storage.createSession();
    console.log(`✨ Created new session: ${sessionId.slice(0, 8)}...\n`);
  }

  console.log('Type your messages (or "exit" to quit, "new" for new session)\n');

  // Chat loop
  while (true) {
    const userInput = await question('You: ');

    if (userInput.toLowerCase() === 'exit') {
      await storage.closeSession(sessionId);
      break;
    }

    if (userInput.toLowerCase() === 'new') {
      await storage.closeSession(sessionId);
      sessionId = await storage.createSession();
      console.log(`\n✨ Created new session: ${sessionId.slice(0, 8)}...\n`);
      continue;
    }

    if (!userInput.trim()) {
      continue;
    }

    try {
      // Load conversation history from database
      const history = await storage.getHistory(sessionId);

      // Save user message
      await storage.saveUserMessage(sessionId, userInput);

      // Call agent with history (stateless)
      const response = await agent.chat(userInput, {
        sessionId,
        history,
        onEvent: (event) => {
          if (event.type === 'processing:start') {
            process.stdout.write('Assistant: ');
          } else if (event.type === 'content:delta' && event.delta) {
            process.stdout.write(event.delta);
          }
        }
      });

      console.log('\n');

      // Save assistant response
      await storage.saveAssistantMessage(sessionId, response);

    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      console.log('');
    }
  }

  // Cleanup
  await storage.disconnect();
  rl.close();
  console.log('\n👋 Goodbye!\n');
}

main().catch(console.error);
