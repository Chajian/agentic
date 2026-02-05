/**
 * Response Handler
 *
 * Generates appropriate responses based on execution results,
 * knowledge assessment, and user interaction needs.
 *
 * _Requirements: 1.4, 5.1-5.5_
 */

import type { LLMManager } from '../llm/manager.js';
import type { ChatMessage } from '../llm/adapter.js';
import type {
  AgentResponse,
  ExecuteResponse,
  ClarifyResponse,
  KnowledgeRequestResponse,
  ConfirmResponse,
  OptionsResponse,
  ToolCallRecord,
  KnowledgeOption,
  SelectableOption,
} from '../types/response.js';
import type { KnowledgeAssessment, SearchResult } from '../types/knowledge.js';
import type { ToolExecutionResult } from './tool-executor.js';
import type { ExecutionPlan } from './plan-generator.js';
import type { DetailedIntent } from './intent-parser.js';

/**
 * Response handler configuration
 */
export interface ResponseHandlerConfig {
  /** System prompt for response generation */
  systemPrompt?: string;
  /** Whether to include tool call details in responses */
  includeToolDetails?: boolean;
  /** Maximum response length */
  maxResponseLength?: number;
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant for a game server management system.
Generate clear, concise responses based on the execution results provided.
Use the user's language (Chinese or English) based on their input.
Be specific about what was done and any relevant details.`;

/**
 * Context for response generation
 */
export interface ResponseContext {
  /** Original user message */
  userMessage: string;
  /** Parsed intent */
  intent: DetailedIntent;
  /** Knowledge assessment */
  knowledgeAssessment?: KnowledgeAssessment;
  /** Search results */
  searchResults?: SearchResult[];
  /** Execution plan */
  plan?: ExecutionPlan;
  /** Tool execution results */
  executionResults?: ToolExecutionResult[];
  /** Conversation history */
  history?: ChatMessage[];
}

/**
 * Response Handler
 *
 * Determines the appropriate response type and generates responses
 * based on the current state of agent processing.
 */
export class ResponseHandler {
  private llmManager: LLMManager;
  private config: Required<ResponseHandlerConfig>;

  constructor(llmManager: LLMManager, config?: ResponseHandlerConfig) {
    this.llmManager = llmManager;
    this.config = {
      systemPrompt: config?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      includeToolDetails: config?.includeToolDetails ?? true,
      maxResponseLength: config?.maxResponseLength ?? 2000,
    };
  }

  /**
   * Generate an appropriate response based on context
   */
  async generateResponse(context: ResponseContext): Promise<AgentResponse> {
    // If we have successful execution results, prioritize returning them
    if (context.executionResults && context.executionResults.length > 0) {
      const hasSuccess = context.executionResults.some((r) => r.success);
      if (hasSuccess) {
        return this.createExecuteResponse(context);
      }
    }

    // Check if we need to request knowledge
    if (this.shouldRequestKnowledge(context)) {
      return this.createKnowledgeRequestResponse(context);
    }

    // Check if we need clarification
    if (this.shouldRequestClarification(context)) {
      return this.createClarifyResponse(context);
    }

    // Check if we need confirmation
    if (this.shouldRequestConfirmation(context)) {
      return this.createConfirmResponse(context);
    }

    // Check if we should present options
    if (this.shouldPresentOptions(context)) {
      return this.createOptionsResponse(context);
    }

    // Generate execute response
    return this.createExecuteResponse(context);
  }

  /**
   * Check if knowledge request is needed
   */
  private shouldRequestKnowledge(context: ResponseContext): boolean {
    const assessment = context.knowledgeAssessment;
    return assessment?.status === 'insufficient' && context.intent.confidence > 0.5; // Only if we understand the intent
  }

  /**
   * Check if clarification is needed
   */
  private shouldRequestClarification(context: ResponseContext): boolean {
    // Low confidence intent
    if (context.intent.confidence < 0.4) {
      return true;
    }

    // Ambiguous knowledge
    if (context.knowledgeAssessment?.status === 'ambiguous') {
      return true;
    }

    // Unknown operation type with no clear target
    if (context.intent.operationType === 'unknown' && !context.intent.target) {
      return true;
    }

    return false;
  }

  /**
   * Check if confirmation is needed
   */
  private shouldRequestConfirmation(context: ResponseContext): boolean {
    return context.plan?.requiresConfirmation === true;
  }

  /**
   * Check if options should be presented
   */
  private shouldPresentOptions(context: ResponseContext): boolean {
    const assessment = context.knowledgeAssessment;
    return (
      assessment?.status === 'ambiguous' &&
      assessment.alternatives !== undefined &&
      assessment.alternatives.length > 1
    );
  }

  /**
   * Create a knowledge request response
   */
  private createKnowledgeRequestResponse(context: ResponseContext): KnowledgeRequestResponse {
    const assessment = context.knowledgeAssessment!;
    const topic = assessment.missingTopic || context.intent.action;

    const options: KnowledgeOption[] = [
      {
        id: 'provide_text',
        type: 'provide_text',
        label: '提供文本信息',
        description: '直接输入相关信息',
      },
      {
        id: 'upload_file',
        type: 'upload_file',
        label: '上传文件',
        description: '上传包含相关信息的文件',
      },
      {
        id: 'skip',
        type: 'skip',
        label: '跳过',
        description: '跳过此步骤，继续其他操作',
      },
      {
        id: 'try_anyway',
        type: 'try_anyway',
        label: '尝试继续',
        description: '使用现有知识尝试执行',
      },
    ];

    return {
      type: 'knowledge_request',
      message: `我需要更多关于 "${topic}" 的信息来完成您的请求。`,
      missing: {
        topic,
        description: `缺少关于 ${topic} 的详细信息，无法准确执行操作。`,
      },
      options,
    };
  }

  /**
   * Create a clarify response
   */
  private async createClarifyResponse(context: ResponseContext): Promise<ClarifyResponse> {
    const questions = await this.generateClarifyingQuestions(context);

    return {
      type: 'clarify',
      message: '我需要一些额外信息来更好地理解您的请求。',
      questions,
    };
  }

  /**
   * Generate clarifying questions using LLM
   */
  private async generateClarifyingQuestions(context: ResponseContext): Promise<string[]> {
    try {
      const prompt = `Based on this user message: "${context.userMessage}"
      
The intent was parsed as:
- Action: ${context.intent.action}
- Operation: ${context.intent.operationType}
- Confidence: ${context.intent.confidence}

Generate 2-3 clarifying questions to better understand what the user wants.
Respond with a JSON array of questions in the user's language.`;

