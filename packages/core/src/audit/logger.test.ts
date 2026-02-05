/**
 * Property-Based Tests for Audit Logger
 *
 * **Feature: ai-agent, Property 6: Operation Log Completeness**
 * **Validates: Requirements 10.1**
 *
 * Tests that for any tool execution, an operation log entry is created
 * with the operation type, parameters, and result.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  AuditLogger,
  createAuditLogger,
  type ToolExecutionLogInput,
  type ConfigChangeLogInput,
  type ErrorLogInput,
  type OperationType,
} from './logger.js';
import { AuditLogQuery, createAuditLogQuery } from './query.js';

// Arbitrary generators for test data
const arbSessionId = fc.option(fc.stringMatching(/^[a-zA-Z0-9-]{1,36}$/), { nil: undefined });

const arbToolName = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,29}$/);

const arbToolArgs = fc.dictionary(
  fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,19}$/),
  fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
  { minKeys: 0, maxKeys: 5 }
);

const arbToolResult = fc.record({
  success: fc.boolean(),
  content: fc.string({ minLength: 1, maxLength: 200 }),
  data: fc.option(fc.jsonValue(), { nil: undefined }),
  error: fc.option(
    fc.record({
      code: fc.stringMatching(/^[A-Z_]{1,20}$/),
      message: fc.string({ minLength: 1, maxLength: 100 }),
      details: fc.option(fc.jsonValue(), { nil: undefined }),
    }),
    { nil: undefined }
  ),
});

const arbDurationMs = fc.integer({ min: 0, max: 60000 });

const arbToolExecutionInput: fc.Arbitrary<ToolExecutionLogInput> = fc.record({
  sessionId: arbSessionId,
  toolName: arbToolName,
  args: arbToolArgs,
  result: arbToolResult,
  durationMs: arbDurationMs,
});

const arbConfigKey = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9._-]{0,49}$/);

const arbConfigChangeInput: fc.Arbitrary<ConfigChangeLogInput> = fc.record({
  sessionId: arbSessionId,
  configKey: arbConfigKey,
  beforeValue: fc.option(fc.jsonValue(), { nil: undefined }),
  afterValue: fc.option(fc.jsonValue(), { nil: undefined }),
  metadata: fc.option(fc.dictionary(fc.string(), fc.jsonValue(), { minKeys: 0, maxKeys: 3 }), {
    nil: undefined,
  }),
});

const arbErrorInput: fc.Arbitrary<ErrorLogInput> = fc.record({
  sessionId: arbSessionId,
  message: fc.string({ minLength: 1, maxLength: 200 }),
  stack: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  context: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  details: fc.option(fc.dictionary(fc.string(), fc.jsonValue(), { minKeys: 0, maxKeys: 3 }), {
    nil: undefined,
  }),
});

describe('Operation Log Completeness Property Tests', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = createAuditLogger();
  });

  /**
   * **Feature: ai-agent, Property 6: Operation Log Completeness**
   * **Validates: Requirements 10.1**
   *
   * For any tool execution, an operation log entry should be created
   * with the operation type, parameters, and result.
   */
  it('Property 6: Tool execution creates complete log entry', () => {
    fc.assert(
      fc.property(arbToolExecutionInput, (input) => {
        const logger = createAuditLogger();

        // Log the tool execution
        const log = logger.logToolExecution(input);

        // Verify log entry is created
        expect(log).toBeDefined();
        expect(log.id).toBeDefined();
        expect(log.id.length).toBeGreaterThan(0);

        // Verify operation type is set
        expect(log.operationType).toBe('tool_execution');

        // Verify target (tool name) is set
        expect(log.target).toBe(input.toolName);

        // Verify parameters are recorded
        expect(log.params).toEqual(input.args);

        // Verify result is recorded
        expect(log.result).toBeDefined();
        expect(log.result?.success).toBe(input.result.success);
        expect(log.result?.content).toBe(input.result.content);

        // Verify status matches result success
        expect(log.status).toBe(input.result.success ? 'success' : 'failure');

        // Verify duration is recorded
        expect(log.durationMs).toBe(input.durationMs);

        // Verify timestamp is set
        expect(log.createdAt).toBeInstanceOf(Date);

        // Verify log can be retrieved
        const retrieved = logger.getLog(log.id);
        expect(retrieved).toEqual(log);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 6: All tool executions are logged and retrievable', () => {
    fc.assert(
      fc.property(fc.array(arbToolExecutionInput, { minLength: 1, maxLength: 20 }), (inputs) => {
        const logger = createAuditLogger();
        const logIds: string[] = [];

        // Log all executions
        for (const input of inputs) {
          const log = logger.logToolExecution(input);
          logIds.push(log.id);
        }

        // Verify all logs exist
        expect(logger.getLogCount()).toBe(inputs.length);

        // Verify all logs are retrievable
        for (let i = 0; i < inputs.length; i++) {
          const log = logger.getLog(logIds[i]);
          expect(log).toBeDefined();
          expect(log?.operationType).toBe('tool_execution');
          expect(log?.target).toBe(inputs[i].toolName);
          expect(log?.params).toEqual(inputs[i].args);
        }

        // Verify logs by type
        const toolLogs = logger.getLogsByType('tool_execution');
        expect(toolLogs.length).toBe(inputs.length);
      }),
      { numRuns: 50 }
    );
  });

  it('Property 6: Session filtering returns correct logs', () => {
    fc.assert(
      fc.property(
        fc.array(arbToolExecutionInput, { minLength: 1, maxLength: 10 }),
        fc.stringMatching(/^session-[a-z0-9]{4}$/),
        (inputs, targetSessionId) => {
          const logger = createAuditLogger();

          // Assign some inputs to the target session
          const inputsWithSession = inputs.map((input, i) => ({
            ...input,
            sessionId: i % 2 === 0 ? targetSessionId : `other-session-${i}`,
          }));

          // Log all executions
          for (const input of inputsWithSession) {
            logger.logToolExecution(input);
          }

          // Get logs for target session
          const sessionLogs = logger.getLogsBySession(targetSessionId);

          // Count expected logs for target session
          const expectedCount = inputsWithSession.filter(
            (i) => i.sessionId === targetSessionId
          ).length;

          expect(sessionLogs.length).toBe(expectedCount);

          // All returned logs should belong to target session
          for (const log of sessionLogs) {
            expect(log.sessionId).toBe(targetSessionId);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 6: Config changes are logged with before/after states', () => {
    fc.assert(
      fc.property(arbConfigChangeInput, (input) => {
        const logger = createAuditLogger();

        const log = logger.logConfigChange(input);

        // Verify operation type
        expect(log.operationType).toBe('config_change');

        // Verify target is config key
        expect(log.target).toBe(input.configKey);

        // Verify before/after states are recorded
        expect(log.params?.before).toEqual(input.beforeValue);
        expect(log.params?.after).toEqual(input.afterValue);
        expect(log.result?.before).toEqual(input.beforeValue);
        expect(log.result?.after).toEqual(input.afterValue);

        // Verify status
        expect(log.status).toBe('success');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 6: Errors are logged with details', () => {
    fc.assert(
      fc.property(arbErrorInput, (input) => {
        const logger = createAuditLogger();

        const log = logger.logError(input);

        // Verify operation type
        expect(log.operationType).toBe('error');

        // Verify error message is recorded
        expect(log.errorMessage).toBe(input.message);

        // Verify stack trace if provided
        if (input.stack) {
          expect(log.errorStack).toBe(input.stack);
        }

        // Verify context as target
        if (input.context) {
          expect(log.target).toBe(input.context);
        }

        // Verify status is failure
        expect(log.status).toBe('failure');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 6: Logs are ordered chronologically', () => {
    fc.assert(
      fc.property(fc.array(arbToolExecutionInput, { minLength: 2, maxLength: 10 }), (inputs) => {
        const logger = createAuditLogger();

        // Log all executions
        for (const input of inputs) {
          logger.logToolExecution(input);
        }

        // Get all logs
        const allLogs = logger.getAllLogs();

        // Verify chronological order
        for (let i = 1; i < allLogs.length; i++) {
          expect(allLogs[i].createdAt.getTime()).toBeGreaterThanOrEqual(
            allLogs[i - 1].createdAt.getTime()
          );
        }
      }),
      { numRuns: 50 }
    );
  });
});

describe('Audit Log Query Property Tests', () => {
  let logger: AuditLogger;
  let query: AuditLogQuery;

  beforeEach(() => {
    logger = createAuditLogger();
    query = createAuditLogQuery(logger);
  });

  it('Query returns correct results with time range filter', () => {
    fc.assert(
      fc.property(fc.array(arbToolExecutionInput, { minLength: 5, maxLength: 15 }), (inputs) => {
        const logger = createAuditLogger();
        const query = createAuditLogQuery(logger);

        // Log all executions
        for (const input of inputs) {
          logger.logToolExecution(input);
        }

        const allLogs = logger.getAllLogs();
        if (allLogs.length < 2) return;

        // Use middle timestamp as filter
        const midIndex = Math.floor(allLogs.length / 2);
        const midTime = allLogs[midIndex].createdAt;

        // Query logs after midTime
        const result = query.query({ after: midTime });

        // All returned logs should be >= midTime
        for (const log of result.logs) {
          expect(log.createdAt.getTime()).toBeGreaterThanOrEqual(midTime.getTime());
        }
      }),
      { numRuns: 50 }
    );
  });

  it('Query pagination works correctly', () => {
    fc.assert(
      fc.property(
        fc.array(arbToolExecutionInput, { minLength: 10, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }),
        (inputs, pageSize) => {
          const logger = createAuditLogger();
          const query = createAuditLogQuery(logger);

          // Log all executions
          for (const input of inputs) {
            logger.logToolExecution(input);
          }

          // Get first page
          const page1 = query.query({ limit: pageSize, offset: 0 });
          expect(page1.logs.length).toBeLessThanOrEqual(pageSize);
          expect(page1.totalCount).toBe(inputs.length);

          // Get second page
          const page2 = query.query({ limit: pageSize, offset: pageSize });

          // Pages should not overlap
          const page1Ids = new Set(page1.logs.map((l) => l.id));
          for (const log of page2.logs) {
            expect(page1Ids.has(log.id)).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Stats calculation is accurate', () => {
    fc.assert(
      fc.property(fc.array(arbToolExecutionInput, { minLength: 1, maxLength: 15 }), (inputs) => {
        const logger = createAuditLogger();
        const query = createAuditLogQuery(logger);

        // Log all executions
        for (const input of inputs) {
          logger.logToolExecution(input);
        }

        const stats = query.getStats();

        // Total should match
        expect(stats.totalLogs).toBe(inputs.length);

        // All should be tool_execution type
        expect(stats.byOperationType['tool_execution']).toBe(inputs.length);

        // Success/failure counts should match
        const successCount = inputs.filter((i) => i.result.success).length;
        const failureCount = inputs.length - successCount;

        expect(stats.byStatus['success'] ?? 0).toBe(successCount);
        expect(stats.byStatus['failure'] ?? 0).toBe(failureCount);
      }),
      { numRuns: 50 }
    );
  });
});

describe('Audit Logger Unit Tests', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = createAuditLogger();
  });

  it('should log tool execution with all fields', () => {
    const input: ToolExecutionLogInput = {
      sessionId: 'test-session',
      toolName: 'test_tool',
      args: { param1: 'value1', param2: 42 },
      result: {
        success: true,
        content: 'Operation completed',
        data: { key: 'value' },
      },
      durationMs: 150,
    };

    const log = logger.logToolExecution(input);

    expect(log.id).toBeDefined();
    expect(log.sessionId).toBe('test-session');
    expect(log.operationType).toBe('tool_execution');
    expect(log.target).toBe('test_tool');
    expect(log.params).toEqual({ param1: 'value1', param2: 42 });
    expect(log.status).toBe('success');
    expect(log.durationMs).toBe(150);
  });

  it('should log failed tool execution with error', () => {
    const input: ToolExecutionLogInput = {
      sessionId: 'test-session',
      toolName: 'failing_tool',
      args: {},
      result: {
        success: false,
        content: 'Operation failed',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
        },
      },
      durationMs: 50,
    };

    const log = logger.logToolExecution(input);

    expect(log.status).toBe('failure');
    expect(log.errorMessage).toBe('Invalid input');
    expect(log.metadata?.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should log knowledge operations', () => {
    const addLog = logger.logKnowledgeAdd('session-1', 'doc-123', 'mythicmobs', 'Boss Config');
    expect(addLog.operationType).toBe('knowledge_add');
    expect(addLog.target).toBe('doc-123');
    expect(addLog.params?.category).toBe('mythicmobs');

    const deleteLog = logger.logKnowledgeDelete('session-1', 'doc-123', true);
    expect(deleteLog.operationType).toBe('knowledge_delete');
    expect(deleteLog.status).toBe('success');
  });

  it('should log session lifecycle', () => {
    const createLog = logger.logSessionCreate('session-new', { userId: 'user-1' });
    expect(createLog.operationType).toBe('session_create');
    expect(createLog.target).toBe('session-new');
    expect(createLog.metadata?.userId).toBe('user-1');

    const closeLog = logger.logSessionClose('session-new');
    expect(closeLog.operationType).toBe('session_close');
  });

  it('should clear all logs', () => {
    logger.logToolExecution({
      toolName: 'tool1',
      args: {},
      result: { success: true, content: 'ok' },
      durationMs: 10,
    });
    logger.logToolExecution({
      toolName: 'tool2',
      args: {},
      result: { success: true, content: 'ok' },
      durationMs: 20,
    });

    expect(logger.getLogCount()).toBe(2);

    logger.clear();

    expect(logger.getLogCount()).toBe(0);
    expect(logger.getAllLogs()).toHaveLength(0);
  });
});
