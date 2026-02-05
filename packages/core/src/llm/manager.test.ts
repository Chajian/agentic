/**
 * LLM Manager Property-Based Tests
 *
 * **Feature: ai-agent, Property 5: LLM Task Routing Consistency**
 * **Validates: Requirements 2.2, 2.3**
 *
 * Tests that LLM task routing is consistent:
 * - In multi-LLM mode, tasks are routed to the configured LLM for that task type
 * - If no task-specific LLM is configured, falls back to the default LLM
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { LLMManager } from './manager.js';
import { LLMError } from './adapter.js';
import type { LLMConfig, LLMProviderConfig, LLMTask } from '../types/config.js';
import { LLM_TASKS } from '../types/config.js';

// Mock OpenAI SDK for abort tests
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

/**
 * Generate a valid LLM provider configuration
 */
const llmProviderConfigArb = (
  provider: LLMProviderConfig['provider']
): fc.Arbitrary<LLMProviderConfig> =>
  fc.record({
    provider: fc.constant(provider),
    apiKey: fc.string({ minLength: 1 }),
    model: fc.string({ minLength: 1 }),
    baseUrl: fc.option(fc.webUrl(), { nil: undefined }),
    temperature: fc.option(fc.double({ min: 0, max: 2 }), { nil: undefined }),
    maxTokens: fc.option(fc.integer({ min: 1, max: 4096 }), { nil: undefined }),
  });

/**
 * Generate a random LLM task
 */
const llmTaskArb: fc.Arbitrary<LLMTask> = fc.constantFrom(...LLM_TASKS);

/**
 * Generate a random provider type
 */
const providerArb: fc.Arbitrary<LLMProviderConfig['provider']> = fc.constantFrom(
  'openai',
  'claude',
  'qwen',
  'siliconflow'
);

