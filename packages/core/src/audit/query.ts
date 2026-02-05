/**
 * Audit Log Query
 *
 * Provides advanced querying capabilities for audit logs
 * with support for filtering by session, operation type, and time range.
 *
 * _Requirements: 10.4_
 */

import type { OperationLog, OperationType, OperationStatus, AuditLogger } from './logger.js';

/**
 * Query options for filtering audit logs
 */
export interface AuditLogQueryOptions {
  /** Filter by session ID */
  sessionId?: string;
  /** Filter by operation type */
  operationType?: OperationType;
  /** Filter by multiple operation types */
  operationTypes?: OperationType[];
  /** Filter by status */
  status?: OperationStatus;
  /** Filter by target (e.g., tool name) */
  target?: string;
  /** Filter by timestamp (after) */
  after?: Date;
  /** Filter by timestamp (before) */
  before?: Date;
  /** Filter by error presence */
  hasError?: boolean;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order */
  order?: 'asc' | 'desc';
}

/**
 * Aggregated statistics for audit logs
 */
export interface AuditLogStats {
  /** Total number of logs */
  totalLogs: number;
  /** Logs by operation type */
  byOperationType: Record<OperationType, number>;
  /** Logs by status */
  byStatus: Record<OperationStatus, number>;
  /** Number of unique sessions */
  uniqueSessions: number;
  /** Average duration for tool executions (ms) */
  avgToolExecutionDuration?: number;
  /** Error rate (percentage) */
  errorRate: number;
  /** Time range of logs */
  timeRange?: {
    earliest: Date;
    latest: Date;
  };
}

/**
 * Query result with pagination info
 */
export interface AuditLogQueryResult {
  /** Matching log entries */
  logs: OperationLog[];
  /** Total count (before pagination) */
  totalCount: number;
  /** Whether there are more results */
  hasMore: boolean;
  /** Current offset */
  offset: number;
  /** Current limit */
  limit: number;
}

/**
 * Audit Log Query Service
 *
 * Provides advanced querying and aggregation capabilities
 * for audit logs.
 */
export class AuditLogQuery {
  constructor(private logger: AuditLogger) {}

  /**
   * Query logs with advanced filtering
   *
   * @param options - Query options
   * @returns Query result with pagination info
   */
  query(options?: AuditLogQueryOptions): AuditLogQueryResult {
    let logs = this.logger.getAllLogs();

    // Apply filters
    logs = this.applyFilters(logs, options);

    // Get total count before pagination
    const totalCount = logs.length;

    // Apply sorting
    const order = options?.order ?? 'desc';
    logs.sort((a, b) => {
      const diff = a.createdAt.getTime() - b.createdAt.getTime();
      return order === 'asc' ? diff : -diff;
    });

    // Apply pagination
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    logs = logs.slice(offset, offset + limit);

    return {
      logs,
      totalCount,
      hasMore: offset + logs.length < totalCount,
      offset,
      limit,
    };
  }

  /**
   * Get logs for a specific session
   *
   * @param sessionId - Session ID
   * @param options - Additional query options
   * @returns Query result
   */
  queryBySession(
    sessionId: string,
    options?: Omit<AuditLogQueryOptions, 'sessionId'>
  ): AuditLogQueryResult {
    return this.query({ ...options, sessionId });
  }

  /**
   * Get logs for a specific operation type
   *
   * @param operationType - Operation type
   * @param options - Additional query options
   * @returns Query result
   */
  queryByOperationType(
    operationType: OperationType,
    options?: Omit<AuditLogQueryOptions, 'operationType'>
  ): AuditLogQueryResult {
    return this.query({ ...options, operationType });
  }

  /**
   * Get logs within a time range
   *
   * @param after - Start of time range
   * @param before - End of time range
   * @param options - Additional query options
   * @returns Query result
   */
  queryByTimeRange(
    after: Date,
    before: Date,
    options?: Omit<AuditLogQueryOptions, 'after' | 'before'>
  ): AuditLogQueryResult {
    return this.query({ ...options, after, before });
  }

  /**
   * Get error logs
   *
   * @param options - Additional query options
   * @returns Query result
   */
  queryErrors(options?: Omit<AuditLogQueryOptions, 'hasError'>): AuditLogQueryResult {
    return this.query({ ...options, hasError: true });
  }

  /**
   * Get tool execution logs
   *
   * @param toolName - Optional tool name filter
   * @param options - Additional query options
   * @returns Query result
   */
  queryToolExecutions(
    toolName?: string,
    options?: Omit<AuditLogQueryOptions, 'operationType' | 'target'>
  ): AuditLogQueryResult {
    return this.query({
      ...options,
      operationType: 'tool_execution',
      target: toolName,
    });
  }

