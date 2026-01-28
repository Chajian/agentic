/**
 * LLM Manager
 * 
 * Manages multiple LLM adapters and routes tasks to the appropriate LLM.
 * Supports single LLM mode (all tasks use one LLM) and multi-LLM mode
 * (different LLMs for different task types).
 */

import type {
  LLMAdapter,
  GenerateOptions,
  ChatMessage,
  LLMResponse,
  EmbeddingResult,
  StreamCallback,
} from './adapter.js';
import { LLMError } from './adapter.js';
import type { LLMConfig, LLMProviderConfig, LLMTask } from '../types/config.js';
import { getLLMConfigForTask } from '../types/config.js';
import type { ToolDefinition } from '../types/tool.js';
import { OpenAIAdapter } from './adapters/openai.js';
import { ClaudeAdapter } from './adapters/claude.js';
import { QwenAdapter } from './adapters/qwen.js';
import { SiliconFlowAdapter } from './adapters/siliconflow.js';
import { MiMoAdapter } from './adapters/mimo.js';
import { AnyRouterAdapter } from './adapters/anyrouter.js';

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * LLM Manager
 * 
 * Provides a unified interface for working with multiple LLM providers.
 */
export class LLMManager {
  private config: LLMConfig;
  private adapters: Map<string, LLMAdapter> = new Map();
  private retryConfig: RetryConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.retryConfig = config.retry ?? DEFAULT_RETRY_CONFIG;
    
