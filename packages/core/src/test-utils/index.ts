/**
 * 测试工具统一导出
 *
 * @packageDocumentation
 */

// 配置
export {
  TEST_CONFIG,
  getPropertyRuns,
  getTestTimeout,
  getRetryCount,
  shouldSkipE2E,
  isCI,
} from './config.js';

// Mock 工厂
export {
  // Types
  type MockLLMResponse,
  type MockToolOptions,
  type MockPluginOptions,
  type MockLLMManagerType,
  // Factories
  createMockLLMManager,
  createResettableMockLLMManager,
  createMockTool,
  createMockToolWithParams,
  createMockPluginContext,
  createMockToolContext,
  createMockPlugin,
  createTestAgentConfig,
  createTestAgentConfigWithConfirmation,
  // Helpers
  createToolCallResponses,
  createInfiniteToolCallResponses,
} from './mocks.js';

// Arbitrary 生成器
export {
  // 标识符
  arbIdentifier,
  arbPluginName,
  arbToolName,
  arbNamespace,
  arbCategory,
  // Session
  arbSessionId,
  arbMessageId,
  arbMessageRole,
  arbResponseType,
  // 字符串
  arbNonEmptyString,
  arbMessageContent,
  arbUserMessage,
  arbSafeString,
  // JSON
  arbJsonValue,
  arbMetadata,
  arbSimpleObject,
  // 工具
  arbToolArgs,
  arbErrorCode,
  arbToolResult,
  arbSuccessToolResult,
  arbFailureToolResult,
  // 数值
  arbPositiveInt,
  arbNonNegativeInt,
  arbDurationMs,
  arbTemperature,
  arbMaxTokens,
  arbMaxIterations,
  // 时间
  arbTimestamp,
  arbPastTimestamp,
  // LLM
  arbLLMProvider,
  arbLLMTask,
  arbLLMErrorCode,
  arbRiskLevel,
  // 复合类型
  type MessageOperation,
  arbMessageOperation,
  arbMessageOperations,
  arbToolCall,
  arbToolCalls,
  arbLLMResponse,
  // 辅助函数
  arbUniqueId,
  arbIndexedId,
  arbEnum,
  arbOptional,
} from './arbitraries.js';

// 清理工具
export {
  type CleanupFn,
  CleanupManager,
  withCleanup,
  createTestFixture,
  ResourcePool,
  DeferredExecutor,
} from './cleanup.js';
