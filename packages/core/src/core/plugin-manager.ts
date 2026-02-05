/**
 * Plugin Manager
 *
 * Manages plugin lifecycle, tool registration, and namespace handling.
 * Provides dependency injection for plugins through PluginContext.
 *
 * @module core/plugin-manager
 */

import type {
  AgentPlugin,
  PluginContext,
  PluginInfo,
  PluginManagerOptions,
  PluginStatus,
} from '../types/plugin.js';
import type { Tool, ToolDefinition } from '../types/tool.js';
import { DEFAULT_PLUGIN_MANAGER_OPTIONS } from '../types/plugin.js';
import { toolToDefinition } from '../types/tool.js';

/**
 * Error thrown when plugin operations fail
 */
export class PluginError extends Error {
  constructor(
    message: string,
    public readonly pluginName: string,
    public readonly reason: string
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

/**
 * Internal plugin state
 */
interface PluginState {
  plugin: AgentPlugin;
  status: PluginStatus;
  error?: string;
  tools: Map<string, Tool>; // Namespaced tool name -> Tool
}

/**
 * Plugin Manager
 *
 * Handles plugin loading, unloading, and tool management.
 * Supports namespace-based tool isolation, dependency injection, and dependency resolution.
 */
export class PluginManager {
  private plugins: Map<string, PluginState> = new Map();
  private allTools: Map<string, Tool> = new Map();
  private options: PluginManagerOptions;
  private context?: PluginContext;
  private loadingPlugins: Set<string> = new Set(); // Track plugins currently being loaded (for circular dependency detection)

  constructor(options: Partial<PluginManagerOptions> = {}) {
    this.options = { ...DEFAULT_PLUGIN_MANAGER_OPTIONS, ...options };
  }

  /**
   * Set the plugin context for dependency injection
   */
  setContext(context: PluginContext): void {
    this.context = context;
  }

  /**
   * Load a plugin
   *
   * @param plugin - The plugin to load
   * @throws PluginError if loading fails
   */
  async load(plugin: AgentPlugin): Promise<void> {
    // Validate plugin
    if (this.options.strictValidation) {
      this.validatePlugin(plugin);
    }

    // Check for duplicate plugin
    if (this.plugins.has(plugin.name)) {
      throw new PluginError(
        `Plugin already loaded: ${plugin.name}`,
        plugin.name,
        'A plugin with this name is already loaded'
      );
    }

    // Check for circular dependencies
    if (this.loadingPlugins.has(plugin.name)) {
      throw new PluginError(
        `Circular dependency detected for plugin: ${plugin.name}`,
        plugin.name,
        'Plugin has a circular dependency'
      );
    }

    // Load dependencies first
    if (plugin.dependencies && plugin.dependencies.length > 0) {
      this.loadingPlugins.add(plugin.name);
      try {
        await this.loadDependencies(plugin);
      } finally {
        this.loadingPlugins.delete(plugin.name);
      }
    }

    // Create plugin state
    const state: PluginState = {
      plugin,
      status: 'loading',
      tools: new Map(),
    };

    this.plugins.set(plugin.name, state);

    try {
      // Call lifecycle hooks (initialize/onLoad) if defined
      // Support both naming conventions for backward compatibility
      const initHook = plugin.initialize || plugin.onLoad;
      if (initHook && this.context) {
        await initHook.call(plugin, this.context);
      }

      // Register tools with namespace
      for (const tool of plugin.tools) {
        const namespacedName = this.getNamespacedToolName(tool.name, plugin.namespace);

        // Check for conflicts
        if (this.allTools.has(namespacedName)) {
          this.handleConflict(namespacedName, plugin.name);
          if (this.options.conflictStrategy === 'skip') {
            continue;
          }
        }

        // Create namespaced tool
        const namespacedTool: Tool = {
          ...tool,
          name: namespacedName,
        };

        state.tools.set(namespacedName, namespacedTool);
        this.allTools.set(namespacedName, namespacedTool);
      }

      state.status = 'loaded';
    } catch (error) {
      state.status = 'error';
      state.error = error instanceof Error ? error.message : String(error);

      // Cleanup any registered tools
      for (const toolName of state.tools.keys()) {
        this.allTools.delete(toolName);
      }
      state.tools.clear();

      throw new PluginError(`Failed to load plugin: ${plugin.name}`, plugin.name, state.error);
    }
  }

  /**
   * Load plugin dependencies
   * @private
   */
  private async loadDependencies(plugin: AgentPlugin): Promise<void> {
    if (!plugin.dependencies || plugin.dependencies.length === 0) {
      return;
    }

    for (const depName of plugin.dependencies) {
      if (!this.plugins.has(depName)) {
        throw new PluginError(
          `Missing dependency for plugin ${plugin.name}: ${depName}`,
          plugin.name,
          `Plugin ${depName} must be loaded before ${plugin.name}`
        );
      }

      const depState = this.plugins.get(depName);
      if (depState?.status !== 'loaded') {
        throw new PluginError(
          `Dependency not ready for plugin ${plugin.name}: ${depName}`,
          plugin.name,
          `Plugin ${depName} is in status ${depState?.status}`
        );
      }
    }
  }

  /**
   * Unload a plugin
   *
   * @param pluginName - Name of the plugin to unload
   * @returns true if unloaded, false if not found
   */
  async unload(pluginName: string): Promise<boolean> {
    const state = this.plugins.get(pluginName);
    if (!state) {
      return false;
    }

    try {
      // Call lifecycle hooks (cleanup/onUnload) if defined
      // Support both naming conventions for backward compatibility
      const cleanupHook = state.plugin.cleanup || state.plugin.onUnload;
      if (cleanupHook) {
        await cleanupHook.call(state.plugin);
      }
    } catch (error) {
      // Log but don't throw - we still want to clean up
      console.error(`Error during plugin unload: ${pluginName}`, error);
    }

    // Remove all tools
    for (const toolName of state.tools.keys()) {
      this.allTools.delete(toolName);
    }

    // Remove plugin
    this.plugins.delete(pluginName);
    return true;
  }

  /**
   * Get a plugin by name
   */
  getPlugin(name: string): AgentPlugin | undefined {
    return this.plugins.get(name)?.plugin;
  }

  /**
   * Check if a plugin is loaded
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * List all loaded plugins
   */
  listPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map((state) => ({
      name: state.plugin.name,
      version: state.plugin.version,
      description: state.plugin.description,
      namespace: state.plugin.namespace,
      toolCount: state.tools.size,
      toolNames: Array.from(state.tools.keys()),
      status: state.status,
      error: state.error,
    }));
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.allTools.get(name);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.allTools.has(name);
  }

  /**
   * List all tools
   */
  listTools(): Tool[] {
    return Array.from(this.allTools.values());
  }

  /**
   * List tool names
   */
  listToolNames(): string[] {
    return Array.from(this.allTools.keys());
  }

  /**
   * Get tool definitions for LLM Function Calling
   */
  getToolDefinitions(): ToolDefinition[] {
    return this.listTools().map((tool) => toolToDefinition(tool));
  }

  /**
   * Get the number of loaded plugins
   */
  get pluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Get the number of registered tools
   */
  get toolCount(): number {
    return this.allTools.size;
  }

  /**
   * Clear all plugins
   */
  async clear(): Promise<void> {
    const pluginNames = Array.from(this.plugins.keys());
    for (const name of pluginNames) {
      await this.unload(name);
    }
  }

  /**
   * Run health checks on all plugins
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, state] of this.plugins) {
      if (state.plugin.healthCheck) {
        try {
          results.set(name, await state.plugin.healthCheck());
        } catch {
          results.set(name, false);
        }
      } else {
        results.set(name, state.status === 'loaded');
      }
    }

    return results;
  }

  /**
   * Get namespaced tool name
   */
  private getNamespacedToolName(toolName: string, namespace?: string): string {
    if (!this.options.autoNamespace || !namespace) {
      return toolName;
    }
    return `${namespace}_${toolName}`;
  }

  /**
   * Handle tool name conflict
   */
  private handleConflict(toolName: string, pluginName: string): void {
    switch (this.options.conflictStrategy) {
      case 'error':
        throw new PluginError(
          `Tool name conflict: ${toolName}`,
          pluginName,
          'A tool with this name already exists'
        );
      case 'replace':
        // Will be replaced in the calling code
        break;
      case 'skip':
        // Will be skipped in the calling code
        break;
    }
  }

  /**
   * Validate plugin definition
   */
  private validatePlugin(plugin: AgentPlugin): void {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new PluginError(
        'Invalid plugin name',
        plugin.name || 'unknown',
        'Plugin name must be a non-empty string'
      );
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(plugin.name)) {
      throw new PluginError(
        `Invalid plugin name format: ${plugin.name}`,
        plugin.name,
        'Plugin name must start with a letter and contain only alphanumeric characters, underscores, and hyphens'
      );
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new PluginError(
        `Invalid plugin version for ${plugin.name}`,
        plugin.name,
        'Plugin version must be a non-empty string'
      );
    }

    if (!plugin.description || typeof plugin.description !== 'string') {
      throw new PluginError(
        `Invalid plugin description for ${plugin.name}`,
        plugin.name,
        'Plugin description must be a non-empty string'
      );
    }

    if (!Array.isArray(plugin.tools)) {
      throw new PluginError(
        `Invalid tools for plugin ${plugin.name}`,
        plugin.name,
        'Plugin tools must be an array'
      );
    }

    // Validate each tool
    for (const tool of plugin.tools) {
      this.validateTool(tool, plugin.name);
    }

    // Validate namespace format if provided
    if (plugin.namespace && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(plugin.namespace)) {
      throw new PluginError(
        `Invalid namespace format for plugin ${plugin.name}`,
        plugin.name,
        'Namespace must start with a letter and contain only alphanumeric characters and underscores'
      );
    }

    // Validate dependencies if provided
    if (plugin.dependencies) {
      if (!Array.isArray(plugin.dependencies)) {
        throw new PluginError(
          `Invalid dependencies for plugin ${plugin.name}`,
          plugin.name,
          'Plugin dependencies must be an array'
        );
      }

      for (const dep of plugin.dependencies) {
        if (typeof dep !== 'string' || !dep) {
          throw new PluginError(
            `Invalid dependency in plugin ${plugin.name}`,
            plugin.name,
            'Each dependency must be a non-empty string'
          );
        }
      }
    }
  }

