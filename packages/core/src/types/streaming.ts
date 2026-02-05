/**
 * Streaming Response Type Definitions
 *
 * Defines the interfaces for Server-Sent Events (SSE) streaming responses.
 * Used for real-time feedback during long-running AI assistant operations.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.4, 10.4
 */

// ============================================================================
// SSE Event Types
// ============================================================================

/**
 * All possible SSE event types
 */
export const SSE_EVENT_TYPES = [
  'processing_started',
  'iteration_started',
  'iteration_completed',
  'content_chunk',
  'tool_call_started',
  'tool_call_completed',
  'tool_error',
  'knowledge_retrieved',
  'confirmation_check',
  'decision',
  'completed',
  'error',
  'cancelled',
  'heartbeat',
  'max_iterations',
] as const;

/**
 * SSE event type literal union
 */
export type SSEEventType = (typeof SSE_EVENT_TYPES)[number];

/**
 * Base event structure for all SSE events
 */
export interface SSEEventBase {
  /** Unique event ID for resumption support */
  id: string;
  /** Event type identifier */
  type: SSEEventType;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Session ID this event belongs to */
  sessionId: string;
}

// ============================================================================
// Processing Lifecycle Events
// ============================================================================

/**
 * Event sent when processing starts
 * Requirement: 1.1
 */
export interface ProcessingStartedEvent extends SSEEventBase {
  type: 'processing_started';
  data: {
    /** ID of the message being processed */
    messageId: string;
  };
}

/**
 * Event sent when an agentic loop iteration begins
 * Requirement: 1.2
 */
export interface IterationStartedEvent extends SSEEventBase {
  type: 'iteration_started';
  data: {
    /** Current iteration number (1-indexed) */
    iteration: number;
    /** Maximum allowed iterations */
    maxIterations: number;
  };
}

/**
 * Event sent when an agentic loop iteration completes
 * Requirement: 3.4
 */
export interface IterationCompletedEvent extends SSEEventBase {
  type: 'iteration_completed';
  data: {
    /** Completed iteration number */
    iteration: number;
    /** Duration of the iteration in milliseconds */
    duration: number;
    /** Number of tool calls made in this iteration */
    toolCallCount: number;
  };
}

// ============================================================================
// Content Streaming Events
// ============================================================================

/**
 * Event sent for each content chunk during streaming
 * Requirement: 1.5, 3.3
 */
export interface ContentChunkEvent extends SSEEventBase {
  type: 'content_chunk';
  data: {
    /** Partial content chunk */
    content: string;
    /** Whether this is the final chunk */
    isComplete: boolean;
  };
}

// ============================================================================
// Tool Execution Events
// ============================================================================

/**
 * Event sent when a tool call starts
 * Requirement: 1.3
 */
export interface ToolCallStartedEvent extends SSEEventBase {
  type: 'tool_call_started';
  data: {
    /** Unique ID for this tool call */
    toolCallId: string;
    /** Name of the tool being called */
    toolName: string;
    /** Arguments passed to the tool */
    arguments: Record<string, unknown>;
  };
}

/**
 * Event sent when a tool call completes successfully
 * Requirement: 1.4
 */
export interface ToolCallCompletedEvent extends SSEEventBase {
  type: 'tool_call_completed';
  data: {
    /** ID of the completed tool call */
    toolCallId: string;
    /** Name of the tool that was called */
    toolName: string;
    /** Whether the tool execution was successful */
    success: boolean;
    /** Duration of the tool call in milliseconds */
    duration: number;
    /** Result of the tool execution (optional, may be omitted for large results) */
    result?: unknown;
  };
}

/**
 * Event sent when a tool call fails
 * Requirement: 8.2
 */
export interface ToolErrorEvent extends SSEEventBase {
  type: 'tool_error';
  data: {
    /** ID of the failed tool call */
    toolCallId: string;
    /** Name of the tool that failed */
    toolName: string;
    /** Error message */
    error: string;
    /** Whether processing can continue after this error */
    recoverable: boolean;
  };
}

