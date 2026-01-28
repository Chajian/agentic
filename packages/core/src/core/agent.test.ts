/**
 * Agent Tests
 *
 * Tests for the Agent class, including confirmation mechanism for high-risk tools.
 *
 * **Feature: ai-agent, Property 11: Tool Execution Idempotency Check**
 * **Validates: Requirements 4.7**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { Agent, createAgent } from './agent.js';
import type { AgentConfig } from '../types/config.js';
import type { Tool, ToolResult, ToolContext } from '../types/tool.js';
import type { AgentPlugin } from '../types/plugin.js';
import type { AgentResponse, ConfirmResponse } from '../types/response.js';

// Mock the LLM Manager module
vi.mock('../llm/manager.js', () => {
  return {
    LLMManager: vi.fn().mockImplementation(() => ({
      generateWithTools: vi.fn(),
      generate: vi.fn(),
      supportsEmbeddings: vi.fn().mockReturnValue(false),
      getLLMForTask: vi.fn(),
    })),
  };
});

// Helper to create a mock tool
function createMockTool(
  name: string,
  options: {
    requiresConfirmation?: boolean;
    riskLevel?: 'low' | 'medium' | 'high';
  } = {}
): Tool {
  return {
    name,
    description: `Mock tool: ${name}`,
    parameters: [
      {
        name: 'target',
        type: 'string',
        description: 'Target of the operation',
        required: true,
      },
    ],
    requiresConfirmation: options.requiresConfirmation,
    riskLevel: options.riskLevel,
    execute: vi.fn(async (): Promise<ToolResult> => ({
      success: true,
      content: `Executed ${name}`,
      data: { executed: true },
    })),
  };
}

// Helper to create a mock plugin
function createMockPlugin(
  name: string,
  tools: Tool[],
  namespace?: string
): AgentPlugin {
  return {
    name,
    version: '1.0.0',
    description: `Mock plugin: ${name}`,
    namespace,
    tools,
  };
}

// Helper to create a minimal agent config
function createTestConfig(): AgentConfig {
  return {
    llm: {
      mode: 'single',
      default: {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      },
    },
    database: {
      url: 'memory://',
    },
    behavior: {
      requireConfirmation: true,
      maxIterations: 5,
      timeoutMs: 5000,
    },
  };
}

describe('Agent Confirmation Mechanism', () => {
  describe('Property 11: Tool Execution Idempotency Check', () => {
    /**
     * Property 11: Tool Execution Idempotency Check
     *
     * For any tool marked as requiresConfirmation, the agent should return
     * a Confirm response before execution, never execute directly.
     *
     * **Feature: ai-agent, Property 11: Tool Execution Idempotency Check**
     * **Validates: Requirements 4.7**
     */
    it('should return Confirm response for tools with requiresConfirmation=true', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random tool names (valid identifiers)
          fc.string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
          // Generate random user messages
          fc.string({ minLength: 1, maxLength: 100 }),
          // Generate random target values
          fc.string({ minLength: 1, maxLength: 50 }),
          async (toolName, userMessage, targetValue) => {
            // Create agent with test config
            const config = createTestConfig();
            const agent = new Agent(config);

            // Create a tool that requires confirmation
            const confirmationTool = createMockTool(toolName, {
              requiresConfirmation: true,
            });

            // Create and load plugin with the confirmation tool
            const plugin = createMockPlugin('test-plugin', [confirmationTool]);
            await agent.loadPlugin(plugin);

            // Mock the LLM to return a tool call for our confirmation tool
            const llmManager = agent.getLLMManager();
            (llmManager.generateWithTools as any).mockResolvedValue({
              content: 'I will execute the tool.',
              toolCalls: [
                {
                  id: 'call_1',
                  name: toolName,
                  arguments: { target: targetValue },
                },
              ],
            });

            // Send a message that would trigger the tool
            const response = await agent.chat(userMessage);

            // Property 11.1: Response should be of type 'confirm'
            expect(response.type).toBe('confirm');

            // Property 11.2: The tool should NOT have been executed yet
            expect(confirmationTool.execute).not.toHaveBeenCalled();

            // Property 11.3: Confirm response should contain action details
            if (response.type === 'confirm') {
              const confirmResponse = response as ConfirmResponse;
              expect(confirmResponse.action).toBeDefined();
              expect(confirmResponse.action.type).toBe(toolName);
              expect(confirmResponse.action.params).toBeDefined();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property 11 (Variant): High-risk tools should also require confirmation
     *
     * **Feature: ai-agent, Property 11: Tool Execution Idempotency Check**
     * **Validates: Requirements 4.7**
     */
    it('should return Confirm response for tools with riskLevel=high', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (toolName, userMessage) => {
            const config = createTestConfig();
            const agent = new Agent(config);

            // Create a high-risk tool (without explicit requiresConfirmation)
            const highRiskTool = createMockTool(toolName, {
              riskLevel: 'high',
            });

            const plugin = createMockPlugin('test-plugin', [highRiskTool]);
            await agent.loadPlugin(plugin);

            const llmManager = agent.getLLMManager();
            (llmManager.generateWithTools as any).mockResolvedValue({
              content: 'Executing high-risk operation.',
              toolCalls: [
                {
                  id: 'call_1',
                  name: toolName,
                  arguments: { target: 'test-target' },
                },
              ],
            });

            const response = await agent.chat(userMessage);

            // High-risk tools should also trigger confirmation
            expect(response.type).toBe('confirm');
            expect(highRiskTool.execute).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property 11 (Negative): Low-risk tools without requiresConfirmation should execute directly
     *
     * This tests the inverse - tools that don't require confirmation should
     * execute without a confirm response.
     *
     * **Feature: ai-agent, Property 11: Tool Execution Idempotency Check**
     * **Validates: Requirements 4.7**
     */
    it('should NOT return Confirm response for tools without requiresConfirmation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom('low', 'medium') as fc.Arbitrary<'low' | 'medium'>,
          async (toolName, userMessage, riskLevel) => {
            const config = createTestConfig();
            const agent = new Agent(config);

            // Create a tool that does NOT require confirmation
            const normalTool = createMockTool(toolName, {
              requiresConfirmation: false,
              riskLevel,
            });

            const plugin = createMockPlugin('test-plugin', [normalTool]);
            await agent.loadPlugin(plugin);

            const llmManager = agent.getLLMManager();
            
            // First call: LLM decides to call the tool
            // Second call: LLM generates final response
            (llmManager.generateWithTools as any)
              .mockResolvedValueOnce({
                content: 'Executing tool.',
                toolCalls: [
                  {
                    id: 'call_1',
                    name: toolName,
                    arguments: { target: 'test-target' },
                  },
                ],
              })
              .mockResolvedValueOnce({
                content: 'Tool executed successfully.',
                toolCalls: [],
              });

            const response = await agent.chat(userMessage);

            // Non-confirmation tools should execute directly (type should be 'execute')
            expect(response.type).toBe('execute');
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property 11 (Confirmation Flow): After user confirms, tool should execute
     *
     * **Feature: ai-agent, Property 11: Tool Execution Idempotency Check**
     * **Validates: Requirements 4.7**
     */
    it('should execute tool after user confirms', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
          fc.constantFrom('yes', 'y', '是', '确认', '确定', 'confirm', 'ok'),
          async (toolName, confirmationWord) => {
            const config = createTestConfig();
            const agent = new Agent(config);

            const confirmationTool = createMockTool(toolName, {
              requiresConfirmation: true,
            });

            const plugin = createMockPlugin('test-plugin', [confirmationTool]);
            await agent.loadPlugin(plugin);

            const llmManager = agent.getLLMManager();
            
            // First call: triggers confirmation
            (llmManager.generateWithTools as any)
              .mockResolvedValueOnce({
                content: 'I will execute the tool.',
                toolCalls: [
                  {
                    id: 'call_1',
                    name: toolName,
                    arguments: { target: 'test-target' },
                  },
                ],
              })
              // Second call: after confirmation, should execute the tool
              .mockResolvedValueOnce({
                content: 'I will execute the tool.',
                toolCalls: [
                  {
                    id: 'call_2',
                    name: toolName,
                    arguments: { target: 'test-target' },
                  },
                ],
              })
              // Third call: final response after tool execution
              .mockResolvedValueOnce({
                content: 'Tool executed successfully.',
                toolCalls: [],
              });

            // First message triggers confirmation
            const firstResponse = await agent.chat('Execute the tool');
            expect(firstResponse.type).toBe('confirm');
            expect(confirmationTool.execute).not.toHaveBeenCalled();

            // Extract pending confirmation from first response
            const confirmResponse = firstResponse as ConfirmResponse;
            const pendingConfirmation = {
              toolName: confirmResponse.action.type,
              arguments: confirmResponse.action.params,
              userMessage: 'Execute the tool',
              timestamp: new Date(),
            };

            // User confirms - pass pendingConfirmation via options (stateless mode)
            const secondResponse = await agent.chat(confirmationWord, {
              pendingConfirmation,
            });

            // After confirmation, tool should have been executed
            expect(secondResponse.type).toBe('execute');
            expect(confirmationTool.execute).toHaveBeenCalled();
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property 11 (Cancellation Flow): After user cancels, tool should NOT execute
     *
     * **Feature: ai-agent, Property 11: Tool Execution Idempotency Check**
     * **Validates: Requirements 4.7**
     */
    it('should NOT execute tool after user cancels', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 })
            .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
          fc.constantFrom('no', 'n', '否', '取消', 'cancel', 'abort'),
          async (toolName, cancellationWord) => {
            const config = createTestConfig();
            const agent = new Agent(config);

            const confirmationTool = createMockTool(toolName, {
              requiresConfirmation: true,
            });

            const plugin = createMockPlugin('test-plugin', [confirmationTool]);
            await agent.loadPlugin(plugin);

            const llmManager = agent.getLLMManager();
            (llmManager.generateWithTools as any).mockResolvedValue({
              content: 'I will execute the tool.',
              toolCalls: [
                {
                  id: 'call_1',
                  name: toolName,
                  arguments: { target: 'test-target' },
                },
              ],
            });

            // First message triggers confirmation
            const firstResponse = await agent.chat('Execute the tool');
            expect(firstResponse.type).toBe('confirm');

            // Extract pending confirmation from first response
            const confirmResponse = firstResponse as ConfirmResponse;
            const pendingConfirmation = {
              toolName: confirmResponse.action.type,
              arguments: confirmResponse.action.params,
              userMessage: 'Execute the tool',
              timestamp: new Date(),
            };

            // User cancels - pass pendingConfirmation via options (stateless mode)
            const secondResponse = await agent.chat(cancellationWord, {
              pendingConfirmation,
            });

            // Tool should NOT have been executed
            expect(secondResponse.type).toBe('execute');
            expect(confirmationTool.execute).not.toHaveBeenCalled();
            
            // Response should indicate cancellation
            if (secondResponse.type === 'execute') {
              expect(secondResponse.data).toEqual({ cancelled: true });
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Confirmation Mechanism Edge Cases', () => {
    it('should handle multiple confirmation tools in one request', async () => {
      const config = createTestConfig();
      const agent = new Agent(config);

      const tool1 = createMockTool('delete_file', { requiresConfirmation: true });
      const tool2 = createMockTool('update_config', { requiresConfirmation: true });

      const plugin = createMockPlugin('test-plugin', [tool1, tool2]);
      await agent.loadPlugin(plugin);

      const llmManager = agent.getLLMManager();
      (llmManager.generateWithTools as any).mockResolvedValue({
        content: 'I will execute both tools.',
        toolCalls: [
          { id: 'call_1', name: 'delete_file', arguments: { target: 'file.txt' } },
          { id: 'call_2', name: 'update_config', arguments: { target: 'config.yml' } },
        ],
      });

      const response = await agent.chat('Delete file and update config');

      // Should trigger confirmation for the first confirmation tool found
      expect(response.type).toBe('confirm');
      expect(tool1.execute).not.toHaveBeenCalled();
      expect(tool2.execute).not.toHaveBeenCalled();
    });

    it('should skip confirmation when skipConfirmation option is true', async () => {
      const config = createTestConfig();
      const agent = new Agent(config);

      const confirmationTool = createMockTool('dangerous_tool', {
        requiresConfirmation: true,
      });

      const plugin = createMockPlugin('test-plugin', [confirmationTool]);
      await agent.loadPlugin(plugin);

      const llmManager = agent.getLLMManager();
      (llmManager.generateWithTools as any)
        .mockResolvedValueOnce({
          content: 'Executing tool.',
          toolCalls: [
            { id: 'call_1', name: 'dangerous_tool', arguments: { target: 'test' } },
          ],
        })
        .mockResolvedValueOnce({
          content: 'Done.',
          toolCalls: [],
        });

      const response = await agent.chat('Execute dangerous tool', {
        skipConfirmation: true,
      });

      // Should execute directly without confirmation
      expect(response.type).toBe('execute');
      expect(confirmationTool.execute).toHaveBeenCalled();
    });

    it('should skip confirmation when requireConfirmation behavior is disabled', async () => {
      const config = createTestConfig();
      config.behavior!.requireConfirmation = false;
      const agent = new Agent(config);

      const confirmationTool = createMockTool('dangerous_tool', {
        requiresConfirmation: true,
      });

      const plugin = createMockPlugin('test-plugin', [confirmationTool]);
      await agent.loadPlugin(plugin);

      const llmManager = agent.getLLMManager();
      (llmManager.generateWithTools as any)
        .mockResolvedValueOnce({
          content: 'Executing tool.',
          toolCalls: [
            { id: 'call_1', name: 'dangerous_tool', arguments: { target: 'test' } },
          ],
        })
        .mockResolvedValueOnce({
          content: 'Done.',
          toolCalls: [],
        });

      const response = await agent.chat('Execute dangerous tool');

      // Should execute directly without confirmation
      expect(response.type).toBe('execute');
      expect(confirmationTool.execute).toHaveBeenCalled();
    });
  });
});
