/**
 * 统一的测试配置常量
 *
 * 提供测试运行次数、超时时间等配置的统一管理
 */

/**
 * 测试配置常量
 */
export const TEST_CONFIG = {
  /**
   * Property-based 测试运行次数
   */
  PROPERTY_RUNS: {
    /** 快速验证 - 用于开发时快速反馈 */
    FAST: 30,
    /** 常规测试 - 用于本地完整测试 */
    NORMAL: 100,
    /** 深度测试 - 用于 CI 环境 */
    THOROUGH: 200,
  },

  /**
   * 超时配置（毫秒）
   */
  TIMEOUT: {
    /** 单元测试 */
    UNIT: 5000,
    /** Property 测试 */
    PROPERTY: 30000,
    /** E2E 测试 */
    E2E: 60000,
    /** 集成测试 */
    INTEGRATION: 30000,
  },

  /**
   * 重试配置
   */
  RETRY: {
    /** CI 环境重试次数 */
    CI: 2,
    /** 本地环境重试次数 */
    LOCAL: 0,
  },
} as const;

/**
 * 根据环境获取 property 测试运行次数
 *
 * @param level - 测试级别
 * @returns 运行次数
 *
 * @example
 * ```typescript
 * fc.assert(fc.property(...), { numRuns: getPropertyRuns('NORMAL') });
 * ```
 */
export function getPropertyRuns(
  level: keyof typeof TEST_CONFIG.PROPERTY_RUNS = 'NORMAL'
): number {
  // CI 环境使用更多运行次数
  if (process.env.CI) {
    return TEST_CONFIG.PROPERTY_RUNS.THOROUGH;
  }
  return TEST_CONFIG.PROPERTY_RUNS[level];
}

/**
 * 获取测试超时时间
 *
 * @param type - 测试类型
 * @returns 超时时间（毫秒）
 */
export function getTestTimeout(
  type: keyof typeof TEST_CONFIG.TIMEOUT = 'UNIT'
): number {
  return TEST_CONFIG.TIMEOUT[type];
}

/**
 * 获取重试次数
 *
 * @returns 重试次数
 */
export function getRetryCount(): number {
  return process.env.CI ? TEST_CONFIG.RETRY.CI : TEST_CONFIG.RETRY.LOCAL;
}

/**
 * 检查是否应该跳过 E2E 测试
 *
 * @param envVar - 环境变量名
 * @returns 是否跳过
 */
export function shouldSkipE2E(envVar = 'E2E_API_KEY'): boolean {
  return !process.env[envVar];
}

/**
 * 检查是否在 CI 环境中运行
 */
export function isCI(): boolean {
  return !!process.env.CI;
}
