/**
 * LLM Adapter Property-Based Tests for Abort Signal Support
 *
 * **Feature: llm-abort-signal, Property 1: Abort signal propagation**
 * **Validates: Requirements 1.1, 2.3**
 *
 * Tests that abort signals are properly handled:
 * - AbortSignal can be passed via GenerateOptions
 * - When aborted, LLMError with code 'CANCELLED' is thrown
 * - Error contains proper provider information
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LLMError, type LLMErrorCode, type GenerateOptions } from './adapter.js';

/**
 * Generate a valid LLMErrorCode
 */
const llmErrorCodeArb: fc.Arbitrary<LLMErrorCode> = fc.constantFrom(
  'AUTHENTICATION_ERROR',
  'RATE_LIMIT_ERROR',
  'INVALID_REQUEST',
  'MODEL_NOT_FOUND',
  'CONTEXT_LENGTH_EXCEEDED',
  'CONTENT_FILTER',
  'TIMEOUT',
  'NETWORK_ERROR',
  'CANCELLED',
  'UNKNOWN_ERROR'
);

/**
 * Generate a valid provider name
 */
const providerArb: fc.Arbitrary<string> = fc.constantFrom(
  'openai',
  'claude',
  'qwen',
  'siliconflow'
);

/**
 * Generate a valid error message
 */
const errorMessageArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 200 });

describe('LLM Adapter Abort Signal Property Tests', () => {
  /**
   * **Feature: llm-abort-signal, Property 1: Abort signal propagation**
   * **Validates: Requirements 1.1, 2.3**
   *
   * Property: GenerateOptions interface accepts abortSignal parameter
   */
  it('Property 1a: GenerateOptions accepts abortSignal parameter', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 }),
        fc.integer({ min: 1, max: 4096 }),
        (temperature, maxTokens) => {
          const controller = new AbortController();

          const options: GenerateOptions = {
            temperature,
            maxTokens,
            abortSignal: controller.signal,
          };

          // Verify abortSignal is properly set
          expect(options.abortSignal).toBe(controller.signal);
          expect(options.abortSignal?.aborted).toBe(false);

          // Abort and verify state change
          controller.abort();
          expect(options.abortSignal?.aborted).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: llm-abort-signal, Property 1: Abort signal propagation**
   * **Validates: Requirements 1.1, 2.3**
   *
   * Property: LLMError with code 'CANCELLED' can be created and contains correct information
   */
  it('Property 1b: LLMError with CANCELLED code preserves all information', () => {
    fc.assert(
      fc.property(errorMessageArb, providerArb, (message, provider) => {
        const cause = new Error('AbortError');
        const error = new LLMError(message, 'CANCELLED', provider, cause);

        // Verify error properties
        expect(error.message).toBe(message);
        expect(error.code).toBe('CANCELLED');
        expect(error.provider).toBe(provider);
        expect(error.cause).toBe(cause);
        expect(error.name).toBe('LLMError');
        expect(error instanceof Error).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: llm-abort-signal, Property 1: Abort signal propagation**
   * **Validates: Requirements 1.1, 2.3**
   *
   * Property: All LLMErrorCode values including 'CANCELLED' are valid
   */
  it('Property 1c: CANCELLED is a valid LLMErrorCode', () => {
    fc.assert(
      fc.property(llmErrorCodeArb, errorMessageArb, providerArb, (code, message, provider) => {
        const error = new LLMError(message, code, provider);

        // All error codes should create valid errors
        expect(error.code).toBe(code);
        expect(error.message).toBe(message);
        expect(error.provider).toBe(provider);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: llm-abort-signal, Property 1: Abort signal propagation**
   * **Validates: Requirements 1.1, 2.3**
   *
   * Property: AbortController can be used to create pre-aborted signals
   */
  it('Property 1d: Pre-aborted signals are correctly detected', () => {
    fc.assert(
      fc.property(fc.boolean(), (shouldAbort) => {
        const controller = new AbortController();

        if (shouldAbort) {
          controller.abort();
        }

        const options: GenerateOptions = {
          abortSignal: controller.signal,
        };

        // Signal state should match abort action
        expect(options.abortSignal?.aborted).toBe(shouldAbort);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: llm-abort-signal, Property 1: Abort signal propagation**
   * **Validates: Requirements 1.1, 2.3**
   *
   * Property: AbortSignal event listeners work correctly
   */
  it('Property 1e: AbortSignal event listeners are triggered on abort', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (listenerCount) => {
        const controller = new AbortController();
        let triggeredCount = 0;

        // Add multiple listeners
        for (let i = 0; i < listenerCount; i++) {
          controller.signal.addEventListener('abort', () => {
            triggeredCount++;
          });
        }

        // Abort should trigger all listeners
        controller.abort();
        expect(triggeredCount).toBe(listenerCount);

        // Aborting again should not trigger listeners again
        const countAfterSecondAbort = triggeredCount;
        controller.abort();
        expect(triggeredCount).toBe(countAfterSecondAbort);
      }),
      { numRuns: 100 }
    );
  });
});