    // Pre-create adapters for configured LLMs
    this.initializeAdapters();
  }

  /**
   * Get the LLM adapter for a specific task
   */
  getLLMForTask(task: LLMTask): LLMAdapter {
    const providerConfig = getLLMConfigForTask(this.config, task);
    return this.getOrCreateAdapter(providerConfig);
  }

  /**
   * Generate text for a specific task
   */
  async generate(
    task: LLMTask,
    prompt: string | ChatMessage[],
    options?: GenerateOptions
  ): Promise<string> {
    return this.executeWithRetry(
      task,
      async (adapter) => adapter.generate(prompt, options),
      options?.abortSignal
    );
  }

  /**
   * Generate text with tool calling for a specific task
   */
  async generateWithTools(
    task: LLMTask,
    prompt: string | ChatMessage[],
    tools: ToolDefinition[],
    options?: GenerateOptions
  ): Promise<LLMResponse> {
    return this.executeWithRetry(
      task,
      async (adapter) => adapter.generateWithTools(prompt, tools, options),
      options?.abortSignal
    );
  }

  /**
   * Generate text with tool calling for a specific task (streaming)
   *
   * Note: Streaming does not support automatic retry since we can't replay the stream.
   * If you need retry behavior, use the non-streaming version.
   */
  async generateWithToolsStream(
    task: LLMTask,
    prompt: string | ChatMessage[],
    tools: ToolDefinition[],
    onChunk: StreamCallback,
    options?: GenerateOptions
  ): Promise<LLMResponse> {
    // Check if already aborted before starting
    if (options?.abortSignal?.aborted) {
      const adapter = this.getLLMForTask(task);
      throw new LLMError('Operation cancelled', 'CANCELLED', adapter.provider);
    }

    const adapter = this.getLLMForTask(task);

    // Check if adapter supports streaming
    if (!adapter.supportsStreaming()) {
      // Fall back to non-streaming and send a single chunk at the end
      const response = await adapter.generateWithTools(prompt, tools, options);
      if (response.content) {
        onChunk({ type: 'content', content: response.content });
      }
      onChunk({ type: 'done', response });
      return response;
    }

    return adapter.generateWithToolsStream(prompt, tools, onChunk, options);
  }

  /**
   * Check if the adapter for a task supports streaming
   */
  supportsStreaming(task: LLMTask): boolean {
    const adapter = this.getLLMForTask(task);
    return adapter.supportsStreaming();
  }

  /**
   * Generate embedding using the knowledge retrieval LLM
   */
  async embed(text: string): Promise<EmbeddingResult> {
    // Use knowledge_retrieval task for embeddings
    const adapter = this.getLLMForTask('knowledge_retrieval');
    
    if (!adapter.supportsEmbeddings()) {
      // Try fallback if available
      if (this.config.fallback) {
        const fallbackAdapter = this.getOrCreateAdapter(this.config.fallback);
        if (fallbackAdapter.supportsEmbeddings()) {
          return fallbackAdapter.embed(text);
        }
      }
      
      // Try default adapter
      const defaultAdapter = this.getOrCreateAdapter(this.config.default);
      if (defaultAdapter.supportsEmbeddings()) {
        return defaultAdapter.embed(text);
      }
      
      throw new LLMError(
        'No adapter supports embeddings',
        'INVALID_REQUEST',
        adapter.provider
      );
    }
    
    return adapter.embed(text);
  }

  /**
   * Check if any configured adapter supports embeddings
   */
  supportsEmbeddings(): boolean {
    for (const adapter of this.adapters.values()) {
      if (adapter.supportsEmbeddings()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if the adapter for a task supports tool calling
   */
  supportsToolCalling(task: LLMTask): boolean {
    const adapter = this.getLLMForTask(task);
    return adapter.supportsToolCalling();
  }

  /**
   * Get all initialized adapters
   */
  getAdapters(): Map<string, LLMAdapter> {
    return new Map(this.adapters);
  }

  /**
   * Get the current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Initialize adapters for all configured LLMs
   */
  private initializeAdapters(): void {
    // Initialize default adapter
    this.getOrCreateAdapter(this.config.default);
    
    // Initialize fallback adapter if configured
    if (this.config.fallback) {
      this.getOrCreateAdapter(this.config.fallback);
    }
    
    // Initialize task-specific adapters in multi-LLM mode
    if (this.config.mode === 'multi' && this.config.taskAssignment) {
      const { intentParsing, knowledgeRetrieval, toolCalling, responseGeneration } = this.config.taskAssignment;
      
      if (intentParsing) this.getOrCreateAdapter(intentParsing);
      if (knowledgeRetrieval) this.getOrCreateAdapter(knowledgeRetrieval);
      if (toolCalling) this.getOrCreateAdapter(toolCalling);
      if (responseGeneration) this.getOrCreateAdapter(responseGeneration);
    }
  }

  /**
   * Get or create an adapter for a provider configuration
   */
  private getOrCreateAdapter(config: LLMProviderConfig): LLMAdapter {
    const key = this.getAdapterKey(config);
    
    let adapter = this.adapters.get(key);
    if (!adapter) {
      adapter = this.createAdapter(config);
      this.adapters.set(key, adapter);
    }
    
    return adapter;
  }

  /**
   * Create a unique key for an adapter configuration
   */
  private getAdapterKey(config: LLMProviderConfig): string {
    return `${config.provider}:${config.model}:${config.baseUrl ?? 'default'}`;
  }

  /**
   * Create an adapter based on provider configuration
   */
  private createAdapter(config: LLMProviderConfig): LLMAdapter {
    switch (config.provider) {
      case 'openai':
        return new OpenAIAdapter({
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      
      case 'claude':
        return new ClaudeAdapter({
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      
      case 'qwen':
        return new QwenAdapter({
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      
      case 'siliconflow':
        return new SiliconFlowAdapter({
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      
      case 'mimo':
        return new MiMoAdapter({
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      
      case 'anyrouter':
        return new AnyRouterAdapter({
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      
      case 'custom':
        // Custom providers use OpenAI-compatible API
        return new OpenAIAdapter({
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      
      default:
        throw new LLMError(
          `Unknown provider: ${config.provider}`,
          'INVALID_REQUEST',
          config.provider
        );
    }
  }

  /**
   * Execute an LLM operation with retry and fallback
   */
  private async executeWithRetry<T>(
    task: LLMTask,
    operation: (adapter: LLMAdapter) => Promise<T>,
    abortSignal?: AbortSignal
  ): Promise<T> {
    // Check if already aborted before starting
    if (abortSignal?.aborted) {
      const adapter = this.getLLMForTask(task);
      throw new LLMError('Operation cancelled', 'CANCELLED', adapter.provider);
    }

    const adapter = this.getLLMForTask(task);
    
    let lastError: Error | undefined;
    let delay = this.retryConfig.initialDelayMs;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      // Check if aborted before each retry attempt
      if (abortSignal?.aborted) {
        throw new LLMError('Operation cancelled', 'CANCELLED', adapter.provider);
      }

      try {
        return await operation(adapter);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry if cancelled
        if (error instanceof LLMError && error.code === 'CANCELLED') {
          throw error;
        }
        
        // Check if we should retry
        if (!this.shouldRetry(error, attempt)) {
          break;
        }
        
        // Wait before retrying
        await this.sleep(delay);
        delay = Math.min(delay * 2, this.retryConfig.maxDelayMs);
      }
    }
    
    // Try fallback if available
    if (this.config.fallback) {
      // Check if aborted before fallback
      if (abortSignal?.aborted) {
        throw new LLMError('Operation cancelled', 'CANCELLED', adapter.provider);
      }

      try {
        const fallbackAdapter = this.getOrCreateAdapter(this.config.fallback);
        return await operation(fallbackAdapter);
      } catch (fallbackError) {
        // Don't swallow cancelled errors from fallback
        if (fallbackError instanceof LLMError && fallbackError.code === 'CANCELLED') {
          throw fallbackError;
        }
        // Fallback also failed, throw original error
      }
    }
    
    throw lastError ?? new LLMError(
      'Unknown error during LLM operation',
      'UNKNOWN_ERROR',
      adapter.provider
    );
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }
    
    if (error instanceof LLMError) {
      // Retry on rate limits and network errors
      return error.code === 'RATE_LIMIT_ERROR' || error.code === 'NETWORK_ERROR';
    }
    
    return false;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create an LLMManager with a simple single-LLM configuration
 */
export function createSimpleLLMManager(
  provider: LLMProviderConfig['provider'],
  apiKey: string,
  model: string,
  options?: Partial<LLMProviderConfig>
): LLMManager {
  return new LLMManager({
    mode: 'single',
    default: {
      provider,
      apiKey,
      model,
      ...options,
    },
  });
}
