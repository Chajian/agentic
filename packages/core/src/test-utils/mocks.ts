/**
 * 类型安全的 Mock 工厂函数
 *
 * 提供统一的 Mock 创建方法，确保类型安全和一致性
 */

import { vi } from 'vitest';
import type { LLMManager } from '../llm/manager.js';
import type { Tool, ToolResult, ToolContext, ToolParameterType } from '../types/tool.js';
import type { PluginContext, AgentPlugin } from '../types/plugin.js';
import type { AgentConfig } from '../types/config.js';

// ============================================================================
// Types
// ============================================================================

/**
 * LLM 响应类型
 */
export interface MockLLMResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}

/**
 * Mock Tool 选项
 */
export interface MockToolOptions {
  /** 工具执行结果 */
  result?: ToolResult;
  /** 是否需要确认 */
  requiresConfirmation?: boolean;
  /** 风险级别 */
  riskLevel?: 'low' | 'medium' | 'high';
  /** 工具分类 */
  category?: string;
  /** 执行时抛出的错误 */
  shouldThrow?: Error;
  /** 工具参数定义 */
  parameters?: Array<{
    name: string;
    type: ToolParameterType;
    description: string;
    required: boolean;
  }>;
}

/**
 * Mock Plugin 选项
 */
export interface MockPluginOptions {
  /** 命名空间 */
  namespace?: string;
  /** 版本号 */
  version?: string;
  /** 加载钩子 */
  onLoad?: () => Promise<void>;
  /** 卸载钩子 */
  onUnload?: () => Promise<void>;
  /** 健康检查 */
  healthCheck?: () => Promise<boolean>;
}

/**
 * LLM Manager Mock 类型（部分接口）
 */
export type MockLLMManagerType = Pick<
  LLMManager,
  'generateWithTools' | 'generate' | 'supportsEmbeddings' | 'getLLMForTask' | 'embed'
>;

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * 创建类型安全的 LLM Manager Mock
 *
 * @param responses - 预定义的响应序列
 * @returns Mock LLM Manager
 *
 * @example
 * ```typescript
 * const llm = createMockLLMManager([
 *   { content: 'First response' },
 *   { content: 'Second response', toolCalls: [...] },
 * ]);
 * ```
 */
export function createMockLLMManager(
  responses: MockLLMResponse[]
): MockLLMManagerType {
  let callIndex = 0;

  const getNextResponse = () => {
    const response = responses[callIndex] || responses[responses.length - 1];
    callIndex++;
    return {
      ...response,
      finishReason: response.finishReason ?? (response.toolCalls ? 'tool_calls' as const : 'stop' as const),
    };
  };

  return {
    generateWithTools: vi.fn(async () => getNextResponse()),
    generate: vi.fn(async () => getNextResponse().content),
    supportsEmbeddings: vi.fn().mockReturnValue(false),
    getLLMForTask: vi.fn(),
    embed: vi.fn(async (text: string) => ({
      embedding: new Array(1536).fill(0).map(() => Math.random()),
      tokenCount: text.split(/\s+/).length,
    })),
  };
}

/**
 * 创建可重置的 LLM Manager Mock
 *
 * @param responses - 预定义的响应序列
 * @returns 带 reset 方法的 Mock LLM Manager
 */
export function createResettableMockLLMManager(responses: MockLLMResponse[]) {
  let callIndex = 0;

  const getNextResponse = () => {
    const response = responses[callIndex] || responses[responses.length - 1];
    callIndex++;
    return {
      ...response,
      finishReason: response.finishReason ?? (response.toolCalls ? 'tool_calls' as const : 'stop' as const),
    };
  };

  const mock: MockLLMManagerType & { reset: () => void; getCallCount: () => number } = {
    generateWithTools: vi.fn(async () => getNextResponse()),
    generate: vi.fn(async () => getNextResponse().content),
    supportsEmbeddings: vi.fn().mockReturnValue(false),
    getLLMForTask: vi.fn(),
    embed: vi.fn(async (text: string) => ({
      embedding: new Array(1536).fill(0).map(() => Math.random()),
      tokenCount: text.split(/\s+/).length,
    })),
    reset: () => {
      callIndex = 0;
      vi.clearAllMocks();
    },
    getCallCount: () => callIndex,
  };

  return mock;
}

/**
 * 创建 Mock Tool
 *
 * @param name - 工具名称
 * @param options - 工具选项
 * @returns Mock Tool
 *
 * @example
 * ```typescript
 * const tool = createMockTool('my_tool', {
 *   requiresConfirmation: true,
 *   riskLevel: 'high',
 * });
 * ```
 */
