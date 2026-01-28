/**
 * AnyRouter LLM Adapter
 * 
 * Implements the LLMAdapter interface for AnyRouter API.
 * AnyRouter is a Claude Code API proxy service that provides
 * OpenAI-compatible API access to Claude models.
 * 
 * @see https://docs.anyrouter.top
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
 * AnyRouter API endpoints
 */
export const ANYROUTER_ENDPOINTS = {
  /** Main site - direct connection */
  MAIN: 'https://anyrouter.top',
  /** China mainland optimized endpoint 1 */
  CN_OPTIMIZED_1: 'https://pmpjfbhq.cn-nb1.rainapp.top',
  /** China mainland optimized endpoint 2 */
  CN_OPTIMIZED_2: 'https://a-ocnfniawgw.cn-shanghai.fcapp.run',
} as const;

/**
 * Available Claude models via AnyRouter
 */
export const ANYROUTER_MODELS = {
  // Claude 4.x models
  CLAUDE_OPUS_4_5: 'claude-opus-4-5',
  CLAUDE_SONNET_4_5: 'claude-sonnet-4-5',
  // Claude 3.x models
  CLAUDE_3_5_SONNET: 'claude-3-5-sonnet-20241022',
  CLAUDE_3_5_HAIKU: 'claude-3-5-haiku-20241022',
  CLAUDE_3_OPUS: 'claude-3-opus-20240229',
  // Gemini models
  GEMINI_2_5_PRO: 'gemini-2.5-pro',
} as const;


/**
 * AnyRouter-specific configuration
 */
export interface AnyRouterAdapterConfig extends LLMAdapterConfig {
  /** Use China mainland optimized endpoint (default: false) */
  useChinaEndpoint?: boolean;
  /** Specific endpoint URL override */
  endpoint?: string;
}

/**
 * AnyRouter LLM Adapter implementation
 * 
 * Provides access to Claude models via AnyRouter proxy with support for:
 * - OpenAI-compatible chat completions
 * - Function/tool calling
 * - Streaming responses
 * - China mainland optimized endpoints
 */
export class AnyRouterAdapter implements LLMAdapter {
  readonly provider = 'anyrouter';
  readonly model: string;
  
  private client: OpenAI;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  private baseURL: string;

