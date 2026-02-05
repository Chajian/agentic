/**
 * Agentic Loop Tests
 *
 * Tests for the ReAct loop execution, tool calling, and termination conditions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { AgenticLoop, LoopError } from './agentic-loop.js';
import { PluginManager } from './plugin-manager.js';
import type { LLMManager } from '../llm/manager.js';
import type { Tool, ToolResult, ToolContext } from '../types/tool.js';
import type { PluginContext, AgentPlugin } from '../types/plugin.js';
import type { LoopConfig } from '../types/loop.js';

// Mock LLM Manager
function createMockLLMManager(
  responses: Array<{
    content: string;
    toolCalls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>;
  }>
): LLMManager {
  let callIndex = 0;

  return {
    generateWithTools: vi.fn(async () => {
      const response = responses[callIndex] || responses[responses.length - 1];
      callIndex++;
      return response;
    }),
  } as unknown as LLMManager;
}

// Helper to create a mock tool
function createMockTool(
  name: string,
  result: ToolResult = { success: true, content: 'Done' }
): Tool {
  return {
    name,
    description: `Mock tool: ${name}`,
    parameters: [],
    execute: vi.fn(async (): Promise<ToolResult> => result),
  };
}

// Helper to create a mock plugin context
function createMockPluginContext(): PluginContext {
  return {
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
    knowledgeBase: {} as any,
    config: { env: 'test', debug: false },
    services: {},
  };
}

// Helper to create a mock tool context
function createMockToolContext(): ToolContext {
  return {
    knowledgeBase: {} as any,
    sessionId: 'test-session',
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
  };
}

describe('AgenticLoop', () => {
  let pluginManager: PluginManager;
  let pluginContext: PluginContext;
  let toolContext: ToolContext;

  beforeEach(() => {
    pluginManager = new PluginManager();
    pluginContext = createMockPluginContext();
    toolContext = createMockToolContext();
    pluginManager.setContext(pluginContext);
  });

  describe('Basic Execution', () => {
    it('should complete when LLM returns no tool calls', async () => {
      const llm = createMockLLMManager([{ content: 'Here is your answer!' }]);

      const loop = new AgenticLoop(llm, pluginManager);
      const result = await loop.run('Hello', toolContext);

      expect(result.status).toBe('completed');
      expect(result.content).toBe('Here is your answer!');
      expect(result.iterations).toBe(1);
      expect(result.toolCalls).toHaveLength(0);
    });

    it('should execute tool calls and continue loop', async () => {
      // Register a tool
      const tool = createMockTool('test_tool');
      const plugin: AgentPlugin = {
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin',
        tools: [tool],
      };
      await pluginManager.load(plugin);

      const llm = createMockLLMManager([
        {
          content: 'Let me check that for you.',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'test_tool', arguments: '{}' },
            },
          ],
        },
        { content: 'Based on the result, here is your answer!' },
      ]);

      const loop = new AgenticLoop(llm, pluginManager);
      const result = await loop.run('Check something', toolContext);

      expect(result.status).toBe('completed');
      expect(result.iterations).toBe(2);
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].toolName).toBe('test_tool');
    });

    it('should handle multiple tool calls in one iteration', async () => {
      const tool1 = createMockTool('tool1');
      const tool2 = createMockTool('tool2');
      const plugin: AgentPlugin = {
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin',
        tools: [tool1, tool2],
      };
      await pluginManager.load(plugin);

      const llm = createMockLLMManager([
        {
          content: 'Checking multiple things.',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'tool1', arguments: '{}' },
            },
            {
              id: 'call_2',
              type: 'function',
              function: { name: 'tool2', arguments: '{}' },
            },
          ],
        },
        { content: 'All done!' },
      ]);

      const loop = new AgenticLoop(llm, pluginManager);
      const result = await loop.run('Check multiple things', toolContext);

      expect(result.status).toBe('completed');
      expect(result.toolCalls).toHaveLength(2);
    });
  });

  describe('Iteration Limits', () => {
    /**
     * Property 10: Agentic Loop Termination
     * For any user message, the agentic loop should terminate within
     * the configured maxIterations limit.
     */
    it('should stop at maxIterations limit', async () => {
      const tool = createMockTool('infinite_tool');
      const plugin: AgentPlugin = {
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin',
        tools: [tool],
      };
      await pluginManager.load(plugin);

      // LLM always wants to call a tool
      const llm = createMockLLMManager(
        Array(20).fill({
          content: 'Need to check more.',
          toolCalls: [
            {
              id: 'call_x',
              type: 'function',
              function: { name: 'infinite_tool', arguments: '{}' },
            },
          ],
        })
      );

      const loop = new AgenticLoop(llm, pluginManager, { maxIterations: 5 });
      const result = await loop.run('Do something', toolContext);

      expect(result.status).toBe('max_iterations');
      expect(result.iterations).toBe(5);
    });

    it('should respect custom maxIterations in run options', async () => {
      const tool = createMockTool('tool');
      const plugin: AgentPlugin = {
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin',
        tools: [tool],
      };
      await pluginManager.load(plugin);

      const llm = createMockLLMManager(
        Array(20).fill({
          content: 'More.',
          toolCalls: [
            {
              id: 'call_x',
              type: 'function',
              function: { name: 'tool', arguments: '{}' },
            },
          ],
        })
      );

      const loop = new AgenticLoop(llm, pluginManager, { maxIterations: 10 });
      const result = await loop.run('Do something', toolContext, { maxIterations: 3 });

      expect(result.status).toBe('max_iterations');
      expect(result.iterations).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle tool not found gracefully', async () => {
      const llm = createMockLLMManager([
        {
          content: 'Let me use a tool.',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'nonexistent_tool', arguments: '{}' },
            },
          ],
        },
        { content: 'Tool not found, but I can still help.' },
      ]);

      const loop = new AgenticLoop(llm, pluginManager);
      const result = await loop.run('Help me', toolContext);

      expect(result.status).toBe('completed');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].result.success).toBe(false);
      expect(result.toolCalls[0].result.error?.code).toBe('TOOL_NOT_FOUND');
    });

    it('should handle tool execution errors', async () => {
      const errorTool: Tool = {
        name: 'error_tool',
        description: 'Tool that throws',
        parameters: [],
        execute: async () => {
          throw new Error('Tool crashed!');
        },
      };
      const plugin: AgentPlugin = {
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin',
        tools: [errorTool],
      };
      await pluginManager.load(plugin);

      const llm = createMockLLMManager([
        {
          content: 'Using error tool.',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'error_tool', arguments: '{}' },
            },
          ],
        },
        { content: 'Recovered from error.' },
      ]);

      const loop = new AgenticLoop(llm, pluginManager);
      const result = await loop.run('Do something', toolContext);

      expect(result.status).toBe('completed');
      expect(result.toolCalls[0].result.success).toBe(false);
      expect(result.toolCalls[0].result.error?.code).toBe('EXECUTION_ERROR');
    });

    it('should handle invalid JSON arguments', async () => {
      const tool = createMockTool('tool');
      const plugin: AgentPlugin = {
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin',
        tools: [tool],
      };
      await pluginManager.load(plugin);

      const llm = createMockLLMManager([
        {
          content: 'Using tool with bad args.',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'tool', arguments: 'not valid json' },
            },
          ],
        },
        { content: 'Handled the error.' },
      ]);

      const loop = new AgenticLoop(llm, pluginManager);
      const result = await loop.run('Do something', toolContext);

      expect(result.status).toBe('completed');
      expect(result.toolCalls[0].result.success).toBe(false);
    });
  });

  describe('System Prompt', () => {
    it('should include system prompt when provided', async () => {
      const llm = createMockLLMManager([{ content: 'Response' }]);

      const loop = new AgenticLoop(llm, pluginManager);
      await loop.run('Hello', toolContext, {
        systemPrompt: 'You are a helpful assistant.',
      });

      expect(llm.generateWithTools).toHaveBeenCalled();
      // The system prompt should be in the messages (as first message with role 'system')
      const call = (llm.generateWithTools as any).mock.calls[0];
      const messages = call[1];
      // Messages is an array, check if any message contains the system prompt
      const hasSystemPrompt = messages.some(
        (msg: any) =>
          (typeof msg === 'object' && msg.content === 'You are a helpful assistant.') ||
          (typeof msg === 'string' && msg.includes('You are a helpful assistant.'))
      );
      expect(hasSystemPrompt).toBe(true);
    });
  });

  describe('Cancellation', () => {
    it('should respect abort signal', async () => {
      const tool = createMockTool('slow_tool');
      const plugin: AgentPlugin = {
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin',
        tools: [tool],
      };
      await pluginManager.load(plugin);

      const controller = new AbortController();
      controller.abort(); // Abort immediately

      const llm = createMockLLMManager([
        {
          content: 'Working.',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'slow_tool', arguments: '{}' },
            },
          ],
        },
      ]);

      const loop = new AgenticLoop(llm, pluginManager);
      const result = await loop.run('Do something', toolContext, {
        abortSignal: controller.signal,
      });

      expect(result.status).toBe('cancelled');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 10: Agentic Loop Termination
     *
     * For any user message, the agentic loop should terminate within
     * the configured maxIterations limit, either by completing the task
     * or reaching the iteration limit.
     *
     * **Feature: ai-agent, Property 10: Agentic Loop Termination**
     * **Validates: Requirements 1.5, 1.6**
     */
    it('Property 10: should always terminate within maxIterations limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          // maxIterations: any positive integer from 1 to 20
          fc.integer({ min: 1, max: 20 }),
          // numToolCalls: how many tool call responses the LLM will generate (can exceed maxIterations)
          fc.integer({ min: 1, max: 50 }),
          // userMessage: any non-empty string
          fc.string({ minLength: 1, maxLength: 100 }),
          async (maxIterations, numToolCalls, userMessage) => {
            const testPluginManager = new PluginManager();
            testPluginManager.setContext(createMockPluginContext());

            const tool = createMockTool('test_tool');
            const plugin: AgentPlugin = {
              name: 'test',
              version: '1.0.0',
              description: 'Test plugin',
              tools: [tool],
            };
            await testPluginManager.load(plugin);

            // Create responses that always call tools (simulating infinite loop scenario)
            const responses = Array(numToolCalls).fill({
              content: 'More work needed.',
              toolCalls: [
                {
                  id: 'call_x',
                  type: 'function',
                  function: { name: 'test_tool', arguments: '{}' },
                },
              ],
            });

            const llm = createMockLLMManager(responses);
            const loop = new AgenticLoop(llm, testPluginManager, { maxIterations });
            const result = await loop.run(userMessage, createMockToolContext());

            // Property 10.1: Loop should always terminate with a valid status
            expect(['completed', 'max_iterations', 'error', 'cancelled']).toContain(result.status);

            // Property 10.2: Iterations should never exceed maxIterations (Requirement 1.5)
            expect(result.iterations).toBeLessThanOrEqual(maxIterations);

            // Property 10.3: When numToolCalls >= maxIterations, status should be 'max_iterations' (Requirement 1.6)
            if (numToolCalls >= maxIterations) {
              expect(result.status).toBe('max_iterations');
            }

            // Property 10.4: Result should always have content (partial result for max_iterations)
            expect(result.content).toBeDefined();
            expect(typeof result.content).toBe('string');

            // Property 10.5: Duration should be non-negative
            expect(result.duration).toBeGreaterThanOrEqual(0);

            // Property 10.6: Tool calls count should match iterations (when each iteration calls one tool)
            if (result.status === 'max_iterations') {
              expect(result.toolCalls.length).toBe(maxIterations);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 10 (Variant): Loop terminates even with varying tool call patterns
     *
     * Tests that the loop terminates correctly regardless of how many tools
     * are called per iteration.
     *
     * **Feature: ai-agent, Property 10: Agentic Loop Termination**
     * **Validates: Requirements 1.5, 1.6**
     */
    it('Property 10: should terminate with varying tool calls per iteration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 20 }),
          async (maxIterations, toolCallsPerIteration) => {
            const testPluginManager = new PluginManager();
            testPluginManager.setContext(createMockPluginContext());

            // Create multiple tools
            const tools: Tool[] = [];
            for (let i = 0; i < 5; i++) {
              tools.push(createMockTool(`tool_${i}`));
            }

            const plugin: AgentPlugin = {
              name: 'test',
              version: '1.0.0',
              description: 'Test plugin',
              tools,
            };
            await testPluginManager.load(plugin);

            // Create responses with varying number of tool calls per iteration
            const responses = toolCallsPerIteration.map((numCalls, iterIdx) => ({
              content: `Iteration ${iterIdx}`,
              toolCalls: Array(numCalls)
                .fill(null)
                .map((_, callIdx) => ({
                  id: `call_${iterIdx}_${callIdx}`,
                  type: 'function' as const,
                  function: {
                    name: `tool_${callIdx % 5}`,
                    arguments: '{}',
                  },
                })),
            }));

            const llm = createMockLLMManager(responses);
            const loop = new AgenticLoop(llm, testPluginManager, { maxIterations });
            const result = await loop.run('Test varying calls', createMockToolContext());

            // Loop must terminate
            expect(['completed', 'max_iterations', 'error', 'cancelled']).toContain(result.status);

            // Iterations must not exceed limit
            expect(result.iterations).toBeLessThanOrEqual(maxIterations);

            // If we had more iterations worth of responses than maxIterations, we should hit the limit
            if (toolCallsPerIteration.length >= maxIterations) {
              expect(result.status).toBe('max_iterations');
              expect(result.iterations).toBe(maxIterations);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property 10 (Edge Case): Loop terminates immediately when maxIterations is 0
     *
     * **Feature: ai-agent, Property 10: Agentic Loop Termination**
     * **Validates: Requirements 1.5, 1.6**
     */
    it('Property 10: should handle edge case of maxIterations boundary', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 3 }), async (maxIterations) => {
          const testPluginManager = new PluginManager();
          testPluginManager.setContext(createMockPluginContext());

          const tool = createMockTool('test_tool');
          const plugin: AgentPlugin = {
            name: 'test',
            version: '1.0.0',
            description: 'Test plugin',
            tools: [tool],
          };
          await testPluginManager.load(plugin);

          // Always call tools - should hit max_iterations
          const responses = Array(100).fill({
            content: 'Working...',
            toolCalls: [
              {
                id: 'call_x',
                type: 'function',
                function: { name: 'test_tool', arguments: '{}' },
              },
            ],
          });

          const llm = createMockLLMManager(responses);
          const loop = new AgenticLoop(llm, testPluginManager, { maxIterations });
          const result = await loop.run('Test', createMockToolContext());

          // With infinite tool calls, should always hit max_iterations
          expect(result.status).toBe('max_iterations');
          expect(result.iterations).toBe(maxIterations);

          // Should have exactly maxIterations tool calls
          expect(result.toolCalls.length).toBe(maxIterations);
        }),
        { numRuns: 30 }
      );
    });

    /**
     * Property: Tool calls are recorded accurately
     */
    it('should accurately record all tool calls', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 5 }), async (numTools) => {
          const testPluginManager = new PluginManager();
          testPluginManager.setContext(createMockPluginContext());

          // Create tools
          const tools: Tool[] = [];
          for (let i = 0; i < numTools; i++) {
            tools.push(createMockTool(`tool_${i}`));
          }

          const plugin: AgentPlugin = {
            name: 'test',
            version: '1.0.0',
            description: 'Test plugin',
            tools,
          };
          await testPluginManager.load(plugin);

          // Create tool calls for all tools
          const toolCalls = tools.map((t, i) => ({
            id: `call_${i}`,
            type: 'function' as const,
            function: { name: t.name, arguments: '{}' },
          }));

          const llm = createMockLLMManager([
            { content: 'Calling tools.', toolCalls },
            { content: 'Done!' },
          ]);

          const loop = new AgenticLoop(llm, testPluginManager);
          const result = await loop.run('Test', createMockToolContext());

          // All tool calls should be recorded
          expect(result.toolCalls).toHaveLength(numTools);

          // Each tool should have been called
          const calledTools = result.toolCalls.map((tc) => tc.toolName);
          for (const tool of tools) {
            expect(calledTools).toContain(tool.name);
          }
        }),
        { numRuns: 20 }
      );
    });
  });
});
