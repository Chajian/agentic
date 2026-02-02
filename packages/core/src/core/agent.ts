/**
 * Agent Core
 *
 * Main Agent class that orchestrates the agentic loop, plugin management,
 * knowledge retrieval, and response handling.
 *
 * Refactored to use:
 * - PluginManager for tool management (replacing ToolRegistry)
 * - AgenticLoop for autonomous LLM decision-making
 * - Confirmation mechanism for high-risk operations
 *
 * _Requirements: 1.1-1.7, 4.1, 4.5, 4.7_
 */

import { v4 as uuidv4 } from 'uuid';
import type { AgentConfig, BehaviorConfig } from '../types/config.js';
import type {
  AgentResponse,
  ToolCallRecord,
  ConfirmResponse,
} from '../types/response.js';
import type { Tool, ToolContext, ToolLogger } from '../types/tool.js';
import type { DocumentInput } from '../types/knowledge.js';
import type { AgentPlugin, PluginContext, PluginInfo, AppConfig } from '../types/plugin.js';
import type { LoopConfig, LoopResult, LoopMessage } from '../types/loop.js';
import type {
  StreamEvent,
  StreamingErrorCode,
} from '../types/streaming.js';
import {
  createProcessingStartedEvent,
  createCompletedEvent,
  createErrorEvent,
  createKnowledgeRetrievedEvent,
  createConfirmationCheckEvent,
} from '../types/streaming.js';
import { LLMManager } from '../llm/manager.js';
import { KnowledgeStore } from '../knowledge/store.js';
import { Embedder } from '../knowledge/embedder.js';
import { Retriever } from '../knowledge/retriever.js';
import { PluginManager } from './plugin-manager.js';
import { AgenticLoop } from './agentic-loop.js';
import { ResponseHandler } from './response-handler.js';

/**
 * Message in conversation history
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallRecord[];
  responseType?: string;
}

/**
 * Conversation session
 */
export interface Session {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
  /** Pending confirmation state */
  pendingConfirmation?: PendingConfirmation;
}

/**
 * Pending confirmation state
 */
export interface PendingConfirmation {
  /** The tool that requires confirmation */
  toolName: string;
  /** Arguments for the tool */
  arguments: Record<string, unknown>;
  /** Original user message */
  userMessage: string;
  /** Timestamp when confirmation was requested */
  timestamp: Date;
}

/**
 * Agent options for chat
 */
export interface ChatOptions {
  /** Session ID (creates new session if not provided) */
  sessionId?: string;
  /** Skip knowledge retrieval */
  skipKnowledge?: boolean;
  /** Skip confirmation for this request */
  skipConfirmation?: boolean;
  /** Additional context */
  context?: Record<string, unknown>;
  /** System prompt override */
  systemPrompt?: string;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Callback for streaming events */
  onEvent?: (event: StreamEvent) => void;
  /** Message ID for streaming events */
  messageId?: string;
  /**
   * Historical messages loaded from database.
   * Used for stateless operation - Agent does not maintain session state in memory.
   */
  history?: Message[];
  /**
   * Pending confirmation state loaded from database.
   * Used for stateless operation when user needs to confirm a high-risk operation.
   */
  pendingConfirmation?: PendingConfirmation;
}

/**
 * Default behavior configuration
 */
const DEFAULT_BEHAVIOR: Required<BehaviorConfig> = {
  timeoutMs: 30000,
  maxIterations: 10,
  requireConfirmation: true,
  confidenceThreshold: 0.8,
  systemPrompt: `You are a helpful AI assistant for game server management.
You have access to tools for managing MythicMobs configurations and Boss spawn points.
When the user asks you to do something, use the appropriate tools to complete the task.
Always respond in the same language as the user (Chinese or English).
If you're unsure about something, ask for clarification.`,
};

/**
 * Agent
 *
 * Main AI Agent class that coordinates all components to process
 * user messages and generate appropriate responses using the agentic loop.
 */
export class Agent {
  private config: AgentConfig;
  private behavior: Required<BehaviorConfig>;

