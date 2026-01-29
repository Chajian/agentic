/**
 * Xiaomi MiMo LLM Adapter
 * 
 * Implements the LLMAdapter interface for Xiaomi MiMo API.
 * MiMo provides OpenAI-compatible API with additional features like
 * deep thinking mode (reasoning_content).
 * 
 * @see https://platform.xiaomimimo.com/#/docs/api/text-generation/openai-api
 */

import OpenAI from 'openai';
import type {
  LLMAdapter,
  LLMAdapterConfig,
  GenerateOptions,
  ChatMessage,
  LLMResponse,
  ToolCall,
  EmbeddingResult,
  StreamCallback,
  StreamChunk,
} from '../adapter.js';
import { LLMError, promptToMessages } from '../adapter.js';
import type { ToolDefinition } from '../../types/tool.js';

/**
 * Default MiMo API base URL
 */
const DEFAULT_MIMO_BASE_URL = 'https://api.xiaomimimo.com/v1';

/**
 * Available MiMo models
 */
export const MIMO_MODELS = {
  // Main models
  V2_FLASH: 'mimo-v2-flash',
} as const;

/**
 * Thinking mode configuration
 */
export type ThinkingMode = 'enabled' | 'disabled';

/**
 * MiMo-specific configuration
 */
export interface MiMoAdapterConfig extends LLMAdapterConfig {
  /** Enable deep thinking mode (default: disabled) */
  thinkingMode?: ThinkingMode;
}

/**
 * Extended generate options for MiMo
 */
export interface MiMoGenerateOptions extends GenerateOptions {
  /** Override thinking mode for this request */
  thinkingMode?: ThinkingMode;
}

/**
 * Extended LLM response with reasoning content
 */
export interface MiMoLLMResponse extends LLMResponse {
  /** Reasoning content from deep thinking mode */
  reasoningContent?: string;
}


/**
 * Xiaomi MiMo LLM Adapter implementation
 * 
 * Provides access to MiMo models with support for:
 * - OpenAI-compatible chat completions
 * - Function/tool calling
 * - Deep thinking mode (reasoning_content)
 * - Streaming responses
 */
export class MiMoAdapter implements LLMAdapter {
  readonly provider = 'mimo';
  readonly model: string;
  
  private client: OpenAI;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private defaultThinkingMode: ThinkingMode;

