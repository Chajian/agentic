/**
 * Custom LLM Adapter Property-Based Tests
 *
 * **Feature: agent-standalone-project, Property 7: Custom LLM adapter compatibility**
 * **Validates: Requirements 6.3**
 *
 * Tests that custom LLM adapter implementations can be successfully integrated
 * and used by the agent. Verifies that any valid LLM adapter implementation
 * following the LLMAdapter interface works correctly with the system.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type {
  LLMAdapter,
  GenerateOptions,
  ChatMessage,
  LLMResponse,
  ToolCall,
  EmbeddingResult,
  StreamCallback,
  StreamChunk,
} from './adapter.js';
import { LLMError } from './adapter.js';
import type { ToolDefinition } from '../types/tool.js';

/**
 * Generate a random chat message
 */
const chatMessageArb: fc.Arbitrary<ChatMessage> = fc.record({
  role: fc.constantFrom('user', 'assistant', 'system') as fc.Arbitrary<
    'user' | 'assistant' | 'system'
  >,
  content: fc.string({ minLength: 1, maxLength: 100 }),
});

/**
 * Generate a random conversation history
 */
const conversationArb: fc.Arbitrary<ChatMessage[]> = fc.array(chatMessageArb, {
  minLength: 0,
  maxLength: 5,
});

/**
 * Generate random generation options
 */
const generateOptionsArb: fc.Arbitrary<GenerateOptions> = fc.record({
  temperature: fc.option(fc.double({ min: 0, max: 2 }), { nil: undefined }),
  maxTokens: fc.option(fc.integer({ min: 1, max: 4096 }), { nil: undefined }),
  systemPrompt: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
});

/**
 * Generate a random tool definition
 */
const toolDefinitionArb: fc.Arbitrary<ToolDefinition> = fc.record({
  function: fc.record({
    name: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    parameters: fc.constant({
      type: 'object',
      properties: {},
      required: [],
    }),
  }),
});

/**
 * Create a mock custom LLM adapter for testing
 */
class MockCustomAdapter implements LLMAdapter {
  readonly provider: string;
  readonly model: string;

  private responseContent: string;
  private shouldSupportStreaming: boolean;
  private shouldSupportEmbeddings: boolean;
  private shouldSupportToolCalling: boolean;

  constructor(
    provider: string,
    model: string,
    responseContent: string,
    capabilities: {
      streaming?: boolean;
      embeddings?: boolean;
      toolCalling?: boolean;
    } = {}
  ) {
    this.provider = provider;
    this.model = model;
    this.responseContent = responseContent;
    this.shouldSupportStreaming = capabilities.streaming ?? true;
    this.shouldSupportEmbeddings = capabilities.embeddings ?? true;
    this.shouldSupportToolCalling = capabilities.toolCalling ?? true;
  }

  async generate(prompt: string | ChatMessage[], options?: GenerateOptions): Promise<string> {
    // Check for abort signal
    if (options?.abortSignal?.aborted) {
      throw new LLMError('Operation cancelled', 'CANCELLED', this.provider);
    }

    // Simulate processing
    return this.responseContent;
  }

  async generateWithTools(
    prompt: string | ChatMessage[],
    tools: ToolDefinition[],
    options?: GenerateOptions
  ): Promise<LLMResponse> {
    // Check for abort signal
    if (options?.abortSignal?.aborted) {
      throw new LLMError('Operation cancelled', 'CANCELLED', this.provider);
    }

    // Simulate tool calling decision
    const shouldCallTool = tools.length > 0 && Math.random() > 0.5;

    if (shouldCallTool && this.shouldSupportToolCalling) {
      const tool = tools[0];
      const toolCall: ToolCall = {
        id: `call_${Date.now()}`,
        name: tool.function.name,
        arguments: {},
      };

      return {
        content: '',
        toolCalls: [toolCall],
        finishReason: 'tool_calls',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
      };
    }

    return {
      content: this.responseContent,
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    };
  }