// ============================================================================
// Knowledge and Reasoning Events
// ============================================================================

/**
 * Event sent when knowledge is retrieved
 * Requirement: 3.1
 */
export interface KnowledgeRetrievedEvent extends SSEEventBase {
  type: 'knowledge_retrieved';
  data: {
    /** Number of documents retrieved */
    documentCount: number;
    /** Categories of retrieved documents */
    categories: string[];
  };
}

/**
 * Event sent when confirmation is being checked
 * Requirement: 3.2
 */
export interface ConfirmationCheckEvent extends SSEEventBase {
  type: 'confirmation_check';
  data: {
    /** Description of what needs confirmation */
    description: string;
  };
}

/**
 * Event sent when the agent decides to stop iterating
 * Requirement: 3.5
 */
export interface DecisionEvent extends SSEEventBase {
  type: 'decision';
  data: {
    /** Reason for stopping */
    reason: string;
    /** Whether the task was completed successfully */
    completed: boolean;
  };
}

// ============================================================================
// Completion Events
// ============================================================================

/**
 * Event sent when processing completes successfully
 * Requirement: 2.3
 */
export interface CompletedEvent extends SSEEventBase {
  type: 'completed';
  data: {
    /** ID of the completed message */
    messageId: string;
    /** Total processing duration in milliseconds */
    totalDuration: number;
    /** Number of iterations executed */
    iterations: number;
    /** Total number of tool calls made */
    toolCalls: number;
  };
}

/**
 * Event sent when maximum iterations are reached
 * Requirement: 2.5
 */
export interface MaxIterationsEvent extends SSEEventBase {
  type: 'max_iterations';
  data: {
    /** Number of iterations executed */
    iterations: number;
    /** Partial content generated so far */
    partialContent?: string;
  };
}

// ============================================================================
// Error and Cancellation Events
// ============================================================================

/**
 * Event sent when an error occurs
 * Requirement: 2.4, 8.1, 8.4
 */
export interface ErrorEvent extends SSEEventBase {
  type: 'error';
  data: {
    /** Error code for programmatic handling */
    code: StreamingErrorCode;
    /** Human-readable error message */
    message: string;
    /** Whether the error is recoverable */
    recoverable: boolean;
    /** Additional error details */
    details?: Record<string, unknown>;
  };
}

/**
 * Event sent when processing is cancelled
 * Requirement: 10.4
 */
export interface CancelledEvent extends SSEEventBase {
  type: 'cancelled';
  data: {
    /** Reason for cancellation */
    reason: CancellationReason;
    /** Partial content generated before cancellation */
    partialContent?: string;
  };
}

// ============================================================================
// Heartbeat Event
// ============================================================================

/**
 * Event sent periodically to keep the connection alive
 * Requirement: 2.2
 */
export interface HeartbeatEvent extends SSEEventBase {
  type: 'heartbeat';
  data: {
    /** Server timestamp */
    serverTime: number;
  };
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * Union type of all possible SSE events
 */
export type StreamEvent =
  | ProcessingStartedEvent
  | IterationStartedEvent
  | IterationCompletedEvent
  | ContentChunkEvent
  | ToolCallStartedEvent
  | ToolCallCompletedEvent
  | ToolErrorEvent
  | KnowledgeRetrievedEvent
  | ConfirmationCheckEvent
  | DecisionEvent
  | CompletedEvent
  | MaxIterationsEvent
  | ErrorEvent
  | CancelledEvent
  | HeartbeatEvent;

// ============================================================================
// Streaming Configuration
// ============================================================================

/**
 * Configuration for streaming behavior
 */
export interface StreamingConfig {
  /** Whether streaming is enabled globally */
  enabled: boolean;
  /** Maximum streaming duration in milliseconds (default: 5 minutes) */
  maxDuration: number;
  /** Heartbeat interval in milliseconds (default: 15 seconds) */
  heartbeatInterval: number;
  /** Maximum number of concurrent streaming connections */
  maxConcurrent: number;
  /** Whether to enable event batching for performance */
  enableBatching: boolean;
  /** Batch interval in milliseconds (only used if enableBatching is true) */
  batchInterval: number;
}

/**
 * Default streaming configuration
 */
export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  enabled: true,
  maxDuration: 5 * 60 * 1000, // 5 minutes
  heartbeatInterval: 15 * 1000, // 15 seconds
  maxConcurrent: 100,
  enableBatching: false,
  batchInterval: 50, // 50ms
};

