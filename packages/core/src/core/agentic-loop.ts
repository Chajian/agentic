/**
 * Agentic Loop
 *
 * Implements the ReAct (Reasoning + Acting) loop pattern.
 * LLM autonomously decides tool calls and iterates until task completion.
 *
 * @module core/agentic-loop
 */

import type { LLMManager } from '../llm/manager.js';
import type { ToolContext, ToolResult } from '../types/tool.js';
import type { ChatMessage } from '../llm/adapter.js';
import type {
  LoopConfig,
  LoopMessage,
  LoopResult,
  LoopRunOptions,
  LoopState,
  LoopStatus,
  LLMToolCall,
  ToolCallRecord,
} from '../types/loop.js';
import type { ToolDefinition } from '../types/tool.js';
import {
  createIterationStartedEvent,
  createIterationCompletedEvent,
  createContentChunkEvent,
  createDecisionEvent,
  createToolCallStartedEvent,
  createToolCallCompletedEvent,
  createToolErrorEvent,
} from '../types/streaming.js';
import { DEFAULT_LOOP_CONFIG } from '../types/loop.js';
import { PluginManager } from './plugin-manager.js';

/**
 * Error thrown when loop execution fails
 */
export class LoopError extends Error {
  constructor(
    message: string,
    public readonly status: LoopStatus,
    public readonly iteration: number
  ) {
    super(message);
    this.name = 'LoopError';
  }
}

/**
 * Agentic Loop
 *
 * Executes the reasoning-action loop where LLM decides what tools to call.
 * Continues until LLM generates a final response or limits are reached.
 */
export class AgenticLoop {
  private config: LoopConfig;

  constructor(
    private llm: LLMManager,
    private pluginManager: PluginManager,
    config: Partial<LoopConfig> = {}
  ) {
    this.config = { ...DEFAULT_LOOP_CONFIG, ...config };
  }

  /**
   * Execute the agentic loop
   *
   * @param userMessage - The user's input message
   * @param context - Tool execution context
   * @param options - Optional run-time overrides
   * @returns Loop result with final response and tool call history
   */
  async run(
    userMessage: string,
    context: ToolContext,
    options: LoopRunOptions = {}
  ): Promise<LoopResult> {
    const maxIterations = options.maxIterations ?? this.config.maxIterations;
    const startTime = new Date();
    const sessionId = options.sessionId ?? 'default';

    // Initialize state
    const state: LoopState = {
      iteration: 0,
      messages: [],
      toolCalls: [],
      status: 'running',
      startTime,
    };

    // Add system prompt if provided
    if (options.systemPrompt) {
      state.messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    // Inject historical messages (stateless mode: history from database)
    // Messages are added after system prompt, before current user message
    if (options.history && options.history.length > 0) {
      // Filter out system messages (already handled via systemPrompt)
      const historyWithoutSystem = options.history.filter(m => m.role !== 'system');
      state.messages.push(...historyWithoutSystem);
    }

    // Add user message
    state.messages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      while (state.status === 'running') {
        // Check iteration limit
        if (state.iteration >= maxIterations) {
          state.status = 'max_iterations';
          
          // Emit decision event for max iterations
          // Requirement: 3.5
          if (options.onEvent) {
            options.onEvent(createDecisionEvent(
              sessionId,
              `Reached maximum iteration limit (${maxIterations})`,
              false
            ));
          }
          break;
        }

        // Check abort signal
        if (options.abortSignal?.aborted) {
          state.status = 'cancelled';
          
          // Emit decision event for cancellation
          // Requirement: 3.5
          if (options.onEvent) {
            options.onEvent(createDecisionEvent(
              sessionId,
              'Operation was cancelled by user',
              false
            ));
          }
          break;
        }

        // Execute one iteration with streaming support
        await this.executeIterationWithStreaming(state, context, options, sessionId);
        state.iteration++;
      }
    } catch (error) {
      // Check if this is an abort/cancellation error
      // Requirements: 1.2, 3.3
      const isAbortError = 
        (error instanceof Error && error.name === 'AbortError') ||
        (error instanceof Error && (error as any).code === 'CANCELLED') ||
        options.abortSignal?.aborted;
      
      if (isAbortError) {
        state.status = 'cancelled';
        
        // Emit decision event for cancellation
        if (options.onEvent) {
          options.onEvent(createDecisionEvent(
            sessionId,
            'Operation was cancelled by user',
            false
          ));
        }
      } else {
        state.status = 'error';
        state.error = error instanceof Error ? error.message : String(error);
      }
    }

    state.endTime = new Date();

    return this.buildResult(state);
  }