  // Core components
  private llmManager: LLMManager;
  private knowledgeStore: KnowledgeStore;
  private embedder?: Embedder;
  private retriever: Retriever;
  private pluginManager: PluginManager;
  private agenticLoop: AgenticLoop;
  private responseHandler: ResponseHandler;

  // Logger
  private logger: ToolLogger;
  private logLevel: 'debug' | 'info' | 'warn' | 'error';
  private metricsEnabled: boolean;

  // Plugin context for dependency injection
  private pluginContext: PluginContext;

  constructor(config: AgentConfig) {
    this.config = config;
    this.behavior = { ...DEFAULT_BEHAVIOR, ...config.behavior };

    // Initialize logging configuration
    this.logLevel = config.logging?.level ?? 'info';
    this.metricsEnabled = config.logging?.enableMetrics ?? false;

    // Initialize logger (custom or default)
    this.logger = config.logging?.logger 
      ? this.createCustomLogger(config.logging.logger)
      : this.createLogger();

    // Initialize LLM Manager
    this.llmManager = new LLMManager(config.llm);

    // Initialize Embedder (if LLM supports embeddings)
    if (this.llmManager.supportsEmbeddings()) {
      // BGE models (used by SiliconFlow) output 1024 dimensions
      // OpenAI text-embedding-ada-002 outputs 1536 dimensions
      const embeddingDimension = config.llm.default?.provider === 'siliconflow' ? 1024 : 1536;
      this.embedder = new Embedder(this.llmManager, {
        expectedDimension: embeddingDimension,
      });
    }

    // Initialize Knowledge Store
    this.knowledgeStore = new KnowledgeStore({
      embedder: this.embedder,
      generateEmbeddings: true,
    });

    // Initialize Retriever
    this.retriever = new Retriever(
      this.knowledgeStore,
      this.embedder,
      config.knowledge?.search
    );

    // Initialize Plugin Manager
    this.pluginManager = new PluginManager({
      conflictStrategy: 'error',
      autoNamespace: true,
      strictValidation: true,
    });

    // Create plugin context for dependency injection
    this.pluginContext = this.createPluginContext();
    this.pluginManager.setContext(this.pluginContext);

    // Initialize Agentic Loop
    const loopConfig: Partial<LoopConfig> = {
      maxIterations: this.behavior.maxIterations,
      iterationTimeout: this.behavior.timeoutMs,
      parallelToolCalls: true,
      continueOnError: true,
    };
    this.agenticLoop = new AgenticLoop(this.llmManager, this.pluginManager, loopConfig);

    // Initialize Response Handler
    this.responseHandler = new ResponseHandler(this.llmManager);
  }