// ============================================================================
// Stream Context
// ============================================================================

/**
 * Status of a streaming session
 */
export type StreamStatus = 'active' | 'completed' | 'failed' | 'cancelled';

/**
 * Context for tracking an active stream
 */
export interface StreamContext {
  /** Unique stream identifier */
  id: string;
  /** Associated session ID */
  sessionId: string;
  /** User ID who initiated the stream */
  userId: string;
  /** Current stream status */
  status: StreamStatus;
  /** Stream start timestamp */
  startTime: number;
  /** Last event ID sent (for resumption) */
  lastEventId: number;
  /** Heartbeat timer reference */
  heartbeatTimer?: ReturnType<typeof setInterval>;
  /** Abort controller for cancellation */
  abortController: AbortController;
  /** Message ID being processed */
  messageId?: string;
  /** Accumulated content chunks */
  accumulatedContent: string;
  /** Event count for this stream */
  eventCount: number;
}

// ============================================================================
// Error Handling Types
// ============================================================================

/**
 * Error codes for streaming errors
 */
export const STREAMING_ERROR_CODES = [
  'LLM_API_ERROR',
  'TOOL_EXECUTION_FAILED',
  'KNOWLEDGE_RETRIEVAL_FAILED',
  'RATE_LIMIT_EXCEEDED',
  'CONTEXT_LENGTH_EXCEEDED',
  'AGENT_CRASH',
  'DATABASE_ERROR',
  'NETWORK_ERROR',
  'TIMEOUT',
  'INVALID_REQUEST',
  'STREAM_CLOSED',
  'MAX_CONCURRENT_EXCEEDED',
  'UNKNOWN_ERROR',
] as const;

export type StreamingErrorCode = (typeof STREAMING_ERROR_CODES)[number];

/**
 * Cancellation reasons
 */
export const CANCELLATION_REASONS = [
  'user_cancelled',
  'client_disconnected',
  'timeout',
  'server_shutdown',
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

/**
 * Error recovery strategy
 */
export type ErrorRecoveryStrategy = 'retry' | 'continue' | 'abort';

/**
 * Error handling configuration for different error types
 */
export interface ErrorHandlingConfig {
  /** Error code */
  code: StreamingErrorCode;
  /** Whether this error is recoverable */
  recoverable: boolean;
  /** Recovery strategy to use */
  strategy: ErrorRecoveryStrategy;
  /** Maximum retry attempts (only for 'retry' strategy) */
  maxRetries?: number;
  /** Retry delay in milliseconds (only for 'retry' strategy) */
  retryDelay?: number;
}

/**
 * Default error handling strategies
 */
export const DEFAULT_ERROR_HANDLING: Record<StreamingErrorCode, ErrorHandlingConfig> = {
  LLM_API_ERROR: {
    code: 'LLM_API_ERROR',
    recoverable: false,
    strategy: 'abort',
  },
  TOOL_EXECUTION_FAILED: {
    code: 'TOOL_EXECUTION_FAILED',
    recoverable: true,
    strategy: 'continue',
  },
  KNOWLEDGE_RETRIEVAL_FAILED: {
    code: 'KNOWLEDGE_RETRIEVAL_FAILED',
    recoverable: true,
    strategy: 'continue',
  },
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    recoverable: true,
    strategy: 'retry',
    maxRetries: 3,
    retryDelay: 1000,
  },
  CONTEXT_LENGTH_EXCEEDED: {
    code: 'CONTEXT_LENGTH_EXCEEDED',
    recoverable: false,
    strategy: 'abort',
  },
  AGENT_CRASH: {
    code: 'AGENT_CRASH',
    recoverable: false,
    strategy: 'abort',
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    recoverable: false,
    strategy: 'abort',
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    recoverable: true,
    strategy: 'retry',
    maxRetries: 3,
    retryDelay: 500,
  },
  TIMEOUT: {
    code: 'TIMEOUT',
    recoverable: true,
    strategy: 'retry',
    maxRetries: 2,
    retryDelay: 1000,
  },
  INVALID_REQUEST: {
    code: 'INVALID_REQUEST',
    recoverable: false,
    strategy: 'abort',
  },
  STREAM_CLOSED: {
    code: 'STREAM_CLOSED',
    recoverable: false,
    strategy: 'abort',
  },
  MAX_CONCURRENT_EXCEEDED: {
    code: 'MAX_CONCURRENT_EXCEEDED',
    recoverable: false,
    strategy: 'abort',
  },
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    recoverable: false,
    strategy: 'abort',
  },
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a value is a valid SSE event type
 */