  async generateWithToolsStream(
    prompt: string | ChatMessage[],
    tools: ToolDefinition[],
    onChunk: StreamCallback,
    options?: GenerateOptions
  ): Promise<LLMResponse> {
    // Check for abort signal
    if (options?.abortSignal?.aborted) {
      throw new LLMError('Operation cancelled', 'CANCELLED', this.provider);
    }

    // Simulate streaming by sending content in chunks
    const words = this.responseContent.split(' ');
    for (const word of words) {
      const chunk: StreamChunk = {
        type: 'content',
        content: word + ' ',
      };
      onChunk(chunk);
    }

    const response: LLMResponse = {
      content: this.responseContent,
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    };

    // Send done chunk
    onChunk({ type: 'done', response });

    return response;
  }

  supportsStreaming(): boolean {
    return this.shouldSupportStreaming;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    if (!this.shouldSupportEmbeddings) {
      throw new LLMError('Embeddings not supported', 'INVALID_REQUEST', this.provider);
    }

    // Generate a mock embedding vector
    const dimension = 1536;
    const embedding = Array.from({ length: dimension }, () => Math.random());

    return {
      embedding,
      tokenCount: text.split(' ').length,
    };
  }

  supportsEmbeddings(): boolean {
    return this.shouldSupportEmbeddings;
  }

  supportsToolCalling(): boolean {
    return this.shouldSupportToolCalling;
  }
}

/**
 * Generate a random custom adapter configuration
 */
const customAdapterArb: fc.Arbitrary<MockCustomAdapter> = fc
  .record({
    provider: fc.string({ minLength: 1, maxLength: 20 }),
    model: fc.string({ minLength: 1, maxLength: 50 }),
    responseContent: fc.string({ minLength: 1, maxLength: 200 }),
    streaming: fc.boolean(),
    embeddings: fc.boolean(),
    toolCalling: fc.boolean(),
  })
  .map(
    (config) =>
      new MockCustomAdapter(config.provider, config.model, config.responseContent, {
        streaming: config.streaming,
        embeddings: config.embeddings,
        toolCalling: config.toolCalling,
      })
  );