  /**
   * Process a user message and generate a response
   *
   * Pure Stateless Implementation:
   * - Does not maintain session state in memory
   * - History is passed in via options.history (loaded from database)
   * - PendingConfirmation is passed in via options.pendingConfirmation
   * - Returns pendingConfirmation in response for external persistence
   *
   * _Requirements: 1.1, 1.2, 1.3, 2.3, 2.4_
   */
  async chat(message: string, options?: ChatOptions): Promise<AgentResponse> {
    const sessionId = options?.sessionId ?? `session_${Date.now()}`;
    const messageId = options?.messageId ?? `msg_${Date.now()}`;
    const startTime = Date.now();

    // Convert external history to LoopMessage format for AgenticLoop
    const history: LoopMessage[] = this.convertHistoryToLoopMessages(options?.history);

    // Emit processing_started event if streaming is enabled
    // Requirement: 1.1
    if (options?.onEvent) {
      options.onEvent(createProcessingStartedEvent(sessionId, messageId));
    }

    try {
      // Check if this is a confirmation response (pendingConfirmation from database)
      if (options?.pendingConfirmation) {
        return this.handleConfirmationResponse(options.pendingConfirmation, message, options);
      }

      // Build tool context
      const toolContext = this.createToolContext(sessionId);

      // Build system prompt with knowledge context
      let systemPrompt = options?.systemPrompt ?? this.behavior.systemPrompt;

      // Optionally retrieve and inject knowledge
      if (!options?.skipKnowledge) {
        const knowledgeContext = await this.retrieveKnowledgeContextWithEvents(
          message,
          sessionId,
          options?.onEvent
        );
        if (knowledgeContext) {
          systemPrompt += `\n\nRelevant knowledge:\n${knowledgeContext}`;
        }
      }

      // Check for tools requiring confirmation before running the loop
      if (!options?.skipConfirmation && this.behavior.requireConfirmation) {
        // Emit confirmation_check event if streaming is enabled
        // Requirement: 3.2
        if (options?.onEvent) {
          options.onEvent(createConfirmationCheckEvent(
            sessionId,
            'Checking if operation requires confirmation'
          ));
        }

        const confirmationNeeded = await this.checkConfirmationNeeded(message, systemPrompt);
        if (confirmationNeeded) {
          // Return confirmation response with pendingConfirmation for external persistence
          const confirmResponse = this.createConfirmResponse(confirmationNeeded);
          // Attach pendingConfirmation data for database storage
          (confirmResponse as ConfirmResponse & { pendingConfirmation: PendingConfirmation }).pendingConfirmation = {
            toolName: confirmationNeeded.toolName,
            arguments: confirmationNeeded.arguments,
            userMessage: message,
            timestamp: new Date(),
          };
          return confirmResponse;
        }
      }

      // Run the agentic loop with streaming support
      // Pass history for stateless operation
      const loopResult = await this.agenticLoop.run(message, toolContext, {
        systemPrompt,
        maxIterations: this.behavior.maxIterations,
        timeout: this.behavior.timeoutMs,
        abortSignal: options?.abortSignal,
        onEvent: options?.onEvent,
        sessionId,
        history,  // Inject historical messages
      });

      // Convert loop result to agent response
      const response = this.loopResultToResponse(loopResult);

      // Emit completed event if streaming is enabled
      // Requirement: 2.3
      if (options?.onEvent) {
        const totalDuration = Date.now() - startTime;
        options.onEvent(createCompletedEvent(
          sessionId,
          messageId,
          totalDuration,
          loopResult.iterations,
          loopResult.toolCalls.length
        ));
      }

      return response;
    } catch (error) {
      this.logger.error('Agent processing failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Emit error event if streaming is enabled
      // Requirement: 2.4
      if (options?.onEvent) {
        const errorCode: StreamingErrorCode = this.mapErrorToCode(error);
        options.onEvent(createErrorEvent(
          sessionId,
          errorCode,
          error instanceof Error ? error.message : String(error),
          false
        ));
      }

      return this.responseHandler.createErrorResponse(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Convert external Message history to LoopMessage format
   */
  private convertHistoryToLoopMessages(history?: Message[]): LoopMessage[] {
    if (!history || history.length === 0) {
      return [];
    }

    return history.map((m) => {
      const loopMessage: LoopMessage = {
        role: m.role,
        content: m.content,
      };

      // Include toolCalls if present (for assistant messages)
      if (m.toolCalls && m.toolCalls.length > 0) {
        loopMessage.toolCalls = m.toolCalls.map((tc) => ({
          id: `tc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'function' as const,
          function: {
            name: tc.toolName,
            arguments: JSON.stringify(tc.arguments),
          },
        }));
      }

      return loopMessage;
    });
  }

  /**
   * Map an error to a streaming error code
   */
  private mapErrorToCode(error: unknown): StreamingErrorCode {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('timeout')) return 'TIMEOUT';
      if (message.includes('rate limit')) return 'RATE_LIMIT_EXCEEDED';
      if (message.includes('context length')) return 'CONTEXT_LENGTH_EXCEEDED';
      if (message.includes('network')) return 'NETWORK_ERROR';
      if (message.includes('database')) return 'DATABASE_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Retrieve knowledge context with streaming events
   * Requirement: 3.1
   */
  private async retrieveKnowledgeContextWithEvents(
    message: string,
    sessionId: string,
    onEvent?: (event: StreamEvent) => void
  ): Promise<string | null> {
    try {
      const results = await this.retriever.search(message, {
        method: 'hybrid',
        topK: 3,
      });

      if (results.length === 0) {
        return null;
      }

      // Emit knowledge_retrieved event if streaming is enabled
      if (onEvent) {
        const categories = [...new Set(results.map(r => r.document.category))];
        onEvent(createKnowledgeRetrievedEvent(sessionId, results.length, categories));
      }

      return results
        .map((r) => `[${r.document.category}] ${r.document.content}`)
        .join('\n\n');
    } catch (error) {
      this.logger.warn('Failed to retrieve knowledge', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Handle user's response to a confirmation request
   *
   * Stateless version: receives pendingConfirmation from database via options
   */
  private async handleConfirmationResponse(
    pending: PendingConfirmation,
    message: string,
    options?: ChatOptions
  ): Promise<AgentResponse> {
    const lowerMessage = message.toLowerCase().trim();

    // Check if user confirmed
    const confirmed =
      lowerMessage === 'yes' ||
      lowerMessage === 'y' ||
      lowerMessage === '是' ||
      lowerMessage === '确认' ||
      lowerMessage === '确定' ||
      lowerMessage === 'confirm' ||
      lowerMessage === 'ok';

    if (!confirmed) {
      return this.responseHandler.createSimpleExecuteResponse(
        '操作已取消。',
        { cancelled: true }
      );
    }

    // Re-run with skipConfirmation and without pendingConfirmation
    // This ensures the confirmed operation is executed
    return this.chat(pending.userMessage, {
      ...options,
      skipConfirmation: true,
      pendingConfirmation: undefined,  // Clear to avoid infinite loop
    });
  }

  /**
   * Check if any tool in the potential execution requires confirmation
   *
   * _Requirements: 4.7_
   */
  private async checkConfirmationNeeded(
    message: string,
    systemPrompt: string
  ): Promise<{ toolName: string; arguments: Record<string, unknown> } | null> {
    // Get tools that require confirmation
    const confirmationTools = this.pluginManager
      .listTools()
      .filter((tool) => tool.requiresConfirmation || tool.riskLevel === 'high');

    if (confirmationTools.length === 0) {
      return null;
    }

    // Use LLM to predict which tool might be called
    try {
      const toolDefinitions = this.pluginManager.getToolDefinitions();
      const response = await this.llmManager.generateWithTools(
        'tool_calling',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        toolDefinitions
      );

      // Check if any predicted tool requires confirmation
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          const tool = this.pluginManager.getTool(toolCall.name);
          if (tool && (tool.requiresConfirmation || tool.riskLevel === 'high')) {
            return {
              toolName: toolCall.name,
              arguments: toolCall.arguments,
            };
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to check confirmation needed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return null;
  }

  /**
   * Create a confirmation response
   */
  private createConfirmResponse(toolInfo: {
    toolName: string;
    arguments: Record<string, unknown>;
  }): ConfirmResponse {
    const tool = this.pluginManager.getTool(toolInfo.toolName);
    const riskLevel = tool?.riskLevel ?? 'medium';

    return {
      type: 'confirm',
      message: `即将执行操作: ${toolInfo.toolName}，请确认是否继续？`,
      action: {
        type: toolInfo.toolName,
        target: String(toolInfo.arguments.target ?? toolInfo.arguments.name ?? 'unknown'),
        params: toolInfo.arguments,
      },
      risk: riskLevel,
      preview: `工具: ${toolInfo.toolName}\n参数: ${JSON.stringify(toolInfo.arguments, null, 2)}`,
    };
  }

  /**
   * Convert agentic loop result to agent response
   */
  private loopResultToResponse(result: LoopResult): AgentResponse {
    // Convert tool call records
    const toolCalls: ToolCallRecord[] = result.toolCalls.map((tc) => ({
      toolName: tc.toolName,
      arguments: tc.arguments,
      result: {
        success: tc.result.success,
        content: tc.result.content,
        data: tc.result.data,
      },
    }));

    // Handle different loop statuses
    if (result.status === 'error') {
      return this.responseHandler.createErrorResponse(result.error ?? 'Unknown error');
    }

    if (result.status === 'max_iterations') {
      return {
        type: 'execute',
        message: `达到最大迭代次数限制 (${result.iterations})。部分结果: ${result.content}`,
        data: { partial: true, iterations: result.iterations },
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    }

    if (result.status === 'cancelled') {
      return {
        type: 'execute',
        message: '操作已取消。',
        data: { cancelled: true },
      };
    }

    // Successful completion
    return {
      type: 'execute',
      message: result.content,
      data: toolCalls.length > 0 ? { toolCallCount: toolCalls.length } : undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  /**
   * Retrieve knowledge context for the message
   * @deprecated Use retrieveKnowledgeContextWithEvents instead
   */
  private async retrieveKnowledgeContext(message: string): Promise<string | null> {
    return this.retrieveKnowledgeContextWithEvents(message, 'default');
  }

  /**
   * Continue processing after user confirmation
   *
   * @deprecated In stateless mode, confirmations should be handled by passing
   * pendingConfirmation via options.pendingConfirmation in chat()
   */
  async confirm(confirmed: boolean, sessionId?: string, options?: ChatOptions): Promise<AgentResponse> {
    const confirmMessage = confirmed ? 'yes' : 'no';
    return this.chat(confirmMessage, {
      ...options,
      sessionId,
    });
  }

  /**
   * Add knowledge to the knowledge base
   */
  async addKnowledge(content: string, category: string, title?: string): Promise<string> {
    const doc: DocumentInput = {
      content,
      category,
      title,
    };
    return this.knowledgeStore.addDocument(doc);
  }

  // ============================================
  // Plugin Management Methods
  // _Requirements: 4.1, 4.5_
  // ============================================

  /**
   * Load a plugin
   */
  async loadPlugin(plugin: AgentPlugin): Promise<void> {
    await this.pluginManager.load(plugin);
    this.logger.info('Plugin loaded', {
      name: plugin.name,
      version: plugin.version,
      toolCount: plugin.tools.length,
    });
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginName: string): Promise<boolean> {
    const result = await this.pluginManager.unload(pluginName);
    if (result) {
      this.logger.info('Plugin unloaded', { name: pluginName });
    }
    return result;
  }

  /**
   * List all loaded plugins
   */
  listPlugins(): PluginInfo[] {
    return this.pluginManager.listPlugins();
  }

  /**
   * Get a specific plugin
   */
  getPlugin(name: string): AgentPlugin | undefined {
    return this.pluginManager.getPlugin(name);
  }

  /**
   * Check if a plugin is loaded
   */
  hasPlugin(name: string): boolean {
    return this.pluginManager.hasPlugin(name);
  }

  // ============================================
  // Legacy Tool Registration (for backward compatibility)
  // ============================================

  /**
   * Register a tool with the agent (legacy method)
   * @deprecated Use loadPlugin instead
   */
  registerTool(tool: Tool): void {
    // Create a simple plugin wrapper for the tool
    const plugin: AgentPlugin = {
      name: `legacy_${tool.name}`,
      version: '1.0.0',
      description: `Legacy tool: ${tool.description}`,
      tools: [tool],
    };
    this.pluginManager.load(plugin).catch((err) => {
      this.logger.error('Failed to register legacy tool', {
        tool: tool.name,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  /**
   * Register multiple tools (legacy method)
   * @deprecated Use loadPlugin instead
   */
  registerTools(tools: Tool[]): void {
    if (tools.length === 0) return;

    const plugin: AgentPlugin = {
      name: 'legacy_tools',
      version: '1.0.0',
      description: 'Legacy tools bundle',
      tools,
    };
    this.pluginManager.load(plugin).catch((err) => {
      this.logger.error('Failed to register legacy tools', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // ============================================
  // Session Management (Stateless - Deprecated Methods)
  // ============================================

  /**
   * @deprecated In stateless mode, history should be passed via options.history in chat()
   * This method is kept for backward compatibility but does nothing.
   */
  importSessionHistory(
    _sessionId: string,
    _messages: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: Date | string;
      toolCalls?: string | null;
      responseType?: string | null;
    }>
  ): void {
    this.logger.warn('importSessionHistory is deprecated in stateless mode. Pass history via options.history in chat()');
  }

  /**
   * @deprecated In stateless mode, Agent does not maintain session state.
   * Always returns false.
   */
  hasSessionHistory(_sessionId: string): boolean {
    this.logger.warn('hasSessionHistory is deprecated in stateless mode. Agent does not maintain session state.');
    return false;
  }

  /**
   * @deprecated In stateless mode, history is not stored in Agent.
   * Always returns empty array.
   */
  getHistory(_sessionId?: string): Message[] {
    this.logger.warn('getHistory is deprecated in stateless mode. History should be loaded from database.');
    return [];
  }

  /**
   * @deprecated In stateless mode, sessions are managed externally (database).
   * Returns a generated UUID for compatibility.
   */
  createSession(_metadata?: Record<string, unknown>): string {
    this.logger.warn('createSession is deprecated in stateless mode. Sessions should be created in database.');
    return uuidv4();
  }

  // ============================================
  // Context and Logger Creation
  // ============================================

  /**
   * Create tool context for execution
   */
  private createToolContext(sessionId: string): ToolContext {
    return {
      knowledgeBase: this.knowledgeStore,
      sessionId,
      logger: this.logger,
    };
  }

  /**
   * Create plugin context for dependency injection
   */
  private createPluginContext(): PluginContext {
    const appConfig: AppConfig = {
      env: process.env.NODE_ENV ?? 'development',
      debug: process.env.DEBUG === 'true',
    };

    return {
      logger: this.logger,
      knowledgeBase: this.knowledgeStore,
      config: appConfig,
      services: {},
    };
  }

  /**
   * Create a logger instance with log level filtering
   */
  private createLogger(): ToolLogger {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.logLevel];

    return {
      info: (message: string, data?: Record<string, unknown>) => {
        if (currentLevel <= levels.info) {
          console.log(`[Agent INFO] ${message}`, data ?? '');
        }
      },
      warn: (message: string, data?: Record<string, unknown>) => {
        if (currentLevel <= levels.warn) {
          console.warn(`[Agent WARN] ${message}`, data ?? '');
        }
      },
      error: (message: string, data?: Record<string, unknown>) => {
        if (currentLevel <= levels.error) {
          console.error(`[Agent ERROR] ${message}`, data ?? '');
        }
      },
      debug: (message: string, data?: Record<string, unknown>) => {
        if (currentLevel <= levels.debug) {
          console.debug(`[Agent DEBUG] ${message}`, data ?? '');
        }
      },
    };
  }

  /**
   * Create a logger wrapper for custom logger
   */
  private createCustomLogger(customLogger: import('../types/config.js').Logger): ToolLogger {
    return {
      info: customLogger.info.bind(customLogger),
      warn: customLogger.warn.bind(customLogger),
      error: customLogger.error.bind(customLogger),
      debug: customLogger.debug.bind(customLogger),
    };
  }

  // ============================================
  // Accessors
  // ============================================

  /**
   * Get the LLM Manager
   */
  getLLMManager(): LLMManager {
    return this.llmManager;
  }

  /**
   * Get the Plugin Manager
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Get the Knowledge Store
   */
  getKnowledgeStore(): KnowledgeStore {
    return this.knowledgeStore;
  }

  /**
   * Get the Retriever
   */
  getRetriever(): Retriever {
    return this.retriever;
  }

  /**
   * Get the Agentic Loop
   */
  getAgenticLoop(): AgenticLoop {
    return this.agenticLoop;
  }

  /**
   * Get the current session ID
   * @deprecated In stateless mode, session ID should be managed externally.
   * Returns a placeholder value for compatibility.
   */
  getCurrentSessionId(): string {
    return 'stateless';
  }
}

/**
 * Create an Agent with simplified configuration
 */
export function createAgent(
  llmProvider: 'openai' | 'claude' | 'qwen' | 'siliconflow',
  apiKey: string,
  model: string,
  options?: Partial<AgentConfig>
): Agent {
  const config: AgentConfig = {
    llm: {
      mode: 'single',
      default: {
        provider: llmProvider,
        apiKey,
        model,
      },
    },
    ...options,
  };

  return new Agent(config);
}