  /**
   * Get aggregated statistics
   *
   * @param options - Optional filter options
   * @returns Aggregated statistics
   */
  getStats(options?: AuditLogQueryOptions): AuditLogStats {
    let logs = this.logger.getAllLogs();
    logs = this.applyFilters(logs, options);

    const byOperationType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const sessions = new Set<string>();
    let totalDuration = 0;
    let durationCount = 0;
    let errorCount = 0;
    let earliest: Date | undefined;
    let latest: Date | undefined;

    for (const log of logs) {
      // Count by operation type
      byOperationType[log.operationType] = (byOperationType[log.operationType] ?? 0) + 1;

      // Count by status
      byStatus[log.status] = (byStatus[log.status] ?? 0) + 1;

      // Track sessions
      if (log.sessionId) {
        sessions.add(log.sessionId);
      }

      // Track duration for tool executions
      if (log.operationType === 'tool_execution' && log.durationMs !== undefined) {
        totalDuration += log.durationMs;
        durationCount++;
      }

      // Count errors
      if (log.status === 'failure' || log.errorMessage) {
        errorCount++;
      }

      // Track time range
      if (!earliest || log.createdAt < earliest) {
        earliest = log.createdAt;
      }
      if (!latest || log.createdAt > latest) {
        latest = log.createdAt;
      }
    }

    return {
      totalLogs: logs.length,
      byOperationType: byOperationType as Record<OperationType, number>,
      byStatus: byStatus as Record<OperationStatus, number>,
      uniqueSessions: sessions.size,
      avgToolExecutionDuration: durationCount > 0 ? totalDuration / durationCount : undefined,
      errorRate: logs.length > 0 ? (errorCount / logs.length) * 100 : 0,
      timeRange: earliest && latest ? { earliest, latest } : undefined,
    };
  }

  /**
   * Get recent logs
   *
   * @param count - Number of logs to return
   * @returns Array of recent logs
   */
  getRecentLogs(count: number = 10): OperationLog[] {
    const result = this.query({ limit: count, order: 'desc' });
    return result.logs;
  }

  /**
   * Search logs by target pattern
   *
   * @param pattern - Search pattern (supports simple wildcards)
   * @param options - Additional query options
   * @returns Query result
   */
  searchByTarget(
    pattern: string,
    options?: Omit<AuditLogQueryOptions, 'target'>
  ): AuditLogQueryResult {
    let logs = this.logger.getAllLogs();
    logs = this.applyFilters(logs, options);

    // Convert pattern to regex (simple wildcard support)
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*')
      .replace(/\\\?/g, '.');
    const regex = new RegExp(regexPattern, 'i');

    logs = logs.filter((log) => log.target && regex.test(log.target));

    const totalCount = logs.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    const order = options?.order ?? 'desc';

    logs.sort((a, b) => {
      const diff = a.createdAt.getTime() - b.createdAt.getTime();
      return order === 'asc' ? diff : -diff;
    });

    logs = logs.slice(offset, offset + limit);

    return {
      logs,
      totalCount,
      hasMore: offset + logs.length < totalCount,
      offset,
      limit,
    };
  }

  /**
   * Apply filters to logs
   */
  private applyFilters(logs: OperationLog[], options?: AuditLogQueryOptions): OperationLog[] {
    if (!options) {
      return logs;
    }

    if (options.sessionId) {
      logs = logs.filter((log) => log.sessionId === options.sessionId);
    }

    if (options.operationType) {
      logs = logs.filter((log) => log.operationType === options.operationType);
    }

    if (options.operationTypes && options.operationTypes.length > 0) {
      const types = new Set(options.operationTypes);
      logs = logs.filter((log) => types.has(log.operationType));
    }

    if (options.status) {
      logs = logs.filter((log) => log.status === options.status);
    }

    if (options.target) {
      logs = logs.filter((log) => log.target === options.target);
    }

    if (options.after) {
      logs = logs.filter((log) => log.createdAt >= options.after!);
    }

    if (options.before) {
      logs = logs.filter((log) => log.createdAt <= options.before!);
    }

    if (options.hasError !== undefined) {
      if (options.hasError) {
        logs = logs.filter((log) => log.status === 'failure' || log.errorMessage);
      } else {
        logs = logs.filter((log) => log.status !== 'failure' && !log.errorMessage);
      }
    }

    return logs;
  }
}

/**
 * Create a new AuditLogQuery instance
 *
 * @param logger - AuditLogger instance to query
 * @returns AuditLogQuery instance
 */
export function createAuditLogQuery(logger: AuditLogger): AuditLogQuery {
  return new AuditLogQuery(logger);
}
