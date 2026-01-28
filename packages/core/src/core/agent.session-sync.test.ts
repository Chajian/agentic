/**
 * Unit Tests for Agent Session History Synchronization (Stateless Mode)
 *
 * In stateless mode, Agent no longer maintains session state in memory.
 * These tests verify the deprecated methods behave correctly:
 * - importSessionHistory: prints warning, does nothing
 * - hasSessionHistory: always returns false
 * - getHistory: always returns empty array
 *
 * History should be passed via options.history in chat() instead.
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.5_
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Agent } from './agent.js';
import type { AgentConfig } from '../types/config.js';

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

/**
 * Create a minimal agent config for testing
 */
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
      requireConfirmation: false,
      maxIterations: 5,
      timeoutMs: 5000,
    },
  };
}

describe('Agent Session Synchronization (Stateless Mode)', () => {
  let agent: Agent;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    agent = new Agent(createTestConfig());
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  /**
   * importSessionHistory() - Deprecated in Stateless Mode
   * Should print warning and do nothing
   * _Requirements: 8.1, 8.2_
   */
  describe('importSessionHistory (Deprecated)', () => {
    it('should print deprecation warning', () => {
      const sessionId = 'test-session-1';
      const messages = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          createdAt: new Date('2025-01-01T10:00:00Z'),
          toolCalls: null,
          responseType: null,
        },
      ];

      agent.importSessionHistory(sessionId, messages);

      // Check that console.warn was called with a message containing the deprecation text
      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnCall = consoleWarnSpy.mock.calls[0][0];
      expect(warnCall).toContain('importSessionHistory is deprecated');
    });

    it('should not store history in memory', () => {
      const sessionId = 'test-session-2';
      const messages = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          createdAt: new Date(),
          toolCalls: null,
          responseType: null,
        },
      ];

      agent.importSessionHistory(sessionId, messages);

      // getHistory should return empty array in stateless mode
      const history = agent.getHistory(sessionId);
      expect(history).toEqual([]);
    });

    it('should not throw for any input', () => {
      // Various inputs should not cause errors
      expect(() => agent.importSessionHistory('session1', [])).not.toThrow();
      expect(() => agent.importSessionHistory('session2', [
        { id: '1', role: 'user', content: 'test', createdAt: new Date(), toolCalls: null, responseType: null },
      ])).not.toThrow();
      expect(() => agent.importSessionHistory('session3', [
        { id: '1', role: 'assistant', content: 'test', createdAt: '2025-01-01', toolCalls: '[]', responseType: 'execute' },
      ])).not.toThrow();
    });
  });

  /**
   * hasSessionHistory() - Deprecated in Stateless Mode
   * Should always return false
   * _Requirements: 8.3_
   */
  describe('hasSessionHistory (Deprecated)', () => {
    it('should print deprecation warning', () => {
      agent.hasSessionHistory('any-session');

      // Check that console.warn was called with a message containing the deprecation text
      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnCall = consoleWarnSpy.mock.calls[0][0];
      expect(warnCall).toContain('hasSessionHistory is deprecated');
    });

    it('should always return false', () => {
      expect(agent.hasSessionHistory('non-existent-session')).toBe(false);
      expect(agent.hasSessionHistory('session-1')).toBe(false);

      // Even after attempting to import history
      agent.importSessionHistory('session-2', [
        { id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date(), toolCalls: null, responseType: null },
      ]);
      expect(agent.hasSessionHistory('session-2')).toBe(false);
    });
  });

  /**
   * getHistory() - Deprecated in Stateless Mode
   * Should always return empty array
   * _Requirements: 8.1, 8.2_
   */
  describe('getHistory (Deprecated)', () => {
    it('should print deprecation warning', () => {
      agent.getHistory('any-session');

      // Check that console.warn was called with a message containing the deprecation text
      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnCall = consoleWarnSpy.mock.calls[0][0];
      expect(warnCall).toContain('getHistory is deprecated');
    });

    it('should always return empty array', () => {
      expect(agent.getHistory('non-existent-session')).toEqual([]);
      expect(agent.getHistory('session-1')).toEqual([]);

      // Even after attempting to import history
      agent.importSessionHistory('session-2', [
        { id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date(), toolCalls: null, responseType: null },
      ]);
      expect(agent.getHistory('session-2')).toEqual([]);
    });
  });

  /**
   * createSession() - Deprecated in Stateless Mode
   * Should return a generated session ID
   * _Requirements: 8.1_
   */
  describe('createSession (Deprecated)', () => {
    it('should print deprecation warning', () => {
      agent.createSession();

      // Check that console.warn was called with a message containing the deprecation text
      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnCall = consoleWarnSpy.mock.calls[0][0];
      expect(warnCall).toContain('createSession is deprecated');
    });

    it('should return a generated session ID', () => {
      const sessionId = agent.createSession();

      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should return unique session IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 10; i++) {
        ids.add(agent.createSession());
      }
      expect(ids.size).toBe(10);
    });
  });

  /**
   * getCurrentSessionId() - Deprecated in Stateless Mode
   * Should return 'stateless'
   */
  describe('getCurrentSessionId (Deprecated)', () => {
    it('should return "stateless"', () => {
      expect(agent.getCurrentSessionId()).toBe('stateless');
    });
  });

  /**
   * Stateless operation via chat() with options.history
   * This is the new recommended approach
   */
  describe('Stateless Operation via chat()', () => {
    it('should accept history via options', async () => {
      const llmManager = agent.getLLMManager();
      (llmManager.generateWithTools as any).mockResolvedValue({
        content: 'Hello! How can I help you?',
        toolCalls: [],
      });

      const history = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Previous message',
          timestamp: new Date(),
        },
        {
          id: 'msg-2',
          role: 'assistant' as const,
          content: 'Previous response',
          timestamp: new Date(),
        },
      ];

      const response = await agent.chat('Current message', {
        history,
      });

      expect(response).toBeDefined();
      expect(response.type).toBe('execute');
    });

    it('should accept pendingConfirmation via options', async () => {
      const response = await agent.chat('yes', {
        pendingConfirmation: {
          toolName: 'delete_file',
          arguments: { target: 'test.txt' },
          userMessage: 'Delete the file',
          timestamp: new Date(),
        },
      });

      // Should handle as cancellation since we didn't set up the tool
      expect(response).toBeDefined();
    });
  });
});