export function isValidSSEEventType(type: unknown): type is SSEEventType {
  return typeof type === 'string' && SSE_EVENT_TYPES.includes(type as SSEEventType);
}

/**
 * Type guard to check if a value is a valid streaming error code
 */
export function isValidStreamingErrorCode(code: unknown): code is StreamingErrorCode {
  return typeof code === 'string' && STREAMING_ERROR_CODES.includes(code as StreamingErrorCode);
}

/**
 * Type guard to check if a value is a valid cancellation reason
 */
export function isValidCancellationReason(reason: unknown): reason is CancellationReason {
  return typeof reason === 'string' && CANCELLATION_REASONS.includes(reason as CancellationReason);
}

/**
 * Type guard for ProcessingStartedEvent
 */
export function isProcessingStartedEvent(event: StreamEvent): event is ProcessingStartedEvent {
  return event.type === 'processing_started';
}

/**
 * Type guard for IterationStartedEvent
 */
export function isIterationStartedEvent(event: StreamEvent): event is IterationStartedEvent {
  return event.type === 'iteration_started';
}

/**
 * Type guard for IterationCompletedEvent
 */
export function isIterationCompletedEvent(event: StreamEvent): event is IterationCompletedEvent {
  return event.type === 'iteration_completed';
}

/**
 * Type guard for ContentChunkEvent
 */
export function isContentChunkEvent(event: StreamEvent): event is ContentChunkEvent {
  return event.type === 'content_chunk';
}

/**
 * Type guard for ToolCallStartedEvent
 */
export function isToolCallStartedEvent(event: StreamEvent): event is ToolCallStartedEvent {
  return event.type === 'tool_call_started';
}

/**
 * Type guard for ToolCallCompletedEvent
 */
export function isToolCallCompletedEvent(event: StreamEvent): event is ToolCallCompletedEvent {
  return event.type === 'tool_call_completed';
}

/**
 * Type guard for ToolErrorEvent
 */
export function isToolErrorEvent(event: StreamEvent): event is ToolErrorEvent {
  return event.type === 'tool_error';
}

/**
 * Type guard for ErrorEvent
 */
export function isErrorEvent(event: StreamEvent): event is ErrorEvent {
  return event.type === 'error';
}

/**
 * Type guard for CancelledEvent
 */
export function isCancelledEvent(event: StreamEvent): event is CancelledEvent {
  return event.type === 'cancelled';
}

/**
 * Type guard for CompletedEvent
 */
export function isCompletedEvent(event: StreamEvent): event is CompletedEvent {
  return event.type === 'completed';
}

/**
 * Type guard for HeartbeatEvent
 */