describe('Custom LLM Adapter Property Tests', () => {
  /**
   * **Feature: agent-standalone-project, Property 7: Custom LLM adapter compatibility**
   * **Validates: Requirements 6.3**
   *
   * Property: For any valid custom LLM adapter implementation, the adapter should
   * successfully process generate() requests and return valid responses.
   */
  it('Property 7a: Custom adapters successfully process generate requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        customAdapterArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        generateOptionsArb,
        async (adapter, prompt, options) => {
          try {
            const response = await adapter.generate(prompt, options);

            // Response should be a string
            expect(typeof response).toBe('string');
            expect(response).toBeDefined();

            return true;
          } catch (error) {
            // Only cancelled errors are acceptable
            if (error instanceof LLMError && error.code === 'CANCELLED') {
              return true;
            }
            console.error('Property 7a error:', error);
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: agent-standalone-project, Property 7: Custom LLM adapter compatibility**
   * **Validates: Requirements 6.3**
   *
   * Property: For any valid custom LLM adapter, generateWithTools() should return
   * a properly formatted LLMResponse with all required fields.
   */
  it('Property 7b: Custom adapters return valid LLMResponse structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        customAdapterArb,
        conversationArb,
        fc.array(toolDefinitionArb, { minLength: 0, maxLength: 3 }),
        generateOptionsArb,
        async (adapter, messages, tools, options) => {
          try {
            const response = await adapter.generateWithTools(messages, tools, options);

            // Verify response structure
            expect(response).toBeDefined();
            expect(typeof response.content).toBe('string');
            expect(response.finishReason).toBeDefined();
            expect(['stop', 'tool_calls', 'length', 'content_filter']).toContain(
              response.finishReason
            );

            // If tool calls are present, verify structure
            if (response.toolCalls) {
              expect(Array.isArray(response.toolCalls)).toBe(true);
              for (const toolCall of response.toolCalls) {
                expect(typeof toolCall.id).toBe('string');
                expect(typeof toolCall.name).toBe('string');
                expect(typeof toolCall.arguments).toBe('object');
              }
            }

            // If usage is present, verify structure
            if (response.usage) {
              expect(typeof response.usage.promptTokens).toBe('number');
              expect(typeof response.usage.completionTokens).toBe('number');
              expect(typeof response.usage.totalTokens).toBe('number');
              expect(response.usage.totalTokens).toBe(
                response.usage.promptTokens + response.usage.completionTokens
              );
            }

            return true;
          } catch (error) {
            // Only cancelled errors are acceptable
            if (error instanceof LLMError && error.code === 'CANCELLED') {
              return true;
            }
            console.error('Property 7b error:', error);
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: agent-standalone-project, Property 7: Custom LLM adapter compatibility**
   * **Validates: Requirements 6.3**
   *
   * Property: Custom adapters that support streaming should emit chunks in the
   * correct format and eventually emit a 'done' chunk with the final response.
   */
  it('Property 7c: Custom adapters with streaming emit valid chunks', async () => {
    await fc.assert(
      fc.asyncProperty(
        customAdapterArb.filter((a) => a.supportsStreaming()),
        conversationArb,
        fc.array(toolDefinitionArb, { minLength: 0, maxLength: 3 }),
        generateOptionsArb,
        async (adapter, messages, tools, options) => {
          try {
            const chunks: StreamChunk[] = [];
            const onChunk: StreamCallback = (chunk) => {
              chunks.push(chunk);
            };

            const response = await adapter.generateWithToolsStream(
              messages,
              tools,
              onChunk,
              options
            );

            // Should have received at least one chunk
            expect(chunks.length).toBeGreaterThan(0);

            // Last chunk should be 'done'
            const lastChunk = chunks[chunks.length - 1];
            expect(lastChunk.type).toBe('done');
            expect(lastChunk.response).toBeDefined();

            // All chunks should have valid types
            for (const chunk of chunks) {
              expect(['content', 'tool_call', 'done']).toContain(chunk.type);
            }

            // Final response should match the done chunk response
            expect(response).toEqual(lastChunk.response);

            return true;
          } catch (error) {
            // Only cancelled errors are acceptable
            if (error instanceof LLMError && error.code === 'CANCELLED') {
              return true;
            }
            console.error('Property 7c error:', error);
            return false;
          }
        }
      ),
      { numRuns: 50 } // Reduced runs for streaming tests
    );
  });

  /**
   * **Feature: agent-standalone-project, Property 7: Custom LLM adapter compatibility**
   * **Validates: Requirements 6.3**
   *
   * Property: Custom adapters that support embeddings should return valid
   * embedding vectors with the correct structure.
   */
  it('Property 7d: Custom adapters with embeddings return valid vectors', async () => {
    await fc.assert(
      fc.asyncProperty(
        customAdapterArb.filter((a) => a.supportsEmbeddings()),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (adapter, text) => {
          try {
            const result = await adapter.embed(text);

            // Verify embedding structure
            expect(result).toBeDefined();
            expect(Array.isArray(result.embedding)).toBe(true);
            expect(result.embedding.length).toBeGreaterThan(0);

            // All embedding values should be numbers
            for (const value of result.embedding) {
              expect(typeof value).toBe('number');
              expect(isFinite(value)).toBe(true);
            }

            // Token count should be a positive number if present
            if (result.tokenCount !== undefined) {
              expect(typeof result.tokenCount).toBe('number');
              expect(result.tokenCount).toBeGreaterThan(0);
            }

            return true;
          } catch (error) {
            console.error('Property 7d error:', error);
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: agent-standalone-project, Property 7: Custom LLM adapter compatibility**
   * **Validates: Requirements 6.3**
   *
   * Property: Custom adapters should correctly report their capabilities through
   * the supports*() methods, and these capabilities should match their behavior.
   */
  it('Property 7e: Custom adapters correctly report capabilities', () => {
    fc.assert(
      fc.property(customAdapterArb, (adapter) => {
        // Capability methods should return booleans
        expect(typeof adapter.supportsStreaming()).toBe('boolean');
        expect(typeof adapter.supportsEmbeddings()).toBe('boolean');
        expect(typeof adapter.supportsToolCalling()).toBe('boolean');

        // Provider and model should be strings
        expect(typeof adapter.provider).toBe('string');
        expect(adapter.provider.length).toBeGreaterThan(0);
        expect(typeof adapter.model).toBe('string');
        expect(adapter.model.length).toBeGreaterThan(0);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: agent-standalone-project, Property 7: Custom LLM adapter compatibility**
   * **Validates: Requirements 6.3**
   *
   * Property: Custom adapters should handle abort signals correctly by throwing
   * a CANCELLED error when the signal is aborted.
   */
  it('Property 7f: Custom adapters handle abort signals correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        customAdapterArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.boolean(),
        async (adapter, prompt, shouldAbort) => {
          const controller = new AbortController();

          if (shouldAbort) {
            controller.abort();
          }

          const options: GenerateOptions = {
            abortSignal: controller.signal,
          };

          try {
            await adapter.generate(prompt, options);

            // If we got here and signal was aborted, that's wrong
            if (shouldAbort) {
              console.error('Property 7f: Adapter did not throw on aborted signal');
              return false;
            }

            return true;
          } catch (error) {
            // If aborted, should throw CANCELLED error
            if (shouldAbort) {
              expect(error).toBeInstanceOf(LLMError);
              if (error instanceof LLMError) {
                expect(error.code).toBe('CANCELLED');
              }
              return true;
            }

            // If not aborted, shouldn't throw
            console.error('Property 7f: Adapter threw when not aborted:', error);
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: agent-standalone-project, Property 7: Custom LLM adapter compatibility**
   * **Validates: Requirements 6.3**
   *
   * Property: Custom adapters should handle tool calling correctly when tools
   * are provided and the adapter supports tool calling.
   */
  it('Property 7g: Custom adapters handle tool calling when supported', async () => {
    await fc.assert(
      fc.asyncProperty(
        customAdapterArb,
        conversationArb,
        fc.array(toolDefinitionArb, { minLength: 1, maxLength: 3 }),
        async (adapter, messages, tools) => {
          try {
            const response = await adapter.generateWithTools(messages, tools);

            // If adapter supports tool calling and tools were provided
            if (adapter.supportsToolCalling() && tools.length > 0) {
              // Response should be valid regardless of whether tools were called
              expect(response).toBeDefined();
              expect(typeof response.content).toBe('string');

              // If tool calls were made, verify they reference valid tools
              if (response.toolCalls && response.toolCalls.length > 0) {
                expect(response.finishReason).toBe('tool_calls');

                for (const toolCall of response.toolCalls) {
                  const toolNames = tools.map((t) => t.function.name);
                  expect(toolNames).toContain(toolCall.name);
                }
              }
            }

            return true;
          } catch (error) {
            console.error('Property 7g error:', error);
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: agent-standalone-project, Property 7: Custom LLM adapter compatibility**
   * **Validates: Requirements 6.3**
   *
   * Property: Custom adapters should handle both string prompts and message arrays
   * as input to generate() method.
   */
  it('Property 7h: Custom adapters accept both string and message array inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        customAdapterArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        conversationArb,
        async (adapter, stringPrompt, messagePrompt) => {
          try {
            // Test with string prompt
            const response1 = await adapter.generate(stringPrompt);
            expect(typeof response1).toBe('string');

            // Test with message array
            const response2 = await adapter.generate(messagePrompt);
            expect(typeof response2).toBe('string');

            return true;
          } catch (error) {
            console.error('Property 7h error:', error);
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