  /**
   * Validate tool definition
   */
  private validateTool(tool: Tool, pluginName: string): void {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new PluginError(
        `Invalid tool name in plugin ${pluginName}`,
        pluginName,
        'Tool name must be a non-empty string'
      );
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tool.name)) {
      throw new PluginError(
        `Invalid tool name format in plugin ${pluginName}: ${tool.name}`,
        pluginName,
        'Tool name must start with a letter and contain only alphanumeric characters, underscores, and hyphens'
      );
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new PluginError(
        `Invalid tool description in plugin ${pluginName}: ${tool.name}`,
        pluginName,
        'Tool description must be a non-empty string'
      );
    }

    if (!Array.isArray(tool.parameters)) {
      throw new PluginError(
        `Invalid tool parameters in plugin ${pluginName}: ${tool.name}`,
        pluginName,
        'Tool parameters must be an array'
      );
    }

    // Validate each parameter
    for (const param of tool.parameters) {
      if (!param.name || typeof param.name !== 'string' || param.name.trim() === '') {
        throw new PluginError(
          `Invalid parameter name in tool ${tool.name} of plugin ${pluginName}`,
          pluginName,
          'Parameter name must be a non-empty string'
        );
      }

      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(param.name)) {
        throw new PluginError(
          `Invalid parameter name format "${param.name}" in tool ${tool.name} of plugin ${pluginName}`,
          pluginName,
          'Parameter name must start with a letter and contain only alphanumeric characters and underscores'
        );
      }

      if (!param.type || typeof param.type !== 'string') {
        throw new PluginError(
          `Invalid parameter type in tool ${tool.name} of plugin ${pluginName}`,
          pluginName,
          'Parameter type must be a non-empty string'
        );
      }

      const validTypes = ['string', 'number', 'boolean', 'object', 'array'];
      if (!validTypes.includes(param.type)) {
        throw new PluginError(
          `Invalid parameter type "${param.type}" in tool ${tool.name} of plugin ${pluginName}`,
          pluginName,
          `Parameter type must be one of: ${validTypes.join(', ')}`
        );
      }

      if (typeof param.required !== 'boolean') {
        throw new PluginError(
          `Invalid parameter required field in tool ${tool.name} of plugin ${pluginName}`,
          pluginName,
          'Parameter required field must be a boolean'
        );
      }
    }

    if (typeof tool.execute !== 'function') {
      throw new PluginError(
        `Invalid tool execute function in plugin ${pluginName}: ${tool.name}`,
        pluginName,
        'Tool execute must be a function'
      );
    }
  }
}