export function isHeartbeatEvent(event: StreamEvent): event is HeartbeatEvent {
  return event.type === 'heartbeat';
}

// ============================================================================
// Factory Functions
// ============================================================================

let eventIdCounter = 0;

/**
 * Generates a unique event ID
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${++eventIdCounter}`;
}

/**
 * Creates a base event with common fields
 */
function createBaseEvent<T extends SSEEventType>(
  type: T,
  sessionId: string
): SSEEventBase & { type: T } {
  return {
    id: generateEventId(),
    type,
    timestamp: Date.now(),
    sessionId,
  };
}

/**
 * Creates a ProcessingStartedEvent
 */
export function createProcessingStartedEvent(
  sessionId: string,
  messageId: string
): ProcessingStartedEvent {
  return {
    ...createBaseEvent('processing_started', sessionId),
    data: { messageId },
  };
}

/**
 * Creates an IterationStartedEvent
 */
export function createIterationStartedEvent(
  sessionId: string,
  iteration: number,
  maxIterations: number
): IterationStartedEvent {
  return {
    ...createBaseEvent('iteration_started', sessionId),
    data: { iteration, maxIterations },
  };
}

/**
 * Creates an IterationCompletedEvent
 */
export function createIterationCompletedEvent(
  sessionId: string,
  iteration: number,
  duration: number,
  toolCallCount: number
): IterationCompletedEvent {
  return {
    ...createBaseEvent('iteration_completed', sessionId),
    data: { iteration, duration, toolCallCount },
  };
}

/**
 * Creates a ContentChunkEvent
 */
export function createContentChunkEvent(
  sessionId: string,
  content: string,
  isComplete: boolean
): ContentChunkEvent {
  return {
    ...createBaseEvent('content_chunk', sessionId),
    data: { content, isComplete },
  };
}

/**
 * Creates a ToolCallStartedEvent
 */
export function createToolCallStartedEvent(
  sessionId: string,
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>
): ToolCallStartedEvent {
  return {
    ...createBaseEvent('tool_call_started', sessionId),
    data: { toolCallId, toolName, arguments: args },
  };
}

/**
 * Creates a ToolCallCompletedEvent
 */
export function createToolCallCompletedEvent(
  sessionId: string,
  toolCallId: string,
  toolName: string,
  success: boolean,
  duration: number,
  result?: unknown
): ToolCallCompletedEvent {
  return {
    ...createBaseEvent('tool_call_completed', sessionId),
    data: { toolCallId, toolName, success, duration, result },
  };
}

/**
 * Creates a ToolErrorEvent
 */
export function createToolErrorEvent(
  sessionId: string,
  toolCallId: string,
  toolName: string,
  error: string,
  recoverable: boolean
): ToolErrorEvent {
  return {
    ...createBaseEvent('tool_error', sessionId),
    data: { toolCallId, toolName, error, recoverable },
  };
}

/**
 * Creates a KnowledgeRetrievedEvent
 */
export function createKnowledgeRetrievedEvent(
  sessionId: string,
  documentCount: number,
  categories: string[]
): KnowledgeRetrievedEvent {
  return {
    ...createBaseEvent('knowledge_retrieved', sessionId),
    data: { documentCount, categories },
  };
}

/**
 * Creates a ConfirmationCheckEvent
 */
export function createConfirmationCheckEvent(
  sessionId: string,
  description: string
): ConfirmationCheckEvent {
  return {
    ...createBaseEvent('confirmation_check', sessionId),
    data: { description },
  };
}

/**
 * Creates a DecisionEvent
 */
export function createDecisionEvent(
  sessionId: string,
  reason: string,
  completed: boolean
): DecisionEvent {
  return {
    ...createBaseEvent('decision', sessionId),
    data: { reason, completed },
  };
}

/**
 * Creates a CompletedEvent
 */
