/**
 * Audit Logger
 *
 * Records tool executions, configuration changes, and errors
 * for audit and troubleshooting purposes.
 *
 * _Requirements: 10.1, 10.2, 10.3_
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Operation types that can be logged
 */
export type OperationType =
  | 'tool_execution'
  | 'config_change'
  | 'knowledge_add'
  | 'knowledge_delete'
  | 'session_create'
  | 'session_close'
  | 'error';

/**
 * Status of an operation
 */
export type OperationStatus = 'success' | 'failure' | 'pending';

/**
 * Operation log entry
 */
export interface OperationLog {
  /** Unique log entry ID */
  id: string;
  /** Session ID associated with this operation */
  sessionId?: string;
  /** Type of operation */
  operationType: OperationType;
  /** Target of the operation (e.g., tool name, config key) */
  target?: string;
  /** Parameters passed to the operation */
  params?: Record<string, unknown>;
  /** Result of the operation */
  result?: Record<string, unknown>;
  /** Operation status */
  status: OperationStatus;
  /** Error message if operation failed */
  errorMessage?: string;
  /** Error stack trace if available */
  errorStack?: string;
  /** Timestamp when the operation occurred */
  createdAt: Date;
  /** Duration of the operation in milliseconds */
  durationMs?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a tool execution log
 */
export interface ToolExecutionLogInput {
  /** Session ID */
  sessionId?: string;
  /** Tool name */
  toolName: string;
  /** Tool arguments */
  args: Record<string, unknown>;
  /** Execution result */
  result: {
    success: boolean;
    content: string;
    data?: unknown;
    error?: {
      code: string;
      message: string;
      details?: unknown;
    };
  };
  /** Execution duration in milliseconds */
  durationMs: number;
}

/**
 * Input for creating a config change log
 */
export interface ConfigChangeLogInput {
  /** Session ID */
  sessionId?: string;
  /** Config key that was changed */
  configKey: string;
  /** Value before the change */
  beforeValue?: unknown;
  /** Value after the change */
  afterValue?: unknown;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating an error log
 */
export interface ErrorLogInput {
  /** Session ID */
  sessionId?: string;
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Context where the error occurred */
  context?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Audit Logger
 *
 * In-memory audit logger that records all operations performed by the Agent.
 * Provides methods for logging tool executions, config changes, and errors.
 */
export class AuditLogger {
  private logs: Map<string, OperationLog> = new Map();

  // Indexes for faster lookups
  private logsBySession: Map<string, Set<string>> = new Map();
  private logsByType: Map<OperationType, Set<string>> = new Map();

  /**
   * Log a tool execution
   *
   * @param input - Tool execution details
   * @returns The created log entry
   */
  logToolExecution(input: ToolExecutionLogInput): OperationLog {
    const log: OperationLog = {
      id: uuidv4(),
      sessionId: input.sessionId,
      operationType: 'tool_execution',
      target: input.toolName,
      params: input.args,
      result: {
        success: input.result.success,
        content: input.result.content,
        data: input.result.data,
      },
      status: input.result.success ? 'success' : 'failure',
      errorMessage: input.result.error?.message,
      createdAt: new Date(),
      durationMs: input.durationMs,
    };

    if (input.result.error) {
      log.metadata = { errorCode: input.result.error.code };
    }

    this.addLog(log);
    return log;
  }

  /**
   * Log a configuration change
   *
   * @param input - Config change details
   * @returns The created log entry
   */
  logConfigChange(input: ConfigChangeLogInput): OperationLog {
    const log: OperationLog = {
      id: uuidv4(),
      sessionId: input.sessionId,
      operationType: 'config_change',
      target: input.configKey,
      params: {
        before: input.beforeValue,
        after: input.afterValue,
      },
      result: {
        before: input.beforeValue,
        after: input.afterValue,
      },
      status: 'success',
      createdAt: new Date(),
      metadata: input.metadata,
    };

    this.addLog(log);
    return log;
  }

  /**
   * Log an error
   *
   * @param input - Error details
   * @returns The created log entry
   */
  logError(input: ErrorLogInput): OperationLog {
    const log: OperationLog = {
      id: uuidv4(),
      sessionId: input.sessionId,
      operationType: 'error',
      target: input.context,
      status: 'failure',
      errorMessage: input.message,
      errorStack: input.stack,
      createdAt: new Date(),
      metadata: input.details,
    };

    this.addLog(log);
    return log;
  }

