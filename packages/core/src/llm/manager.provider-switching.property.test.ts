/**
 * LLM Provider Switching Property-Based Tests
 * 
 * **Feature: agent-standalone-project, Property 6: LLM provider switching preserves behavior**
 * **Validates: Requirements 6.4**
 * 
 * Tests that switching LLM providers doesn't affect the agent's ability to process
 * messages with the same history. The agent should maintain consistent behavior
 * regardless of which provider is used.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { LLMManager } from './manager.js';
import type { LLMConfig, LLMProviderConfig, LLMTask } from '../types/config.js';
import type { ChatMessage, LLMResponse } from './adapter.js';

// Mock OpenAI SDK
const mockOpenAICreate = vi.fn();
const mockEmbeddingsCreate = vi.fn();

vi.mock('openai', () => {
  class MockOpenAI {
    chat = {
      completions: {
        create: mockOpenAICreate,
      },
    };
    embeddings = {
      create: mockEmbeddingsCreate,
    };
    
    static APIError = class APIError extends Error {
      status?: number;
      code?: string | null;
      constructor(message: string, status?: number, code?: string | null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.code = code;
      }
    };
  }
  
  return { default: MockOpenAI };
});

// Mock Anthropic SDK
const mockAnthropicCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: mockAnthropicCreate,
      stream: vi.fn(),
    };
    
    static APIError = class APIError extends Error {
      status?: number;
      constructor(message: string, status?: number) {
        super(message);
        this.name = 'APIError';
        this.status = status;
      }
    };
  }
  
  return { default: MockAnthropic };
});

/**
 * Generate a random provider type (excluding custom for simplicity)
 */
const providerArb: fc.Arbitrary<Exclude<LLMProviderConfig['provider'], 'custom'>> = fc.constantFrom(
  'openai',
  'claude',
  'qwen',
  'siliconflow',
  'mimo',
  'anyrouter'
);

/**
 * Generate a pair of different providers
 */
const differentProvidersArb: fc.Arbitrary<[Exclude<LLMProviderConfig['provider'], 'custom'>, Exclude<LLMProviderConfig['provider'], 'custom'>]> = 
  fc.tuple(providerArb, providerArb).filter(([p1, p2]) => p1 !== p2);

/**
 * Generate a random LLM task
 */
const llmTaskArb: fc.Arbitrary<LLMTask> = fc.constantFrom(
  'intent_parsing',
  'knowledge_retrieval',
  'tool_calling',
  'response_generation'
);

/**
 * Generate a random conversation history
 */
const chatMessageArb: fc.Arbitrary<ChatMessage> = fc.record({
  role: fc.constantFrom('user', 'assistant', 'system') as fc.Arbitrary<'user' | 'assistant' | 'system'>,
  content: fc.string({ minLength: 1, maxLength: 100 }),
});

const conversationHistoryArb: fc.Arbitrary<ChatMessage[]> = fc.array(chatMessageArb, { minLength: 0, maxLength: 5 });

/**
 * Generate a mock LLM response
 */
function createMockResponse(content: string): LLMResponse {
  return {
    content,
    finishReason: 'stop',
    usage: {
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    },
  };
}

