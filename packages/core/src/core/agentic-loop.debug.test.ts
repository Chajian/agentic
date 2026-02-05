/**
 * Debug test for AgenticLoop event emission
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgenticLoop } from './agentic-loop.js';
import { PluginManager } from './plugin-manager.js';
import type { LLMManager } from '../llm/manager.js';
import type { Tool, ToolResult, ToolContext } from '../types/tool.js';
import type { PluginContext, AgentPlugin } from '../types/plugin.js';
import type { StreamEvent } from '../types/streaming.js';

describe('AgenticLoop Debug Tests', () => {
  it('should emit tool call events', async () => {
    // Create plugin manager
    const pluginManager = new PluginManager();
    const pluginContext: PluginContext = {
      logger: {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      },
      knowledgeBase: {} as any,
      config: { env: 'test', debug: true },
      services: {},
    };
    pluginManager.setContext(pluginContext);

    // Create a simple tool
    const testTool: Tool = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: [],
      execute: async (): Promise<ToolResult> => {
        console.log('Tool executed!');
        return { success: true, content: 'Tool result' };
      },
    };

    const plugin: AgentPlugin = {
      name: 'test',
      version: '1.0.0',
      description: 'Test plugin',
      tools: [testTool],
    };
    await pluginManager.load(plugin);

    // Create mock LLM
    let callCount = 0;
    const mockLLM: LLMManager = {
      generateWithTools: async () => {
        callCount++;
        console.log(`LLM call ${callCount}`);
        if (callCount === 1) {
          return {
            content: 'Calling the tool',
            toolCalls: [
              {
                id: 'test_call_123',
                type: 'function' as const,
                function: {
                  name: 'test_tool',
                  arguments: '{}',
                },
              },
            ],
          };
        }
        return {
          content: 'All done',
          toolCalls: [],
        };
      },
      generateWithToolsStream: async () => {
        callCount++;
        console.log(`LLM stream call ${callCount}`);
        if (callCount === 1) {
          return {
            content: 'Calling the tool',
            toolCalls: [
              {
                id: 'test_call_123',
                type: 'function' as const,
                function: {
                  name: 'test_tool',
                  arguments: '{}',
                },
              },
            ],
          };
        }
        return {
          content: 'All done',
          toolCalls: [],
        };
      },
    } as unknown as LLMManager;

    // Collect events
    const events: StreamEvent[] = [];
    const onEvent = (event: StreamEvent) => {
      console.log('Event:', event.type, event.data);
      events.push(event);
    };

    const toolContext: ToolContext = {
      knowledgeBase: {} as any,
      logger: pluginContext.logger,
    };

    // Run the loop
    const loop = new AgenticLoop(mockLLM, pluginManager);
    const result = await loop.run('Test message', toolContext, {
      sessionId: 'test-session',
      onEvent,
      maxIterations: 3,
    });

    console.log('Result:', result);
    console.log('Events collected:', events.length);
    console.log(
      'Event types:',
      events.map((e) => e.type)
    );

    // Check for tool call events
    const toolCallStarted = events.find((e) => e.type === 'tool_call_started');
    const toolCallCompleted = events.find((e) => e.type === 'tool_call_completed');

    console.log('Tool call started:', toolCallStarted);
    console.log('Tool call completed:', toolCallCompleted);

    expect(toolCallStarted).toBeDefined();
    expect(toolCallCompleted).toBeDefined();
  });
});
