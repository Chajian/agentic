/**
 * Property-Based Tests for Session Management
 *
 * **Feature: ai-agent, Property 3: Conversation History Ordering**
 * **Feature: ai-agent, Property 8: Session Isolation**
 * **Validates: Requirements 9.4, 9.5**
 *
 * Tests that conversation history is properly ordered and sessions are isolated.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  SessionManager,
  createSessionManager,
  type Message,
  type CreateSessionOptions,
} from './session.js';
import { createExecuteResponse, createClarifyResponse } from '../types/response.js';

// Arbitraries for generating test data

const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 100 });

// Use UUID-like session IDs to ensure uniqueness across test runs
const arbSessionId = fc.uuid().map((uuid) => `session_${uuid}`);

const arbMessageContent = fc.string({ minLength: 1, maxLength: 500 });

const arbMetadata = fc.option(
  fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.jsonValue()),
  { nil: undefined }
);

// Generate a sequence of message operations
interface MessageOperation {
  type: 'user' | 'assistant' | 'system';
  content: string;
}

const arbMessageOperation: fc.Arbitrary<MessageOperation> = fc.record({
  type: fc.constantFrom('user', 'assistant', 'system'),
  content: arbMessageContent,
});

const arbMessageOperations = fc.array(arbMessageOperation, { minLength: 1, maxLength: 20 });

describe('Conversation History Ordering Property Tests', () => {
  /**
   * **Feature: ai-agent, Property 3: Conversation History Ordering**
   * **Validates: Requirements 9.4**
   *
   * For any session, conversation messages should be returned in
   * chronological order by creation timestamp.
   */
  it('Property 3: Messages are returned in chronological order', () => {
    fc.assert(
      fc.property(arbSessionId, arbMessageOperations, (sessionId, operations) => {
        // Create a fresh session manager for each test case
        const sessionManager = createSessionManager();

        // Create session
        sessionManager.createSession({ id: sessionId });

        // Add messages
        for (const op of operations) {
          if (op.type === 'user') {
            sessionManager.addUserMessage(sessionId, op.content);
          } else if (op.type === 'assistant') {
            const response = createExecuteResponse(op.content);
            sessionManager.addAssistantMessage(sessionId, response);
          } else {
            sessionManager.addSystemMessage(sessionId, op.content);
          }
        }

        // Get history
        const history = sessionManager.getHistory(sessionId);

        // Verify chronological order
        for (let i = 1; i < history.length; i++) {
          const prevTimestamp = history[i - 1].timestamp.getTime();
          const currTimestamp = history[i].timestamp.getTime();
          expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
        }

        // Verify all messages are present
        expect(history.length).toBe(operations.length);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: History order is stable across multiple retrievals', () => {
    fc.assert(
      fc.property(arbSessionId, arbMessageOperations, (sessionId, operations) => {
        // Create a fresh session manager for each test case
        const sessionManager = createSessionManager();

        // Create session and add messages
        sessionManager.createSession({ id: sessionId });

        for (const op of operations) {
          if (op.type === 'user') {
            sessionManager.addUserMessage(sessionId, op.content);
          } else if (op.type === 'assistant') {
            const response = createExecuteResponse(op.content);
            sessionManager.addAssistantMessage(sessionId, response);
          } else {
            sessionManager.addSystemMessage(sessionId, op.content);
          }
        }

        // Get history multiple times
        const history1 = sessionManager.getHistory(sessionId);
        const history2 = sessionManager.getHistory(sessionId);
        const history3 = sessionManager.getHistory(sessionId);

        // All retrievals should return the same order
        expect(history1.length).toBe(history2.length);
        expect(history2.length).toBe(history3.length);

        for (let i = 0; i < history1.length; i++) {
          expect(history1[i].id).toBe(history2[i].id);
          expect(history2[i].id).toBe(history3[i].id);
          expect(history1[i].content).toBe(history2[i].content);
          expect(history2[i].content).toBe(history3[i].content);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: Empty session returns empty history', () => {
    fc.assert(
      fc.property(arbSessionId, (sessionId) => {
        const sessionManager = createSessionManager();
        sessionManager.createSession({ id: sessionId });
        const history = sessionManager.getHistory(sessionId);
        expect(history).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: Non-existent session returns empty history', () => {
    fc.assert(
      fc.property(arbSessionId, (sessionId) => {
        const sessionManager = createSessionManager();
        // Don't create the session
        const history = sessionManager.getHistory(sessionId);
        expect(history).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Session Isolation Property Tests', () => {
  /**
   * **Feature: ai-agent, Property 8: Session Isolation**
   * **Validates: Requirements 9.1, 9.4**
   *
   * For any two different session IDs, their conversation histories
   * should be completely independent and not share any messages.
   */
  it('Property 8: Different sessions have independent histories', () => {
    fc.assert(
      fc.property(
        arbSessionId,
        arbSessionId,
        arbMessageOperations,
        arbMessageOperations,
        (sessionId1, sessionId2Base, ops1, ops2) => {
          // Create a fresh session manager for each test case
          const sessionManager = createSessionManager();

          // Ensure session IDs are different
          const sessionId2 =
            sessionId1 === sessionId2Base ? `${sessionId2Base}_different` : sessionId2Base;

          // Create both sessions
          sessionManager.createSession({ id: sessionId1 });
          sessionManager.createSession({ id: sessionId2 });

          // Add messages to session 1
          for (const op of ops1) {
            if (op.type === 'user') {
              sessionManager.addUserMessage(sessionId1, op.content);
            } else if (op.type === 'assistant') {
              sessionManager.addAssistantMessage(sessionId1, createExecuteResponse(op.content));
            } else {
              sessionManager.addSystemMessage(sessionId1, op.content);
            }
          }

          // Add messages to session 2
          for (const op of ops2) {
            if (op.type === 'user') {
              sessionManager.addUserMessage(sessionId2, op.content);
            } else if (op.type === 'assistant') {
              sessionManager.addAssistantMessage(sessionId2, createExecuteResponse(op.content));
            } else {
              sessionManager.addSystemMessage(sessionId2, op.content);
            }
          }

          // Get histories
          const history1 = sessionManager.getHistory(sessionId1);
          const history2 = sessionManager.getHistory(sessionId2);

          // Verify message counts match operations
          expect(history1.length).toBe(ops1.length);
          expect(history2.length).toBe(ops2.length);

          // Verify no message IDs are shared
          const ids1 = new Set(history1.map((m) => m.id));
          const ids2 = new Set(history2.map((m) => m.id));

          for (const id of ids1) {
            expect(ids2.has(id)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Modifying one session does not affect another', () => {
    fc.assert(
      fc.property(
        arbSessionId,
        arbSessionId,
        arbMessageContent,
        arbMessageContent,
        (sessionId1Base, sessionId2Base, content1, content2) => {
          // Create a fresh session manager for each test case
          const sessionManager = createSessionManager();

          // Ensure different session IDs
          const sessionId1 = `${sessionId1Base}_1`;
          const sessionId2 = `${sessionId2Base}_2`;

          // Create sessions and add initial messages
          sessionManager.createSession({ id: sessionId1 });
          sessionManager.createSession({ id: sessionId2 });

          sessionManager.addUserMessage(sessionId1, content1);
          sessionManager.addUserMessage(sessionId2, content2);

          // Get initial histories
          const initialHistory1 = sessionManager.getHistory(sessionId1);
          const initialHistory2 = sessionManager.getHistory(sessionId2);

          // Add more messages to session 1 only
          sessionManager.addUserMessage(sessionId1, 'additional message 1');
          sessionManager.addUserMessage(sessionId1, 'additional message 2');

          // Session 2 history should be unchanged
          const finalHistory2 = sessionManager.getHistory(sessionId2);
          expect(finalHistory2.length).toBe(initialHistory2.length);
          expect(finalHistory2[0].content).toBe(initialHistory2[0].content);

          // Session 1 should have more messages
          const finalHistory1 = sessionManager.getHistory(sessionId1);
          expect(finalHistory1.length).toBe(initialHistory1.length + 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Clearing one session does not affect another', () => {
    fc.assert(
      fc.property(
        arbSessionId,
        arbSessionId,
        arbMessageOperations,
        arbMessageOperations,
        (sessionId1Base, sessionId2Base, ops1, ops2) => {
          // Create a fresh session manager for each test case
          const sessionManager = createSessionManager();

          const sessionId1 = `${sessionId1Base}_clear1`;
          const sessionId2 = `${sessionId2Base}_clear2`;

          // Create sessions and add messages
          sessionManager.createSession({ id: sessionId1 });
          sessionManager.createSession({ id: sessionId2 });

          for (const op of ops1) {
            sessionManager.addUserMessage(sessionId1, op.content);
          }
          for (const op of ops2) {
            sessionManager.addUserMessage(sessionId2, op.content);
          }

          // Clear session 1
          sessionManager.clearSession(sessionId1);

          // Session 1 should be empty
          expect(sessionManager.getHistory(sessionId1)).toEqual([]);

          // Session 2 should be unchanged
          const history2 = sessionManager.getHistory(sessionId2);
          expect(history2.length).toBe(ops2.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Deleting one session does not affect another', () => {
    fc.assert(
      fc.property(
        arbSessionId,
        arbSessionId,
        arbMessageOperations,
        arbMessageOperations,
        (sessionId1Base, sessionId2Base, ops1, ops2) => {
          // Create a fresh session manager for each test case
          const sessionManager = createSessionManager();

          const sessionId1 = `${sessionId1Base}_del1`;
          const sessionId2 = `${sessionId2Base}_del2`;

          // Create sessions and add messages
          sessionManager.createSession({ id: sessionId1 });
          sessionManager.createSession({ id: sessionId2 });

          for (const op of ops1) {
            sessionManager.addUserMessage(sessionId1, op.content);
          }
          for (const op of ops2) {
            sessionManager.addUserMessage(sessionId2, op.content);
          }

          // Delete session 1
          sessionManager.deleteSession(sessionId1);

          // Session 1 should not exist
          expect(sessionManager.hasSession(sessionId1)).toBe(false);
          expect(sessionManager.getHistory(sessionId1)).toEqual([]);

          // Session 2 should still exist and be unchanged
          expect(sessionManager.hasSession(sessionId2)).toBe(true);
          const history2 = sessionManager.getHistory(sessionId2);
          expect(history2.length).toBe(ops2.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Session creation with same ID throws error', () => {
    fc.assert(
      fc.property(arbSessionId, (sessionId) => {
        // Create a fresh session manager for each test case
        const sessionManager = createSessionManager();

        // Create session first time - should succeed
        sessionManager.createSession({ id: sessionId });
        expect(sessionManager.hasSession(sessionId)).toBe(true);

        // Create session second time - should throw
        expect(() => {
          sessionManager.createSession({ id: sessionId });
        }).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it('Property 8: getOrCreateSession maintains isolation', () => {
    fc.assert(
      fc.property(
        arbSessionId,
        arbSessionId,
        arbMessageContent,
        (sessionId1Base, sessionId2Base, content) => {
          // Create a fresh session manager for each test case
          const sessionManager = createSessionManager();

          const sessionId1 = `${sessionId1Base}_getorcreate1`;
          const sessionId2 = `${sessionId2Base}_getorcreate2`;

          // Use getOrCreateSession for both
          const session1 = sessionManager.getOrCreateSession(sessionId1);
          const session2 = sessionManager.getOrCreateSession(sessionId2);

          // They should be different sessions
          expect(session1.id).not.toBe(session2.id);

          // Add message to session 1
          sessionManager.addUserMessage(sessionId1, content);

          // Session 2 should still be empty
          expect(sessionManager.getHistory(sessionId2)).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Session Manager Unit Tests', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = createSessionManager();
  });

  it('should create session with custom ID', () => {
    const id = sessionManager.createSession({ id: 'custom-id' });
    expect(id).toBe('custom-id');
    expect(sessionManager.hasSession('custom-id')).toBe(true);
  });

  it('should create session with auto-generated ID', () => {
    const id = sessionManager.createSession();
    expect(id).toBeDefined();
    expect(id.length).toBeGreaterThan(0);
    expect(sessionManager.hasSession(id)).toBe(true);
  });

  it('should add system message on session creation', () => {
    const id = sessionManager.createSession({
      systemMessage: 'You are a helpful assistant.',
    });
    const history = sessionManager.getHistory(id);
    expect(history.length).toBe(1);
    expect(history[0].role).toBe('system');
    expect(history[0].content).toBe('You are a helpful assistant.');
  });

  it('should update session metadata', () => {
    const id = sessionManager.createSession({ metadata: { key1: 'value1' } });
    sessionManager.updateMetadata(id, { key2: 'value2' });

    const session = sessionManager.getSession(id);
    expect(session?.metadata).toEqual({ key1: 'value1', key2: 'value2' });
  });

  it('should close session', () => {
    const id = sessionManager.createSession();
    expect(sessionManager.getSession(id)?.active).toBe(true);

    sessionManager.closeSession(id);
    expect(sessionManager.getSession(id)?.active).toBe(false);
  });

  it('should query sessions by active status', () => {
    const id1 = sessionManager.createSession();
    const id2 = sessionManager.createSession();
    sessionManager.closeSession(id1);

    const activeSessions = sessionManager.querySessions({ active: true });
    const inactiveSessions = sessionManager.querySessions({ active: false });

    expect(activeSessions.length).toBe(1);
    expect(activeSessions[0].id).toBe(id2);
    expect(inactiveSessions.length).toBe(1);
    expect(inactiveSessions[0].id).toBe(id1);
  });

  it('should count sessions and messages', () => {
    const id1 = sessionManager.createSession();
    const id2 = sessionManager.createSession();

    sessionManager.addUserMessage(id1, 'message 1');
    sessionManager.addUserMessage(id1, 'message 2');
    sessionManager.addUserMessage(id2, 'message 3');

    expect(sessionManager.getSessionCount()).toBe(2);
    expect(sessionManager.getTotalMessageCount()).toBe(3);
  });
});
