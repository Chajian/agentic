/**
 * Property-Based Tests for Agent Stateless Architecture
 *
 * Tests Properties 1 and 2:
 * - Property 1: Stateless conversation processing
 * - Property 2: History preservation
 *
 * _Requirements: 1.1, 8.1_
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { Agent, type Message } from './agent.js';
import type { AgentConfig } from '../types/config.js';

// Mock the LLM Manager module
vi.mock('../llm/manager.js', () => {
  return {
    LLMManager: vi.fn().mockImplementation(() => ({
      generateWithTools: vi.fn().mockResolvedValue({
        content: 'Mocked response',
        toolCalls: [],
        finishReason: 'stop',
      }),
      generate: vi.fn().mockResolvedValue({
        content: 'Mocked response',
        finishReason: 'stop',
      }),
      supportsEmbeddings: vi.fn().mockReturnValue(false),
      getLLMForTask: vi.fn(),
    })),
  };
});

describe('Agent Stateless Architecture - Property Tests', () => {
  let agent: Agent;

  beforeEach(() => {
    const config: AgentConfig = {
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
        maxIterations: 3,
        timeoutMs: 5000,
        requireConfirmation: false,
      },
    };
    agent = new Agent(config);
  });

  /**
   * Property 1: Stateless conversation processing
   *
   * For any agent instance, calling chat() with the same message and history
   * should produce consistent results regardless of previous calls.
   *
   * This validates that the Agent doesn't maintain internal state between calls.
   */
  it('Property 1: Agent processes conversations statelessly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            role: fc.constantFrom('user' as const, 'assistant' as const),
            content: fc.string({ minLength: 1, maxLength: 50 }),
            timestamp: fc.date(),
          }),
          { maxLength: 5 }
        ),
        async (message, historyData) => {
          // Convert to Message format
          const history: Message[] = historyData.map((h) => ({
            ...h,
            timestamp: new Date(h.timestamp),
          }));

          // First call
          const response1 = await agent.chat(message, {
            history,
            skipKnowledge: true,
            skipConfirmation: true,
          });

          // Second call with same inputs
          const response2 = await agent.chat(message, {
            history,
            skipKnowledge: true,
            skipConfirmation: true,
          });

          // Responses should be consistent (same type and similar structure)
          expect(response1.type).toBe(response2.type);

          // Third call with different message but same history
          const response3 = await agent.chat('different message', {
            history,
            skipKnowledge: true,
            skipConfirmation: true,
          });

          // Should not affect subsequent calls with original message
          const response4 = await agent.chat(message, {
            history,
            skipKnowledge: true,
            skipConfirmation: true,
          });

          expect(response4.type).toBe(response1.type);
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  });

  /**
   * Property 2: History preservation
   *
   * For any conversation history passed to Agent.chat(), the agent should not
   * modify the input history array.
   *
   * This validates that the Agent treats history as immutable input.
   */
  it('Property 2: Agent does not modify input history', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            role: fc.constantFrom('user' as const, 'assistant' as const, 'system' as const),
            content: fc.string({ minLength: 1, maxLength: 50 }),
            timestamp: fc.date(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (message, historyData) => {
          // Convert to Message format
          const history: Message[] = historyData.map((h) => ({
            ...h,
            timestamp: new Date(h.timestamp),
          }));

          // Create a deep copy for comparison
          const historyCopy = JSON.parse(JSON.stringify(history));

          // Call agent
          await agent.chat(message, {
            history,
            skipKnowledge: true,
            skipConfirmation: true,
          });

          // Verify history was not modified
          expect(history.length).toBe(historyCopy.length);
          for (let i = 0; i < history.length; i++) {
            expect(history[i].id).toBe(historyCopy[i].id);
            expect(history[i].role).toBe(historyCopy[i].role);
            expect(history[i].content).toBe(historyCopy[i].content);
          }
        }
      ),
      { numRuns: 20, timeout: 30000 }
    );
  });

  /**
   * Property: Multiple sessions don't interfere
   *
   * Calling chat() with different sessionIds but same history should produce
   * consistent results, proving sessions are just labels, not state containers.
   */
  it('Property: Different session IDs do not affect processing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            role: fc.constantFrom('user' as const, 'assistant' as const),
            content: fc.string({ minLength: 1, maxLength: 50 }),
            timestamp: fc.date(),
          }),
          { maxLength: 5 }
        ),
        fc.uuid(),
        fc.uuid(),
        async (message, historyData, sessionId1, sessionId2) => {
          const history: Message[] = historyData.map((h) => ({
            ...h,
            timestamp: new Date(h.timestamp),
          }));

          // Call with first session ID
          const response1 = await agent.chat(message, {
            sessionId: sessionId1,
            history,
            skipKnowledge: true,
            skipConfirmation: true,
          });

          // Call with second session ID but same history
          const response2 = await agent.chat(message, {
            sessionId: sessionId2,
            history,
            skipKnowledge: true,
            skipConfirmation: true,
          });

          // Responses should be consistent regardless of session ID
          expect(response1.type).toBe(response2.type);
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  });

  /**
   * Property: Empty history handling
   *
   * Agent should handle empty history gracefully and consistently.
   */
  it('Property: Agent handles empty history consistently', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (message) => {
        // Call with no history
        const response1 = await agent.chat(message, {
          history: [],
          skipKnowledge: true,
          skipConfirmation: true,
        });

        // Call with undefined history
        const response2 = await agent.chat(message, {
          history: undefined,
          skipKnowledge: true,
          skipConfirmation: true,
        });

        // Both should produce valid responses
        expect(response1.type).toBeDefined();
        expect(response2.type).toBeDefined();
      }),
      { numRuns: 10, timeout: 30000 }
    );
  });
});
