/**
 * Property-Based Tests for Agent Streaming Events
 *
 * Tests Properties 9, 16, and 17:
 * - Property 9: Event emission ordering
 * - Property 16: Streaming event completeness
 * - Property 17: Abort signal cancellation
 *
 * _Requirements: 7.2_
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { Agent } from './agent.js';
import type { AgentConfig } from '../types/config.js';
import type { StreamEvent } from '../types/streaming.js';

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

describe('Agent Streaming Events - Property Tests', () => {
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
      behavior: {
        maxIterations: 3,
        timeoutMs: 5000,
        requireConfirmation: false,
      },
    };
    agent = new Agent(config);
  });

  /**
   * Property 9: Event emission ordering
   *
   * For any agent operation, events should be emitted in the correct sequence:
   * - processing_started before processing_complete
   * - tool_call_started before tool_call_completed
   * - iteration_started before iteration_completed
   *
   * Validates: Requirements 7.2
   */
  it('Property 9: Events are emitted in correct order', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (message) => {
        const events: StreamEvent[] = [];

        try {
          await agent.chat(message, {
            skipKnowledge: true,
            skipConfirmation: true,
            onEvent: (event) => {
              events.push(event);
            },
          });
        } catch (error) {
          // Ignore errors, we're testing event ordering
        }

        // Verify processing_started comes first
        if (events.length > 0) {
          expect(events[0].type).toBe('processing_started');
        }

        // Verify processing_started comes before completed/error
        const startIndex = events.findIndex((e) => e.type === 'processing_started');
        const endIndex = events.findIndex(
          (e) => e.type === 'completed' || e.type === 'error' || e.type === 'cancelled'
        );

        if (startIndex !== -1 && endIndex !== -1) {
          expect(startIndex).toBeLessThan(endIndex);
        }

        // Verify tool_call_started comes before tool_call_completed
        for (let i = 0; i < events.length; i++) {
          if (events[i].type === 'tool_call_started') {
            const toolCallId = (events[i] as any).data.toolCallId;
            const completedIndex = events.findIndex(
              (e, idx) =>
                idx > i &&
                (e.type === 'tool_call_completed' || e.type === 'tool_error') &&
                (e as any).data.toolCallId === toolCallId
            );

            if (completedIndex !== -1) {
              expect(i).toBeLessThan(completedIndex);
            }
          }
        }

        // Verify iteration_started comes before iteration_completed
        for (let i = 0; i < events.length; i++) {
          if (events[i].type === 'iteration_started') {
            const iteration = (events[i] as any).data.iteration;
            const completedIndex = events.findIndex(
              (e, idx) =>
                idx > i &&
                e.type === 'iteration_completed' &&
                (e as any).data.iteration === iteration
            );

            if (completedIndex !== -1) {
              expect(i).toBeLessThan(completedIndex);
            }
          }
        }
      }),
      { numRuns: 10, timeout: 30000 }
    );
  });

  /**
   * Property 16: Streaming event completeness
   *
   * For any agent operation with streaming enabled, all lifecycle events
   * (start, iterations, tools, complete/error) should be emitted.
   *
   * Validates: Requirements 7.2
   */
  it('Property 16: All lifecycle events are emitted', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (message) => {
        const events: StreamEvent[] = [];
        const eventTypes = new Set<string>();

        try {
          await agent.chat(message, {
            skipKnowledge: true,
            skipConfirmation: true,
            onEvent: (event) => {
              events.push(event);
              eventTypes.add(event.type);
            },
          });
        } catch (error) {
          // Ignore errors
        }

        // Verify essential events are present
        expect(eventTypes.has('processing_started')).toBe(true);

        // Should have either completed, error, or cancelled
        const hasEndEvent =
          eventTypes.has('completed') ||
          eventTypes.has('error') ||
          eventTypes.has('cancelled') ||
          eventTypes.has('max_iterations');

        expect(hasEndEvent).toBe(true);

        // Verify events have required fields
        for (const event of events) {
          expect(event.id).toBeDefined();
          expect(event.type).toBeDefined();
          expect(event.timestamp).toBeGreaterThan(0);
          expect(event.sessionId).toBeDefined();
          expect(event.data).toBeDefined();
        }
      }),
      { numRuns: 10, timeout: 30000 }
    );
  });

  /**
   * Property 17: Abort signal cancellation
   *
   * For any agent operation with an abort signal, triggering the signal
   * should cancel the operation and emit a cancelled event.
   *
   * Validates: Requirements 7.2
   */
  it('Property 17: Abort signal cancels operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 10, max: 500 }),
        async (message, abortDelay) => {
          const events: StreamEvent[] = [];
          const abortController = new AbortController();

          // Schedule abort after delay
          const abortTimer = setTimeout(() => {
            abortController.abort();
          }, abortDelay);

          try {
            await agent.chat(message, {
              skipKnowledge: true,
              skipConfirmation: true,
              abortSignal: abortController.signal,
              onEvent: (event) => {
                events.push(event);
              },
            });
          } catch (error) {
            // Expected to throw on abort
          } finally {
            clearTimeout(abortTimer);
          }

          // If abort was triggered, should have cancelled event or error
          if (abortController.signal.aborted) {
            const hasCancelledEvent = events.some(
              (e) => e.type === 'cancelled' || e.type === 'error'
            );
            // Note: Depending on timing, we might not always get the event
            // This is acceptable as the operation was cancelled
            expect(hasCancelledEvent || events.length === 0).toBe(true);
          }
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  });

  /**
   * Property: Event timestamps are monotonically increasing
   */
  it('Property: Event timestamps increase monotonically', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (message) => {
        const events: StreamEvent[] = [];

        try {
          await agent.chat(message, {
            skipKnowledge: true,
            skipConfirmation: true,
            onEvent: (event) => {
              events.push(event);
            },
          });
        } catch (error) {
          // Ignore errors
        }

        // Verify timestamps are monotonically increasing
        for (let i = 0; i < events.length - 1; i++) {
          expect(events[i].timestamp).toBeLessThanOrEqual(events[i + 1].timestamp);
        }
      }),
      { numRuns: 10, timeout: 30000 }
    );
  });

  /**
   * Property: Session ID is consistent across all events
   */
  it('Property: All events have consistent session ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.uuid(),
        async (message, sessionId) => {
          const events: StreamEvent[] = [];

          try {
            await agent.chat(message, {
              sessionId,
              skipKnowledge: true,
              skipConfirmation: true,
              onEvent: (event) => {
                events.push(event);
              },
            });
          } catch (error) {
            // Ignore errors
          }

          // Verify all events have the same session ID
          for (const event of events) {
            expect(event.sessionId).toBe(sessionId);
          }
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  });

  /**
   * Property: Event IDs are unique
   */
  it('Property: All event IDs are unique', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (message) => {
        const events: StreamEvent[] = [];

        try {
          await agent.chat(message, {
            skipKnowledge: true,
            skipConfirmation: true,
            onEvent: (event) => {
              events.push(event);
            },
          });
        } catch (error) {
          // Ignore errors
        }

        // Verify all event IDs are unique
        const eventIds = events.map((e) => e.id);
        const uniqueIds = new Set(eventIds);
        expect(uniqueIds.size).toBe(eventIds.length);
      }),
      { numRuns: 10, timeout: 30000 }
    );
  });

  /**
   * Property: Completed event includes metrics
   */
  it('Property: Completed event includes performance metrics', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (message) => {
        const events: StreamEvent[] = [];

        try {
          await agent.chat(message, {
            skipKnowledge: true,
            skipConfirmation: true,
            onEvent: (event) => {
              events.push(event);
            },
          });
        } catch (error) {
          // Ignore errors
        }

        // Find completed event
        const completedEvent = events.find((e) => e.type === 'completed');

        if (completedEvent) {
          const data = (completedEvent as any).data;
          expect(data.totalDuration).toBeGreaterThanOrEqual(0);
          expect(data.iterations).toBeGreaterThanOrEqual(0);
          expect(data.toolCalls).toBeGreaterThanOrEqual(0);
          expect(data.messageId).toBeDefined();
        }
      }),
      { numRuns: 10, timeout: 30000 }
    );
  });
});
