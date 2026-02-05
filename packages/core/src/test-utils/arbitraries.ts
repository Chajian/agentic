/**
 * 共享的 Arbitrary 生成器
 *
 * 为 Property-based 测试提供统一的数据生成器
 */

import * as fc from 'fast-check';

// ============================================================================
// 标识符相关
// ============================================================================

/**
 * 有效的标识符（用于工具名、变量名等）
 * 规则：以字母开头，只包含字母、数字、下划线
 */
export const arbIdentifier = fc
  .stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
    { minLength: 1, maxLength: 30 }
  )
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

/**
 * 有效的插件名（允许连字符）
 */
export const arbPluginName = fc
  .stringOf(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'.split('')
    ),
    { minLength: 1, maxLength: 30 }
  )
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

/**
 * 有效的工具名（不允许连字符）
 */
export const arbToolName = fc
  .stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
    { minLength: 1, maxLength: 30 }
  )
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

/**
 * 有效的命名空间（小写字母开头）
 */
export const arbNamespace = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), {
    minLength: 1,
    maxLength: 20,
  })
  .filter((s) => /^[a-z][a-z0-9_]*$/.test(s));

/**
 * 有效的分类名
 */
export const arbCategory = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
  minLength: 1,
  maxLength: 20,
});

// ============================================================================
// Session 相关
// ============================================================================

/**
 * Session ID（UUID 格式）
 */
export const arbSessionId = fc.uuid().map((uuid) => `session_${uuid}`);

/**
 * Message ID
 */
export const arbMessageId = fc.uuid().map((uuid) => `msg_${uuid}`);

/**
 * 消息角色
 */
export const arbMessageRole = fc.constantFrom('user', 'assistant', 'system');

/**
 * 响应类型
 */
export const arbResponseType = fc.constantFrom(
  'execute',
  'clarify',
  'confirm',
  'options',
  'knowledge_request'
);

// ============================================================================
// 字符串相关
// ============================================================================

/**
 * 非空字符串
 *
 * @param maxLength - 最大长度
 */
export const arbNonEmptyString = (maxLength = 200) => fc.string({ minLength: 1, maxLength });

/**
 * 消息内容
 */
export const arbMessageContent = arbNonEmptyString(500);

/**
 * 用户消息
 */
export const arbUserMessage = arbNonEmptyString(1000);

/**
 * 安全的字符串（只包含常见字符）
 */
export const arbSafeString = (maxLength = 100) =>
  fc.stringOf(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-_'.split('')
    ),
    { minLength: 1, maxLength }
  );

// ============================================================================
// JSON 相关
// ============================================================================

/**
 * 有效的 JSON 值（排除 undefined）
 */
export const arbJsonValue = fc.jsonValue();

/**
 * 元数据对象
 */
export const arbMetadata = fc.option(
  fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), arbJsonValue),
  { nil: undefined }
);

/**
 * 简单的键值对对象
 */
export const arbSimpleObject = fc.dictionary(
  arbIdentifier,
  fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
  { minKeys: 0, maxKeys: 5 }
);

// ============================================================================
// 工具相关
// ============================================================================

/**
 * 工具参数
 */
export const arbToolArgs = fc.dictionary(
  arbIdentifier,
  fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
  { minKeys: 0, maxKeys: 5 }
);

/**
 * 错误代码
 */
export const arbErrorCode = fc.stringOf(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
  { minLength: 3, maxLength: 30 }
);

/**
 * 工具执行结果
 */
export const arbToolResult = fc.record({
  success: fc.boolean(),
  content: arbNonEmptyString(200),
  data: fc.option(arbJsonValue, { nil: undefined }),
  error: fc.option(
    fc.record({
      code: arbErrorCode,
      message: arbNonEmptyString(100),
    }),
    { nil: undefined }
  ),
});

/**
 * 成功的工具结果
 */
export const arbSuccessToolResult = fc.record({
  success: fc.constant(true),
  content: arbNonEmptyString(200),
  data: fc.option(arbJsonValue, { nil: undefined }),
});

/**
 * 失败的工具结果
 */
export const arbFailureToolResult = fc.record({
  success: fc.constant(false),
  content: arbNonEmptyString(200),
  error: fc.record({
    code: arbErrorCode,
    message: arbNonEmptyString(100),
  }),
});