export function createMockTool(name: string, options: MockToolOptions = {}): Tool {
  const defaultResult: ToolResult = { success: true, content: 'Done' };

  return {
    name,
    description: `Mock tool: ${name}`,
    parameters: options.parameters ?? [],
    category: options.category,
    requiresConfirmation: options.requiresConfirmation,
    riskLevel: options.riskLevel,
    execute: vi.fn(async (): Promise<ToolResult> => {
      if (options.shouldThrow) {
        throw options.shouldThrow;
      }
      return options.result ?? defaultResult;
    }),
  };
}

/**
 * 创建带参数的 Mock Tool
 *
 * @param name - 工具名称
 * @param params - 参数名列表
 * @param options - 其他选项
 * @returns Mock Tool
 */
export function createMockToolWithParams(
  name: string,
  params: string[],
  options: Omit<MockToolOptions, 'parameters'> = {}
): Tool {
  return createMockTool(name, {
    ...options,
    parameters: params.map((p) => ({
      name: p,
      type: 'string',
      description: `Parameter: ${p}`,
      required: true,
    })),
  });
}

/**
 * 创建 Mock Plugin Context
 *
 * @param overrides - 覆盖的属性
 * @returns Mock Plugin Context
 */
export function createMockPluginContext(
  overrides?: Partial<PluginContext>
): PluginContext {
  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    knowledgeBase: {} as any,
    config: { env: 'test', debug: false },
    services: {},
    ...overrides,
  };
}

/**
 * 创建 Mock Tool Context
 *
 * @param overrides - 覆盖的属性
 * @returns Mock Tool Context
 */
export function createMockToolContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    knowledgeBase: {} as any,
    sessionId: `test-session-${Date.now()}`,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    ...overrides,
  };
}

/**
 * 创建 Mock Plugin
 *
 * @param name - 插件名称
 * @param tools - 工具列表
 * @param options - 插件选项
 * @returns Mock Plugin
 *
 * @example
 * ```typescript
 * const plugin = createMockPlugin('my-plugin', [tool1, tool2], {
 *   namespace: 'myns',
 * });
 * ```
 */
export function createMockPlugin(
  name: string,
  tools: Tool[],
  options: MockPluginOptions = {}
): AgentPlugin {
  return {
    name,
    version: options.version ?? '1.0.0',
    description: `Mock plugin: ${name}`,
    namespace: options.namespace,
    tools,
    onLoad: options.onLoad,
    onUnload: options.onUnload,
    healthCheck: options.healthCheck,
  };
}

/**
 * 创建测试用 Agent 配置
 *
 * @param overrides - 覆盖的配置
 * @returns Agent 配置
 */
export function createTestAgentConfig(
  overrides?: Partial<AgentConfig>
): AgentConfig {
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
      requireConfirmation: false,
      maxIterations: 5,
      timeoutMs: 5000,
    },
    ...overrides,
  };
}

/**
 * 创建带确认机制的测试配置
 */
export function createTestAgentConfigWithConfirmation(): AgentConfig {
  return createTestAgentConfig({
    behavior: {
      requireConfirmation: true,
      maxIterations: 5,
      timeoutMs: 5000,
    },
  });
}

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * 创建一系列工具调用响应
 *
 * @param toolName - 工具名称
 * @param count - 调用次数
 * @returns 响应数组
 */
export function createToolCallResponses(
  toolName: string,
  count: number
): MockLLMResponse[] {
  const responses: MockLLMResponse[] = [];

  for (let i = 0; i < count; i++) {
    responses.push({
      content: `Calling ${toolName} (${i + 1}/${count})`,
      toolCalls: [
        {
          id: `call_${i}`,
          name: toolName,
          arguments: {},
        },
      ],
    });
  }

  // 最后一个响应不包含工具调用
  responses.push({ content: 'Done!' });

  return responses;
}

/**
 * 创建无限工具调用响应（用于测试 maxIterations）
 *
 * @param toolName - 工具名称
 * @param maxResponses - 最大响应数
 * @returns 响应数组
 */
export function createInfiniteToolCallResponses(
  toolName: string,
  maxResponses = 100
): MockLLMResponse[] {
  return Array(maxResponses).fill({
    content: 'Need more work.',
    toolCalls: [
      {
        id: 'call_x',
        name: toolName,
        arguments: {},
      },
    ],
  });
}