export function createCompletedEvent(
  sessionId: string,
  messageId: string,
  totalDuration: number,
  iterations: number,
  toolCalls: number
): CompletedEvent {
  return {
    ...createBaseEvent('completed', sessionId),
    data: { messageId, totalDuration, iterations, toolCalls },
  };
}

/**
 * Creates a MaxIterationsEvent
 */
export function createMaxIterationsEvent(
  sessionId: string,
  iterations: number,
  partialContent?: string
): MaxIterationsEvent {
  return {
    ...createBaseEvent('max_iterations', sessionId),
    data: { iterations, partialContent },
  };
}

/**
 * Creates an ErrorEvent
 */
export function createErrorEvent(
  sessionId: string,
  code: StreamingErrorCode,
  message: string,
  recoverable: boolean,
  details?: Record<string, unknown>
): ErrorEvent {
  return {
    ...createBaseEvent('error', sessionId),
    data: { code, message, recoverable, details },
  };
}

/**
 * Creates a CancelledEvent
 */
export function createCancelledEvent(
  sessionId: string,
  reason: CancellationReason,
  partialContent?: string
): CancelledEvent {
  return {
    ...createBaseEvent('cancelled', sessionId),
    data: { reason, partialContent },
  };
}

/**
 * Creates a HeartbeatEvent
 */
export function createHeartbeatEvent(sessionId: string): HeartbeatEvent {
  return {
    ...createBaseEvent('heartbeat', sessionId),
    data: { serverTime: Date.now() },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats an SSE event for transmission
 */
export function formatSSEEvent(event: StreamEvent): string {
  const lines: string[] = [];
  lines.push(`id: ${event.id}`);
  lines.push(`event: ${event.type}`);
  lines.push(`data: ${JSON.stringify(event)}`);
  lines.push(''); // Empty line to end the event
  return lines.join('\n') + '\n';
}

/**
 * Parses an SSE event from a string
 */
export function parseSSEEvent(eventString: string): StreamEvent | null {
  const lines = eventString.split('\n');
  let data: string | null = null;

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      data = line.slice(6);
    }
  }

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as StreamEvent;
  } catch {
    return null;
  }
}

/**
 * Gets the error handling configuration for an error code
 */
export function getErrorHandling(code: StreamingErrorCode): ErrorHandlingConfig {
  return DEFAULT_ERROR_HANDLING[code] ?? DEFAULT_ERROR_HANDLING.UNKNOWN_ERROR;
}

/**
 * Checks if an error is recoverable
 */
export function isRecoverableError(code: StreamingErrorCode): boolean {
  return getErrorHandling(code).recoverable;
}

/**
 * Creates a new StreamContext
 */
export function createStreamContext(id: string, sessionId: string, userId: string): StreamContext {
  return {
    id,
    sessionId,
    userId,
    status: 'active',
    startTime: Date.now(),
    lastEventId: 0,
    abortController: new AbortController(),
    accumulatedContent: '',
    eventCount: 0,
  };
}

/**
 * Validates streaming configuration
 */
export function validateStreamingConfig(config: Partial<StreamingConfig>): string[] {
  const errors: string[] = [];

  if (config.maxDuration !== undefined && config.maxDuration < 1000) {
    errors.push('maxDuration must be at least 1000ms (1 second)');
  }

  if (config.heartbeatInterval !== undefined && config.heartbeatInterval < 1000) {
    errors.push('heartbeatInterval must be at least 1000ms (1 second)');
  }

  if (config.maxConcurrent !== undefined && config.maxConcurrent < 1) {
    errors.push('maxConcurrent must be at least 1');
  }

  if (config.batchInterval !== undefined && config.batchInterval < 10) {
    errors.push('batchInterval must be at least 10ms');
  }

  return errors;
}

/**
 * Merges partial config with defaults
 */
export function mergeStreamingConfig(partial: Partial<StreamingConfig>): StreamingConfig {
  return {
    ...DEFAULT_STREAMING_CONFIG,
    ...partial,
  };
}
