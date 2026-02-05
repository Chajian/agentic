/**
 * Tool Registry
 *
 * Manages registration and retrieval of tools for the Agent.
 * Validates tool definitions and provides Function Calling format conversion.
 *
 * @module core/tool-registry
 */

import type { Tool, ToolDefinition, ToolParameter } from '../types/tool.js';
import { toolToDefinition } from '../types/tool.js';

/**
 * Error thrown when tool registration fails
 */
export class ToolRegistrationError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly reason: string
  ) {
    super(message);
    this.name = 'ToolRegistrationError';
  }
}

/**
 * Error thrown when a tool is not found
 */
export class ToolNotFoundError extends Error {
  constructor(toolName: string) {
    super(`Tool not found: ${toolName}`);
    this.name = 'ToolNotFoundError';
  }
}

/**
 * Options for tool registration behavior
 */
export interface ToolRegistryOptions {
  /** Whether to allow replacing existing tools (default: false) */
  allowReplace?: boolean;
  /** Whether to validate tool definitions strictly (default: true) */
  strictValidation?: boolean;
}

/**
 * Validates a tool parameter definition
 */
function validateParameter(param: ToolParameter, toolName: string): void {
  if (!param.name || typeof param.name !== 'string') {
    throw new ToolRegistrationError(
      `Invalid parameter name in tool ${toolName}`,
      toolName,
      'Parameter name must be a non-empty string'
    );
  }

  const validTypes = ['string', 'number', 'boolean', 'object', 'array'];
  if (!validTypes.includes(param.type)) {
    throw new ToolRegistrationError(
      `Invalid parameter type "${param.type}" in tool ${toolName}`,
      toolName,
      `Parameter type must be one of: ${validTypes.join(', ')}`
    );
  }

  if (!param.description || typeof param.description !== 'string') {
    throw new ToolRegistrationError(
      `Invalid parameter description in tool ${toolName}`,
      toolName,
      'Parameter description must be a non-empty string'
    );
  }

  if (typeof param.required !== 'boolean') {
    throw new ToolRegistrationError(
      `Invalid parameter required flag in tool ${toolName}`,
      toolName,
      'Parameter required must be a boolean'
    );
  }

  if (param.enum !== undefined && !Array.isArray(param.enum)) {
    throw new ToolRegistrationError(
      `Invalid parameter enum in tool ${toolName}`,
      toolName,
      'Parameter enum must be an array of strings'
    );
  }
}

/**
 * Validates a complete tool definition
 */
function validateTool(tool: Tool): void {
  // Validate name
  if (!tool.name || typeof tool.name !== 'string') {
    throw new ToolRegistrationError(
      'Invalid tool name',
      tool.name || 'unknown',
      'Tool name must be a non-empty string'
    );
  }

  // Validate name format (alphanumeric, underscores, hyphens)
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tool.name)) {
    throw new ToolRegistrationError(
      `Invalid tool name format: ${tool.name}`,
      tool.name,
      'Tool name must start with a letter and contain only alphanumeric characters, underscores, and hyphens'
    );
  }

  // Validate description
  if (!tool.description || typeof tool.description !== 'string') {
    throw new ToolRegistrationError(
      `Invalid tool description for ${tool.name}`,
      tool.name,
      'Tool description must be a non-empty string'
    );
  }

  // Validate parameters
  if (!Array.isArray(tool.parameters)) {
    throw new ToolRegistrationError(
      `Invalid parameters for tool ${tool.name}`,
      tool.name,
      'Tool parameters must be an array'
    );
  }

  // Check for duplicate parameter names
  const paramNames = new Set<string>();
  for (const param of tool.parameters) {
    validateParameter(param, tool.name);
    if (paramNames.has(param.name)) {
      throw new ToolRegistrationError(
        `Duplicate parameter name "${param.name}" in tool ${tool.name}`,
        tool.name,
        'Parameter names must be unique within a tool'
      );
    }
    paramNames.add(param.name);
  }

  // Validate execute function
  if (typeof tool.execute !== 'function') {
    throw new ToolRegistrationError(
      `Invalid execute function for tool ${tool.name}`,
      tool.name,
      'Tool execute must be a function'
    );
  }

  // Validate optional fields
  if (tool.riskLevel !== undefined) {
    const validRiskLevels = ['low', 'medium', 'high'];
    if (!validRiskLevels.includes(tool.riskLevel)) {
      throw new ToolRegistrationError(
        `Invalid risk level for tool ${tool.name}`,
        tool.name,
        `Risk level must be one of: ${validRiskLevels.join(', ')}`
      );
    }
  }
}

/**
 * Registry for managing Agent tools
 *
 * Provides methods to register, retrieve, and list tools.
 * Ensures tool uniqueness and validates definitions.
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private options: Required<ToolRegistryOptions>;

  constructor(options: ToolRegistryOptions = {}) {
    this.options = {
      allowReplace: options.allowReplace ?? false,
      strictValidation: options.strictValidation ?? true,
    };
  }

  /**
   * Register a tool with the registry
   *
   * @param tool - The tool to register
   * @throws ToolRegistrationError if validation fails or tool already exists
   */
  register(tool: Tool): void {
    // Validate tool definition
    if (this.options.strictValidation) {
      validateTool(tool);
    }

    // Check for existing tool
    if (this.tools.has(tool.name)) {
      if (!this.options.allowReplace) {
        throw new ToolRegistrationError(
          `Tool already registered: ${tool.name}`,
          tool.name,
          'A tool with this name already exists. Use allowReplace option to override.'
        );
      }
    }

    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools at once
   *
   * @param tools - Array of tools to register
   * @throws ToolRegistrationError if any tool fails validation
   */
  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a tool by name
   *
   * @param name - The tool name
   * @returns The tool if found, undefined otherwise
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get a tool by name, throwing if not found
   *
   * @param name - The tool name
   * @returns The tool
   * @throws ToolNotFoundError if tool doesn't exist
   */
  getOrThrow(name: string): Tool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolNotFoundError(name);
    }
    return tool;
  }

  /**
   * Check if a tool is registered
   *
   * @param name - The tool name
   * @returns true if the tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Remove a tool from the registry
   *
   * @param name - The tool name
   * @returns true if the tool was removed, false if it didn't exist
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * List all registered tools
   *
   * @returns Array of all registered tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * List tool names
   *
   * @returns Array of registered tool names
   */
  listNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * List tools by category
   *
   * @param category - The category to filter by
   * @returns Array of tools in the specified category
   */
  listByCategory(category: string): Tool[] {
    return this.list().filter((tool) => tool.category === category);
  }

  /**
   * Get all unique categories
   *
   * @returns Array of unique category names
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const tool of this.tools.values()) {
      if (tool.category) {
        categories.add(tool.category);
      }
    }
    return Array.from(categories);
  }

  /**
   * Get tool definitions in Function Calling format
   *
   * @returns Array of tool definitions for LLM APIs
   */
  getDefinitions(): ToolDefinition[] {
    return this.list().map((tool) => toolToDefinition(tool));
  }

  /**
   * Get tool definitions for specific tools
   *
   * @param names - Array of tool names to get definitions for
   * @returns Array of tool definitions
   */
  getDefinitionsFor(names: string[]): ToolDefinition[] {
    return names
      .map((name) => this.tools.get(name))
      .filter((tool): tool is Tool => tool !== undefined)
      .map((tool) => toolToDefinition(tool));
  }

  /**
   * Get the number of registered tools
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }
}
