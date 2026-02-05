/**
 * Plan Generator
 *
 * Generates execution plans based on parsed intent and retrieved knowledge.
 * Determines which tools to call and in what order.
 *
 * _Requirements: 1.3_
 */

import type { LLMManager } from '../llm/manager.js';
import type { ChatMessage } from '../llm/adapter.js';
import type { ToolDefinition } from '../types/tool.js';
import type { SearchResult } from '../types/knowledge.js';
import type { DetailedIntent } from './intent-parser.js';
import type { ToolRegistry } from './tool-registry.js';

/**
 * A single step in an execution plan
 */
export interface PlanStep {
  /** Step number (1-based) */
  stepNumber: number;
  /** Tool to call */
  toolName: string;
  /** Arguments to pass to the tool */
  arguments: Record<string, unknown>;
  /** Description of what this step does */
  description: string;
  /** Whether this step depends on previous step results */
  dependsOnPrevious: boolean;
  /** Condition for executing this step (optional) */
  condition?: string;
}

/**
 * Complete execution plan
 */
export interface ExecutionPlan {
  /** Unique plan ID */
  id: string;
  /** Steps to execute */
  steps: PlanStep[];
  /** Overall plan description */
  description: string;
  /** Estimated risk level */
  riskLevel: 'low' | 'medium' | 'high';
  /** Whether the plan requires user confirmation */
  requiresConfirmation: boolean;
  /** Confidence in the plan */
  confidence: number;
  /** Original intent that generated this plan */
  intent: DetailedIntent;
}

/**
 * Plan generation result
 */
export interface PlanGenerationResult {
  /** Whether plan generation was successful */
  success: boolean;
  /** Generated plan (if successful) */
  plan?: ExecutionPlan;
  /** Reason for failure (if unsuccessful) */
  failureReason?: string;
  /** Missing information needed to generate plan */
  missingInfo?: string[];
  /** Alternative suggestions */
  suggestions?: string[];
}

/**
 * Plan generator configuration
 */
export interface PlanGeneratorConfig {
  /** System prompt for plan generation */
  systemPrompt?: string;
  /** Maximum steps allowed in a plan */
  maxSteps?: number;
  /** Whether to require confirmation for high-risk operations */
  requireConfirmationForHighRisk?: boolean;
}

const DEFAULT_SYSTEM_PROMPT = `You are a plan generator for a game server management system.
Given a user intent and available tools, generate an execution plan.

Your task:
1. Analyze the intent and determine which tools are needed
2. Order the tool calls appropriately (dependencies first)
3. Provide arguments for each tool call
4. Assess the risk level of the overall plan

Respond in JSON format:
{
  "success": true/false,
  "plan": {
    "description": "Overall plan description",
    "riskLevel": "low|medium|high",
    "requiresConfirmation": true/false,
    "confidence": 0.0-1.0,
    "steps": [
      {
        "stepNumber": 1,
        "toolName": "tool_name",
        "arguments": { "arg1": "value1" },
        "description": "What this step does",
        "dependsOnPrevious": false,
        "condition": "optional condition"
      }
    ]
  },
  "failureReason": "reason if success is false",
  "missingInfo": ["list of missing information"],
  "suggestions": ["alternative suggestions"]
}`;

/**
 * Plan Generator
 *
 * Uses LLM to generate execution plans based on intent and available tools.
 */
export class PlanGenerator {
  private llmManager: LLMManager;
  private toolRegistry: ToolRegistry;
  private config: Required<PlanGeneratorConfig>;
  private planCounter: number = 0;

  constructor(llmManager: LLMManager, toolRegistry: ToolRegistry, config?: PlanGeneratorConfig) {
    this.llmManager = llmManager;
    this.toolRegistry = toolRegistry;
    this.config = {
      systemPrompt: config?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      maxSteps: config?.maxSteps ?? 10,
      requireConfirmationForHighRisk: config?.requireConfirmationForHighRisk ?? true,
    };
  }