  /**
   * Execute a single iteration of the loop with streaming support
   * Requirements: 1.2, 1.5, 3.3, 3.4, 3.5
   */
  private async executeIterationWithStreaming(
    state: LoopState,
    context: ToolContext,
    options: LoopRunOptions,
    sessionId: string
  ): Promise<void> {
    const iterationStartTime = Date.now();
    const currentIteration = state.iteration + 1; // 1-indexed for display
    const maxIterations = options.maxIterations ?? this.config.maxIterations;

    // Emit iteration_started event
    // Requirement: 1.2
    if (options.onEvent) {
      options.onEvent(createIterationStartedEvent(sessionId, currentIteration, maxIterations));
    }

    // Get tool definitions
    const toolDefinitions = this.pluginManager.getToolDefinitions();

    // Track if we've sent any content chunks during streaming
    let hasStreamedContent = false;

    // Create streaming callback if onEvent is provided
    const onContentChunk = options.onEvent
      ? (content: string) => {
          hasStreamedContent = true;
          options.onEvent!(createContentChunkEvent(sessionId, content, false));
        }
      : undefined;

    // Call LLM with tools - pass abortSignal for cancellation support
    // Requirements: 3.1
    const llmResponse = await this.callLLMWithTimeout(
      state.messages,
      toolDefinitions,
      options.timeout ?? this.config.iterationTimeout,
      options.abortSignal,
      onContentChunk
    );

    let toolCallCount = 0;

    // Check if LLM wants to call tools
    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      // Add assistant message with tool calls
      state.messages.push({
        role: 'assistant',
        content: llmResponse.content || '',
        toolCalls: llmResponse.toolCalls,
      });

      // If we didn't stream content (non-streaming fallback), send it now
      // Requirement: 1.5, 3.3
      if (!hasStreamedContent && llmResponse.content && options.onEvent) {
        options.onEvent(createContentChunkEvent(sessionId, llmResponse.content, false));
      }

      // Execute tools with streaming events
      const toolResults = await this.executeToolCallsWithStreaming(
        llmResponse.toolCalls,
        context,
        state,
        options,
        sessionId
      );

      toolCallCount = toolResults.length;

      // Add tool results as messages
      for (const result of toolResults) {
        state.messages.push({
          role: 'tool',
          content: JSON.stringify(result.result),
          toolCallId: result.id,
        });
      }
    } else {
      // LLM generated final response - task complete
      state.messages.push({
        role: 'assistant',
        content: llmResponse.content || '',
      });
      state.status = 'completed';

      // Stream final content
      // Requirement: 1.5, 3.3
      if (options.onEvent) {
        if (!hasStreamedContent && llmResponse.content) {
          // Non-streaming fallback: send all content at once
          options.onEvent(createContentChunkEvent(sessionId, llmResponse.content, true));
        } else {
          // Content was already streamed, just signal completion
          options.onEvent(createContentChunkEvent(sessionId, '', true));
        }
      }

      // Emit decision event for completion
      // Requirement: 3.5
      if (options.onEvent) {
        options.onEvent(createDecisionEvent(
          sessionId,
          'Task completed successfully',
          true
        ));
      }
    }

