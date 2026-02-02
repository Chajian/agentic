/**
 * Intent Parser
 * 
 * Parses user messages to extract intent, entities, and operation type.
 * Uses LLM to understand natural language and determine appropriate actions.
 * 
 * _Requirements: 1.1_
 */

import type { LLMManager } from '../llm/manager.js';
import type { ChatMessage } from '../llm/adapter.js';

/**
 * Parsed intent from user message
 */
export interface Intent {
  /** The main action or operation type */
  action: string;
  /** Key entities mentioned in the message */
  entities: string[];
  /** Required knowledge topics to fulfill the intent */
  requiredTopics?: string[];
  /** Confidence level of the parsing */
  confidence: number;
  /** Original user message */
  originalMessage: string;
  /** Additional context extracted from the message */
  context?: Record<string, unknown>;
}

/**
 * Operation types that the agent can perform
 */
export type OperationType = 
  | 'query'      // Information retrieval
  | 'create'     // Create new resource
  | 'update'     // Modify existing resource
  | 'delete'     // Remove resource
  | 'execute'    // Execute an action
  | 'configure'  // Change configuration
  | 'unknown';   // Unable to determine

/**
 * Detailed intent with operation classification
 */
export interface DetailedIntent extends Intent {
  /** Classified operation type */
  operationType: OperationType;
  /** Target resource or entity */
  target?: string;
  /** Parameters extracted from the message */
  parameters?: Record<string, unknown>;
}

/**
 * Intent parser configuration
 */
export interface IntentParserConfig {
  /** System prompt for intent parsing */
  systemPrompt?: string;
  /** Whether to include conversation history */
  includeHistory?: boolean;
  /** Maximum history messages to include */
  maxHistoryMessages?: number;
}

const DEFAULT_SYSTEM_PROMPT = `你是一个游戏服务器管理系统的意图解析器。
你的任务是分析用户消息并提取结构化信息。

【重要】你必须且只能返回一个 JSON 对象，不要包含任何其他文字或解释。

JSON 格式如下：
{
  "action": "用户想要执行的主要操作描述",
  "entities": ["提到的实体名称数组，如怪物名、Boss名、玩家名等"],
  "requiredTopics": ["需要的知识主题数组"],
  "operationType": "query|create|update|delete|execute|configure|unknown",
  "target": "目标资源（可选）",
  "parameters": {},
  "confidence": 0.8
}

operationType 说明：
- query: 查询信息
- create: 创建新资源
- update: 修改现有资源
- delete: 删除资源
- execute: 执行操作
- configure: 配置设置
- unknown: 无法确定（如简单问候）

示例：
用户: "你好"
返回: {"action":"问候","entities":[],"requiredTopics":[],"operationType":"unknown","confidence":0.9}

用户: "查看所有Boss"
返回: {"action":"查询Boss列表","entities":["Boss"],"requiredTopics":["boss"],"operationType":"query","target":"boss","confidence":0.95}`;

/**
 * Intent Parser
 * 
 * Uses LLM to parse user messages and extract structured intent information.
 */
export class IntentParser {
  private llmManager: LLMManager;
  private config: Required<IntentParserConfig>;

  constructor(llmManager: LLMManager, config?: IntentParserConfig) {
    this.llmManager = llmManager;
    this.config = {
      systemPrompt: config?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      includeHistory: config?.includeHistory ?? true,
      maxHistoryMessages: config?.maxHistoryMessages ?? 5,
    };
  }

  /**
   * Parse a user message to extract intent
   * 
   * @param message - User message to parse
   * @param history - Optional conversation history
   * @returns Parsed intent
   */
  async parse(message: string, _history?: ChatMessage[]): Promise<DetailedIntent> {
    // Skip LLM call for intent parsing - use keyword-based fallback directly
    // This is more reliable for Chinese language models that don't follow JSON format
    return this.createFallbackIntent(message);
  }

