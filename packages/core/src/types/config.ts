/**
 * Configuration Type Definitions
 *
 * Defines the configuration interfaces for the Agent, LLM providers,
 * and other system components.
 */

/**
 * Supported LLM providers
 */
export type LLMProvider =
  | 'openai'
  | 'claude'
  | 'qwen'
  | 'siliconflow'
  | 'mimo'
  | 'anyrouter'
  | 'custom';

/**
 * LLM task types for multi-LLM routing
 */
export type LLMTask =
  | 'intent_parsing'
  | 'knowledge_retrieval'
  | 'tool_calling'
  | 'response_generation';

/**
 * All LLM task types as a constant array
 */
export const LLM_TASKS: LLMTask[] = [
  'intent_parsing',
  'knowledge_retrieval',
  'tool_calling',
  'response_generation',
];

/**
 * Configuration for a single LLM provider
 */
export interface LLMProviderConfig {
  /** LLM provider type */
  provider: LLMProvider;
  /** API key for authentication */
  apiKey: string;
  /** Model identifier (e.g., 'gpt-4', 'claude-3-opus') */
  model: string;
  /** Custom API endpoint (for custom providers or proxies) */
  baseUrl?: string;
  /** Temperature for response generation (0-2) */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Additional provider-specific options */
  options?: Record<string, unknown>;
}

/**
 * LLM configuration supporting single or multi-LLM modes
 */
export interface LLMConfig {
  /** Operating mode: single LLM for all tasks or multiple specialized LLMs */
  mode: 'single' | 'multi';
  /** Default LLM configuration (used for all tasks in single mode) */
  default: LLMProviderConfig;
  /** Task-specific LLM assignments (only used in multi mode) */
  taskAssignment?: {
    /** LLM for parsing user intent */
    intentParsing?: LLMProviderConfig;
    /** LLM for knowledge retrieval and embedding */
    knowledgeRetrieval?: LLMProviderConfig;
    /** LLM for tool calling decisions */
    toolCalling?: LLMProviderConfig;
    /** LLM for generating final responses */
    responseGeneration?: LLMProviderConfig;
  };
  /** Fallback LLM if primary fails */
  fallback?: LLMProviderConfig;
  /** Retry configuration */
  retry?: {
    /** Maximum number of retries */
    maxRetries: number;
    /** Initial delay in milliseconds */
    initialDelayMs: number;
    /** Maximum delay in milliseconds */
    maxDelayMs: number;
  };
}

/**
 * Database configuration (deprecated - storage is now external)
 * @deprecated Storage is managed externally. Use @ai-agent/storage-memory or other storage packages.
 */
export interface DatabaseConfig {
  /** Database connection URL */
  url: string;
  /** Connection pool size */
  poolSize?: number;
}

/**
 * Knowledge system configuration
 */
export interface KnowledgeConfig {
  /** Embedding model configuration */
  embedding?: {
    /** Model to use for embeddings */
    model: string;
    /** Embedding dimension (e.g., 1536 for OpenAI ada-002) */
    dimension: number;
  };
  /** Search configuration */
  search?: {
    /** Default number of results to return */
    defaultTopK: number;
    /** Minimum similarity score threshold */
    minScore: number;
    /** Default search method */
    defaultMethod: 'keyword' | 'semantic' | 'hybrid';
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** Custom logger implementation */
  logger?: Logger;
  /** Enable performance metrics collection */
  enableMetrics?: boolean;
}

/**
 * Logger interface for custom logging implementations
 */
export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Agent behavior configuration
 */
export interface BehaviorConfig {
  /** Maximum processing time in milliseconds */
  timeoutMs?: number;
  /** Maximum number of tool call iterations */
  maxIterations?: number;
  /** Whether to require confirmation for high-risk operations */
  requireConfirmation?: boolean;
  /** Confidence threshold for automatic execution */
  confidenceThreshold?: number;
  /** System prompt customization */
  systemPrompt?: string;
}

/**
 * Complete Agent configuration
 */
export interface AgentConfig {
  /** LLM configuration */
  llm: LLMConfig;
  /** Database configuration (deprecated - use external storage) */
  database?: DatabaseConfig;
  /** Knowledge system configuration */
  knowledge?: KnowledgeConfig;
  /** Agent behavior configuration */
  behavior?: BehaviorConfig;
  /** Logging configuration */
  logging?: LoggingConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<AgentConfig> = {
  knowledge: {
    embedding: {
      model: 'text-embedding-ada-002',
      dimension: 1536,
    },
    search: {
      defaultTopK: 5,
      minScore: 0.7,
      defaultMethod: 'hybrid',
    },
  },
  behavior: {
    timeoutMs: 30000,
    maxIterations: 10,
    requireConfirmation: true,
    confidenceThreshold: 0.8,
  },
};

/**
 * Validates an LLMProviderConfig
 */
export function validateLLMProviderConfig(config: LLMProviderConfig): string[] {
  const errors: string[] = [];

  if (!config.provider) {
    errors.push('LLM provider is required');
  }
  if (!config.apiKey) {
    errors.push('API key is required');
  }
  if (!config.model) {
    errors.push('Model is required');
  }
  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
    errors.push('Temperature must be between 0 and 2');
  }
  if (config.maxTokens !== undefined && config.maxTokens < 1) {
    errors.push('Max tokens must be at least 1');
  }

  return errors;
}

/**
 * Validates an LLMConfig
 */
export function validateLLMConfig(config: LLMConfig): string[] {
  const errors: string[] = [];

  if (!config.mode) {
    errors.push('LLM mode is required');
  }
  if (!config.default) {
    errors.push('Default LLM configuration is required');
  } else {
    errors.push(...validateLLMProviderConfig(config.default).map((e) => `default: ${e}`));
  }

  if (config.fallback) {
    errors.push(...validateLLMProviderConfig(config.fallback).map((e) => `fallback: ${e}`));
  }

  if (config.mode === 'multi' && config.taskAssignment) {
    for (const [task, taskConfig] of Object.entries(config.taskAssignment)) {
      if (taskConfig) {
        errors.push(...validateLLMProviderConfig(taskConfig).map((e) => `${task}: ${e}`));
      }
    }
  }

  return errors;
}

/**
 * Validates a complete AgentConfig
 */
export function validateAgentConfig(config: AgentConfig): string[] {
  const errors: string[] = [];

  if (!config.llm) {
    errors.push('LLM configuration is required');
  } else {
    errors.push(...validateLLMConfig(config.llm).map((e) => `llm.${e}`));
  }

  // Database is now optional (deprecated)
  if (config.database && !config.database.url) {
    errors.push('Database URL is required if database config is provided');
  }

  return errors;
}

/**
 * Gets the LLM configuration for a specific task
 */
export function getLLMConfigForTask(config: LLMConfig, task: LLMTask): LLMProviderConfig {
  if (config.mode === 'single') {
    return config.default;
  }

  // Multi-LLM mode: check task assignment
  const taskConfig =
    config.taskAssignment?.[
      task === 'intent_parsing'
        ? 'intentParsing'
        : task === 'knowledge_retrieval'
          ? 'knowledgeRetrieval'
          : task === 'tool_calling'
            ? 'toolCalling'
            : 'responseGeneration'
    ];

  return taskConfig ?? config.default;
}
