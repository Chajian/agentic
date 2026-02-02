/**
 * Agentic Loop 边界条件测试
 *
 * 测试极端情况和边界条件，确保系统的健壮性
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgenticLoop } from './agentic-loop.js';
import { PluginManager } from './plugin-manager.js';
import {
  createMockLLMManager,
  createMockPluginContext,
  createMockToolContext,
  createMockTool,
  createMockPlugin,
  createInfiniteToolCallResponses,
  getPropertyRuns,
} from '../test-utils/index.js';
import * as fc from 'fast-check';
import { arbPositiveInt, arbNonEmptyString } from '../test-utils/index.js';

describe('AgenticLoop Boundary Tests', () => {
  let pluginManager: PluginManager;

  beforeEach(() => {
    pluginManager = new PluginManager();
    pluginManager.setContext(createMockPluginContext());
  });

  describe('maxIterations boundary cases', () => {
    it('should handle maxIterations = 1 correctly', async () => {
      const llm = createMockLLMManager([{ content: 'response' }]);

      const loop = new AgenticLoop(llm as any, pluginManager, { maxIterations: 1 });
      const result = await loop.run('test', createMockToolContext());

      expect(result.iterations).toBeLessThanOrEqual(1);
      expect(result.status).toBe('completed');
    });

    it('should hit max_iterations when tool calls exceed limit', async () => {
      const tool = createMockTool('test_tool');
      const plugin = createMockPlugin('test', [tool]);
      await pluginManager.load(plugin);

      const llm = createMockLLMManager(createInfiniteToolCallResponses('test_tool'));

      const loop = new AgenticLoop(llm as any, pluginManager, { maxIterations: 3 });
      const result = await loop.run('test', createMockToolContext());

      expect(result.status).toBe('max_iterations');
      expect(result.iterations).toBe(3);
    });

    it('should handle very large maxIterations without issues', async () => {
      const llm = createMockLLMManager([{ content: 'done' }]);

      const loop = new AgenticLoop(llm as any, pluginManager, { maxIterations: 10000 });
      const result = await loop.run('test', createMockToolContext());

      // Should complete normally without hitting the limit
      expect(result.status).toBe('completed');
      expect(result.iterations).toBe(1);
    });

    it('Property: iterations never exceed maxIterations for any input', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbPositiveInt(20),
          arbNonEmptyString(100),
          async (maxIterations, userMessage) => {
            const testPluginManager = new PluginManager();
            testPluginManager.setContext(createMockPluginContext());

            const tool = createMockTool('test_tool');
            const plugin = createMockPlugin('test', [tool]);
            await testPluginManager.load(plugin);

            // Always call tools to test the limit
            const llm = createMockLLMManager(
              createInfiniteToolCallResponses('test_tool', 100)
            );

            const loop = new AgenticLoop(llm as any, testPluginManager, { maxIterations });
            const result = await loop.run(userMessage, createMockToolContext());

            // Core property: iterations should never exceed maxIterations
            expect(result.iterations).toBeLessThanOrEqual(maxIterations);

            // If we have infinite tool calls, we should hit the limit
            expect(result.status).toBe('max_iterations');
          }
        ),
        { numRuns: getPropertyRuns('FAST') }
      );
    });
  });

  describe('Empty and whitespace input handling', () => {
    it('should handle empty user message', async () => {
      const llm = createMockLLMManager([{ content: 'response' }]);
      const loop = new AgenticLoop(llm as any, pluginManager);

      const result = await loop.run('', createMockToolContext());

      expect(result.status).toBe('completed');
    });

    it('should handle whitespace-only user message', async () => {
      const llm = createMockLLMManager([{ content: 'response' }]);
      const loop = new AgenticLoop(llm as any, pluginManager);

      const result = await loop.run('   \n\t  ', createMockToolContext());

      expect(result.status).toBe('completed');
    });

    it('should handle very long user message', async () => {
      const llm = createMockLLMManager([{ content: 'response' }]);
      const loop = new AgenticLoop(llm as any, pluginManager);

      const longMessage = 'a'.repeat(10000);
      const result = await loop.run(longMessage, createMockToolContext());

      expect(result.status).toBe('completed');
    });

    it('should handle unicode characters in message', async () => {
      const llm = createMockLLMManager([{ content: '回复' }]);
      const loop = new AgenticLoop(llm as any, pluginManager);

      const result = await loop.run('你好世界 🌍 مرحبا', createMockToolContext());

      expect(result.status).toBe('completed');
    });
  });

  describe('LLM response edge cases', () => {
    it('should handle empty LLM response content', async () => {
      const llm = createMockLLMManager([{ content: '' }]);
      const loop = new AgenticLoop(llm as any, pluginManager);

      const result = await loop.run('test', createMockToolContext());

      expect(result.status).toBe('completed');
      expect(result.content).toBe('');
    });

    it('should handle undefined toolCalls', async () => {
      const llm = createMockLLMManager([{ content: 'response', toolCalls: undefined }]);
      const loop = new AgenticLoop(llm as any, pluginManager);

      const result = await loop.run('test', createMockToolContext());

      expect(result.status).toBe('completed');
      expect(result.toolCalls).toHaveLength(0);
    });

    it('should handle empty toolCalls array', async () => {
      const llm = createMockLLMManager([{ content: 'response', toolCalls: [] }]);
      const loop = new AgenticLoop(llm as any, pluginManager);

      const result = await loop.run('test', createMockToolContext());

      expect(result.status).toBe('completed');
      expect(result.toolCalls).toHaveLength(0);
    });

    it('should handle very long LLM response', async () => {
      const longContent = 'response '.repeat(1000);
      const llm = createMockLLMManager([{ content: longContent }]);
      const loop = new AgenticLoop(llm as any, pluginManager);

      const result = await loop.run('test', createMockToolContext());

      expect(result.status).toBe('completed');
      expect(result.content).toBe(longContent);
    });
  });

  describe('Tool execution edge cases', () => {
    it('should handle tool that returns empty content', async () => {
      const tool = createMockTool('empty_tool', {
        result: { success: true, content: '' },
      });
      const plugin = createMockPlugin('test', [tool]);
      await pluginManager.load(plugin);

      const llm = createMockLLMManager([
        {
          content: 'Calling tool',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'empty_tool', arguments: '{}' },
            },
          ],
        },
        { content: 'Done' },
      ]);

      const loop = new AgenticLoop(llm as any, pluginManager);
      const result = await loop.run('test', createMockToolContext());

      expect(result.status).toBe('completed');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].result.success).toBe(true);
    });

    it('should handle tool that throws error', async () => {
      const tool = createMockTool('error_tool', {
        shouldThrow: new Error('Tool crashed!'),
      });
      const plugin = createMockPlugin('test', [tool]);
      await pluginManager.load(plugin);

      const llm = createMockLLMManager([
        {
          content: 'Calling tool',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'error_tool', arguments: '{}' },
            },
          ],
        },
        { content: 'Recovered' },
      ]);

      const loop = new AgenticLoop(llm as any, pluginManager);
      const result = await loop.run('test', createMockToolContext());

      expect(result.status).toBe('completed');
      expect(result.toolCalls[0].result.success).toBe(false);
      expect(result.toolCalls[0].result.error?.code).toBe('EXECUTION_ERROR');
    });

    it('should handle multiple tools called simultaneously', async () => {
      const tool1 = createMockTool('tool1');
      const tool2 = createMockTool('tool2');
      const tool3 = createMockTool('tool3');
      const plugin = createMockPlugin('test', [tool1, tool2, tool3]);
      await pluginManager.load(plugin);

      const llm = createMockLLMManager([
        {
          content: 'Calling multiple tools',
          toolCalls: [
            { id: 'call_1', type: 'function', function: { name: 'tool1', arguments: '{}' } },
            { id: 'call_2', type: 'function', function: { name: 'tool2', arguments: '{}' } },
            { id: 'call_3', type: 'function', function: { name: 'tool3', arguments: '{}' } },
          ],
        },
        { content: 'Done' },
      ]);

      const loop = new AgenticLoop(llm as any, pluginManager);
      const result = await loop.run('test', createMockToolContext());

      expect(result.status).toBe('completed');
      expect(result.toolCalls).toHaveLength(3);
    });

    it('should handle tool with complex JSON arguments', async () => {
      const tool = createMockTool('complex_tool');
      const plugin = createMockPlugin('test', [tool]);
      await pluginManager.load(plugin);

      const complexArgs = JSON.stringify({
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        unicode: '你好',
        special: 'line1\nline2\ttab',
      });

      const llm = createMockLLMManager([
        {
          content: 'Calling tool',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'complex_tool', arguments: complexArgs },
            },
          ],
        },
        { content: 'Done' },
      ]);

      const loop = new AgenticLoop(llm as any, pluginManager);
      const result = await loop.run('test', createMockToolContext());

      expect(result.status).toBe('completed');
      expect(result.toolCalls[0].result.success).toBe(true);
    });
  });

  describe('Abort signal edge cases', () => {
    it('should handle pre-aborted signal', async () => {
      const llm = createMockLLMManager([{ content: 'response' }]);
      const loop = new AgenticLoop(llm as any, pluginManager);

      const controller = new AbortController();
      controller.abort();

      const result = await loop.run('test', createMockToolContext(), {
        abortSignal: controller.signal,
      });

      expect(result.status).toBe('cancelled');
    });

    it('should handle abort during tool execution', async () => {
      const controller = new AbortController();

      // Tool that aborts during execution
      const slowTool: any = {
        name: 'slow_tool',
        description: 'Slow tool',
        parameters: [],
        execute: async () => {
          controller.abort();
          return { success: true, content: 'Done' };
        },
      };

      const plugin = createMockPlugin('test', [slowTool]);
      await pluginManager.load(plugin);

      const llm = createMockLLMManager([
        {
          content: 'Calling tool',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'slow_tool', arguments: '{}' },
            },
          ],
        },
        { content: 'Done' },
      ]);

      const loop = new AgenticLoop(llm as any, pluginManager);
      const result = await loop.run('test', createMockToolContext(), {
        abortSignal: controller.signal,
      });

      // Should either complete the current iteration or be cancelled
      expect(['completed', 'cancelled']).toContain(result.status);
    });
  });

  describe('System prompt edge cases', () => {
    it('should handle empty system prompt', async () => {
      const llm = createMockLLMManager([{ content: 'response' }]);
      const loop = new AgenticLoop(llm as any, pluginManager);

      const result = await loop.run('test', createMockToolContext(), {
        systemPrompt: '',
      });

      expect(result.status).toBe('completed');
    });

    it('should handle very long system prompt', async () => {
      const llm = createMockLLMManager([{ content: 'response' }]);
      const loop = new AgenticLoop(llm as any, pluginManager);

      const longPrompt = 'You are a helpful assistant. '.repeat(100);
      const result = await loop.run('test', createMockToolContext(), {
        systemPrompt: longPrompt,
      });

      expect(result.status).toBe('completed');
    });
  });
});
