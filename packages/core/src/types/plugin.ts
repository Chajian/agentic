/**
 * Plugin System Type Definitions
 *
 * Defines the interfaces for the Agent's plugin-based tool extension system.
 * Plugins provide a modular way to extend Agent capabilities with dependency injection.
 */

import type { Tool, ToolLogger } from './tool.js';
import type { KnowledgeBase } from './knowledge.js';

/**
 * Plugin context for dependency injection
 * Provides access to shared services and resources
 */
export interface PluginContext {
  /** Logger for plugin operations */
  logger: ToolLogger;
  /** Knowledge base access */
  knowledgeBase: KnowledgeBase;
  /** Application configuration */
  config: AppConfig;
  /** Custom services injected by the host application */
  services: Record<string, unknown>;
}

/**
 * Application configuration available to plugins
 */
export interface AppConfig {
  /** Environment (development, production, test) */
  env: string;
  /** Debug mode flag */
  debug: boolean;
  /** Custom configuration values */
  [key: string]: unknown;
}

/**
 * Plugin definition interface
 * Plugins provide tools and optional lifecycle hooks
 */
export interface AgentPlugin {
  /** Unique plugin identifier */
  name: string;
  /** Plugin version (semver format) */
  version: string;
  /** Human-readable description */
  description: string;
  /** Namespace for tool names (e.g., 'boss' -> 'boss_get_stats') */
  namespace?: string;
  /** Plugin dependencies (names of other plugins that must be loaded first) */
  dependencies?: string[];

  /** Tools provided by this plugin */
  tools: Tool[];

  /**
   * Called when the plugin is loaded (before tools are registered)
   * Use for initialization, resource allocation, etc.
   * @alias initialize
   */
  onLoad?(context: PluginContext): Promise<void>;

  /**
   * Called when the plugin is loaded (before tools are registered)
   * Use for initialization, resource allocation, etc.
   * @alias onLoad
   */
  initialize?(context: PluginContext): Promise<void>;

  /**
   * Called when the plugin is unloaded (after tools are unregistered)
   * Use for cleanup, resource release, etc.
   * @alias cleanup
   */
  onUnload?(): Promise<void>;

  /**
   * Called when the plugin is unloaded (after tools are unregistered)
   * Use for cleanup, resource release, etc.
   * @alias onUnload
   */
  cleanup?(): Promise<void>;

  /**
   * Optional health check for the plugin
   * Returns true if the plugin is functioning correctly
   */
  healthCheck?(): Promise<boolean>;
}

/**
 * Plugin factory function type
 * Recommended pattern for creating plugins with dependency injection
 */
export type PluginFactory<TDeps = unknown> = (deps: TDeps) => AgentPlugin;

/**
 * Plugin status information
 */
export type PluginStatus = 'loaded' | 'loading' | 'error' | 'unloaded';

/**
 * Plugin information returned by listPlugins
 */
export interface PluginInfo {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin namespace */
  namespace?: string;
  /** Number of tools provided */
  toolCount: number;
  /** Tool names (with namespace prefix if applicable) */
  toolNames: string[];
  /** Current status */
  status: PluginStatus;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Options for plugin manager behavior
 */
export interface PluginManagerOptions {
  /**
   * Strategy for handling tool name conflicts
   * - 'error': Throw an error (default)
   * - 'replace': Replace existing tool
   * - 'skip': Skip the conflicting tool
   */
  conflictStrategy: 'error' | 'replace' | 'skip';

  /**
   * Whether to automatically add namespace prefix to tool names
   * Default: true
   */
  autoNamespace: boolean;

  /**
   * Whether to validate plugin definitions strictly
   * Default: true
   */
  strictValidation: boolean;
}

/**
 * Default plugin manager options
 */
export const DEFAULT_PLUGIN_MANAGER_OPTIONS: PluginManagerOptions = {
  conflictStrategy: 'error',
  autoNamespace: true,
  strictValidation: true,
};