  constructor(config: AnyRouterAdapterConfig) {
    this.model = config.model;
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 8192;

    // Determine base URL
    this.baseURL = config.endpoint ?? config.baseUrl ?? '';
    if (!this.baseURL) {
      this.baseURL = config.useChinaEndpoint 
        ? ANYROUTER_ENDPOINTS.CN_OPTIMIZED_1 
        : ANYROUTER_ENDPOINTS.MAIN;
    }

    console.log(`[AnyRouter] Initializing adapter:`);
    console.log(`[AnyRouter]   - Base URL: ${this.baseURL}`);
    console.log(`[AnyRouter]   - Model: ${this.model}`);
    console.log(`[AnyRouter]   - API Key: ${config.apiKey?.substring(0, 10)}...`);

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: this.baseURL,
      timeout: config.timeoutMs ?? 120000, // Claude responses can be slow
    });
  }

  async generate(
    prompt: string | ChatMessage[],
    options?: GenerateOptions
  ): Promise<string> {
    const messages = typeof prompt === 'string'
      ? promptToMessages(prompt, options?.systemPrompt)
      : prompt;

    console.log(`[AnyRouter] generate() called`);
    console.log(`[AnyRouter]   - Messages count: ${messages.length}`);
    console.log(`[AnyRouter]   - Model: ${this.model}`);
    console.log(`[AnyRouter]   - Base URL: ${this.baseURL}`);

    try {
      const requestBody = {
        model: this.model,
        messages: this.convertMessages(messages),
        temperature: options?.temperature ?? this.defaultTemperature,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        stop: options?.stopSequences,
      };
      
      console.log(`[AnyRouter] Request body:`, JSON.stringify(requestBody, null, 2));

      const response = await this.client.chat.completions.create(
        requestBody,
        { signal: options?.abortSignal }
      );

      console.log(`[AnyRouter] Response received:`, JSON.stringify(response, null, 2));

      return response.choices[0]?.message?.content ?? '';
    } catch (error) {
      console.error(`[AnyRouter] Error in generate():`, error);
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

    console.log(`[AnyRouter] generateWithTools() called`);
    console.log(`[AnyRouter]   - Messages count: ${messages.length}`);
    console.log(`[AnyRouter]   - Tools count: ${tools.length}`);
    console.log(`[AnyRouter]   - Model: ${this.model}`);
    console.log(`[AnyRouter]   - Base URL: ${this.baseURL}`);

    try {
      const requestBody = {
        model: this.model,
        messages: this.convertMessages(messages),
        tools: tools.map(t => ({
          type: 'function' as const,
          function: t.function,
        })),
        temperature: options?.temperature ?? this.defaultTemperature,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        stop: options?.stopSequences,
      };

      console.log(`[AnyRouter] Request body (truncated):`, JSON.stringify({
        model: requestBody.model,
        messagesCount: requestBody.messages.length,
        toolsCount: requestBody.tools.length,
        temperature: requestBody.temperature,
        max_tokens: requestBody.max_tokens,
      }));

      const response = await this.client.chat.completions.create(
        requestBody,
        { signal: options?.abortSignal }
      );

      console.log(`[AnyRouter] Response received, choices: ${response.choices?.length}`);

      const choice = response.choices[0];
      const message = choice?.message;

      const toolCalls: ToolCall[] | undefined = message?.tool_calls?.map(tc => ({
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
      console.error(`[AnyRouter] Error in generateWithTools():`, error);
      throw this.handleError(error);
    }
  }

  async embed(_text: string): Promise<EmbeddingResult> {
    // AnyRouter focuses on Claude Code, embeddings not supported
    throw new LLMError(
      'AnyRouter does not support embeddings. Use SiliconFlow or OpenAI for embeddings.',
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
    options?: GenerateOptions
  ): Promise<LLMResponse> {
    const messages = typeof prompt === 'string'
      ? promptToMessages(prompt, options?.systemPrompt)
      : prompt;

    console.log(`[AnyRouter] generateWithToolsStream() called`);
    console.log(`[AnyRouter]   - Messages count: ${messages.length}`);
    console.log(`[AnyRouter]   - Tools count: ${tools.length}`);
    console.log(`[AnyRouter]   - Model: ${this.model}`);
    console.log(`[AnyRouter]   - Base URL: ${this.baseURL}`);

    try {
      const requestBody = {
        model: this.model,
        messages: this.convertMessages(messages),
        tools: tools.map(t => ({
          type: 'function' as const,
          function: t.function,
        })),
        temperature: options?.temperature ?? this.defaultTemperature,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        stop: options?.stopSequences,
        stream: true as const,
      };

      console.log(`[AnyRouter] Stream request body (truncated):`, JSON.stringify({
        model: requestBody.model,
        messagesCount: requestBody.messages.length,
        toolsCount: requestBody.tools.length,
        temperature: requestBody.temperature,
        max_tokens: requestBody.max_tokens,
        stream: requestBody.stream,
      }));

      const stream = await this.client.chat.completions.create(
        requestBody,
        { signal: options?.abortSignal }
      );

      console.log(`[AnyRouter] Stream created, starting iteration...`);

      // Accumulate the response
      let accumulatedContent = '';
      const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();
      let finishReason: LLMResponse['finishReason'] = 'stop';
      let chunkCount = 0;

      for await (const chunk of stream) {
        chunkCount++;
        const delta = chunk.choices[0]?.delta;
        const chunkFinishReason = chunk.choices[0]?.finish_reason;

        if (chunkCount <= 3 || chunkCount % 10 === 0) {
          console.log(`[AnyRouter] Chunk ${chunkCount}:`, JSON.stringify(chunk));
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
          for (const tc of delta.tool_calls) {
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

      console.log(`[AnyRouter] Stream completed, total chunks: ${chunkCount}`);
      console.log(`[AnyRouter] Accumulated content length: ${accumulatedContent.length}`);

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
      console.error(`[AnyRouter] Error in generateWithToolsStream():`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Convert internal message format to OpenAI format
   */
  private convertMessages(messages: ChatMessage[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.toolCallId ?? '',
        };
      }
      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        return {
          role: 'assistant' as const,
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
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