// ============================================================================
// 数值相关
// ============================================================================

/**
 * 正整数
 *
 * @param max - 最大值
 */
export const arbPositiveInt = (max = 100) => fc.integer({ min: 1, max });

/**
 * 非负整数
 *
 * @param max - 最大值
 */
export const arbNonNegativeInt = (max = 60000) => fc.integer({ min: 0, max });

/**
 * 持续时间（毫秒）
 */
export const arbDurationMs = arbNonNegativeInt(60000);

/**
 * 温度参数（0-2）
 */
export const arbTemperature = fc.double({ min: 0, max: 2, noNaN: true });

/**
 * maxTokens 参数
 */
export const arbMaxTokens = fc.integer({ min: 1, max: 4096 });

/**
 * maxIterations 参数
 */
export const arbMaxIterations = fc.integer({ min: 1, max: 50 });

// ============================================================================
// 时间相关
// ============================================================================

/**
 * 合理范围内的时间戳
 */
export const arbTimestamp = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2030-12-31'),
});

/**
 * 过去的时间戳
 */
export const arbPastTimestamp = fc.date({
  min: new Date('2020-01-01'),
  max: new Date(),
});

// ============================================================================
// LLM 相关
// ============================================================================

/**
 * LLM 提供商
 */
export const arbLLMProvider = fc.constantFrom(
  'openai',
  'claude',
  'qwen',
  'siliconflow',
  'anyrouter'
);

/**
 * LLM 任务类型
 */
export const arbLLMTask = fc.constantFrom(
  'intent_parsing',
  'knowledge_retrieval',
  'tool_calling',
  'response_generation'
);

/**
 * LLM 错误代码
 */
export const arbLLMErrorCode = fc.constantFrom(
  'AUTHENTICATION_ERROR',
  'RATE_LIMIT_ERROR',
  'INVALID_REQUEST',
  'MODEL_NOT_FOUND',
  'CONTEXT_LENGTH_EXCEEDED',
  'CONTENT_FILTER',
  'TIMEOUT',
  'NETWORK_ERROR',
  'CANCELLED',
  'UNKNOWN_ERROR'
);

/**
 * 风险级别
 */
export const arbRiskLevel = fc.constantFrom('low', 'medium', 'high');

// ============================================================================
// 复合类型
// ============================================================================

/**
 * 消息操作
 */
export interface MessageOperation {
  type: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * 消息操作生成器
 */
export const arbMessageOperation: fc.Arbitrary<MessageOperation> = fc.record({
  type: fc.constantFrom('user', 'assistant', 'system'),
  content: arbMessageContent,
});

/**
 * 消息操作序列
 */
export const arbMessageOperations = fc.array(arbMessageOperation, {
  minLength: 1,
  maxLength: 20,
});

/**
 * 工具调用
 */
export const arbToolCall = fc.record({
  id: fc.uuid().map((id) => `call_${id}`),
  type: fc.constant('function' as const),
  function: fc.record({
    name: arbToolName,
    arguments: fc.json(),
  }),
});

/**
 * 工具调用数组
 */
export const arbToolCalls = fc.array(arbToolCall, { minLength: 1, maxLength: 5 });

/**
 * LLM 响应
 */
export const arbLLMResponse = fc.record({
  content: arbNonEmptyString(500),
  toolCalls: fc.option(arbToolCalls, { nil: undefined }),
});

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 创建唯一标识符生成器
 *
 * @param prefix - 前缀
 */
export function arbUniqueId(prefix: string) {
  return fc.uuid().map((uuid) => `${prefix}_${uuid}`);
}

/**
 * 创建带索引的唯一标识符生成器
 *
 * @param prefix - 前缀
 */
export function arbIndexedId(prefix: string) {
  return fc.integer({ min: 0, max: 999999 }).map((i) => `${prefix}_${i}`);
}

/**
 * 创建枚举生成器
 *
 * @param values - 枚举值数组
 */
export function arbEnum<T extends string>(...values: T[]): fc.Arbitrary<T> {
  return fc.constantFrom(...values);
}

/**
 * 创建可选值生成器
 *
 * @param arb - 基础生成器
 */
export function arbOptional<T>(arb: fc.Arbitrary<T>): fc.Arbitrary<T | undefined> {
  return fc.option(arb, { nil: undefined });
}
