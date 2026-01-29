/**
 * Claude (Anthropic) LLM Adapter
 * 
 * Implements the LLMAdapter interface for Anthropic's Claude API.
 * Supports messages API and tool use.
 */

import Anthropic from '@anthropic-ai/sdk';
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
 * Claude-specific configuration
 */
export interface ClaudeAdapterConfig extends LLMAdapterConfig {
  /** Anthropic API version header */
  apiVersion?: string;
}

/**
 * Claude LLM Adapter implementation
 */
export class ClaudeAdapter implements LLMAdapter {
  readonly provider = 'claude';
  readonly model: string;
  
  private client: Anthropic;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: ClaudeAdapterConfig) {
    this.model = config.model;
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 2048;

    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
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

    const { systemPrompt, userMessages } = this.extractSystemPrompt(messages, options?.systemPrompt);

    try {
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          system: systemPrompt,
          messages: this.convertMessages(userMessages),
          temperature: options?.temperature ?? this.defaultTemperature,
          stop_sequences: options?.stopSequences,
        },
        { signal: options?.abortSignal }
      );

      return this.extractTextContent(response.content);
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

    const { systemPrompt, userMessages } = this.extractSystemPrompt(messages, options?.systemPrompt);

    try {
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          system: systemPrompt,
          messages: this.convertMessages(userMessages),
          tools: this.convertTools(tools),
          temperature: options?.temperature ?? this.defaultTemperature,
          stop_sequences: options?.stopSequences,
        },
        { signal: options?.abortSignal }
      );

      const toolCalls = this.extractToolCalls(response.content);
      const textContent = this.extractTextContent(response.content);

      return {
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: this.mapStopReason(response.stop_reason),
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async embed(_text: string): Promise<EmbeddingResult> {
    // Claude doesn't have a native embedding API
    // Users should use a different provider for embeddings
    throw new LLMError(
      'Claude does not support embeddings. Use OpenAI or another provider for embeddings.',
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

    const { systemPrompt, userMessages } = this.extractSystemPrompt(messages, options?.systemPrompt);

    try {
      const stream = this.client.messages.stream(
        {
          model: this.model,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          system: systemPrompt,
          messages: this.convertMessages(userMessages),
          tools: this.convertTools(tools),
          temperature: options?.temperature ?? this.defaultTemperature,
          stop_sequences: options?.stopSequences,
        },
        { signal: options?.abortSignal }
      );

      // Accumulate the response
      let accumulatedContent = '';
      const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();
      let finishReason: LLMResponse['finishReason'] = 'stop';
      let toolCallIndex = 0;

      // Process stream events
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta;

          // Handle text delta
          if (delta.type === 'text_delta') {
            accumulatedContent += delta.text;
            const streamChunk: StreamChunk = {
              type: 'content',
              content: delta.text,
            };
            onChunk(streamChunk);
          }

          // Handle tool use input delta
          if (delta.type === 'input_json_delta') {
            const currentIndex = toolCallIndex - 1;
            const toolCallEntry = toolCallsMap.get(currentIndex);
            if (toolCallEntry) {
              toolCallEntry.arguments += delta.partial_json;
              const streamChunk: StreamChunk = {
                type: 'tool_call',
                toolCall: {
                  index: currentIndex,
                  arguments: delta.partial_json,
                },
              };
              onChunk(streamChunk);
            }
          }
        }

        // Handle content block start (for tool use)
        if (event.type === 'content_block_start') {
          const block = event.content_block;
          if (block.type === 'tool_use') {
            const index = toolCallIndex++;
            toolCallsMap.set(index, {
              id: block.id,
              name: block.name,
              arguments: '',
            });
            const streamChunk: StreamChunk = {
              type: 'tool_call',
              toolCall: {
                index,
                id: block.id,
                name: block.name,
              },
            };
            onChunk(streamChunk);
          }
        }

        // Handle message stop
        if (event.type === 'message_delta') {
          finishReason = this.mapStopReason(event.delta.stop_reason);
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
   * Extract system prompt from messages
   */
  private extractSystemPrompt(
    messages: ChatMessage[],
    defaultSystem?: string
  ): { systemPrompt: string | undefined; userMessages: ChatMessage[] } {
    const systemMessages = messages.filter((m: ChatMessage) => m.role === 'system');
    const userMessages = messages.filter((m: ChatMessage) => m.role !== 'system');
    
    const systemPrompt = systemMessages.length > 0
      ? systemMessages.map((m: ChatMessage) => m.content).join('\n')
      : defaultSystem;

    return { systemPrompt, userMessages };
  }

  /**
   * Convert internal message format to Claude format
   */
  private convertMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
    return messages.map((msg: ChatMessage) => {
      if (msg.role === 'tool') {
        return {
          role: 'user' as const,
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: msg.toolCallId ?? '',
              content: msg.content,
            },
          ],
        };
      }
      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        // Assistant message with tool calls - Claude uses tool_use blocks
        const content: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }> = [];
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        for (const tc of msg.toolCalls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          });
        }
        return {
          role: 'assistant' as const,
          content,
        };
      }
      return {
        role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: msg.content,
      };
    });
  }

  /**
   * Convert tool definitions to Claude format
   */
  private convertTools(tools: ToolDefinition[]): Anthropic.Tool[] {
    return tools.map((tool: ToolDefinition) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters as Anthropic.Tool.InputSchema,
    }));
  }

  /**
   * Extract text content from Claude response
   */
  private extractTextContent(content: Anthropic.ContentBlock[]): string {
    return content
      .filter((block: Anthropic.ContentBlock): block is Anthropic.TextBlock => block.type === 'text')
      .map((block: Anthropic.TextBlock) => block.text)
      .join('');
  }

  /**
   * Extract tool calls from Claude response
   */
  private extractToolCalls(content: Anthropic.ContentBlock[]): ToolCall[] {
    return content
      .filter((block: Anthropic.ContentBlock): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
      .map((block: Anthropic.ToolUseBlock) => ({
        id: block.id,
        name: block.name,
        arguments: block.input as Record<string, unknown>,
      }));
  }

  /**
   * Map Claude stop reason to internal format
   */
  private mapStopReason(reason: string | null): LLMResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'tool_use':
        return 'tool_calls';
      case 'max_tokens':
        return 'length';
      default:
        return 'stop';
    }
  }

  /**
   * Handle Claude API errors
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

    if (error instanceof Anthropic.APIError) {
      const code = this.mapErrorCode(error.status);
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
   * Map Claude error codes to internal error codes
   */
  private mapErrorCode(status?: number): LLMError['code'] {
    if (status === 401) return 'AUTHENTICATION_ERROR';
    if (status === 429) return 'RATE_LIMIT_ERROR';
    if (status === 400) return 'INVALID_REQUEST';
    if (status === 404) return 'MODEL_NOT_FOUND';
    return 'UNKNOWN_ERROR';
  }
}