      const response = await this.llmManager.generate(
        'response_generation',
        [
          { role: 'system', content: 'Generate clarifying questions. Respond with a JSON array.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3 }
      );

      const match = response.match(/\[[\s\S]*\]/);
      if (match) {
        const questions = JSON.parse(match[0]);
        if (Array.isArray(questions)) {
          return questions.map((q) => String(q)).slice(0, 3);
        }
      }
    } catch (error) {
      console.warn('Failed to generate clarifying questions:', error);
    }

    // Fallback questions
    return ['您能更详细地描述您想要做什么吗？', '您要操作的具体对象是什么？'];
  }

  /**
   * Create a confirm response
   */
  private createConfirmResponse(context: ResponseContext): ConfirmResponse {
    const plan = context.plan!;
    const firstStep = plan.steps[0];

    // Generate preview of changes
    const preview = this.generatePlanPreview(plan);

    return {
      type: 'confirm',
      message: `即将执行以下操作，请确认：`,
      action: {
        type: context.intent.operationType,
        target: context.intent.target || firstStep?.toolName || 'unknown',
        params: firstStep?.arguments || {},
      },
      risk: plan.riskLevel,
      preview,
    };
  }

  /**
   * Generate a preview of the execution plan
   */
  private generatePlanPreview(plan: ExecutionPlan): string {
    const lines: string[] = [];
    lines.push(`计划: ${plan.description}`);
    lines.push(`风险等级: ${plan.riskLevel}`);
    lines.push('');
    lines.push('执行步骤:');

    for (const step of plan.steps) {
      lines.push(`${step.stepNumber}. ${step.description}`);
      if (Object.keys(step.arguments).length > 0) {
        lines.push(`   参数: ${JSON.stringify(step.arguments)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Create an options response
   */
  private createOptionsResponse(context: ResponseContext): OptionsResponse {
    const alternatives = context.knowledgeAssessment?.alternatives || [];

    const options: SelectableOption[] = alternatives.map((alt, index) => ({
      id: `option_${index}`,
      label: alt.interpretation,
      description: `置信度: ${(alt.confidence * 100).toFixed(0)}%`,
      metadata: { confidence: alt.confidence },
    }));

    return {
      type: 'options',
      message: '发现多个可能的选项，请选择您想要的：',
      options,
    };
  }

  /**
   * Create an execute response
   */
  private async createExecuteResponse(context: ResponseContext): Promise<ExecuteResponse> {
    const results = context.executionResults || [];
    const toolCalls = this.buildToolCallRecords(results);

    // Generate response message using LLM
    const message = await this.generateExecuteMessage(context, results);

    // Collect data from successful executions
    const data = this.collectExecutionData(results);

    return {
      type: 'execute',
      message,
      data: Object.keys(data).length > 0 ? data : undefined,
      toolCalls: this.config.includeToolDetails ? toolCalls : undefined,
    };
  }

  /**
   * Build tool call records from execution results
   */
  private buildToolCallRecords(results: ToolExecutionResult[]): ToolCallRecord[] {
    return results.map((result) => ({
      toolName: result.toolName,
      arguments: result.arguments,
      result: {
        success: result.success,
        content: result.result.content,
        data: result.result.data,
      },
    }));
  }

  /**
   * Generate execute response message using LLM
   */
  private async generateExecuteMessage(
    context: ResponseContext,
    results: ToolExecutionResult[]
  ): Promise<string> {
    // If no results, generate a simple response
    if (results.length === 0) {
      return this.generateNoActionMessage(context);
    }

    try {
      const prompt = this.buildExecuteMessagePrompt(context, results);

      const response = await this.llmManager.generate(
        'response_generation',
        [
          { role: 'system', content: this.config.systemPrompt },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.5 }
      );

      // Truncate if too long
      if (response.length > this.config.maxResponseLength) {
        return response.slice(0, this.config.maxResponseLength) + '...';
      }

      return response;
    } catch (error) {
      console.warn('Failed to generate execute message:', error);
      return this.generateFallbackMessage(results);
    }
  }

  /**
   * Build prompt for execute message generation
   */
  private buildExecuteMessagePrompt(
    context: ResponseContext,
    results: ToolExecutionResult[]
  ): string {
    const parts: string[] = [];

    parts.push(`User request: ${context.userMessage}`);
    parts.push('');
    parts.push('Execution results:');

    for (const result of results) {
      parts.push(`- Tool: ${result.toolName}`);
      parts.push(`  Success: ${result.success}`);
      parts.push(`  Result: ${result.result.content}`);
      if (result.result.data) {
        parts.push(`  Data: ${JSON.stringify(result.result.data).slice(0, 200)}`);
      }
    }

    parts.push('');
    parts.push('Generate a helpful response summarizing what was done.');
    parts.push('Use the same language as the user (Chinese or English).');

    return parts.join('\n');
  }

  /**
   * Generate message when no action was taken
   */
  private generateNoActionMessage(context: ResponseContext): string {
    if (context.searchResults && context.searchResults.length > 0) {
      return '根据您的请求，我找到了以下相关信息。';
    }
    return '我理解了您的请求，但目前没有需要执行的操作。';
  }

  /**
   * Generate fallback message when LLM fails
   */
  private generateFallbackMessage(results: ToolExecutionResult[]): string {
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    const parts: string[] = [];

    if (successful.length > 0) {
      parts.push(`成功执行了 ${successful.length} 个操作。`);
    }

    if (failed.length > 0) {
      parts.push(`${failed.length} 个操作失败。`);
      for (const f of failed) {
        parts.push(`- ${f.toolName}: ${f.result.content}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Collect data from execution results
   */
  private collectExecutionData(results: ToolExecutionResult[]): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    for (const result of results) {
      if (result.success && result.result.data !== undefined) {
        data[result.toolName] = result.result.data;
      }
    }

    return data;
  }

  /**
   * Create a simple execute response without LLM
   */
  createSimpleExecuteResponse(
    message: string,
    data?: unknown,
    toolCalls?: ToolCallRecord[]
  ): ExecuteResponse {
    return {
      type: 'execute',
      message,
      data,
      toolCalls,
    };
  }

  /**
   * Create an error response
   */
  createErrorResponse(error: Error | string): ExecuteResponse {
    const message = error instanceof Error ? error.message : error;
    return {
      type: 'execute',
      message: `操作失败: ${message}`,
      data: { error: true },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ResponseHandlerConfig> {
    return { ...this.config };
  }
}
