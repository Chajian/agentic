import { Agent } from '@agenticc/core';
import { SessionManager } from '@agenticc/storage-memory';
import { loadDocuments } from './loader.js';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Initialize storage
const storage = new SessionManager();

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
  console.log('📚 Q&A Bot with RAG\n');
  console.log('This example demonstrates knowledge-based question answering:');
  console.log('- Documents are loaded into the knowledge store');
  console.log('- Agent automatically retrieves relevant context');
  console.log('- Answers are grounded in your documents\n');

  // Initialize agent
  const agent = new Agent({
    llm: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
      temperature: 0.3  // Lower temperature for factual answers
    },
    behavior: {
      systemPrompt: `You are a helpful Q&A assistant. Answer questions based on the provided knowledge base.
If you don't find relevant information in the knowledge base, say so clearly.
Always cite which document or section your answer comes from.`
    },
    knowledge: {
      enabled: true,
      maxResults: 5,
      minRelevanceScore: 0.7
    }
  });

  // Load knowledge documents
  console.log('📖 Loading knowledge base...');
  const knowledgePath = path.join(process.cwd(), 'knowledge');
  const documents = await loadDocuments(knowledgePath);

  if (documents.length === 0) {
    console.log('\n⚠️  No documents found in ./knowledge directory');
    console.log('Add some .md, .txt, or .json files to get started!\n');
  } else {
    console.log(`\n✅ Loaded ${documents.length} documents:\n`);
    
    const categoryCounts = documents.reduce((acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  📁 ${category}: ${count} document(s)`);
    });

    // Add documents to agent's knowledge store
    for (const doc of documents) {
      await agent.addKnowledge(doc.content, doc.category, doc.title);
    }
    console.log('');
  }

  // Create session for conversation
  const sessionId = storage.createSession({
    systemMessage: `You are a helpful Q&A assistant. Answer questions based on the provided knowledge base.
If you don't find relevant information in the knowledge base, say so clearly.
Always cite which document or section your answer comes from.`
  });

  console.log('Ask questions about your documents (or "exit" to quit, "clear" to reset)\n');

  // Q&A loop
  while (true) {
    const userInput = await question('Question: ');

    if (userInput.toLowerCase() === 'exit') {
      break;
    }

    if (userInput.toLowerCase() === 'clear') {
      storage.clearSession(sessionId);
      console.log('\n🔄 Conversation history cleared\n');
      continue;
    }

    if (!userInput.trim()) {
      continue;
    }

    try {
      // Add user message to history
      storage.addUserMessage(sessionId, userInput);

      // Get conversation history
      const history = storage.getHistory(sessionId);

      // Call agent with history
      const response = await agent.chat(userInput, {
        sessionId,
        history,
        onEvent: (event) => {
          if (event.type === 'processing:start') {
            process.stdout.write('Answer: ');
          } else if (event.type === 'content:delta' && event.delta) {
            process.stdout.write(event.delta);
          } else if (event.type === 'knowledge:retrieved' && event.results) {
            // Show which documents were used
            console.log(`\n📚 Retrieved ${event.results.length} relevant document(s)`);
          }
        }
      });

      console.log('\n');

      // Add assistant response to history
      storage.addAssistantMessage(sessionId, response);

    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      console.log('');
    }
  }

  rl.close();
  console.log('\n👋 Goodbye!\n');
}

main().catch(console.error);