  /**
   * Log a knowledge addition
   *
   * @param sessionId - Session ID
   * @param documentId - Document ID
   * @param category - Document category
   * @param title - Document title
   * @returns The created log entry
   */
  logKnowledgeAdd(
    sessionId: string | undefined,
    documentId: string,
    category: string,
    title?: string
  ): OperationLog {
    const log: OperationLog = {
      id: uuidv4(),
      sessionId,
      operationType: 'knowledge_add',
      target: documentId,
      params: { category, title },
      status: 'success',
      createdAt: new Date(),
    };

    this.addLog(log);
    return log;
  }

  /**
   * Log a knowledge deletion
   *
   * @param sessionId - Session ID
   * @param documentId - Document ID
   * @param success - Whether deletion was successful
   * @returns The created log entry
   */
  logKnowledgeDelete(
    sessionId: string | undefined,
    documentId: string,
    success: boolean
  ): OperationLog {
    const log: OperationLog = {
      id: uuidv4(),
      sessionId,
      operationType: 'knowledge_delete',
      target: documentId,
      status: success ? 'success' : 'failure',
      createdAt: new Date(),
    };

    this.addLog(log);
    return log;
  }

  /**
   * Log a session creation
   *
   * @param sessionId - Session ID
   * @param metadata - Session metadata
   * @returns The created log entry
   */
  logSessionCreate(sessionId: string, metadata?: Record<string, unknown>): OperationLog {
    const log: OperationLog = {
      id: uuidv4(),
      sessionId,
      operationType: 'session_create',
      target: sessionId,
      status: 'success',
      createdAt: new Date(),
      metadata,
    };

    this.addLog(log);
    return log;
  }

  /**
   * Log a session close
   *
   * @param sessionId - Session ID
   * @returns The created log entry
   */
  logSessionClose(sessionId: string): OperationLog {
    const log: OperationLog = {
      id: uuidv4(),
      sessionId,
      operationType: 'session_close',
      target: sessionId,
      status: 'success',
      createdAt: new Date(),
    };

    this.addLog(log);
    return log;
  }

  /**
   * Get a log entry by ID
   *
   * @param logId - Log entry ID
   * @returns The log entry or undefined
   */
  getLog(logId: string): OperationLog | undefined {
    return this.logs.get(logId);
  }

  /**
   * Get all logs for a session
   *
   * @param sessionId - Session ID
   * @returns Array of log entries
   */
  getLogsBySession(sessionId: string): OperationLog[] {
    const logIds = this.logsBySession.get(sessionId);
    if (!logIds) {
      return [];
    }
    return Array.from(logIds)
      .map((id) => this.logs.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Get all logs of a specific type
   *
   * @param operationType - Operation type
   * @returns Array of log entries
   */
  getLogsByType(operationType: OperationType): OperationLog[] {
    const logIds = this.logsByType.get(operationType);
    if (!logIds) {
      return [];
    }
    return Array.from(logIds)
      .map((id) => this.logs.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Get all logs
   *
   * @returns Array of all log entries
   */
  getAllLogs(): OperationLog[] {
    return Array.from(this.logs.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  /**
   * Get total log count
   *
   * @returns Total number of logs
   */
  getLogCount(): number {
    return this.logs.size;
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs.clear();
    this.logsBySession.clear();
    this.logsByType.clear();
  }

  /**
   * Add a log entry to storage
   */
  private addLog(log: OperationLog): void {
    this.logs.set(log.id, log);

    // Update session index
    if (log.sessionId) {
      if (!this.logsBySession.has(log.sessionId)) {
        this.logsBySession.set(log.sessionId, new Set());
      }
      this.logsBySession.get(log.sessionId)!.add(log.id);
    }

    // Update type index
    if (!this.logsByType.has(log.operationType)) {
      this.logsByType.set(log.operationType, new Set());
    }
    this.logsByType.get(log.operationType)!.add(log.id);
  }
}

/**
 * Create a new AuditLogger instance
 */
export function createAuditLogger(): AuditLogger {
  return new AuditLogger();
}