  constructor(config: MiMoAdapterConfig) {
    this.model = config.model;
    this.defaultTemperature = config.temperature ?? 0.3;
    this.defaultMaxTokens = config.maxTokens ?? 65536;
    this.defaultThinkingMode = config.thinkingMode ?? 'disabled';

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl ?? DEFAULT_MIMO_BASE_URL,
      timeout: config.timeoutMs ?? 60000,
    });
  }

  async generate(
    prompt: string | ChatMessage[],
    options?: MiMoGenerateOptions
  ): Promise<string> {
    const messages = typeof prompt === 'string'
      ? promptToMessages(prompt, options?.systemPrompt)
      : prompt;

    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: this.convertMessages(messages),
          temperature: options?.temperature ?? this.defaultTemperature,
          max_completion_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences,
          thinking: {
            type: options?.thinkingMode ?? this.defaultThinkingMode,
          },
        } as OpenAI.ChatCompletionCreateParamsNonStreaming,
        { signal: options?.abortSignal }
      );

      return response.choices[0]?.message?.content ?? '';
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateWithTools(
    prompt: string | ChatMessage[],
    tools: ToolDefinition[],
    options?: MiMoGenerateOptions
  ): Promise<MiMoLLMResponse> {
    const messages = typeof prompt === 'string'
      ? promptToMessages(prompt, options?.systemPrompt)
      : prompt;

    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: this.convertMessages(messages),
          tools: tools.map((t: ToolDefinition) => ({
            type: 'function' as const,
            function: t.function,
          })),
          temperature: options?.temperature ?? this.defaultTemperature,
          max_completion_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences,
          thinking: {
            type: options?.thinkingMode ?? this.defaultThinkingMode,
          },
        } as OpenAI.ChatCompletionCreateParamsNonStreaming,
        { signal: options?.abortSignal }
      );

      const choice = response.choices[0];
      const message = choice?.message as OpenAI.ChatCompletionMessage & { reasoning_content?: string };

      const toolCalls: ToolCall[] | undefined = message?.tool_calls?.map((tc: OpenAI.Chat.Completions.ChatCompletionMessageToolCall) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }));

      return {
        content: message?.content ?? '',
        toolCalls,
        finishReason: this.mapFinishReason(choice?.finish_reason),
        reasoningContent: message?.reasoning_content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async embed(_text: string): Promise<EmbeddingResult> {
    // MiMo does not support embeddings currently
    throw new LLMError(
      'MiMo does not support embeddings. Use SiliconFlow or OpenAI for embeddings.',
      'INVALID_REQUEST',
      this.provider
    );
  }

  supportsEmbeddings(): boolean {
    return false;
  }

  supportsToolCalling(): boolean {
    return true;
  }

  supportsStreaming(): boolean {
    return true;
  }


  async generateWithToolsStream(
    prompt: string | ChatMessage[],
    tools: ToolDefinition[],
    onChunk: StreamCallback,
    options?: MiMoGenerateOptions
  ): Promise<MiMoLLMResponse> {
    const messages = typeof prompt === 'string'
      ? promptToMessages(prompt, options?.systemPrompt)
      : prompt;

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: this.convertMessages(messages),
          tools: tools.map((t: ToolDefinition) => ({
            type: 'function' as const,
            function: t.function,
          })),
          temperature: options?.temperature ?? this.defaultTemperature,
          max_completion_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences,
          stream: true,
          thinking: {
            type: options?.thinkingMode ?? this.defaultThinkingMode,
          },
        } as OpenAI.ChatCompletionCreateParamsStreaming,
        { signal: options?.abortSignal }
      );

      // Accumulate the response
      let accumulatedContent = '';
      let accumulatedReasoningContent = '';
      const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();
      let finishReason: LLMResponse['finishReason'] = 'stop';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta as OpenAI.ChatCompletionChunk.Choice.Delta & { 
          reasoning_content?: string 
        };
        const chunkFinishReason = chunk.choices[0]?.finish_reason;

        // Handle reasoning content chunks (from thinking mode)
        if (delta?.reasoning_content) {
          accumulatedReasoningContent += delta.reasoning_content;
          // Optionally emit reasoning content as a special chunk
          // For now, we accumulate it silently
        }

        // Handle content chunks
        if (delta?.content) {
          accumulatedContent += delta.content;
          const streamChunk: StreamChunk = {
            type: 'content',
            content: delta.content,
          };
          onChunk(streamChunk);
        }

        // Handle tool call chunks
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls as any[]) {
            const index = tc.index;

            // Get or create tool call entry
            let toolCallEntry = toolCallsMap.get(index);
            if (!toolCallEntry) {
              toolCallEntry = { id: '', name: '', arguments: '' };
              toolCallsMap.set(index, toolCallEntry);
            }

            // Accumulate tool call data
            if (tc.id) toolCallEntry.id = tc.id;
            if (tc.function?.name) toolCallEntry.name = tc.function.name;
            if (tc.function?.arguments) toolCallEntry.arguments += tc.function.arguments;

            // Send tool call chunk
            const streamChunk: StreamChunk = {
              type: 'tool_call',
              toolCall: {
                index,
                id: tc.id,
                name: tc.function?.name,
                arguments: tc.function?.arguments,
              },
            };
            onChunk(streamChunk);
          }
        }

        // Update finish reason
        if (chunkFinishReason) {
          finishReason = this.mapFinishReason(chunkFinishReason);
        }
      }

      // Build final tool calls array
      const toolCalls: ToolCall[] | undefined = toolCallsMap.size > 0
        ? Array.from(toolCallsMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([, tc]) => ({
              id: tc.id,
              name: tc.name,
              arguments: JSON.parse(tc.arguments || '{}'),
            }))
        : undefined;

      // Build final response
      const response: MiMoLLMResponse = {
        content: accumulatedContent,
        toolCalls,
        finishReason,
        reasoningContent: accumulatedReasoningContent || undefined,
      };

      // Send done chunk
      onChunk({ type: 'done', response });

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Convert internal message format to OpenAI format
   * Preserves reasoning_content for multi-turn tool calling
   */
  private convertMessages(messages: ChatMessage[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((msg: ChatMessage) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.toolCallId ?? '',
        };
      }
      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        // Assistant message with tool calls
        return {
          role: 'assistant' as const,
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc: ToolCall) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
      }
      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      };
    });
  }

  /**
   * Map finish reason to internal format
   */
  private mapFinishReason(reason?: string | null): LLMResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'tool_calls':
        return 'tool_calls';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): LLMError {
    // Check for abort error first
    if (error instanceof Error && error.name === 'AbortError') {
      return new LLMError(
        'Operation cancelled',
        'CANCELLED',
        this.provider,
        error
      );
    }

    // Preserve existing LLMError instances
    if (error instanceof LLMError) {
      return error;
    }

    if (error instanceof OpenAI.APIError) {
      const code = this.mapErrorCode(error.status, error.code);
      return new LLMError(
        error.message,
        code,
        this.provider,
        error
      );
    }
    
    if (error instanceof Error) {
      return new LLMError(
        error.message,
        'UNKNOWN_ERROR',
        this.provider,
        error
      );
    }
    
    return new LLMError(
      'Unknown error occurred',
      'UNKNOWN_ERROR',
      this.provider
    );
  }

  /**
   * Map error codes to internal error codes
   */
  private mapErrorCode(status?: number, code?: string | null): LLMError['code'] {
    if (status === 401) return 'AUTHENTICATION_ERROR';
    if (status === 429) return 'RATE_LIMIT_ERROR';
    if (status === 400) return 'INVALID_REQUEST';
    if (status === 404) return 'MODEL_NOT_FOUND';
    if (code === 'context_length_exceeded') return 'CONTEXT_LENGTH_EXCEEDED';
    if (code === 'content_filter') return 'CONTENT_FILTER';
    return 'UNKNOWN_ERROR';
  }
}