  /**
   * Build messages for LLM call
   */
  private buildMessages(message: string, history?: ChatMessage[]): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.config.systemPrompt },
    ];

    // Add conversation history if enabled
    if (this.config.includeHistory && history && history.length > 0) {
      const recentHistory = history.slice(-this.config.maxHistoryMessages);
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    return messages;
  }

  /**
   * Parse LLM response into DetailedIntent
   */
  private parseResponse(response: string, originalMessage: string): DetailedIntent {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                        response.match(/\{[\s\S]*\}/);
      
      const jsonStr = jsonMatch ? 
        (jsonMatch[1] || jsonMatch[0]).trim() : 
        response.trim();

      const parsed = JSON.parse(jsonStr);

      return {
        action: parsed.action || 'unknown',
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        requiredTopics: Array.isArray(parsed.requiredTopics) ? parsed.requiredTopics : [],
        confidence: typeof parsed.confidence === 'number' ? 
          Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
        originalMessage,
        operationType: this.validateOperationType(parsed.operationType),
        target: parsed.target,
        parameters: typeof parsed.parameters === 'object' ? parsed.parameters : undefined,
        context: parsed.context,
      };
    } catch (error) {
      console.warn('Failed to parse intent response:', error);
      return this.createFallbackIntent(originalMessage);
    }
  }

  /**
   * Validate and normalize operation type
   */
  private validateOperationType(type: unknown): OperationType {
    const validTypes: OperationType[] = [
      'query', 'create', 'update', 'delete', 'execute', 'configure', 'unknown'
    ];
    
    if (typeof type === 'string' && validTypes.includes(type as OperationType)) {
      return type as OperationType;
    }
    
    return 'unknown';
  }

  /**
   * Create a fallback intent when parsing fails
   */
  private createFallbackIntent(message: string): DetailedIntent {
    // Simple heuristic-based fallback
    const lowerMessage = message.toLowerCase();
    
    let operationType: OperationType = 'unknown';
    const entities: string[] = [];
    
    // Detect operation type from keywords
    if (lowerMessage.includes('查询') || lowerMessage.includes('获取') || 
        lowerMessage.includes('查看') || lowerMessage.includes('显示') ||
        lowerMessage.includes('what') || lowerMessage.includes('show') ||
        lowerMessage.includes('get') || lowerMessage.includes('list')) {
      operationType = 'query';
    } else if (lowerMessage.includes('创建') || lowerMessage.includes('新建') ||
               lowerMessage.includes('添加') || lowerMessage.includes('create') ||
               lowerMessage.includes('add') || lowerMessage.includes('new')) {
      operationType = 'create';
    } else if (lowerMessage.includes('修改') || lowerMessage.includes('更新') ||
               lowerMessage.includes('编辑') || lowerMessage.includes('update') ||
               lowerMessage.includes('modify') || lowerMessage.includes('edit')) {
      operationType = 'update';
    } else if (lowerMessage.includes('删除') || lowerMessage.includes('移除') ||
               lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
      operationType = 'delete';
    } else if (lowerMessage.includes('执行') || lowerMessage.includes('运行') ||
               lowerMessage.includes('execute') || lowerMessage.includes('run')) {
      operationType = 'execute';
    } else if (lowerMessage.includes('配置') || lowerMessage.includes('设置') ||
               lowerMessage.includes('configure') || lowerMessage.includes('set')) {
      operationType = 'configure';
    }

    // Higher confidence if we detected a known operation type
    const confidence = operationType !== 'unknown' ? 0.6 : 0.3;

    return {
      action: message.slice(0, 100), // Use first 100 chars as action
      entities,
      requiredTopics: [],
      confidence,
      originalMessage: message,
      operationType,
    };
  }

  /**
   * Extract entities from a message using simple pattern matching
   * Used as a supplement to LLM parsing
   */
  extractEntities(message: string): string[] {
    const entities: string[] = [];
    
    // Extract quoted strings
    const quotedMatches = message.match(/["'](.*?)["']/g);
    if (quotedMatches) {
      entities.push(...quotedMatches.map(m => m.slice(1, -1)));
    }
    
    // Extract potential identifiers (CamelCase or snake_case)
    const identifierMatches = message.match(/\b[A-Z][a-zA-Z0-9]*(?:_[a-zA-Z0-9]+)*\b/g);
    if (identifierMatches) {
      entities.push(...identifierMatches);
    }
    
    return [...new Set(entities)]; // Remove duplicates
  }

  /**
   * Update the system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt;
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<IntentParserConfig> {
    return { ...this.config };
  }
}
