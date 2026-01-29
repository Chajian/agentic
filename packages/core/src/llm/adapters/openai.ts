/**
 * OpenAI LLM Adapter
 * 
 * Implements the LLMAdapter interface for OpenAI's API.
 * Supports chat completions, function calling, and embeddings.
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
 * OpenAI-specific configuration
 */
export interface OpenAIAdapterConfig extends LLMAdapterConfig {
  /** Organization ID (optional) */
  organization?: string;
  /** Embedding model (defaults to text-embedding-ada-002) */
  embeddingModel?: string;
}

/**
 * OpenAI LLM Adapter implementation
 */
export class OpenAIAdapter implements LLMAdapter {
  readonly provider = 'openai';
  readonly model: string;
  
  private client: OpenAI;
  private embeddingModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: OpenAIAdapterConfig) {
    this.model = config.model;
    this.embeddingModel = config.embeddingModel ?? 'text-embedding-ada-002';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 2048;

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      organization: config.organization,
      timeout: config.timeoutMs ?? 30000,
    });
  }

  async generate(
    prompt: string | ChatMessage[],
    options?: GenerateOptions
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
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences,
        },
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
    options?: GenerateOptions
  ): Promise<LLMResponse> {
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
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences,
        },
        { signal: options?.abortSignal }
      );

      const choice = response.choices[0];
      const message = choice?.message;

      const toolCalls: ToolCall[] | undefined = message?.tool_calls?.map((tc: OpenAI.Chat.Completions.ChatCompletionMessageToolCall) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }));

      return {
        content: message?.content ?? '',
        toolCalls,
        finishReason: this.mapFinishReason(choice?.finish_reason),
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

  async embed(text: string): Promise<EmbeddingResult> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      const embeddingData = response.data[0];
      if (!embeddingData) {
        throw new LLMError(
          'No embedding data returned',
          'INVALID_REQUEST',
          this.provider
        );
      }

      return {
        embedding: embeddingData.embedding,
        tokenCount: response.usage?.total_tokens,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  supportsEmbeddings(): boolean {
    return true;
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
    options?: GenerateOptions
  ): Promise<LLMResponse> {
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
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences,
          stream: true,
        },
        { signal: options?.abortSignal }
      );

      // Accumulate the response
      let accumulatedContent = '';
      const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();
      let finishReason: LLMResponse['finishReason'] = 'stop';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const chunkFinishReason = chunk.choices[0]?.finish_reason;

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
      const response: LLMResponse = {
        content: accumulatedContent,
        toolCalls,
        finishReason,
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
   * Map OpenAI finish reason to internal format
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
   * Handle OpenAI API errors
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
   * Map OpenAI error codes to internal error codes
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