  /**
   * Generate an execution plan based on intent and knowledge
   *
   * @param intent - Parsed user intent
   * @param knowledge - Retrieved knowledge results
   * @param history - Optional conversation history
   * @returns Plan generation result
   */
  async generate(
    intent: DetailedIntent,
    knowledge: SearchResult[],
    history?: ChatMessage[]
  ): Promise<PlanGenerationResult> {
    const tools = this.toolRegistry.getDefinitions();

    // If no tools available, return failure
    if (tools.length === 0) {
      return {
        success: false,
        failureReason: 'No tools available to execute the request',
        suggestions: ['Register tools before generating plans'],
      };
    }

    const messages = this.buildMessages(intent, knowledge, tools, history);

    try {
      const response = await this.llmManager.generate('tool_calling', messages, {
        temperature: 0.2,
      });

      return this.parseResponse(response, intent);
    } catch (error) {
      console.warn('Plan generation failed:', error);
      return {
        success: false,
        failureReason: `Plan generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Build messages for LLM call
   */
  private buildMessages(
    intent: DetailedIntent,
    knowledge: SearchResult[],
    tools: ToolDefinition[],
    history?: ChatMessage[]
  ): ChatMessage[] {
    const messages: ChatMessage[] = [{ role: 'system', content: this.config.systemPrompt }];

    // Add conversation history
    if (history && history.length > 0) {
      messages.push(...history.slice(-3)); // Last 3 messages for context
    }

    // Build user message with context
    const userMessage = this.buildUserMessage(intent, knowledge, tools);
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /**
   * Build the user message with all context
   */
  private buildUserMessage(
    intent: DetailedIntent,
    knowledge: SearchResult[],
    tools: ToolDefinition[]
  ): string {
    const parts: string[] = [];

    // Intent information
    parts.push('## User Intent');
    parts.push(`Action: ${intent.action}`);
    parts.push(`Operation Type: ${intent.operationType}`);
    if (intent.target) {
      parts.push(`Target: ${intent.target}`);
    }
    if (intent.entities.length > 0) {
      parts.push(`Entities: ${intent.entities.join(', ')}`);
    }
    if (intent.parameters) {
      parts.push(`Parameters: ${JSON.stringify(intent.parameters)}`);
    }
    parts.push(`Original Message: ${intent.originalMessage}`);
    parts.push('');

    // Available tools
    parts.push('## Available Tools');
    for (const tool of tools) {
      parts.push(`- ${tool.function.name}: ${tool.function.description}`);
      const params = tool.function.parameters;
      if (params.required.length > 0) {
        parts.push(`  Required params: ${params.required.join(', ')}`);
      }
    }
    parts.push('');

    // Retrieved knowledge
    if (knowledge.length > 0) {
      parts.push('## Relevant Knowledge');
      for (const result of knowledge.slice(0, 5)) {
        parts.push(`- [${result.document.category}] ${result.document.title || 'Untitled'}`);
        parts.push(`  ${result.document.content.slice(0, 200)}...`);
      }
      parts.push('');
    }

    parts.push('Generate an execution plan based on the above information.');

    return parts.join('\n');
  }

  /**
   * Parse LLM response into PlanGenerationResult
   */
  private parseResponse(response: string, intent: DetailedIntent): PlanGenerationResult {
    try {
      // Extract JSON from response
      const jsonMatch =
        response.match(/```(?:json)?\s*([\s\S]*?)```/) || response.match(/\{[\s\S]*\}/);

      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : response.trim();

      const parsed = JSON.parse(jsonStr);

      if (!parsed.success) {
        return {
          success: false,
          failureReason: parsed.failureReason || 'Plan generation failed',
          missingInfo: parsed.missingInfo,
          suggestions: parsed.suggestions,
        };
      }

      const plan = this.validateAndBuildPlan(parsed.plan, intent);

      return {
        success: true,
        plan,
      };
    } catch (error) {
      console.warn('Failed to parse plan response:', error);
      return {
        success: false,
        failureReason: 'Failed to parse plan generation response',
      };
    }
  }

  /**
   * Validate and build execution plan from parsed response
   */
  private validateAndBuildPlan(
    rawPlan: Record<string, unknown>,
    intent: DetailedIntent
  ): ExecutionPlan {
    const steps: PlanStep[] = [];
    const rawSteps = Array.isArray(rawPlan.steps) ? rawPlan.steps : [];

    for (let i = 0; i < Math.min(rawSteps.length, this.config.maxSteps); i++) {
      const rawStep = rawSteps[i] as Record<string, unknown>;

      // Validate tool exists
      const toolName = String(rawStep.toolName || '');
      if (!this.toolRegistry.has(toolName)) {
        console.warn(`Unknown tool in plan: ${toolName}`);
        continue;
      }

      steps.push({
        stepNumber: i + 1,
        toolName,
        arguments:
          typeof rawStep.arguments === 'object' && rawStep.arguments !== null
            ? (rawStep.arguments as Record<string, unknown>)
            : {},
        description: String(rawStep.description || `Execute ${toolName}`),
        dependsOnPrevious: Boolean(rawStep.dependsOnPrevious),
        condition: rawStep.condition ? String(rawStep.condition) : undefined,
      });
    }

    const riskLevel = this.validateRiskLevel(rawPlan.riskLevel);
    const requiresConfirmation =
      this.config.requireConfirmationForHighRisk &&
      (riskLevel === 'high' || Boolean(rawPlan.requiresConfirmation));

    return {
      id: this.generatePlanId(),
      steps,
      description: String(rawPlan.description || 'Execution plan'),
      riskLevel,
      requiresConfirmation,
      confidence:
        typeof rawPlan.confidence === 'number' ? Math.max(0, Math.min(1, rawPlan.confidence)) : 0.5,
      intent,
    };
  }

  /**
   * Validate risk level
   */
  private validateRiskLevel(level: unknown): 'low' | 'medium' | 'high' {
    if (level === 'low' || level === 'medium' || level === 'high') {
      return level;
    }
    return 'medium';
  }

  /**
   * Generate unique plan ID
   */
  private generatePlanId(): string {
    this.planCounter++;
    return `plan_${Date.now()}_${this.planCounter}`;
  }

  /**
   * Create a simple single-step plan for direct tool calls
   */
  createDirectPlan(
    toolName: string,
    args: Record<string, unknown>,
    intent: DetailedIntent
  ): ExecutionPlan {
    const tool = this.toolRegistry.get(toolName);
    const riskLevel = tool?.riskLevel ?? 'low';

    return {
      id: this.generatePlanId(),
      steps: [
        {
          stepNumber: 1,
          toolName,
          arguments: args,
          description: `Execute ${toolName}`,
          dependsOnPrevious: false,
        },
      ],
      description: `Direct execution of ${toolName}`,
      riskLevel,
      requiresConfirmation:
        tool?.requiresConfirmation ??
        (this.config.requireConfirmationForHighRisk && riskLevel === 'high'),
      confidence: 1.0,
      intent,
    };
  }

  /**
   * Estimate risk level based on operation type and tools
   */
  estimateRiskLevel(intent: DetailedIntent, toolNames: string[]): 'low' | 'medium' | 'high' {
    // High risk operations
    if (intent.operationType === 'delete') {
      return 'high';
    }

    // Check tool risk levels
    for (const name of toolNames) {
      const tool = this.toolRegistry.get(name);
      if (tool?.riskLevel === 'high') {
        return 'high';
      }
    }

    // Medium risk operations
    if (intent.operationType === 'update' || intent.operationType === 'configure') {
      return 'medium';
    }

    // Check for medium risk tools
    for (const name of toolNames) {
      const tool = this.toolRegistry.get(name);
      if (tool?.riskLevel === 'medium') {
        return 'medium';
      }
    }

    return 'low';
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<PlanGeneratorConfig> {
    return { ...this.config };
  }
}
