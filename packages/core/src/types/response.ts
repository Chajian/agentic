/**
 * Agent Response Type Definitions
 * 
 * Defines the different types of responses the Agent can return.
 * Each response type represents a different interaction pattern with the user.
 */

/**
 * All possible response types
 */
export const RESPONSE_TYPES = ['execute', 'clarify', 'knowledge_request', 'confirm', 'options'] as const;

/**
 * Response type literal union
 */
export type ResponseType = typeof RESPONSE_TYPES[number];

/**
 * Execute Response - Agent has completed an action
 * 
 * Returned when the Agent has sufficient knowledge and confidence
 * to execute the requested action.
 */
export interface ExecuteResponse {
  type: 'execute';
  /** Human-readable result message */
  message: string;
  /** Optional structured data from the execution */
  data?: unknown;
  /** Tool calls that were made during execution */
  toolCalls?: ToolCallRecord[];
}

/**
 * Record of a tool call made during execution
 */
export interface ToolCallRecord {
  toolName: string;
  arguments: Record<string, unknown>;
  result: {
    success: boolean;
    content: string;
    data?: unknown;
  };
}

/**
 * Clarify Response - Agent needs more information
 * 
 * Returned when the user's request is ambiguous and the Agent
 * needs clarification before proceeding.
 */
export interface ClarifyResponse {
  type: 'clarify';
  /** Explanation of why clarification is needed */
  message: string;
  /** Specific questions to ask the user */
  questions: string[];
}

/**
 * Knowledge Request Response - Agent lacks required knowledge
 * 
 * Returned when the Agent doesn't have sufficient knowledge
 * to complete the request and needs the user to provide information.
 */
export interface KnowledgeRequestResponse {
  type: 'knowledge_request';
  /** Explanation of what knowledge is missing */
  message: string;
  /** Details about the missing knowledge */
  missing: {
    /** Topic area that's missing */
    topic: string;
    /** Description of what information is needed */
    description: string;
  };
  /** Options for how the user can provide the knowledge */
  options: KnowledgeOption[];
}

/**
 * Options for providing knowledge to the Agent
 */
export interface KnowledgeOption {
  /** Unique identifier for this option */
  id: string;
  /** Type of knowledge input */
  type: 'provide_text' | 'upload_file' | 'provide_url' | 'skip' | 'try_anyway';
  /** Human-readable label for the option */
  label: string;
  /** Optional description of what this option does */
  description?: string;
}

/**
 * Confirm Response - Agent needs user confirmation
 * 
 * Returned when the Agent is about to perform a high-risk operation
 * and needs explicit user confirmation.
 */
export interface ConfirmResponse {
  type: 'confirm';
  /** Explanation of what action will be taken */
  message: string;
  /** Details of the action to be confirmed */
  action: {
    /** Type of action (e.g., 'update', 'delete', 'create') */
    type: string;
    /** Target of the action (e.g., file path, entity name) */
    target: string;
    /** Parameters for the action */
    params: Record<string, unknown>;
  };
  /** Risk level of the operation */
  risk: 'low' | 'medium' | 'high';
  /** Optional preview of the changes */
  preview?: string;
}

/**
 * Options Response - Agent presents choices to user
 * 
 * Returned when multiple valid options exist and the Agent
 * needs the user to make a selection.
 */
export interface OptionsResponse {
  type: 'options';
  /** Explanation of why options are being presented */
  message: string;
  /** Available options for the user to choose from */
  options: SelectableOption[];
}

/**
 * A selectable option in an Options response
 */
export interface SelectableOption {
  /** Unique identifier for this option */
  id: string;
  /** Human-readable label */
  label: string;
  /** Detailed description of what this option does */
  description: string;
  /** Optional metadata for the option */
  metadata?: Record<string, unknown>;
}

/**
 * Union type of all possible Agent responses
 */
export type AgentResponse =
  | ExecuteResponse
  | ClarifyResponse
  | KnowledgeRequestResponse
  | ConfirmResponse
  | OptionsResponse;

/**
 * Type guard to check if a response is an ExecuteResponse
 */
export function isExecuteResponse(response: AgentResponse): response is ExecuteResponse {
  return response.type === 'execute';
}

/**
 * Type guard to check if a response is a ClarifyResponse
 */
export function isClarifyResponse(response: AgentResponse): response is ClarifyResponse {
  return response.type === 'clarify';
}

/**
 * Type guard to check if a response is a KnowledgeRequestResponse
 */
export function isKnowledgeRequestResponse(response: AgentResponse): response is KnowledgeRequestResponse {
  return response.type === 'knowledge_request';
}

/**
 * Type guard to check if a response is a ConfirmResponse
 */
export function isConfirmResponse(response: AgentResponse): response is ConfirmResponse {
  return response.type === 'confirm';
}

/**
 * Type guard to check if a response is an OptionsResponse
 */
export function isOptionsResponse(response: AgentResponse): response is OptionsResponse {
  return response.type === 'options';
}

/**
 * Validates that a response object has a valid response type
 */
export function isValidResponseType(type: unknown): type is ResponseType {
  return typeof type === 'string' && RESPONSE_TYPES.includes(type as ResponseType);
}

/**
 * Creates an ExecuteResponse
 */
export function createExecuteResponse(
  message: string,
  data?: unknown,
  toolCalls?: ToolCallRecord[]
): ExecuteResponse {
  return { type: 'execute', message, data, toolCalls };
}

/**
 * Creates a ClarifyResponse
 */
export function createClarifyResponse(message: string, questions: string[]): ClarifyResponse {
  return { type: 'clarify', message, questions };
}

/**
 * Creates a KnowledgeRequestResponse
 */
export function createKnowledgeRequestResponse(
  message: string,
  topic: string,
  description: string,
  options?: KnowledgeOption[]
): KnowledgeRequestResponse {
  const defaultOptions: KnowledgeOption[] = [
    { id: 'provide_text', type: 'provide_text', label: '提供文本信息' },
    { id: 'skip', type: 'skip', label: '跳过此步骤' },
    { id: 'try_anyway', type: 'try_anyway', label: '尝试继续' },
  ];
  return {
    type: 'knowledge_request',
    message,
    missing: { topic, description },
    options: options ?? defaultOptions,
  };
}

/**
 * Creates a ConfirmResponse
 */
export function createConfirmResponse(
  message: string,
  actionType: string,
  target: string,
  params: Record<string, unknown>,
  risk: 'low' | 'medium' | 'high',
  preview?: string
): ConfirmResponse {
  return {
    type: 'confirm',
    message,
    action: { type: actionType, target, params },
    risk,
    preview,
  };
}

/**
 * Creates an OptionsResponse
 */
export function createOptionsResponse(
  message: string,
  options: SelectableOption[]
): OptionsResponse {
  return { type: 'options', message, options };
}
