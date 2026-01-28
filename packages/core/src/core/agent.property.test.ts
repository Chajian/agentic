/**
 * Property-Based Tests for Agent Session History (Stateless Mode)
 *
 * **Feature: ai-assistant-session-persistence, Property 9: Session History Synchronization**
 * **Validates: Requirements 8.1, 8.2, 8.4**
 *
 * In stateless mode, the Agent no longer maintains session state in memory.
 * These tests verify that the deprecated methods behave correctly:
 * - importSessionHistory: does nothing (deprecated)
 * - getHistory: always returns empty array (deprecated)
 * - hasSessionHistory: always returns false (deprecated)
 *
 * History should be passed via options.history in chat() instead.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
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

// ============================================================================
// Test Helpers
// ============================================================================

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

// ============================================================================
// Arbitrary Generators
// ============================================================================

/**
 * Generate a valid session ID (UUID-like format)
 */
const sessionIdArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
  { minLength: 8, maxLength: 36 }
).map(s => `session_${s}`);

/**
 * Generate a valid message ID
 */
const messageIdArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
  { minLength: 8, maxLength: 36 }
).map(s => `msg_${s}`);

/**
 * Generate a valid role
 */
const roleArb = fc.constantFrom('user', 'assistant', 'system');

/**
 * Generate message content (non-empty string)
 */
const contentArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?'.split('')),
  { minLength: 1, maxLength: 500 }
);

/**
 * Generate a valid response type
 */
const responseTypeArb = fc.option(
  fc.constantFrom('execute', 'clarify', 'confirm', 'options', 'knowledge_request'),
  { nil: null }
);

/**
 * Generate tool calls as JSON string (or null)
 */
const toolCallsArb = fc.option(
  fc.array(
    fc.record({
      toolName: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'.split('')), { minLength: 3, maxLength: 20 }),
      arguments: fc.record({
        target: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      }),
      result: fc.record({
        success: fc.boolean(),
        content: fc.string({ minLength: 1, maxLength: 50 }),
      }),
    }),
    { minLength: 1, maxLength: 3 }
  ).map(calls => JSON.stringify(calls)),
  { nil: null }
);

/**
 * Generate a timestamp within a reasonable range
 */
const timestampArb = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2026-12-31'),
});

/**
 * Generate an external message (database format)
 */
const externalMessageArb = fc.record({
  id: messageIdArb,
  role: roleArb,
  content: contentArb,
  createdAt: timestampArb,
  toolCalls: toolCallsArb,
  responseType: responseTypeArb,
});

/**
 * Generate an array of external messages in chronological order
 */
const externalMessagesArb = fc.array(externalMessageArb, { minLength: 1, maxLength: 20 })
  .map(messages => {
    // Sort by createdAt to ensure chronological order
    return messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  });

// ============================================================================
// Property Tests for Stateless Mode
// ============================================================================

describe('Agent - Property 9: Session History Synchronization (Stateless Mode)', () => {
  /**
   * **Feature: ai-assistant-session-persistence, Property 9: Session History Synchronization**
   * **Validates: Requirements 8.1, 8.2, 8.4**
   *
   * In stateless mode, session history is NOT stored in memory.
   * These tests verify the deprecated methods behave correctly.
   */

  describe('Stateless Behavior - getHistory always returns empty', () => {
    /**
     * Property: In stateless mode, getHistory should always return an empty array
     * regardless of what was imported.
     */
    it('should always return empty array after import (stateless mode)', () => {
      fc.assert(
        fc.property(
          sessionIdArb,
          externalMessagesArb,
          (sessionId, messages) => {
            const config = createTestConfig();
            const agent = new Agent(config);

            // Import session history (deprecated - does nothing in stateless mode)
            agent.importSessionHistory(sessionId, messages);

            // Get history from agent - should always be empty in stateless mode
            const history = agent.getHistory(sessionId);

            // Property: history should always be empty in stateless mode
            expect(history).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Stateless Behavior - hasSessionHistory always returns false', () => {
    /**
     * Property: In stateless mode, hasSessionHistory should always return false
     * regardless of what was imported.
     */
    it('should always return false after import (stateless mode)', () => {
      fc.assert(
        fc.property(
          sessionIdArb,
          externalMessagesArb,
          (sessionId, messages) => {
            const config = createTestConfig();
            const agent = new Agent(config);

            // Before import
            expect(agent.hasSessionHistory(sessionId)).toBe(false);

            // Import session history (deprecated - does nothing in stateless mode)
            agent.importSessionHistory(sessionId, messages);

            // After import - should still be false in stateless mode
            expect(agent.hasSessionHistory(sessionId)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: hasSessionHistory should return false for empty message arrays
     */
    it('should return false for empty message arrays', () => {
      fc.assert(
        fc.property(
          sessionIdArb,
          (sessionId) => {
            const config = createTestConfig();
            const agent = new Agent(config);

            // Import empty history
            agent.importSessionHistory(sessionId, []);

            // Should return false
            expect(agent.hasSessionHistory(sessionId)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Stateless Behavior - importSessionHistory does not throw', () => {
    /**
     * Property: importSessionHistory should not throw for any valid input
     */
    it('should not throw for any valid input', () => {
      fc.assert(
        fc.property(
          sessionIdArb,
          externalMessagesArb,
          (sessionId, messages) => {
            const config = createTestConfig();
            const agent = new Agent(config);

            // Should not throw
            expect(() => agent.importSessionHistory(sessionId, messages)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: importSessionHistory should not throw for empty arrays
     */
    it('should not throw for empty message arrays', () => {
      fc.assert(
        fc.property(
          sessionIdArb,
          (sessionId) => {
            const config = createTestConfig();
            const agent = new Agent(config);

            // Should not throw
            expect(() => agent.importSessionHistory(sessionId, [])).not.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Stateless Behavior - Multiple sessions', () => {
    /**
     * Property: Multiple session imports should all result in empty histories
     */
    it('should return empty history for all sessions', () => {
      fc.assert(
        fc.property(
          sessionIdArb,
          sessionIdArb.map(s => `${s}_other`),
          externalMessagesArb,
          externalMessagesArb,
          (sessionId1, sessionId2, messages1, messages2) => {
            const config = createTestConfig();
            const agent = new Agent(config);

            // Import history to both sessions
            agent.importSessionHistory(sessionId1, messages1);
            agent.importSessionHistory(sessionId2, messages2);

            // Get histories - both should be empty in stateless mode
            const history1 = agent.getHistory(sessionId1);
            const history2 = agent.getHistory(sessionId2);

            // Property: both histories should be empty
            expect(history1).toEqual([]);
            expect(history2).toEqual([]);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Stateless Behavior - Re-import', () => {
    /**
     * Property: Re-importing history should still result in empty history
     */
    it('should return empty history after re-import', () => {
      fc.assert(
        fc.property(
          sessionIdArb,
          externalMessagesArb,
          externalMessagesArb,
          (sessionId, messages1, messages2) => {
            const config = createTestConfig();
            const agent = new Agent(config);

            // Import first set of messages
            agent.importSessionHistory(sessionId, messages1);
            expect(agent.getHistory(sessionId)).toEqual([]);

            // Import second set of messages
            agent.importSessionHistory(sessionId, messages2);
            const history = agent.getHistory(sessionId);

            // Property: history should still be empty
            expect(history).toEqual([]);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
