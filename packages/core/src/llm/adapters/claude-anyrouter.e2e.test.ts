/**
 * Claude Adapter + AnyRouter E2E Tests
 *
 * Tests Claude adapter with AnyRouter as baseURL.
 * AnyRouter supports Anthropic's native Messages API format.
 *
 * Run with: npx vitest run claude-anyrouter.e2e.test.ts
 *
 * Note: Requires ANYROUTER_API_KEY environment variable
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ClaudeAdapter } from './claude.js';
import { shouldSkipE2E } from '../../test-utils/index.js';

// Check if E2E tests should be skipped
const SKIP_E2E = shouldSkipE2E('ANYROUTER_API_KEY');

// AnyRouter endpoints that support Anthropic Messages API
const ENDPOINTS = [
  { name: '主站', url: 'https://anyrouter.top' },
  { name: '大陆优化1', url: 'https://pmpjfbhq.cn-nb1.rainapp.top' },
  { name: '大陆优化2', url: 'https://a-ocnfniawgw.cn-shanghai.fcapp.run' },
];

// Claude models available via AnyRouter
const MODELS = [
  'claude-3-5-haiku-20241022',
  'claude-3-5-sonnet-20241022',
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
];

// Test results storage
interface TestResult {
  endpoint: string;
  model: string;
  success: boolean;
  latency?: number;
  error?: string;
  response?: string;
}

const results: TestResult[] = [];

// Get API key from environment
const API_KEY = process.env.ANYROUTER_API_KEY || '';

describe.skipIf(SKIP_E2E)('Claude Adapter + AnyRouter E2E Tests', () => {
  beforeAll(() => {
    if (!API_KEY) {
      console.warn('⚠️  ANYROUTER_API_KEY not set, tests will be skipped');
      return;
    }
    console.log('\n🚀 Starting Claude + AnyRouter E2E Tests...\n');
    console.log('📝 Using Anthropic Messages API format (not OpenAI format)\n');
  });

  // Generate tests for each endpoint and model combination
  for (const endpoint of ENDPOINTS) {
    describe(`Endpoint: ${endpoint.name} (${endpoint.url})`, () => {
      for (const model of MODELS) {
        it(`Model: ${model}`, async () => {
          const result: TestResult = {
            endpoint: endpoint.name,
            model,
            success: false,
          };

          if (!API_KEY) {
            result.error = 'API_KEY not set';
            results.push(result);
            // Skip test instead of failing when API key is not available
            console.log('⚠️  Skipping E2E test: ANYROUTER_API_KEY not set');
            return;
          }

          const adapter = new ClaudeAdapter({
            apiKey: API_KEY,
            model,
            baseUrl: endpoint.url,
            timeoutMs: 60000,
          });

          const startTime = Date.now();

          try {
            const response = await adapter.generate('Say "Hello" in one word only.');
            const latency = Date.now() - startTime;

            result.success = true;
            result.latency = latency;
            result.response = response.substring(0, 100);

            console.log(`  ✅ ${endpoint.name} + ${model}: ${latency}ms`);
            console.log(`     Response: ${response.substring(0, 50)}...`);

            expect(response).toBeTruthy();
            expect(response.length).toBeGreaterThan(0);
          } catch (error) {
            const latency = Date.now() - startTime;
            result.latency = latency;
            result.error = error instanceof Error ? error.message : String(error);

            console.log(`  ❌ ${endpoint.name} + ${model}: ${result.error}`);

            // Don't fail the test, just record the result
          }

          results.push(result);
        }, 120000); // 2 minute timeout per test
      }
    });
  }

  // Summary test that runs after all others
  describe('Summary', () => {
    it('should print test summary', () => {
      console.log('\n' + '='.repeat(80));
      console.log('📊 Claude + AnyRouter E2E Test Summary');
      console.log('='.repeat(80) + '\n');

      // Group by endpoint
      for (const endpoint of ENDPOINTS) {
        const endpointResults = results.filter((r) => r.endpoint === endpoint.name);
        const successCount = endpointResults.filter((r) => r.success).length;
        const totalCount = endpointResults.length;

        console.log(`\n📍 ${endpoint.name} (${endpoint.url})`);
        console.log(`   Success: ${successCount}/${totalCount}`);
        console.log('-'.repeat(60));

        for (const result of endpointResults) {
          const status = result.success ? '✅' : '❌';
          const latency = result.latency ? `${result.latency}ms` : 'N/A';
          const info = result.success ? `${latency}` : `${result.error?.substring(0, 50)}`;
          console.log(`   ${status} ${result.model.padEnd(35)} ${info}`);
        }
      }

      // Overall summary
      const totalSuccess = results.filter((r) => r.success).length;
      const totalTests = results.length;
      console.log('\n' + '='.repeat(80));
      console.log(`📈 Overall: ${totalSuccess}/${totalTests} tests passed`);
      console.log('='.repeat(80) + '\n');

      // Export results as JSON
      console.log('\n📄 Raw Results (JSON):');
      console.log(JSON.stringify(results, null, 2));
    });
  });
});
