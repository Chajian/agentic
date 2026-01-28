/**
 * Plugin System Integration Tests
 *
 * Tests for plugin loading/unloading, namespace isolation, and dependency injection.
 * Requirements: 4.1-4.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManager, PluginError } from './plugin-manager.js';
import type { AgentPlugin, PluginContext, PluginFactory } from '../types/plugin.js';
import type { Tool, ToolResult, ToolContext } from '../types/tool.js';

// Helper to create a mock tool with optional execute behavior
function createMockTool(
  name: string,
  options?: {
    category?: string;
    requiresConfirmation?: boolean;
    executeFn?: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
  }
): Tool {
  return {
    name,
    description: `Mock tool: ${name}`,
    parameters: [],
    category: options?.category,
    requiresConfirmation: options?.requiresConfirmation,
    execute: options?.executeFn ?? (async (): Promise<ToolResult> => ({
      success: true,
      content: `Executed ${name}`,
    })),
  };
}

// Helper to create a mock plugin context with tracking
function createMockContext(services: Record<string, unknown> = {}): PluginContext {
  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    knowledgeBase: {} as any,
    config: { env: 'test', debug: false },
    services,
  };
}


describe('Plugin System Integration Tests', () => {
  let manager: PluginManager;
  let context: PluginContext;

  beforeEach(() => {
    manager = new PluginManager();
    context = createMockContext();
    manager.setContext(context);
  });

  describe('Plugin Loading/Unloading Lifecycle', () => {
    /**
     * Test: Complete plugin lifecycle - load, use, unload
     * Requirements: 4.1, 4.5
     */
    it('should handle complete plugin lifecycle', async () => {
      let loadCalled = false;
      let unloadCalled = false;
      const executionLog: string[] = [];

      const plugin: AgentPlugin = {
        name: 'lifecycle-test',
        version: '1.0.0',
        description: 'Lifecycle test plugin',
        namespace: 'lifecycle',
        tools: [
          createMockTool('action', {
            executeFn: async () => {
              executionLog.push('action executed');
              return { success: true, content: 'Action done' };
            },
          }),
        ],
        onLoad: async (ctx) => {
          loadCalled = true;
          ctx.logger.info('Plugin loaded');
        },
        onUnload: async () => {
          unloadCalled = true;
        },
      };

      // Load plugin
      await manager.load(plugin);
      expect(loadCalled).toBe(true);
      expect(manager.hasPlugin('lifecycle-test')).toBe(true);
      expect(manager.hasTool('lifecycle_action')).toBe(true);

      // Execute tool
      const tool = manager.getTool('lifecycle_action');
      expect(tool).toBeDefined();
      const result = await tool!.execute({}, {} as ToolContext);
      expect(result.success).toBe(true);
      expect(executionLog).toContain('action executed');

      // Unload plugin
      const unloaded = await manager.unload('lifecycle-test');
      expect(unloaded).toBe(true);
      expect(unloadCalled).toBe(true);
      expect(manager.hasPlugin('lifecycle-test')).toBe(false);
      expect(manager.hasTool('lifecycle_action')).toBe(false);
    });

    /**
     * Test: Multiple plugins can be loaded and unloaded independently
     * Requirements: 4.1, 4.5
     */
    it('should manage multiple plugins independently', async () => {
      const plugin1: AgentPlugin = {
        name: 'plugin-a',
        version: '1.0.0',
        description: 'Plugin A',
        namespace: 'a',
        tools: [createMockTool('tool1'), createMockTool('tool2')],
      };

      const plugin2: AgentPlugin = {
        name: 'plugin-b',
        version: '2.0.0',
        description: 'Plugin B',
        namespace: 'b',
        tools: [createMockTool('tool1'), createMockTool('tool3')],
      };

      // Load both plugins
      await manager.load(plugin1);
      await manager.load(plugin2);

      expect(manager.pluginCount).toBe(2);
      expect(manager.toolCount).toBe(4);

      // Unload plugin A - plugin B should remain
      await manager.unload('plugin-a');
      expect(manager.pluginCount).toBe(1);
      expect(manager.toolCount).toBe(2);
      expect(manager.hasTool('a_tool1')).toBe(false);
      expect(manager.hasTool('b_tool1')).toBe(true);

      // Unload plugin B
      await manager.unload('plugin-b');
      expect(manager.pluginCount).toBe(0);
      expect(manager.toolCount).toBe(0);
    });


    /**
     * Test: Plugin loading failure should not affect other plugins
     * Requirements: 4.1
     */
    it('should isolate plugin loading failures', async () => {
      const goodPlugin: AgentPlugin = {
        name: 'good-plugin',
        version: '1.0.0',
        description: 'Good plugin',
        tools: [createMockTool('good_tool')],
      };

      const badPlugin: AgentPlugin = {
        name: 'bad-plugin',
        version: '1.0.0',
        description: 'Bad plugin',
        tools: [createMockTool('bad_tool')],
        onLoad: async () => {
          throw new Error('Initialization failed');
        },
      };

      // Load good plugin first
      await manager.load(goodPlugin);
      expect(manager.hasPlugin('good-plugin')).toBe(true);

      // Bad plugin should fail to load
      await expect(manager.load(badPlugin)).rejects.toThrow(PluginError);

      // Good plugin should still be functional
      expect(manager.hasPlugin('good-plugin')).toBe(true);
      expect(manager.hasTool('good_tool')).toBe(true);
      
      // Bad plugin is registered but in error state, its tools are cleaned up
      const plugins = manager.listPlugins();
      const badPluginInfo = plugins.find(p => p.name === 'bad-plugin');
      expect(badPluginInfo?.status).toBe('error');
      expect(manager.hasTool('bad_tool')).toBe(false); // Tools should be cleaned up
    });

    /**
     * Test: Clear all plugins
     * Requirements: 4.5
     */
    it('should clear all plugins at once', async () => {
      const plugins = Array.from({ length: 5 }, (_, i) => ({
        name: `plugin-${i}`,
        version: '1.0.0',
        description: `Plugin ${i}`,
        namespace: `ns${i}`,
        tools: [createMockTool(`tool${i}`)],
      }));

      for (const plugin of plugins) {
        await manager.load(plugin);
      }

      expect(manager.pluginCount).toBe(5);
      expect(manager.toolCount).toBe(5);

      await manager.clear();

      expect(manager.pluginCount).toBe(0);
      expect(manager.toolCount).toBe(0);
    });
  });


  describe('Namespace Isolation', () => {
    /**
     * Test: Tools from different plugins with same names are isolated by namespace
     * Requirements: 4.2, 4.3
     */
    it('should isolate tools with same names using namespaces', async () => {
      const bossPlugin: AgentPlugin = {
        name: 'boss-plugin',
        version: '1.0.0',
        description: 'Boss management',
        namespace: 'boss',
        tools: [
          createMockTool('get_stats', {
            executeFn: async () => ({ success: true, content: 'Boss stats' }),
          }),
          createMockTool('create', {
            executeFn: async () => ({ success: true, content: 'Boss created' }),
          }),
        ],
      };

      const playerPlugin: AgentPlugin = {
        name: 'player-plugin',
        version: '1.0.0',
        description: 'Player management',
        namespace: 'player',
        tools: [
          createMockTool('get_stats', {
            executeFn: async () => ({ success: true, content: 'Player stats' }),
          }),
          createMockTool('create', {
            executeFn: async () => ({ success: true, content: 'Player created' }),
          }),
        ],
      };

      await manager.load(bossPlugin);
      await manager.load(playerPlugin);

      // Both plugins should be loaded
      expect(manager.pluginCount).toBe(2);
      expect(manager.toolCount).toBe(4);

      // Tools should be namespaced
      expect(manager.hasTool('boss_get_stats')).toBe(true);
      expect(manager.hasTool('boss_create')).toBe(true);
      expect(manager.hasTool('player_get_stats')).toBe(true);
      expect(manager.hasTool('player_create')).toBe(true);

      // Original names should not exist
      expect(manager.hasTool('get_stats')).toBe(false);
      expect(manager.hasTool('create')).toBe(false);

      // Tools should execute independently
      const bossStats = manager.getTool('boss_get_stats');
      const playerStats = manager.getTool('player_get_stats');

      const bossResult = await bossStats!.execute({}, {} as ToolContext);
      const playerResult = await playerStats!.execute({}, {} as ToolContext);

      expect(bossResult.content).toBe('Boss stats');
      expect(playerResult.content).toBe('Player stats');
    });

    /**
     * Test: Plugin info includes correct tool names with namespace
     * Requirements: 4.2
     */
    it('should report namespaced tool names in plugin info', async () => {
      const plugin: AgentPlugin = {
        name: 'info-test',
        version: '1.0.0',
        description: 'Info test plugin',
        namespace: 'test',
        tools: [createMockTool('action1'), createMockTool('action2')],
      };

      await manager.load(plugin);

      const plugins = manager.listPlugins();
      expect(plugins).toHaveLength(1);

      const info = plugins[0];
      expect(info.name).toBe('info-test');
      expect(info.namespace).toBe('test');
      expect(info.toolCount).toBe(2);
      expect(info.toolNames).toContain('test_action1');
      expect(info.toolNames).toContain('test_action2');
    });


    /**
     * Test: Tool definitions for LLM include namespaced names
     * Requirements: 4.2, 4.6
     */
    it('should generate tool definitions with namespaced names', async () => {
      const plugin: AgentPlugin = {
        name: 'def-test',
        version: '1.0.0',
        description: 'Definition test plugin',
        namespace: 'api',
        tools: [
          {
            name: 'fetch_data',
            description: 'Fetches data from API',
            parameters: [
              { name: 'id', type: 'string', description: 'Resource ID', required: true },
            ],
            execute: async () => ({ success: true, content: 'Data fetched' }),
          },
        ],
      };

      await manager.load(plugin);

      const definitions = manager.getToolDefinitions();
      expect(definitions).toHaveLength(1);

      const def = definitions[0];
      expect(def.type).toBe('function');
      expect(def.function.name).toBe('api_fetch_data');
      expect(def.function.description).toBe('Fetches data from API');
      expect(def.function.parameters.properties).toHaveProperty('id');
    });

    /**
     * Test: Plugins without namespace don't get prefix
     * Requirements: 4.2
     */
    it('should not add prefix to tools when namespace is not set', async () => {
      const plugin: AgentPlugin = {
        name: 'no-namespace',
        version: '1.0.0',
        description: 'No namespace plugin',
        tools: [createMockTool('raw_tool')],
      };

      await manager.load(plugin);

      expect(manager.hasTool('raw_tool')).toBe(true);
      expect(manager.hasTool('no-namespace_raw_tool')).toBe(false);
    });
  });


  describe('Dependency Injection', () => {
    /**
     * Test: Plugin receives context with services during onLoad
     * Requirements: 4.4
     */
    it('should inject context with services into plugin onLoad', async () => {
      let receivedContext: PluginContext | null = null;

      const plugin: AgentPlugin = {
        name: 'di-test',
        version: '1.0.0',
        description: 'DI test plugin',
        tools: [],
        onLoad: async (ctx) => {
          receivedContext = ctx;
        },
      };

      const customContext = createMockContext({
        database: { query: vi.fn() },
        cache: { get: vi.fn(), set: vi.fn() },
      });
      manager.setContext(customContext);

      await manager.load(plugin);

      expect(receivedContext).not.toBeNull();
      expect(receivedContext!.logger).toBeDefined();
      expect(receivedContext!.config).toBeDefined();
      expect(receivedContext!.services.database).toBeDefined();
      expect(receivedContext!.services.cache).toBeDefined();
    });

    /**
     * Test: Plugin factory pattern with dependency injection
     * Requirements: 4.4
     */
    it('should support plugin factory pattern for dependency injection', async () => {
      // Define a service interface
      interface DataService {
        getData(): Promise<string>;
      }

      // Create a plugin factory
      const createDataPlugin: PluginFactory<{ dataService: DataService }> = (deps) => ({
        name: 'data-plugin',
        version: '1.0.0',
        description: 'Data plugin with injected service',
        namespace: 'data',
        tools: [
          {
            name: 'fetch',
            description: 'Fetch data using injected service',
            parameters: [],
            execute: async () => {
              const data = await deps.dataService.getData();
              return { success: true, content: data };
            },
          },
        ],
      });

      // Create mock service
      const mockDataService: DataService = {
        getData: vi.fn().mockResolvedValue('Injected data result'),
      };

      // Create plugin with injected dependency
      const plugin = createDataPlugin({ dataService: mockDataService });
      await manager.load(plugin);

      // Execute tool - should use injected service
      const tool = manager.getTool('data_fetch');
      const result = await tool!.execute({}, {} as ToolContext);

      expect(result.success).toBe(true);
      expect(result.content).toBe('Injected data result');
      expect(mockDataService.getData).toHaveBeenCalled();
    });


    /**
     * Test: Plugin can store services in context for backward compatibility
     * Requirements: 4.4
     */
    it('should allow plugins to store services in context', async () => {
      const plugin: AgentPlugin = {
        name: 'service-provider',
        version: '1.0.0',
        description: 'Service provider plugin',
        tools: [],
        onLoad: async (ctx) => {
          // Plugin stores its own service in context
          ctx.services.customService = {
            process: (data: string) => `Processed: ${data}`,
          };
        },
      };

      await manager.load(plugin);

      // Service should be available in context
      const customService = context.services.customService as { process: (data: string) => string };
      expect(customService).toBeDefined();
      expect(customService.process('test')).toBe('Processed: test');
    });

    /**
     * Test: Multiple plugins can share services through context
     * Requirements: 4.4
     */
    it('should allow multiple plugins to share services', async () => {
      const sharedLog: string[] = [];

      const providerPlugin: AgentPlugin = {
        name: 'provider',
        version: '1.0.0',
        description: 'Service provider',
        tools: [],
        onLoad: async (ctx) => {
          ctx.services.sharedLogger = {
            log: (msg: string) => sharedLog.push(msg),
          };
        },
      };

      const consumerPlugin: AgentPlugin = {
        name: 'consumer',
        version: '1.0.0',
        description: 'Service consumer',
        namespace: 'consumer',
        tools: [
          {
            name: 'log_action',
            description: 'Logs an action',
            parameters: [],
            execute: async () => {
              const logger = context.services.sharedLogger as { log: (msg: string) => void };
              logger.log('Action executed');
              return { success: true, content: 'Logged' };
            },
          },
        ],
      };

      // Load provider first, then consumer
      await manager.load(providerPlugin);
      await manager.load(consumerPlugin);

      // Execute consumer tool
      const tool = manager.getTool('consumer_log_action');
      await tool!.execute({}, {} as ToolContext);

      expect(sharedLog).toContain('Action executed');
    });
  });


  describe('Health Check Integration', () => {
    /**
     * Test: Health check runs on all plugins
     * Requirements: 4.1
     */
    it('should run health checks on all loaded plugins', async () => {
      const healthyPlugin: AgentPlugin = {
        name: 'healthy',
        version: '1.0.0',
        description: 'Healthy plugin',
        tools: [],
        healthCheck: async () => true,
      };

      const unhealthyPlugin: AgentPlugin = {
        name: 'unhealthy',
        version: '1.0.0',
        description: 'Unhealthy plugin',
        tools: [],
        healthCheck: async () => false,
      };

      const noCheckPlugin: AgentPlugin = {
        name: 'no-check',
        version: '1.0.0',
        description: 'Plugin without health check',
        tools: [],
      };

      await manager.load(healthyPlugin);
      await manager.load(unhealthyPlugin);
      await manager.load(noCheckPlugin);

      const results = await manager.healthCheck();

      expect(results.get('healthy')).toBe(true);
      expect(results.get('unhealthy')).toBe(false);
      expect(results.get('no-check')).toBe(true); // Default to loaded status
    });

    /**
     * Test: Health check handles errors gracefully
     * Requirements: 4.1
     */
    it('should handle health check errors gracefully', async () => {
      const errorPlugin: AgentPlugin = {
        name: 'error-check',
        version: '1.0.0',
        description: 'Plugin with failing health check',
        tools: [],
        healthCheck: async () => {
          throw new Error('Health check failed');
        },
      };

      await manager.load(errorPlugin);

      const results = await manager.healthCheck();
      expect(results.get('error-check')).toBe(false);
    });
  });


  describe('Tool Confirmation Requirement', () => {
    /**
     * Test: Tools marked with requiresConfirmation are properly registered
     * Requirements: 4.7
     */
    it('should preserve requiresConfirmation flag on tools', async () => {
      const plugin: AgentPlugin = {
        name: 'confirm-test',
        version: '1.0.0',
        description: 'Confirmation test plugin',
        namespace: 'admin',
        tools: [
          createMockTool('safe_action', { requiresConfirmation: false }),
          createMockTool('dangerous_action', { requiresConfirmation: true }),
        ],
      };

      await manager.load(plugin);

      const safeTool = manager.getTool('admin_safe_action');
      const dangerousTool = manager.getTool('admin_dangerous_action');

      expect(safeTool?.requiresConfirmation).toBeFalsy();
      expect(dangerousTool?.requiresConfirmation).toBe(true);
    });
  });

  describe('Conflict Resolution Strategies', () => {
    /**
     * Test: Error strategy throws on conflict
     * Requirements: 4.3
     */
    it('should throw error on tool conflict with error strategy', async () => {
      const errorManager = new PluginManager({ conflictStrategy: 'error' });
      errorManager.setContext(createMockContext());

      const plugin1: AgentPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        description: 'Plugin 1',
        tools: [createMockTool('shared_tool')],
      };

      const plugin2: AgentPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        description: 'Plugin 2',
        tools: [createMockTool('shared_tool')],
      };

      await errorManager.load(plugin1);
      await expect(errorManager.load(plugin2)).rejects.toThrow(PluginError);
    });

    /**
     * Test: Replace strategy replaces existing tool
     * Requirements: 4.3
     */
    it('should replace tool on conflict with replace strategy', async () => {
      const replaceManager = new PluginManager({ conflictStrategy: 'replace' });
      replaceManager.setContext(createMockContext());

      const plugin1: AgentPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        description: 'Plugin 1',
        tools: [
          createMockTool('shared_tool', {
            executeFn: async () => ({ success: true, content: 'Version 1' }),
          }),
        ],
      };

      const plugin2: AgentPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        description: 'Plugin 2',
        tools: [
          createMockTool('shared_tool', {
            executeFn: async () => ({ success: true, content: 'Version 2' }),
          }),
        ],
      };

      await replaceManager.load(plugin1);
      await replaceManager.load(plugin2);

      const tool = replaceManager.getTool('shared_tool');
      const result = await tool!.execute({}, {} as ToolContext);
      expect(result.content).toBe('Version 2');
    });


    /**
     * Test: Skip strategy keeps existing tool
     * Requirements: 4.3
     */
    it('should skip tool on conflict with skip strategy', async () => {
      const skipManager = new PluginManager({ conflictStrategy: 'skip' });
      skipManager.setContext(createMockContext());

      const plugin1: AgentPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        description: 'Plugin 1',
        tools: [
          createMockTool('shared_tool', {
            executeFn: async () => ({ success: true, content: 'Version 1' }),
          }),
        ],
      };

      const plugin2: AgentPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        description: 'Plugin 2',
        tools: [
          createMockTool('shared_tool', {
            executeFn: async () => ({ success: true, content: 'Version 2' }),
          }),
        ],
      };

      await skipManager.load(plugin1);
      await skipManager.load(plugin2);

      const tool = skipManager.getTool('shared_tool');
      const result = await tool!.execute({}, {} as ToolContext);
      expect(result.content).toBe('Version 1');
    });
  });

  describe('Real-World Plugin Scenarios', () => {
    /**
     * Test: Simulates loading Boss and MythicMobs plugins together
     * Requirements: 4.1, 4.2, 4.4
     */
    it('should handle multiple business plugins with overlapping tool names', async () => {
      // Simulate Boss plugin
      const bossPlugin: AgentPlugin = {
        name: 'boss',
        version: '1.0.0',
        description: 'Boss spawn point management',
        namespace: 'boss',
        tools: [
          createMockTool('get_stats'),
          createMockTool('create'),
          createMockTool('update'),
          createMockTool('delete'),
          createMockTool('query'),
        ],
        onLoad: async (ctx) => {
          ctx.services.bossService = { initialized: true };
          ctx.logger.info('Boss plugin loaded');
        },
      };

      // Simulate MythicMobs plugin
      const mythicMobsPlugin: AgentPlugin = {
        name: 'mythicmobs',
        version: '1.0.0',
        description: 'MythicMobs configuration management',
        namespace: 'mythicmobs',
        tools: [
          createMockTool('read'),
          createMockTool('create'),
          createMockTool('save'),
          createMockTool('search'),
        ],
        onLoad: async (ctx) => {
          ctx.services.mythicMobsService = { initialized: true };
          ctx.logger.info('MythicMobs plugin loaded');
        },
      };

      await manager.load(bossPlugin);
      await manager.load(mythicMobsPlugin);

      // Both plugins should be loaded
      expect(manager.pluginCount).toBe(2);
      expect(manager.toolCount).toBe(9);

      // Tools should be properly namespaced
      expect(manager.hasTool('boss_create')).toBe(true);
      expect(manager.hasTool('mythicmobs_create')).toBe(true);

      // Services should be available
      expect(context.services.bossService).toEqual({ initialized: true });
      expect(context.services.mythicMobsService).toEqual({ initialized: true });

      // Logger should have been called
      expect(context.logger.info).toHaveBeenCalledWith('Boss plugin loaded');
      expect(context.logger.info).toHaveBeenCalledWith('MythicMobs plugin loaded');
    });
  });
});