describe('LLM Provider Switching Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses for OpenAI-compatible providers (openai, qwen, siliconflow, mimo, anyrouter)
    mockOpenAICreate.mockResolvedValue({
      choices: [{ 
        message: { content: 'OpenAI-compatible response', tool_calls: undefined }, 
        finish_reason: 'stop' 
      }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
    
    // Setup mock for Anthropic Claude
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Claude response' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 },
    });
  });

  /**
   * **Feature: agent-standalone-project, Property 6: LLM provider switching preserves behavior**
   * **Validates: Requirements 6.4**
   * 
   * Property: For any conversation history and task, switching the LLM provider
   * should not prevent the manager from successfully processing the request.
   * Both providers should be able to handle the same input.
   */
  it('Property 6a: Provider switching maintains request processing capability', async () => {
    await fc.assert(
      fc.asyncProperty(
        differentProvidersArb,
        llmTaskArb,
        conversationHistoryArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        async ([provider1, provider2], task, history, prompt) => {
          try {
            // Create config with first provider
            const config1: LLMConfig = {
              mode: 'single',
              default: {
                provider: provider1,
                apiKey: 'test-key-1',
                model: 'test-model-1',
              },
            };

            // Create config with second provider
            const config2: LLMConfig = {
              mode: 'single',
              default: {
                provider: provider2,
                apiKey: 'test-key-2',
                model: 'test-model-2',
              },
            };

            const manager1 = new LLMManager(config1);
            const manager2 = new LLMManager(config2);

            // Both managers should successfully process the same request
            const response1 = await manager1.generateWithTools(task, [...history, { role: 'user', content: prompt }], []);
            const response2 = await manager2.generateWithTools(task, [...history, { role: 'user', content: prompt }], []);

            // Both should return valid responses
            expect(response1).toBeDefined();
            expect(response1.content).toBeDefined();
            expect(response1.finishReason).toBeDefined();
            
            expect(response2).toBeDefined();
            expect(response2.content).toBeDefined();
            expect(response2.finishReason).toBeDefined();

            return true; // Property holds
          } catch (error) {
            // Log error for debugging but don't fail the property
            console.error('Property 6a error:', error);
            return false;
          }
        }
      ),
      { numRuns: 50 } // Reduced runs due to async operations
    );
  });

  /**
   * **Feature: agent-standalone-project, Property 6: LLM provider switching preserves behavior**
   * **Validates: Requirements 6.4**
   * 
   * Property: Switching providers mid-conversation (by creating a new manager)
   * should not affect the ability to continue the conversation with the same history.
   */
  it('Property 6b: Provider switching preserves conversation continuity', async () => {
    await fc.assert(
      fc.asyncProperty(
        differentProvidersArb,
        conversationHistoryArb,
        async ([provider1, provider2], initialHistory) => {
          try {
            // Start with first provider
            const config1: LLMConfig = {
              mode: 'single',
              default: {
                provider: provider1,
                apiKey: 'test-key-1',
                model: 'test-model-1',
              },
            };

            const manager1 = new LLMManager(config1);
            
            // Make first request
            const response1 = await manager1.generateWithTools(
              'response_generation',
              [...initialHistory, { role: 'user', content: 'First message' }],
              []
            );

            // Build history with first response
            const historyWithResponse: ChatMessage[] = [
              ...initialHistory,
              { role: 'user', content: 'First message' },
              { role: 'assistant', content: response1.content },
            ];

            // Switch to second provider
            const config2: LLMConfig = {
              mode: 'single',
              default: {
                provider: provider2,
                apiKey: 'test-key-2',
                model: 'test-model-2',
              },
            };

            const manager2 = new LLMManager(config2);

            // Continue conversation with second provider using same history
            const response2 = await manager2.generateWithTools(
              'response_generation',
              [...historyWithResponse, { role: 'user', content: 'Second message' }],
              []
            );

            // Second provider should successfully process the conversation
            expect(response2).toBeDefined();
            expect(response2.content).toBeDefined();
            expect(response2.finishReason).toBeDefined();

            return true; // Property holds
          } catch (error) {
            // Log error for debugging but don't fail the property
            console.error('Property 6b error:', error);
            return false;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * **Feature: agent-standalone-project, Property 6: LLM provider switching preserves behavior**
   * **Validates: Requirements 6.4**
   * 
   * Property: In multi-LLM mode, switching the provider for a specific task
   * should not affect other tasks' ability to process requests.
   */
  it('Property 6c: Task-specific provider switching preserves other tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        providerArb,
        differentProvidersArb,
        llmTaskArb,
        async (defaultProvider, [taskProvider1, taskProvider2], switchedTask) => {
          try {
            // Create config with first task provider
            const taskAssignment1: LLMConfig['taskAssignment'] = {};
            const taskAssignment2: LLMConfig['taskAssignment'] = {};
            
            const taskKey = switchedTask === 'intent_parsing' ? 'intentParsing' :
                           switchedTask === 'knowledge_retrieval' ? 'knowledgeRetrieval' :
                           switchedTask === 'tool_calling' ? 'toolCalling' :
                           'responseGeneration';
            
            taskAssignment1[taskKey] = {
              provider: taskProvider1,
              apiKey: 'task-key-1',
              model: 'task-model-1',
            };
            
            taskAssignment2[taskKey] = {
              provider: taskProvider2,
              apiKey: 'task-key-2',
              model: 'task-model-2',
            };

            const config1: LLMConfig = {
              mode: 'multi',
              default: {
                provider: defaultProvider,
                apiKey: 'default-key',
                model: 'default-model',
              },
              taskAssignment: taskAssignment1,
            };

            const config2: LLMConfig = {
              mode: 'multi',
              default: {
                provider: defaultProvider,
                apiKey: 'default-key',
                model: 'default-model',
              },
              taskAssignment: taskAssignment2,
            };

            const manager1 = new LLMManager(config1);
            const manager2 = new LLMManager(config2);

            // Test the switched task
            const response1 = await manager1.generateWithTools(switchedTask, 'test prompt', []);
            const response2 = await manager2.generateWithTools(switchedTask, 'test prompt', []);

            // Both should work
            expect(response1).toBeDefined();
            expect(response2).toBeDefined();

            // Test a different task (should use default provider in both)
            const otherTask: LLMTask = switchedTask === 'intent_parsing' ? 'tool_calling' : 'intent_parsing';
            const otherResponse1 = await manager1.generateWithTools(otherTask, 'test prompt', []);
            const otherResponse2 = await manager2.generateWithTools(otherTask, 'test prompt', []);

            // Other task should work the same in both managers
            expect(otherResponse1).toBeDefined();
            expect(otherResponse2).toBeDefined();

            return true; // Property holds
          } catch (error) {
            // Log error for debugging but don't fail the property
            console.error('Property 6c error:', error);
            return false;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * **Feature: agent-standalone-project, Property 6: LLM provider switching preserves behavior**
   * **Validates: Requirements 6.4**
   * 
   * Property: Adapter caching should work correctly when switching between providers.
   * The same provider configuration should return the same adapter instance.
   */
  it('Property 6d: Provider switching maintains adapter caching consistency', () => {
    fc.assert(
      fc.property(
        differentProvidersArb,
        llmTaskArb,
        ([provider1, provider2], task) => {

          const config: LLMConfig = {
            mode: 'single',
            default: {
              provider: provider1,
              apiKey: 'test-key',
              model: 'test-model',
            },
          };

          const manager = new LLMManager(config);

          // Get adapter for first provider multiple times
          const adapter1a = manager.getLLMForTask(task);
          const adapter1b = manager.getLLMForTask(task);

          // Should return same instance (cached)
          expect(adapter1a).toBe(adapter1b);
          expect(adapter1a.provider).toBe(provider1);

          // Create new manager with different provider
          const config2: LLMConfig = {
            mode: 'single',
            default: {
              provider: provider2,
              apiKey: 'test-key',
              model: 'test-model',
            },
          };

          const manager2 = new LLMManager(config2);

          // Get adapter for second provider
          const adapter2a = manager2.getLLMForTask(task);
          const adapter2b = manager2.getLLMForTask(task);

          // Should return same instance for second provider (cached)
          expect(adapter2a).toBe(adapter2b);
          expect(adapter2a.provider).toBe(provider2);

          // Adapters from different managers should be different
          expect(adapter1a).not.toBe(adapter2a);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: agent-standalone-project, Property 6: LLM provider switching preserves behavior**
   * **Validates: Requirements 6.4**
   * 
   * Property: Provider capabilities (streaming, embeddings, tool calling) should be
   * correctly reported after switching providers.
   */
  it('Property 6e: Provider switching preserves capability reporting', () => {
    fc.assert(
      fc.property(
        providerArb,
        llmTaskArb,
        (provider, task) => {
          const config: LLMConfig = {
            mode: 'single',
            default: {
              provider,
              apiKey: 'test-key',
              model: 'test-model',
            },
          };

          const manager = new LLMManager(config);

          // Check capabilities
          const supportsStreaming = manager.supportsStreaming(task);
          const supportsToolCalling = manager.supportsToolCalling(task);

          // Capabilities should be boolean
          expect(typeof supportsStreaming).toBe('boolean');
          expect(typeof supportsToolCalling).toBe('boolean');

          // Get the adapter and verify capabilities match
          const adapter = manager.getLLMForTask(task);
          expect(adapter.supportsStreaming()).toBe(supportsStreaming);
          expect(adapter.supportsToolCalling()).toBe(supportsToolCalling);
        }
      ),
      { numRuns: 100 }
    );
  });
});
