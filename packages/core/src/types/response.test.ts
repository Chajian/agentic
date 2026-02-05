/**
 * Property-Based Tests for Response Types
 *
 * **Feature: ai-agent, Property 4: Response Type Consistency**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 *
 * Tests that all agent responses have exactly one valid response type.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  RESPONSE_TYPES,
  type AgentResponse,
  type ExecuteResponse,
  type ClarifyResponse,
  type KnowledgeRequestResponse,
  type ConfirmResponse,
  type OptionsResponse,
  isExecuteResponse,
  isClarifyResponse,
  isKnowledgeRequestResponse,
  isConfirmResponse,
  isOptionsResponse,
  isValidResponseType,
  createExecuteResponse,
  createClarifyResponse,
  createKnowledgeRequestResponse,
  createConfirmResponse,
  createOptionsResponse,
} from './response.js';

// Arbitraries for generating test data

const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 100 });

const arbExecuteResponse: fc.Arbitrary<ExecuteResponse> = fc.record({
  type: fc.constant('execute' as const),
  message: arbNonEmptyString,
  data: fc.option(fc.jsonValue(), { nil: undefined }),
  toolCalls: fc.option(
    fc.array(
      fc.record({
        toolName: arbNonEmptyString,
        arguments: fc.dictionary(fc.string(), fc.jsonValue()),
        result: fc.record({
          success: fc.boolean(),
          content: arbNonEmptyString,
          data: fc.option(fc.jsonValue(), { nil: undefined }),
        }),
      }),
      { minLength: 0, maxLength: 3 }
    ),
    { nil: undefined }
  ),
});

const arbClarifyResponse: fc.Arbitrary<ClarifyResponse> = fc.record({
  type: fc.constant('clarify' as const),
  message: arbNonEmptyString,
  questions: fc.array(arbNonEmptyString, { minLength: 1, maxLength: 5 }),
});

const arbKnowledgeRequestResponse: fc.Arbitrary<KnowledgeRequestResponse> = fc.record({
  type: fc.constant('knowledge_request' as const),
  message: arbNonEmptyString,
  missing: fc.record({
    topic: arbNonEmptyString,
    description: arbNonEmptyString,
  }),
  options: fc.array(
    fc.record({
      id: arbNonEmptyString,
      type: fc.constantFrom('provide_text', 'upload_file', 'provide_url', 'skip', 'try_anyway'),
      label: arbNonEmptyString,
      description: fc.option(arbNonEmptyString, { nil: undefined }),
    }),
    { minLength: 1, maxLength: 5 }
  ),
});

const arbConfirmResponse: fc.Arbitrary<ConfirmResponse> = fc.record({
  type: fc.constant('confirm' as const),
  message: arbNonEmptyString,
  action: fc.record({
    type: arbNonEmptyString,
    target: arbNonEmptyString,
    params: fc.dictionary(fc.string(), fc.jsonValue()),
  }),
  risk: fc.constantFrom('low', 'medium', 'high'),
  preview: fc.option(arbNonEmptyString, { nil: undefined }),
});

const arbOptionsResponse: fc.Arbitrary<OptionsResponse> = fc.record({
  type: fc.constant('options' as const),
  message: arbNonEmptyString,
  options: fc.array(
    fc.record({
      id: arbNonEmptyString,
      label: arbNonEmptyString,
      description: arbNonEmptyString,
      metadata: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
    }),
    { minLength: 1, maxLength: 10 }
  ),
});

const arbAgentResponse: fc.Arbitrary<AgentResponse> = fc.oneof(
  arbExecuteResponse,
  arbClarifyResponse,
  arbKnowledgeRequestResponse,
  arbConfirmResponse,
  arbOptionsResponse
);

describe('Response Type Consistency Property Tests', () => {
  /**
   * **Feature: ai-agent, Property 4: Response Type Consistency**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
   *
   * For any agent response, the response type should match exactly one
   * of the defined response types (execute, clarify, knowledge_request, confirm, options).
   */
  it('Property 4: Every response has exactly one valid type', () => {
    fc.assert(
      fc.property(arbAgentResponse, (response) => {
        // The response type must be one of the valid types
        expect(isValidResponseType(response.type)).toBe(true);
        expect(RESPONSE_TYPES).toContain(response.type);

        // Exactly one type guard should return true
        const typeGuardResults = [
          isExecuteResponse(response),
          isClarifyResponse(response),
          isKnowledgeRequestResponse(response),
          isConfirmResponse(response),
          isOptionsResponse(response),
        ];

        const trueCount = typeGuardResults.filter(Boolean).length;
        expect(trueCount).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: ExecuteResponse type guard is consistent', () => {
    fc.assert(
      fc.property(arbExecuteResponse, (response) => {
        expect(isExecuteResponse(response)).toBe(true);
        expect(isClarifyResponse(response)).toBe(false);
        expect(isKnowledgeRequestResponse(response)).toBe(false);
        expect(isConfirmResponse(response)).toBe(false);
        expect(isOptionsResponse(response)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: ClarifyResponse type guard is consistent', () => {
    fc.assert(
      fc.property(arbClarifyResponse, (response) => {
        expect(isExecuteResponse(response)).toBe(false);
        expect(isClarifyResponse(response)).toBe(true);
        expect(isKnowledgeRequestResponse(response)).toBe(false);
        expect(isConfirmResponse(response)).toBe(false);
        expect(isOptionsResponse(response)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: KnowledgeRequestResponse type guard is consistent', () => {
    fc.assert(
      fc.property(arbKnowledgeRequestResponse, (response) => {
        expect(isExecuteResponse(response)).toBe(false);
        expect(isClarifyResponse(response)).toBe(false);
        expect(isKnowledgeRequestResponse(response)).toBe(true);
        expect(isConfirmResponse(response)).toBe(false);
        expect(isOptionsResponse(response)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: ConfirmResponse type guard is consistent', () => {
    fc.assert(
      fc.property(arbConfirmResponse, (response) => {
        expect(isExecuteResponse(response)).toBe(false);
        expect(isClarifyResponse(response)).toBe(false);
        expect(isKnowledgeRequestResponse(response)).toBe(false);
        expect(isConfirmResponse(response)).toBe(true);
        expect(isOptionsResponse(response)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: OptionsResponse type guard is consistent', () => {
    fc.assert(
      fc.property(arbOptionsResponse, (response) => {
        expect(isExecuteResponse(response)).toBe(false);
        expect(isClarifyResponse(response)).toBe(false);
        expect(isKnowledgeRequestResponse(response)).toBe(false);
        expect(isConfirmResponse(response)).toBe(false);
        expect(isOptionsResponse(response)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: Factory functions create valid responses', () => {
    fc.assert(
      fc.property(
        arbNonEmptyString,
        fc.array(arbNonEmptyString, { minLength: 1, maxLength: 5 }),
        fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<'low' | 'medium' | 'high'>,
        (message, questions, risk) => {
          // Test createExecuteResponse
          const executeResp = createExecuteResponse(message);
          expect(isValidResponseType(executeResp.type)).toBe(true);
          expect(isExecuteResponse(executeResp)).toBe(true);

          // Test createClarifyResponse
          const clarifyResp = createClarifyResponse(message, questions);
          expect(isValidResponseType(clarifyResp.type)).toBe(true);
          expect(isClarifyResponse(clarifyResp)).toBe(true);

          // Test createKnowledgeRequestResponse
          const knowledgeResp = createKnowledgeRequestResponse(message, 'topic', 'description');
          expect(isValidResponseType(knowledgeResp.type)).toBe(true);
          expect(isKnowledgeRequestResponse(knowledgeResp)).toBe(true);

          // Test createConfirmResponse
          const confirmResp = createConfirmResponse(message, 'update', 'target', {}, risk);
          expect(isValidResponseType(confirmResp.type)).toBe(true);
          expect(isConfirmResponse(confirmResp)).toBe(true);

          // Test createOptionsResponse
          const optionsResp = createOptionsResponse(message, [
            { id: '1', label: 'Option 1', description: 'Desc 1' },
          ]);
          expect(isValidResponseType(optionsResp.type)).toBe(true);
          expect(isOptionsResponse(optionsResp)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Invalid types are rejected', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !RESPONSE_TYPES.includes(s as any)),
        (invalidType) => {
          expect(isValidResponseType(invalidType)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
