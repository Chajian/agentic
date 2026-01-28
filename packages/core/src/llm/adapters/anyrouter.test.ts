/**
 * AnyRouter Adapter Tests
 * 
 * Basic tests for the AnyRouter LLM adapter.
 */

import { describe, it, expect } from 'vitest';
import { AnyRouterAdapter, ANYROUTER_ENDPOINTS, ANYROUTER_MODELS } from './anyrouter.js';

describe('AnyRouterAdapter', () => {
  describe('Configuration', () => {
    it('should use main endpoint by default', () => {
      const adapter = new AnyRouterAdapter({
        apiKey: 'sk-test',
        model: ANYROUTER_MODELS.CLAUDE_3_5_SONNET,
      });

      expect(adapter.provider).toBe('anyrouter');
      expect(adapter.model).toBe(ANYROUTER_MODELS.CLAUDE_3_5_SONNET);
    });

    it('should use China endpoint when configured', () => {
      const adapter = new AnyRouterAdapter({
        apiKey: 'sk-test',
        model: 'claude-3-5-sonnet-20241022',
        useChinaEndpoint: true,
      });

      expect(adapter.provider).toBe('anyrouter');
    });

    it('should use custom endpoint when provided', () => {
      const adapter = new AnyRouterAdapter({
        apiKey: 'sk-test',
        model: 'gemini-2.5-pro',
        endpoint: ANYROUTER_ENDPOINTS.CN_OPTIMIZED_2,
      });

      expect(adapter.provider).toBe('anyrouter');
    });
  });

  describe('Capabilities', () => {
    it('should support tool calling', () => {
      const adapter = new AnyRouterAdapter({
        apiKey: 'sk-test',
        model: 'claude-3-5-sonnet-20241022',
      });

      expect(adapter.supportsToolCalling()).toBe(true);
    });

    it('should support streaming', () => {
      const adapter = new AnyRouterAdapter({
        apiKey: 'sk-test',
        model: 'claude-3-5-sonnet-20241022',
      });

      expect(adapter.supportsStreaming()).toBe(true);
    });

    it('should not support embeddings', () => {
      const adapter = new AnyRouterAdapter({
        apiKey: 'sk-test',
        model: 'claude-3-5-sonnet-20241022',
      });

      expect(adapter.supportsEmbeddings()).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should export endpoint constants', () => {
      expect(ANYROUTER_ENDPOINTS.MAIN).toBe('https://anyrouter.top');
      expect(ANYROUTER_ENDPOINTS.CN_OPTIMIZED_1).toBe('https://pmpjfbhq.cn-nb1.rainapp.top');
      expect(ANYROUTER_ENDPOINTS.CN_OPTIMIZED_2).toBe('https://a-ocnfniawgw.cn-shanghai.fcapp.run');
    });

    it('should export model constants', () => {
      expect(ANYROUTER_MODELS.CLAUDE_OPUS_4_5).toBe('claude-opus-4-5');
      expect(ANYROUTER_MODELS.CLAUDE_SONNET_4_5).toBe('claude-sonnet-4-5');
      expect(ANYROUTER_MODELS.CLAUDE_3_5_SONNET).toBe('claude-3-5-sonnet-20241022');
      expect(ANYROUTER_MODELS.GEMINI_2_5_PRO).toBe('gemini-2.5-pro');
    });
  });
});