describe('LLMManager Property Tests', () => {
  /**
   * **Feature: ai-agent, Property 5: LLM Task Routing Consistency**
   * **Validates: Requirements 2.2, 2.3**
   *
   * Property: In single LLM mode, all tasks should be routed to the default LLM
   */
  it('Property 5a: Single LLM mode routes all tasks to default LLM', () => {
    fc.assert(
      fc.property(providerArb, llmTaskArb, (provider, task) => {
        const defaultConfig: LLMProviderConfig = {
          provider,
          apiKey: 'test-key',
          model: 'test-model',
        };

        const config: LLMConfig = {
          mode: 'single',
          default: defaultConfig,
        };

        const manager = new LLMManager(config);
        const adapter = manager.getLLMForTask(task);

        // In single mode, all tasks should use the default adapter
        expect(adapter.provider).toBe(provider);
        expect(adapter.model).toBe('test-model');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: ai-agent, Property 5: LLM Task Routing Consistency**
   * **Validates: Requirements 2.2, 2.3**
   *
   * Property: In multi-LLM mode, tasks with specific assignments should be routed
   * to their assigned LLM
   */
  it('Property 5b: Multi LLM mode routes tasks to assigned LLMs', () => {
    fc.assert(
      fc.property(providerArb, providerArb, llmTaskArb, (defaultProvider, taskProvider, task) => {
        const defaultConfig: LLMProviderConfig = {
          provider: defaultProvider,
          apiKey: 'default-key',
          model: 'default-model',
        };

        const taskConfig: LLMProviderConfig = {
          provider: taskProvider,
          apiKey: 'task-key',
          model: 'task-model',
        };

        // Create task assignment based on the task type
        const taskAssignment: LLMConfig['taskAssignment'] = {};
        switch (task) {
          case 'intent_parsing':
            taskAssignment.intentParsing = taskConfig;
            break;
          case 'knowledge_retrieval':
            taskAssignment.knowledgeRetrieval = taskConfig;
            break;
          case 'tool_calling':
            taskAssignment.toolCalling = taskConfig;
            break;
          case 'response_generation':
            taskAssignment.responseGeneration = taskConfig;
            break;
        }

        const config: LLMConfig = {
          mode: 'multi',
          default: defaultConfig,
          taskAssignment,
        };

        const manager = new LLMManager(config);
        const adapter = manager.getLLMForTask(task);

        // Task should be routed to the task-specific LLM
        expect(adapter.provider).toBe(taskProvider);
        expect(adapter.model).toBe('task-model');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: ai-agent, Property 5: LLM Task Routing Consistency**
   * **Validates: Requirements 2.2, 2.3**
   *
   * Property: In multi-LLM mode, tasks without specific assignments should fall back
   * to the default LLM
   */
  it('Property 5c: Multi LLM mode falls back to default for unassigned tasks', () => {
    fc.assert(
      fc.property(
        providerArb,
        providerArb,
        llmTaskArb,
        llmTaskArb,
        (defaultProvider, assignedProvider, assignedTask, queryTask) => {
          // Skip if the query task is the same as the assigned task
          fc.pre(assignedTask !== queryTask);

          const defaultConfig: LLMProviderConfig = {
            provider: defaultProvider,
            apiKey: 'default-key',
            model: 'default-model',
          };

          const assignedConfig: LLMProviderConfig = {
            provider: assignedProvider,
            apiKey: 'assigned-key',
            model: 'assigned-model',
          };

          // Only assign one task
          const taskAssignment: LLMConfig['taskAssignment'] = {};
          switch (assignedTask) {
            case 'intent_parsing':
              taskAssignment.intentParsing = assignedConfig;
              break;
            case 'knowledge_retrieval':
              taskAssignment.knowledgeRetrieval = assignedConfig;
              break;
            case 'tool_calling':
              taskAssignment.toolCalling = assignedConfig;
              break;
            case 'response_generation':
              taskAssignment.responseGeneration = assignedConfig;
              break;
          }

          const config: LLMConfig = {
            mode: 'multi',
            default: defaultConfig,
            taskAssignment,
          };

          const manager = new LLMManager(config);
          const adapter = manager.getLLMForTask(queryTask);

          // Unassigned task should fall back to default
          expect(adapter.provider).toBe(defaultProvider);
          expect(adapter.model).toBe('default-model');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: ai-agent, Property 5: LLM Task Routing Consistency**
   * **Validates: Requirements 2.2, 2.3**
   *
   * Property: The same task should always return the same adapter instance
   * (adapter caching consistency)
   */
  it('Property 5d: Same task returns same adapter instance', () => {
    fc.assert(
      fc.property(providerArb, llmTaskArb, (provider, task) => {
        const config: LLMConfig = {
          mode: 'single',
          default: {
            provider,
            apiKey: 'test-key',
            model: 'test-model',
          },
        };

        const manager = new LLMManager(config);

        // Get adapter twice for the same task
        const adapter1 = manager.getLLMForTask(task);
        const adapter2 = manager.getLLMForTask(task);

        // Should return the same instance (cached)
        expect(adapter1).toBe(adapter2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: ai-agent, Property 5: LLM Task Routing Consistency**
   * **Validates: Requirements 2.2, 2.3**
   *
   * Property: Configuration retrieval should be consistent
   */
  it('Property 5e: getConfig returns consistent configuration', () => {
    fc.assert(
      fc.property(
        providerArb,
        fc.constantFrom('single', 'multi') as fc.Arbitrary<'single' | 'multi'>,
        (provider, mode) => {
          const config: LLMConfig = {
            mode,
            default: {
              provider,
              apiKey: 'test-key',
              model: 'test-model',
            },
          };

          const manager = new LLMManager(config);
          const retrievedConfig = manager.getConfig();

          // Retrieved config should match original
          expect(retrievedConfig.mode).toBe(mode);
          expect(retrievedConfig.default.provider).toBe(provider);
          expect(retrievedConfig.default.model).toBe('test-model');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * LLM Manager Abort Signal Tests
 *
 * Tests that the LLM Manager correctly passes abortSignal to adapters
 * and handles cancellation properly.
 *
 * _Requirements: 2.2, 2.3_
 */
describe('LLMManager Abort Signal Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test that abortSignal is passed to adapter in generateWithTools
   * _Requirements: 2.2_
   */
  it('should pass abortSignal to adapter in generateWithTools', async () => {
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [
        {
          message: { content: 'response', tool_calls: undefined },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });

    const config: LLMConfig = {
      mode: 'single',
      default: {
        provider: 'siliconflow',
        apiKey: 'test-key',
        model: 'test-model',
      },
    };

    const manager = new LLMManager(config);
    const controller = new AbortController();

    await manager.generateWithTools('tool_calling', 'test prompt', [], {
      abortSignal: controller.signal,
    });

    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: controller.signal })
    );
  });

  /**
   * Test that abortSignal is passed to adapter in generate
   * _Requirements: 2.2_
   */
  it('should pass abortSignal to adapter in generate', async () => {
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'response' }, finish_reason: 'stop' }],
    });

    const config: LLMConfig = {
      mode: 'single',
      default: {
        provider: 'siliconflow',
        apiKey: 'test-key',
        model: 'test-model',
      },
    };

    const manager = new LLMManager(config);
    const controller = new AbortController();

    await manager.generate('response_generation', 'test prompt', {
      abortSignal: controller.signal,
    });

    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: controller.signal })
    );
  });

  /**
   * Test that pre-aborted signal throws CANCELLED error immediately
   * _Requirements: 2.3_
   */
  it('should throw CANCELLED error immediately if signal is already aborted', async () => {
    const config: LLMConfig = {
      mode: 'single',
      default: {
        provider: 'siliconflow',
        apiKey: 'test-key',
        model: 'test-model',
      },
    };

    const manager = new LLMManager(config);
    const controller = new AbortController();
    controller.abort(); // Pre-abort

    try {
      await manager.generateWithTools('tool_calling', 'test prompt', [], {
        abortSignal: controller.signal,
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      expect((error as LLMError).code).toBe('CANCELLED');
      expect((error as LLMError).message).toBe('Operation cancelled');
    }

    // Should not have called the API
    expect(mockOpenAICreate).not.toHaveBeenCalled();
  });

  /**
   * Test that CANCELLED error is not retried
   * _Requirements: 2.3_
   */
  it('should not retry CANCELLED errors', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockOpenAICreate.mockRejectedValue(abortError);

    const config: LLMConfig = {
      mode: 'single',
      default: {
        provider: 'siliconflow',
        apiKey: 'test-key',
        model: 'test-model',
      },
      retry: {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
      },
    };

    const manager = new LLMManager(config);
    const controller = new AbortController();

    try {
      await manager.generateWithTools('tool_calling', 'test prompt', [], {
        abortSignal: controller.signal,
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      expect((error as LLMError).code).toBe('CANCELLED');
    }

    // Should only have been called once (no retries)
    expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
  });

  /**
   * Test that CANCELLED error propagates from fallback
   * _Requirements: 2.3_
   */
  it('should propagate CANCELLED error from fallback adapter', async () => {
    // First call fails with rate limit (triggers fallback)
    const rateLimitError = new LLMError('Rate limited', 'RATE_LIMIT_ERROR', 'siliconflow');
    // Fallback call fails with abort
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    mockOpenAICreate
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(abortError); // Fallback call

    const config: LLMConfig = {
      mode: 'single',
      default: {
        provider: 'siliconflow',
        apiKey: 'test-key',
        model: 'test-model',
      },
      fallback: {
        provider: 'openai',
        apiKey: 'fallback-key',
        model: 'gpt-4',
      },
      retry: {
        maxRetries: 3,
        initialDelayMs: 1,
        maxDelayMs: 10,
      },
    };

    const manager = new LLMManager(config);
    const controller = new AbortController();

    try {
      await manager.generateWithTools('tool_calling', 'test prompt', [], {
        abortSignal: controller.signal,
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      expect((error as LLMError).code).toBe('CANCELLED');
    }
  });
});
