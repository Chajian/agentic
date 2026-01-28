/**
 * LLM Adapters Abort Signal Unit Tests
 * 
 * Tests that each adapter correctly handles AbortError and converts it to
 * LLMError with code 'CANCELLED'.
 * 
 * _Requirements: 4.1, 4.2, 4.3, 4.4_
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMError } from '../adapter.js';

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

describe('LLM Adapters Abort Signal Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SiliconFlow Adapter', () => {
    it('should convert AbortError to LLMError with CANCELLED code in generate', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockOpenAICreate.mockRejectedValueOnce(abortError);

      const { SiliconFlowAdapter } = await import('./siliconflow.js');
      const adapter = new SiliconFlowAdapter({
        apiKey: 'test-key',
        model: 'test-model',
      });

      try {
        await adapter.generate('test prompt');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('CANCELLED');
        expect((error as LLMError).provider).toBe('siliconflow');
        expect((error as LLMError).message).toBe('Operation cancelled');
      }
    });

    it('should convert AbortError to LLMError with CANCELLED code in generateWithTools', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockOpenAICreate.mockRejectedValueOnce(abortError);

      const { SiliconFlowAdapter } = await import('./siliconflow.js');
      const adapter = new SiliconFlowAdapter({
        apiKey: 'test-key',
        model: 'test-model',
      });

      const tools = [{
        type: 'function' as const,
        function: {
          name: 'test_tool',
          description: 'A test tool',
          parameters: { type: 'object', properties: {} },
        },
      }];

      try {
        await adapter.generateWithTools('test prompt', tools);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('CANCELLED');
        expect((error as LLMError).provider).toBe('siliconflow');
      }
    });

    it('should pass abortSignal to OpenAI SDK', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'response' }, finish_reason: 'stop' }],
      });

      const { SiliconFlowAdapter } = await import('./siliconflow.js');
      const adapter = new SiliconFlowAdapter({
        apiKey: 'test-key',
        model: 'test-model',
      });

      const controller = new AbortController();
      await adapter.generate('test prompt', { abortSignal: controller.signal });

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ signal: controller.signal })
      );
    });
  });

  describe('OpenAI Adapter', () => {
    it('should convert AbortError to LLMError with CANCELLED code in generate', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockOpenAICreate.mockRejectedValueOnce(abortError);

      const { OpenAIAdapter } = await import('./openai.js');
      const adapter = new OpenAIAdapter({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      try {
        await adapter.generate('test prompt');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('CANCELLED');
        expect((error as LLMError).provider).toBe('openai');
      }
    });

    it('should convert AbortError to LLMError with CANCELLED code in generateWithTools', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockOpenAICreate.mockRejectedValueOnce(abortError);

      const { OpenAIAdapter } = await import('./openai.js');
      const adapter = new OpenAIAdapter({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      const tools = [{
        type: 'function' as const,
        function: {
          name: 'test_tool',
          description: 'A test tool',
          parameters: { type: 'object', properties: {} },
        },
      }];

      try {
        await adapter.generateWithTools('test prompt', tools);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('CANCELLED');
        expect((error as LLMError).provider).toBe('openai');
      }
    });

    it('should pass abortSignal to OpenAI SDK', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'response' }, finish_reason: 'stop' }],
      });

      const { OpenAIAdapter } = await import('./openai.js');
      const adapter = new OpenAIAdapter({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      const controller = new AbortController();
      await adapter.generate('test prompt', { abortSignal: controller.signal });

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ signal: controller.signal })
      );
    });
  });

  describe('Claude Adapter', () => {
    it('should convert AbortError to LLMError with CANCELLED code in generate', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockAnthropicCreate.mockRejectedValueOnce(abortError);

      const { ClaudeAdapter } = await import('./claude.js');
      const adapter = new ClaudeAdapter({
        apiKey: 'test-key',
        model: 'claude-3-opus',
      });

      try {
        await adapter.generate('test prompt');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('CANCELLED');
        expect((error as LLMError).provider).toBe('claude');
      }
    });

    it('should convert AbortError to LLMError with CANCELLED code in generateWithTools', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockAnthropicCreate.mockRejectedValueOnce(abortError);

      const { ClaudeAdapter } = await import('./claude.js');
      const adapter = new ClaudeAdapter({
        apiKey: 'test-key',
        model: 'claude-3-opus',
      });

      const tools = [{
        type: 'function' as const,
        function: {
          name: 'test_tool',
          description: 'A test tool',
          parameters: { type: 'object', properties: {} },
        },
      }];

      try {
        await adapter.generateWithTools('test prompt', tools);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('CANCELLED');
        expect((error as LLMError).provider).toBe('claude');
      }
    });

    it('should pass abortSignal to Anthropic SDK', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const { ClaudeAdapter } = await import('./claude.js');
      const adapter = new ClaudeAdapter({
        apiKey: 'test-key',
        model: 'claude-3-opus',
      });

      const controller = new AbortController();
      await adapter.generate('test prompt', { abortSignal: controller.signal });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ signal: controller.signal })
      );
    });
  });

  describe('Qwen Adapter', () => {
    it('should convert AbortError to LLMError with CANCELLED code in generate', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockOpenAICreate.mockRejectedValueOnce(abortError);

      const { QwenAdapter } = await import('./qwen.js');
      const adapter = new QwenAdapter({
        apiKey: 'test-key',
        model: 'qwen-turbo',
      });

      try {
        await adapter.generate('test prompt');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('CANCELLED');
        expect((error as LLMError).provider).toBe('qwen');
      }
    });

    it('should convert AbortError to LLMError with CANCELLED code in generateWithTools', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockOpenAICreate.mockRejectedValueOnce(abortError);

      const { QwenAdapter } = await import('./qwen.js');
      const adapter = new QwenAdapter({
        apiKey: 'test-key',
        model: 'qwen-turbo',
      });

      const tools = [{
        type: 'function' as const,
        function: {
          name: 'test_tool',
          description: 'A test tool',
          parameters: { type: 'object', properties: {} },
        },
      }];

      try {
        await adapter.generateWithTools('test prompt', tools);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('CANCELLED');
        expect((error as LLMError).provider).toBe('qwen');
      }
    });

    it('should pass abortSignal to OpenAI SDK (Qwen uses OpenAI-compatible API)', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'response' }, finish_reason: 'stop' }],
      });

      const { QwenAdapter } = await import('./qwen.js');
      const adapter = new QwenAdapter({
        apiKey: 'test-key',
        model: 'qwen-turbo',
      });

      const controller = new AbortController();
      await adapter.generate('test prompt', { abortSignal: controller.signal });

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ signal: controller.signal })
      );
    });
  });
});
