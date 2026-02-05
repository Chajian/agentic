/**
 * Plugin Manager Tests
 *
 * Tests for plugin loading, unloading, namespace handling, and conflict resolution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PluginManager, PluginError } from './plugin-manager.js';
import type { AgentPlugin, PluginContext } from '../types/plugin.js';
import type { Tool, ToolResult } from '../types/tool.js';

// Helper to create a mock tool
function createMockTool(name: string, category?: string): Tool {
  return {
    name,
    description: `Mock tool: ${name}`,
    parameters: [],
    category,
    execute: async (): Promise<ToolResult> => ({
      success: true,
      content: `Executed ${name}`,
    }),
  };
}

// Helper to create a mock plugin
function createMockPlugin(name: string, tools: Tool[], namespace?: string): AgentPlugin {
  return {
    name,
    version: '1.0.0',
    description: `Mock plugin: ${name}`,
    namespace,
    tools,
  };
}

// Helper to create a mock plugin context
function createMockContext(): PluginContext {
  return {
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
    knowledgeBase: {} as any,
    config: { env: 'test', debug: false },
    services: {},
  };
}

describe('PluginManager', () => {
  let manager: PluginManager;

  beforeEach(() => {
    manager = new PluginManager();
    manager.setContext(createMockContext());
  });

  describe('Plugin Loading', () => {
    it('should load a valid plugin', async () => {
      const plugin = createMockPlugin('test-plugin', [createMockTool('test_tool')]);

      await manager.load(plugin);

      expect(manager.hasPlugin('test-plugin')).toBe(true);
      expect(manager.pluginCount).toBe(1);
    });

    it('should register all tools from a plugin', async () => {
      const tools = [createMockTool('tool1'), createMockTool('tool2'), createMockTool('tool3')];
      const plugin = createMockPlugin('test-plugin', tools);

      await manager.load(plugin);

      expect(manager.toolCount).toBe(3);
      expect(manager.hasTool('tool1')).toBe(true);
      expect(manager.hasTool('tool2')).toBe(true);
      expect(manager.hasTool('tool3')).toBe(true);
    });

    it('should reject duplicate plugin names', async () => {
      const plugin1 = createMockPlugin('test-plugin', [createMockTool('tool1')]);
      const plugin2 = createMockPlugin('test-plugin', [createMockTool('tool2')]);

      await manager.load(plugin1);

      await expect(manager.load(plugin2)).rejects.toThrow(PluginError);
      await expect(manager.load(plugin2)).rejects.toMatchObject({
        message: expect.stringMatching(/already.*loaded|duplicate/i),
      });
    });

    it('should call onLoad hook when loading', async () => {
      let loadCalled = false;
      const plugin: AgentPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        tools: [],
        onLoad: async () => {
          loadCalled = true;
        },
      };

      await manager.load(plugin);

      expect(loadCalled).toBe(true);
    });

    it('should validate plugin name format', async () => {
      const invalidPlugin = createMockPlugin('123-invalid', []);

      await expect(manager.load(invalidPlugin)).rejects.toThrow(PluginError);
      await expect(manager.load(invalidPlugin)).rejects.toMatchObject({
        message: expect.stringMatching(/invalid.*name|name.*invalid|must.*start/i),
      });
    });
  });

  describe('Namespace Handling', () => {
    it('should add namespace prefix to tool names', async () => {
      const plugin = createMockPlugin('test-plugin', [createMockTool('get_stats')], 'boss');

      await manager.load(plugin);

      expect(manager.hasTool('boss_get_stats')).toBe(true);
      expect(manager.hasTool('get_stats')).toBe(false);
    });

    it('should not add prefix when namespace is not set', async () => {
      const plugin = createMockPlugin('test-plugin', [createMockTool('get_stats')]);

      await manager.load(plugin);

      expect(manager.hasTool('get_stats')).toBe(true);
    });

    it('should not add prefix when autoNamespace is disabled', async () => {
      const customManager = new PluginManager({ autoNamespace: false });
      customManager.setContext(createMockContext());

      const plugin = createMockPlugin('test-plugin', [createMockTool('get_stats')], 'boss');

      await customManager.load(plugin);

      expect(customManager.hasTool('get_stats')).toBe(true);
      expect(customManager.hasTool('boss_get_stats')).toBe(false);
    });

    /**
     * Property 9: Plugin Namespace Isolation
     * For any two plugins with different namespaces, their tools should have
     * unique fully-qualified names and never conflict.
     */
    it('should isolate tools from different plugins with namespaces', async () => {
      const plugin1 = createMockPlugin(
        'plugin1',
        [createMockTool('get_stats'), createMockTool('create')],
        'boss'
      );
      const plugin2 = createMockPlugin(
        'plugin2',
        [createMockTool('get_stats'), createMockTool('create')],
        'player'
      );

      await manager.load(plugin1);
      await manager.load(plugin2);

      // Both plugins should be loaded
      expect(manager.pluginCount).toBe(2);

      // All tools should be registered with unique names
      expect(manager.toolCount).toBe(4);
      expect(manager.hasTool('boss_get_stats')).toBe(true);
      expect(manager.hasTool('boss_create')).toBe(true);
      expect(manager.hasTool('player_get_stats')).toBe(true);
      expect(manager.hasTool('player_create')).toBe(true);
    });
  });

  describe('Conflict Handling', () => {
    it('should throw error on tool name conflict by default', async () => {
      const plugin1 = createMockPlugin('plugin1', [createMockTool('shared_tool')]);
      const plugin2 = createMockPlugin('plugin2', [createMockTool('shared_tool')]);

      await manager.load(plugin1);

      await expect(manager.load(plugin2)).rejects.toThrow(PluginError);
    });

    it('should replace tool when conflictStrategy is replace', async () => {
      const replaceManager = new PluginManager({ conflictStrategy: 'replace' });
      replaceManager.setContext(createMockContext());

      const tool1 = createMockTool('shared_tool');
      tool1.description = 'First version';
      const tool2 = createMockTool('shared_tool');
      tool2.description = 'Second version';

      const plugin1 = createMockPlugin('plugin1', [tool1]);
      const plugin2 = createMockPlugin('plugin2', [tool2]);

      await replaceManager.load(plugin1);
      await replaceManager.load(plugin2);

      const tool = replaceManager.getTool('shared_tool');
      expect(tool?.description).toBe('Second version');
    });

    it('should skip tool when conflictStrategy is skip', async () => {
      const skipManager = new PluginManager({ conflictStrategy: 'skip' });
      skipManager.setContext(createMockContext());

      const tool1 = createMockTool('shared_tool');
      tool1.description = 'First version';
      const tool2 = createMockTool('shared_tool');
      tool2.description = 'Second version';

      const plugin1 = createMockPlugin('plugin1', [tool1]);
      const plugin2 = createMockPlugin('plugin2', [tool2]);

      await skipManager.load(plugin1);
      await skipManager.load(plugin2);

      const tool = skipManager.getTool('shared_tool');
      expect(tool?.description).toBe('First version');
    });
  });

  describe('Plugin Unloading', () => {
    it('should unload a plugin and remove its tools', async () => {
      const plugin = createMockPlugin(
        'test-plugin',
        [createMockTool('tool1'), createMockTool('tool2')],
        'test'
      );

      await manager.load(plugin);
      expect(manager.toolCount).toBe(2);

      const result = await manager.unload('test-plugin');

      expect(result).toBe(true);
      expect(manager.hasPlugin('test-plugin')).toBe(false);
      expect(manager.toolCount).toBe(0);
    });

    it('should call onUnload hook when unloading', async () => {
      let unloadCalled = false;
      const plugin: AgentPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        tools: [],
        onUnload: async () => {
          unloadCalled = true;
        },
      };

      await manager.load(plugin);
      await manager.unload('test-plugin');

      expect(unloadCalled).toBe(true);
    });

    it('should return false when unloading non-existent plugin', async () => {
      const result = await manager.unload('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Plugin Information', () => {
    it('should list all loaded plugins', async () => {
      await manager.load(createMockPlugin('plugin1', [createMockTool('t1')], 'p1'));
      await manager.load(createMockPlugin('plugin2', [createMockTool('t2')], 'p2'));

      const plugins = manager.listPlugins();

      expect(plugins).toHaveLength(2);
      expect(plugins.map((p) => p.name)).toContain('plugin1');
      expect(plugins.map((p) => p.name)).toContain('plugin2');
    });

    it('should include tool names in plugin info', async () => {
      const plugin = createMockPlugin(
        'test-plugin',
        [createMockTool('tool1'), createMockTool('tool2')],
        'test'
      );

      await manager.load(plugin);

      const plugins = manager.listPlugins();
      const info = plugins[0];

      expect(info.toolCount).toBe(2);
      expect(info.toolNames).toContain('test_tool1');
      expect(info.toolNames).toContain('test_tool2');
    });
  });

  describe('Tool Definitions', () => {
    it('should generate tool definitions for LLM', async () => {
      const plugin = createMockPlugin('test-plugin', [createMockTool('get_data')], 'api');

      await manager.load(plugin);

      const definitions = manager.getToolDefinitions();

      expect(definitions).toHaveLength(1);
      expect(definitions[0].type).toBe('function');
      expect(definitions[0].function.name).toBe('api_get_data');
    });
  });

  describe('Health Check', () => {
    it('should run health checks on all plugins', async () => {
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

      await manager.load(healthyPlugin);
      await manager.load(unhealthyPlugin);

      const results = await manager.healthCheck();

      expect(results.get('healthy')).toBe(true);
      expect(results.get('unhealthy')).toBe(false);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property: Plugin names must be unique
     */
    it('should maintain plugin name uniqueness', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string().filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)),
            {
              minLength: 1,
              maxLength: 10,
            }
          ),
          async (names) => {
            const testManager = new PluginManager();
            testManager.setContext(createMockContext());

            const uniqueNames = [...new Set(names)];
            const loadedNames: string[] = [];

            for (const name of uniqueNames) {
              try {
                await testManager.load(createMockPlugin(name, []));
                loadedNames.push(name);
              } catch {
                // Expected for duplicates
              }
            }

            // All loaded plugins should have unique names
            expect(new Set(loadedNames).size).toBe(loadedNames.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property 9: Namespace isolation guarantees unique tool names
     */
    it('should guarantee unique tool names with namespaces', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              pluginName: fc.string().filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)),
              namespace: fc.string().filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
              toolNames: fc.array(
                fc.string().filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)),
                { minLength: 1, maxLength: 3 }
              ),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (pluginConfigs) => {
            const testManager = new PluginManager();
            testManager.setContext(createMockContext());

            // Make plugin names and namespaces unique, and dedupe tool names within each plugin
            const uniqueConfigs = pluginConfigs.reduce(
              (acc, config, index) => {
                const uniqueName = `${config.pluginName}_${index}`;
                const uniqueNamespace = `${config.namespace}_${index}`;
                // Dedupe tool names within the plugin
                const uniqueToolNames = [...new Set(config.toolNames)];
                acc.push({
                  ...config,
                  pluginName: uniqueName,
                  namespace: uniqueNamespace,
                  toolNames: uniqueToolNames,
                });
                return acc;
              },
              [] as typeof pluginConfigs
            );

            // Load all plugins
            for (const config of uniqueConfigs) {
              const tools = config.toolNames.map((name) => createMockTool(name));
              const plugin = createMockPlugin(config.pluginName, tools, config.namespace);
              await testManager.load(plugin);
            }

            // All tool names should be unique
            const toolNames = testManager.listToolNames();
            expect(new Set(toolNames).size).toBe(toolNames.length);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