    // Emit iteration_completed event
    // Requirement: 3.4
    if (options.onEvent) {
      const iterationDuration = Date.now() - iterationStartTime;
      options.onEvent(createIterationCompletedEvent(
        sessionId,
        currentIteration,
        iterationDuration,
        toolCallCount
      ));
    }
  }

  /**
   * Execute tool calls with streaming events
   * Requirements: 1.3, 1.4, 8.2
   */
  private async executeToolCallsWithStreaming(
    toolCalls: LLMToolCall[],
    context: ToolContext,
    state: LoopState,
    options: LoopRunOptions,
    sessionId: string
  ): Promise<ToolCallRecord[]> {
    const results: ToolCallRecord[] = [];

    if (this.config.parallelToolCalls && toolCalls.length > 1) {
      // Execute in parallel
      const promises = toolCalls.map((tc) =>
        this.executeSingleToolCallWithStreaming(tc, context, options, sessionId)
      );
      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults);
    } else {
      // Execute sequentially
      for (const toolCall of toolCalls) {
        const result = await this.executeSingleToolCallWithStreaming(
          toolCall,
          context,
          options,
          sessionId
        );
        results.push(result);
      }
    }

    // Add to state
    state.toolCalls.push(...results);

    return results;
  }

  /**
   * Execute a single tool call with streaming events
   * Requirements: 1.3, 1.4, 8.2
   */
  private async executeSingleToolCallWithStreaming(
    toolCall: LLMToolCall,
    context: ToolContext,
    options: LoopRunOptions,
    sessionId: string
  ): Promise<ToolCallRecord> {
    const startTime = Date.now();
    const toolName = toolCall.function.name;
    const toolCallId = toolCall.id;

    let result: ToolResult;
    let args: Record<string, unknown> = {};

    try {
      // Parse arguments
      args = JSON.parse(toolCall.function.arguments);

      // Emit tool_call_started event
      // Requirement: 1.3
      if (options.onEvent) {
        options.onEvent(createToolCallStartedEvent(sessionId, toolCallId, toolName, args));
      }

      // Get tool
      const tool = this.pluginManager.getTool(toolName);
      if (!tool) {
        result = {
          success: false,
          content: `Tool not found: ${toolName}`,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: `Tool '${toolName}' is not registered`,
          },
        };

        // Emit tool_error event
        // Requirement: 8.2
        if (options.onEvent) {
          options.onEvent(createToolErrorEvent(
            sessionId,
            toolCallId,
            toolName,
            `Tool '${toolName}' is not registered`,
            true // recoverable - can continue with other tools
          ));
        }
      } else {
        // Execute tool
        result = await tool.execute(args, context);

        const duration = Date.now() - startTime;

        if (result.success) {
          // Emit tool_call_completed event
          // Requirement: 1.4
          if (options.onEvent) {
            options.onEvent(createToolCallCompletedEvent(
              sessionId,
              toolCallId,
              toolName,
              true,
              duration,
              result.data
            ));
          }
        } else {
          // Emit tool_error event for failed execution
          // Requirement: 8.2
          if (options.onEvent) {
            options.onEvent(createToolErrorEvent(
              sessionId,
              toolCallId,
              toolName,
              result.error?.message ?? result.content,
              true // recoverable - can continue with other tools
            ));
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result = {
        success: false,
        content: `Tool execution failed: ${errorMessage}`,
        error: {
          code: 'EXECUTION_ERROR',
          message: errorMessage,
        },
      };

      // Emit tool_error event
      // Requirement: 8.2
      if (options.onEvent) {
        options.onEvent(createToolErrorEvent(
          sessionId,
          toolCallId,
          toolName,
          errorMessage,
          true // recoverable - can continue with other tools
        ));
      }
    }

    return {
      id: toolCall.id,
      toolName,
      arguments: args,
      result,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Execute a single iteration of the loop
   * @deprecated Use executeIterationWithStreaming instead
   */
  private async executeIteration(
    state: LoopState,
    context: ToolContext,
    options: LoopRunOptions
  ): Promise<void> {
    // Delegate to the streaming version without events
    await this.executeIterationWithStreaming(state, context, options, 'default');
  }

  /**
   * Call LLM with timeout and abort signal support
   * 
   * Creates a combined AbortController that responds to either:
   * - Timeout expiration
   * - External abort signal
   *
   * Requirements: 3.1, 3.2
   */
  private async callLLMWithTimeout(
    messages: LoopMessage[],
    toolDefinitions: ToolDefinition[],
    timeout: number,
    abortSignal?: AbortSignal,
    onContentChunk?: (content: string) => void
  ): Promise<{ content: string; toolCalls?: LLMToolCall[] }> {
    // Create a combined AbortController for timeout and manual abort
    const controller = new AbortController();

    // Set up timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Listen to external abort signal
    const onAbort = () => controller.abort();
    abortSignal?.addEventListener('abort', onAbort);

    try {
      // Use streaming API if onContentChunk callback is provided
      if (onContentChunk) {
        const response = await this.llm.generateWithToolsStream(
          'tool_calling',
          this.formatMessagesForLLM(messages),
          toolDefinitions,
          (chunk) => {
            // Only forward content chunks
            if (chunk.type === 'content' && chunk.content) {
              onContentChunk(chunk.content);
            }
          },
          { abortSignal: controller.signal }
        );

        // Convert LLM response tool calls to LLMToolCall format
        const toolCalls: LLMToolCall[] | undefined = response.toolCalls?.map((tc: any) => {
          if (tc.function && typeof tc.function.name === 'string') {
            return {
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.function.name,
                arguments: typeof tc.function.arguments === 'string'
                  ? tc.function.arguments
                  : JSON.stringify(tc.function.arguments),
              },
            };
          }
          return {
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: typeof tc.arguments === 'string'
                ? tc.arguments
                : JSON.stringify(tc.arguments),
            },
          };
        });

        return {
          content: response.content || '',
          toolCalls,
        };
      }

      // Non-streaming fallback
      const response = await this.llm.generateWithTools(
        'tool_calling',
        this.formatMessagesForLLM(messages),
        toolDefinitions,
        { abortSignal: controller.signal }
      );

      // Convert LLM response tool calls to LLMToolCall format
      // Handle both formats: { name, arguments } and { function: { name, arguments } }
      const toolCalls: LLMToolCall[] | undefined = response.toolCalls?.map((tc: any) => {
        // Check if it's already in LLMToolCall format
        if (tc.function && typeof tc.function.name === 'string') {
          return {
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: typeof tc.function.arguments === 'string'
                ? tc.function.arguments
                : JSON.stringify(tc.function.arguments),
            },
          };
        }
        // Otherwise, convert from { name, arguments } format
        return {
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: typeof tc.arguments === 'string'
              ? tc.arguments
              : JSON.stringify(tc.arguments),
          },
        };
      });

      return {
        content: response.content || '',
        toolCalls,
      };
    } finally {
      // Clean up resources - Requirements: 1.3
      clearTimeout(timeoutId);
      abortSignal?.removeEventListener('abort', onAbort);
    }
  }

  /**
   * Execute tool calls (parallel or sequential)
   * @deprecated Use executeToolCallsWithStreaming instead
   */
  private async executeToolCalls(
    toolCalls: LLMToolCall[],
    context: ToolContext,
    state: LoopState
  ): Promise<ToolCallRecord[]> {
    // Delegate to the streaming version without events
    return this.executeToolCallsWithStreaming(toolCalls, context, state, {}, 'default');
  }

  /**
   * Execute a single tool call
   * @deprecated Use executeSingleToolCallWithStreaming instead
   */
  private async executeSingleToolCall(
    toolCall: LLMToolCall,
    context: ToolContext
  ): Promise<ToolCallRecord> {
    // Delegate to the streaming version without events
    return this.executeSingleToolCallWithStreaming(toolCall, context, {}, 'default');
  }

  /**
   * Format messages for LLM API
   */
  private formatMessagesForLLM(
    messages: LoopMessage[]
  ): ChatMessage[] {
    return messages.map((msg) => {
      const formatted: ChatMessage = {
        role: msg.role,
        content: msg.content,
      };

      if (msg.toolCallId) {
        formatted.toolCallId = msg.toolCallId;
      }

      // Include tool calls for assistant messages
      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        formatted.toolCalls = msg.toolCalls.map((tc) => {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            // If JSON parsing fails, use empty object
            // The error will be handled during tool execution
            args = {};
          }
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: args,
          };
        });
      }

      return formatted;
    });
  }

  /**
   * Build the final result
   */
  private buildResult(state: LoopState): LoopResult {
    // Get the last assistant message as the final content
    const lastAssistantMessage = [...state.messages]
      .reverse()
      .find((m) => m.role === 'assistant');

    return {
      status: state.status,
      content: lastAssistantMessage?.content || '',
      toolCalls: state.toolCalls,
      iterations: state.iteration,
      duration: state.endTime
        ? state.endTime.getTime() - state.startTime.getTime()
        : 0,
      error: state.error,
    };
  }

  /**
   * Update loop configuration
   */
  updateConfig(config: Partial<LoopConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LoopConfig {
    return { ...this.config };
  }
}
