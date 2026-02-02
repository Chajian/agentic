import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // 超时配置
    testTimeout: 10000,
    hookTimeout: 10000,
    // CI 环境重试配置（减少 flaky 测试）
    retry: process.env.CI ? 2 : 0,
    // 并发配置
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/test-utils/**',
        '**/*.test.ts',
        '**/*.e2e.test.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@test-utils': resolve(__dirname, './src/test-utils'),
    },
  },
});
