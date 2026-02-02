/**
 * 测试清理工具
 *
 * 确保测试后资源被正确清理，避免测试间的状态污染
 */

/**
 * 清理函数类型
 */
export type CleanupFn = () => void | Promise<void>;

/**
 * 清理管理器
 *
 * 管理测试清理函数的注册和执行
 *
 * @example
 * ```typescript
 * const cleanup = new CleanupManager();
 *
 * // 注册清理函数
 * cleanup.register(() => store.clear());
 * cleanup.register(() => connection.close());
 *
 * // 测试结束后执行清理
 * await cleanup.cleanup();
 * ```
 */
export class CleanupManager {
  private cleanupFns: CleanupFn[] = [];
  private cleaned = false;

  /**
   * 注册清理函数
   *
   * @param fn - 清理函数
   * @returns this（支持链式调用）
   */
  register(fn: CleanupFn): this {
    if (this.cleaned) {
      throw new Error('Cannot register cleanup after cleanup has been called');
    }
    this.cleanupFns.push(fn);
    return this;
  }

  /**
   * 执行所有清理函数
   *
   * 清理函数按注册的逆序执行（后注册的先清理）
   * 即使某个清理函数失败，也会继续执行其他清理函数
   *
   * @throws AggregateError 如果有清理函数失败
   */
  async cleanup(): Promise<void> {
    if (this.cleaned) {
      return;
    }

    const errors: Error[] = [];

    // 逆序执行清理（后注册的先清理）
    for (const fn of this.cleanupFns.reverse()) {
      try {
        await fn();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.cleanupFns = [];
    this.cleaned = true;

    if (errors.length > 0) {
      throw new AggregateError(errors, `Cleanup failed with ${errors.length} error(s)`);
    }
  }

  /**
   * 重置清理管理器
   *
   * 清除所有已注册的清理函数，允许重新使用
   */
  reset(): void {
    this.cleanupFns = [];
    this.cleaned = false;
  }

  /**
   * 获取已注册的清理函数数量
   */
  get count(): number {
    return this.cleanupFns.length;
  }

  /**
   * 检查是否已执行清理
   */
  get isCleaned(): boolean {
    return this.cleaned;
  }
}

/**
 * 创建带自动清理的测试上下文
 *
 * @param setup - 设置函数，接收 CleanupManager 并返回测试上下文
 * @returns 异步函数，执行设置并在完成后自动清理
 *
 * @example
 * ```typescript
 * const runTest = withCleanup(async (cleanup) => {
 *   const store = new KnowledgeStore();
 *   cleanup.register(() => store.clear());
 *   return store;
 * });
 *
 * const store = await runTest();
 * // 使用 store...
 * // 函数返回后自动清理
 * ```
 */
export function withCleanup<T>(
  setup: (cleanup: CleanupManager) => T | Promise<T>
): () => Promise<{ result: T; cleanup: () => Promise<void> }> {
  return async () => {
    const cleanupManager = new CleanupManager();
    const result = await setup(cleanupManager);
    return {
      result,
      cleanup: () => cleanupManager.cleanup(),
    };
  };
}

/**
 * 创建测试夹具
 *
 * 提供 setup 和 teardown 的便捷封装
 *
 * @example
 * ```typescript
 * const fixture = createTestFixture(
 *   async () => {
 *     const store = new KnowledgeStore();
 *     await store.initialize();
 *     return store;
 *   },
 *   async (store) => {
 *     await store.clear();
 *     await store.close();
 *   }
 * );
 *
 * // 在测试中使用
 * const store = await fixture.setup();
 * // ... 测试代码
 * await fixture.teardown(store);
 * ```
 */
export function createTestFixture<T>(
  setup: () => T | Promise<T>,
  teardown: (instance: T) => void | Promise<void>
): {
  setup: () => Promise<T>;
  teardown: (instance: T) => Promise<void>;
  run: <R>(fn: (instance: T) => R | Promise<R>) => Promise<R>;
} {
  return {
    setup: async () => setup(),
    teardown: async (instance: T) => teardown(instance),
    run: async <R>(fn: (instance: T) => R | Promise<R>): Promise<R> => {
      const instance = await setup();
      try {
        return await fn(instance);
      } finally {
        await teardown(instance);
      }
    },
  };
}

/**
 * 资源池
 *
 * 管理可重用的测试资源
 *
 * @example
 * ```typescript
 * const connectionPool = new ResourcePool(
 *   () => createConnection(),
 *   (conn) => conn.close()
 * );
 *
 * const conn = await connectionPool.acquire();
 * // 使用连接...
 * await connectionPool.release(conn);
 *
 * // 测试结束后清理所有资源
 * await connectionPool.cleanup();
 * ```
 */
export class ResourcePool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private createFn: () => T | Promise<T>;
  private destroyFn: (resource: T) => void | Promise<void>;

  constructor(
    create: () => T | Promise<T>,
    destroy: (resource: T) => void | Promise<void>
  ) {
    this.createFn = create;
    this.destroyFn = destroy;
  }

  /**
   * 获取资源
   */
  async acquire(): Promise<T> {
    let resource = this.available.pop();
    if (!resource) {
      resource = await this.createFn();
    }
    this.inUse.add(resource);
    return resource;
  }

  /**
   * 释放资源
   */
  release(resource: T): void {
    if (this.inUse.has(resource)) {
      this.inUse.delete(resource);
      this.available.push(resource);
    }
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    const allResources = [...this.available, ...this.inUse];
    this.available = [];
    this.inUse.clear();

    const errors: Error[] = [];
    for (const resource of allResources) {
      try {
        await this.destroyFn(resource);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Resource cleanup failed');
    }
  }

  /**
   * 获取池状态
   */
  get stats(): { available: number; inUse: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
    };
  }
}

/**
 * 延迟执行器
 *
 * 收集操作并在最后批量执行
 */
export class DeferredExecutor {
  private operations: Array<() => void | Promise<void>> = [];

  /**
   * 添加延迟操作
   */
  defer(operation: () => void | Promise<void>): this {
    this.operations.push(operation);
    return this;
  }

  /**
   * 执行所有延迟操作
   */
  async execute(): Promise<void> {
    const errors: Error[] = [];

    for (const op of this.operations) {
      try {
        await op();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.operations = [];

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Deferred execution failed');
    }
  }

  /**
   * 清除所有待执行操作
   */
  clear(): void {
    this.operations = [];
  }

  /**
   * 获取待执行操作数量
   */
  get count(): number {
    return this.operations.length;
  }
}
