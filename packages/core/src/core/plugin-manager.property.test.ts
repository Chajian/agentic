/**
 * Plugin Manager Property-Based Tests
 *
 * Property-based tests for plugin lifecycle, tool validation, and namespace isolation.
 * These tests validate correctness properties across many randomly generated inputs.
 *
 * @module core/plugin-manager.property.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PluginManager, PluginError } from './plugin-manager.js';
import type { AgentPlugin, PluginContext } from '../types/plugin.js';
import type { Tool, ToolResult, ToolParameter } from '../types/tool.js';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock plugin context
 */
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

/**
 * Create a mock tool with validation
 */
function createMockTool(name: string, params: ToolParameter[] = []): Tool {
  return {
    name,
    description: `Mock tool: ${name}`,
    parameters: params,
    execute: async (): Promise<ToolResult> => ({
      success: true,
      content: `Executed ${name}`,
    }),
  };
}

/**
 * Create a mock plugin
 */
function createMockPlugin(
  name: string,
  tools: Tool[],
  options: {
    namespace?: string;
    dependencies?: string[];
    hasInitialize?: boolean;
    hasCleanup?: boolean;
  } = {}
): AgentPlugin {
  const plugin: AgentPlugin = {
    name,
    version: '1.0.0',
    description: `Mock plugin: ${name}`,
    namespace: options.namespace,
    dependencies: options.dependencies,
    tools,
  };

  if (options.hasInitialize) {
    plugin.initialize = async () => {};
  }

  if (options.hasCleanup) {
    plugin.cleanup = async () => {};
  }

  return plugin;
}

// ============================================================================
// Fast-check Arbitraries
// ============================================================================

/**
 * Generate valid plugin names
 */
const pluginNameArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

/**
 * Generate valid tool names
 */
const toolNameArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

/**
 * Generate valid namespace names
 */
const namespaceArb = fc
  .string({ minLength: 1, maxLength: 15 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

/**
 * Generate valid parameter types
 */
const paramTypeArb = fc.constantFrom('string', 'number', 'boolean', 'object', 'array');

/**
 * Generate tool parameters
 */
const toolParameterArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 15 }).filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
  type: paramTypeArb,
  description: fc.string({ minLength: 1, maxLength: 50 }),
  required: fc.boolean(),
});

/**
 * Generate tools with valid parameters
 */
const toolArb = fc.record({
  name: toolNameArb,
  parameters: fc.array(toolParameterArb, { maxLength: 5 }),
}).map(({ name, parameters }) => createMockTool(name, parameters));

// ============================================================================
// Property 3: Plugin lifecycle hook ordering
// **Feature: agent-standalone-project, Property 3: Plugin lifecycle hook ordering**
// **Validates: Requirements 4.1**
// ============================================================================

describe('Plugin Manager - Property-Based Tests', () => {
  describe('Property 3: Plugin lifecycle hook ordering', () => {
    it('should call initialize/onLoad before tools are registered', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          fc.array(toolArb, { minLength: 1, maxLength: 5 }),
          async (pluginName, tools) => {
            // Create fresh manager for each iteration
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            // Deduplicate tool names to avoid conflicts
            const uniqueTools = tools.reduce((acc, tool) => {
              if (!acc.some((t) => t.name === tool.name)) {
                acc.push(tool);
              }
              return acc;
            }, [] as Tool[]);

            // Skip if no unique tools
            if (uniqueTools.length === 0) {
              return true;
            }

            const callOrder: string[] = [];

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: uniqueTools,
              initialize: async () => {
                callOrder.push('initialize');
                // At this point, tools should NOT be registered yet
                expect(manager.toolCount).toBe(0);
              },
            };

            await manager.load(plugin);
            callOrder.push('tools_registered');

            // Verify ordering
            expect(callOrder).toEqual(['initialize', 'tools_registered']);
            // After loading, tools should be registered
            expect(manager.toolCount).toBe(uniqueTools.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call cleanup/onUnload after tools are unregistered', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          fc.array(toolArb, { minLength: 1, maxLength: 5 }),
          async (pluginName, tools) => {
            // Create fresh manager for each iteration
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            // Deduplicate tool names to avoid conflicts
            const uniqueTools = tools.reduce((acc, tool) => {
              if (!acc.some((t) => t.name === tool.name)) {
                acc.push(tool);
              }
              return acc;
            }, [] as Tool[]);

            // Skip if no unique tools
            if (uniqueTools.length === 0) {
              return true;
            }

            const callOrder: string[] = [];

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: uniqueTools,
              cleanup: async () => {
                callOrder.push('cleanup');
              },
            };

            await manager.load(plugin);
            expect(manager.toolCount).toBe(uniqueTools.length);

            await manager.unload(pluginName);
            callOrder.push('tools_unregistered');

            // Verify cleanup was called
            expect(callOrder).toContain('cleanup');
            // After unloading, tools should be removed
            expect(manager.toolCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should support both initialize and onLoad naming conventions', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          fc.boolean(),
          async (pluginName, useInitialize) => {
            // Create fresh manager for each iteration
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            let hookCalled = false;

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: [],
            };

            if (useInitialize) {
              plugin.initialize = async () => {
                hookCalled = true;
              };
            } else {
              plugin.onLoad = async () => {
                hookCalled = true;
              };
            }

            await manager.load(plugin);

            // Hook should be called regardless of naming
            expect(hookCalled).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should support both cleanup and onUnload naming conventions', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          fc.boolean(),
          async (pluginName, useCleanup) => {
            // Create fresh manager for each iteration
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            let hookCalled = false;

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: [],
            };

            if (useCleanup) {
              plugin.cleanup = async () => {
                hookCalled = true;
              };
            } else {
              plugin.onUnload = async () => {
                hookCalled = true;
              };
            }

            await manager.load(plugin);
            await manager.unload(pluginName);

            // Hook should be called regardless of naming
            expect(hookCalled).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should load dependencies before the plugin itself', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pluginNameArb, pluginNameArb).filter(([a, b]) => a !== b),
          async ([depName, pluginName]) => {
            // Create fresh manager for each iteration
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            const loadOrder: string[] = [];

            // Create dependency plugin
            const depPlugin: AgentPlugin = {
              name: depName,
              version: '1.0.0',
              description: 'Dependency plugin',
              tools: [],
              initialize: async () => {
                loadOrder.push(depName);
              },
            };

            // Create plugin with dependency
            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Main plugin',
              dependencies: [depName],
              tools: [],
              initialize: async () => {
                loadOrder.push(pluginName);
              },
            };

            // Load dependency first
            await manager.load(depPlugin);
            // Then load plugin with dependency
            await manager.load(plugin);

            // Verify dependency was loaded before plugin
            expect(loadOrder).toEqual([depName, pluginName]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject plugins with missing dependencies', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pluginNameArb, pluginNameArb).filter(([a, b]) => a !== b),
          async ([depName, pluginName]) => {
            // Create fresh manager for each iteration
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Plugin with missing dependency',
              dependencies: [depName],
              tools: [],
            };

            // Should throw because dependency is not loaded
            await expect(manager.load(plugin)).rejects.toThrow(PluginError);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Property 4: Tool validation and error handling
  // **Feature: agent-standalone-project, Property 4: Tool validation and error handling**
  // **Validates: Requirements 4.3**
  // ============================================================================

  describe('Property 4: Tool validation and error handling', () => {
    it('should reject tools with invalid names', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          fc.string().filter((s) => !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s) && s.length > 0),
          async (pluginName, invalidToolName) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: [createMockTool(invalidToolName)],
            };

            // Should throw PluginError due to invalid tool name
            await expect(manager.load(plugin)).rejects.toThrow(PluginError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject tools with missing required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          async (pluginName) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            // Tool with missing description
            const invalidTool = {
              name: 'valid_name',
              description: '', // Empty description
              parameters: [],
              execute: async () => ({ success: true, content: 'test' }),
            } as Tool;

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: [invalidTool],
            };

            // Should throw PluginError due to empty description
            await expect(manager.load(plugin)).rejects.toThrow(PluginError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject tools with invalid parameter types', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          toolNameArb,
          fc.string().filter((s) => !['string', 'number', 'boolean', 'object', 'array'].includes(s)),
          async (pluginName, toolName, invalidType) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            const invalidParam: ToolParameter = {
              name: 'param1',
              type: invalidType as any,
              description: 'Test parameter',
              required: true,
            };

            const tool = createMockTool(toolName, [invalidParam]);

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: [tool],
            };

            // Should throw PluginError due to invalid parameter type
            await expect(manager.load(plugin)).rejects.toThrow(PluginError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject tools with invalid parameter names', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          toolNameArb,
          fc.string().filter((s) => !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(s) && s.length > 0),
          async (pluginName, toolName, invalidParamName) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            const invalidParam: ToolParameter = {
              name: invalidParamName,
              type: 'string',
              description: 'Test parameter',
              required: true,
            };

            const tool = createMockTool(toolName, [invalidParam]);

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: [tool],
            };

            // Should throw PluginError due to invalid parameter name
            await expect(manager.load(plugin)).rejects.toThrow(PluginError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject tools with non-function execute', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          toolNameArb,
          async (pluginName, toolName) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            const invalidTool = {
              name: toolName,
              description: 'Test tool',
              parameters: [],
              execute: 'not a function' as any,
            };

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: [invalidTool],
            };

            // Should throw PluginError due to invalid execute function
            await expect(manager.load(plugin)).rejects.toThrow(PluginError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept tools with valid definitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          fc.array(toolArb, { minLength: 1, maxLength: 5 }),
          async (pluginName, tools) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            // Deduplicate tool names
            const uniqueTools = tools.reduce((acc, tool) => {
              if (!acc.some((t) => t.name === tool.name)) {
                acc.push(tool);
              }
              return acc;
            }, [] as Tool[]);

            if (uniqueTools.length === 0) {
              return true;
            }

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: uniqueTools,
            };

            // Should load successfully with valid tools
            await manager.load(plugin);
            expect(manager.hasPlugin(pluginName)).toBe(true);
            expect(manager.toolCount).toBe(uniqueTools.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Property 5: Multiple tool registration
  // **Feature: agent-standalone-project, Property 5: Multiple tool registration**
  // **Validates: Requirements 4.4**
  // ============================================================================

  describe('Property 5: Multiple tool registration', () => {
    it('should register all tools from a plugin', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          fc.array(toolArb, { minLength: 1, maxLength: 10 }),
          async (pluginName, tools) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            // Deduplicate tool names
            const uniqueTools = tools.reduce((acc, tool) => {
              if (!acc.some((t) => t.name === tool.name)) {
                acc.push(tool);
              }
              return acc;
            }, [] as Tool[]);

            if (uniqueTools.length === 0) {
              return true;
            }

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: uniqueTools,
            };

            await manager.load(plugin);

            // All tools should be registered
            expect(manager.toolCount).toBe(uniqueTools.length);

            // Each tool should be accessible
            for (const tool of uniqueTools) {
              expect(manager.hasTool(tool.name)).toBe(true);
              expect(manager.getTool(tool.name)).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should make all tools independently callable', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          fc.array(toolArb, { minLength: 2, maxLength: 5 }),
          async (pluginName, tools) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            // Deduplicate tool names
            const uniqueTools = tools.reduce((acc, tool) => {
              if (!acc.some((t) => t.name === tool.name)) {
                acc.push(tool);
              }
              return acc;
            }, [] as Tool[]);

            if (uniqueTools.length < 2) {
              return true;
            }

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: uniqueTools,
            };

            await manager.load(plugin);

            // Call each tool independently
            for (const tool of uniqueTools) {
              const registeredTool = manager.getTool(tool.name);
              expect(registeredTool).toBeDefined();

              // Execute the tool
              const result = await registeredTool!.execute({}, {} as any);
              expect(result.success).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve tool metadata for all registered tools', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          fc.array(toolArb, { minLength: 1, maxLength: 5 }),
          async (pluginName, tools) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            // Deduplicate tool names
            const uniqueTools = tools.reduce((acc, tool) => {
              if (!acc.some((t) => t.name === tool.name)) {
                acc.push(tool);
              }
              return acc;
            }, [] as Tool[]);

            if (uniqueTools.length === 0) {
              return true;
            }

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: uniqueTools,
            };

            await manager.load(plugin);

            // Verify metadata is preserved for each tool
            for (const originalTool of uniqueTools) {
              const registeredTool = manager.getTool(originalTool.name);
              expect(registeredTool).toBeDefined();
              expect(registeredTool!.description).toBe(originalTool.description);
              expect(registeredTool!.parameters).toEqual(originalTool.parameters);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle plugins with no tools', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          async (pluginName) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Plugin with no tools',
              tools: [],
            };

            // Should load successfully even with no tools
            await manager.load(plugin);
            expect(manager.hasPlugin(pluginName)).toBe(true);
            expect(manager.toolCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate correct tool definitions for all tools', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          fc.array(toolArb, { minLength: 1, maxLength: 5 }),
          async (pluginName, tools) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            // Deduplicate tool names
            const uniqueTools = tools.reduce((acc, tool) => {
              if (!acc.some((t) => t.name === tool.name)) {
                acc.push(tool);
              }
              return acc;
            }, [] as Tool[]);

            if (uniqueTools.length === 0) {
              return true;
            }

            const plugin: AgentPlugin = {
              name: pluginName,
              version: '1.0.0',
              description: 'Test plugin',
              tools: uniqueTools,
            };

            await manager.load(plugin);

            // Get tool definitions for LLM
            const definitions = manager.getToolDefinitions();
            expect(definitions).toHaveLength(uniqueTools.length);

            // Each definition should have correct structure
            for (const def of definitions) {
              expect(def.type).toBe('function');
              expect(def.function.name).toBeDefined();
              expect(def.function.description).toBeDefined();
              expect(def.function.parameters).toBeDefined();
              expect(def.function.parameters.type).toBe('object');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Property 18: Plugin tool namespace isolation
  // **Feature: agent-standalone-project, Property 18: Plugin tool namespace isolation**
  // **Validates: Requirements 4.1**
  // ============================================================================

  describe('Property 18: Plugin tool namespace isolation', () => {
    it('should isolate tools from different plugins with namespaces', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              pluginName: pluginNameArb,
              namespace: namespaceArb,
              toolNames: fc.array(toolNameArb, { minLength: 1, maxLength: 3 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (pluginConfigs) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            // Make plugin names and namespaces unique
            const uniqueConfigs = pluginConfigs.map((config, index) => ({
              ...config,
              pluginName: `${config.pluginName}_${index}`,
              namespace: `${config.namespace}_${index}`,
              // Dedupe tool names within each plugin
              toolNames: [...new Set(config.toolNames)],
            }));

            // Load all plugins
            for (const config of uniqueConfigs) {
              const tools = config.toolNames.map((name) => createMockTool(name));
              const plugin = createMockPlugin(config.pluginName, tools, {
                namespace: config.namespace,
              });
              await manager.load(plugin);
            }

            // All tool names should be unique (namespaced)
            const toolNames = manager.listToolNames();
            expect(new Set(toolNames).size).toBe(toolNames.length);

            // Each tool should be accessible with its namespaced name
            for (const config of uniqueConfigs) {
              for (const toolName of config.toolNames) {
                const namespacedName = `${config.namespace}_${toolName}`;
                expect(manager.hasTool(namespacedName)).toBe(true);
                expect(manager.getTool(namespacedName)).toBeDefined();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent conflicts between plugins with same tool names but different namespaces', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pluginNameArb, pluginNameArb).filter(([a, b]) => a !== b),
          fc.tuple(namespaceArb, namespaceArb).filter(([a, b]) => a !== b),
          fc.array(toolNameArb, { minLength: 1, maxLength: 3 }),
          async ([plugin1Name, plugin2Name], [namespace1, namespace2], sharedToolNames) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            // Dedupe tool names
            const uniqueToolNames = [...new Set(sharedToolNames)];
            if (uniqueToolNames.length === 0) {
              return true;
            }

            // Create two plugins with the same tool names but different namespaces
            const tools1 = uniqueToolNames.map((name) => createMockTool(name));
            const tools2 = uniqueToolNames.map((name) => createMockTool(name));

            const plugin1 = createMockPlugin(plugin1Name, tools1, { namespace: namespace1 });
            const plugin2 = createMockPlugin(plugin2Name, tools2, { namespace: namespace2 });

            // Both plugins should load successfully
            await manager.load(plugin1);
            await manager.load(plugin2);

            // Total tool count should be 2x the number of unique tool names
            expect(manager.toolCount).toBe(uniqueToolNames.length * 2);

            // Each plugin's tools should be accessible with their namespace
            for (const toolName of uniqueToolNames) {
              const tool1Name = `${namespace1}_${toolName}`;
              const tool2Name = `${namespace2}_${toolName}`;

              expect(manager.hasTool(tool1Name)).toBe(true);
              expect(manager.hasTool(tool2Name)).toBe(true);

              // Tools should be different instances
              const tool1 = manager.getTool(tool1Name);
              const tool2 = manager.getTool(tool2Name);
              expect(tool1).toBeDefined();
              expect(tool2).toBeDefined();
              expect(tool1!.name).toBe(tool1Name);
              expect(tool2!.name).toBe(tool2Name);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not add namespace when autoNamespace is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          namespaceArb,
          fc.array(toolNameArb, { minLength: 1, maxLength: 3 }),
          async (pluginName, namespace, toolNames) => {
            const manager = new PluginManager({ autoNamespace: false });
            manager.setContext(createMockContext());

            // Dedupe tool names
            const uniqueToolNames = [...new Set(toolNames)];
            if (uniqueToolNames.length === 0) {
              return true;
            }

            const tools = uniqueToolNames.map((name) => createMockTool(name));
            const plugin = createMockPlugin(pluginName, tools, { namespace });

            await manager.load(plugin);

            // Tools should be registered without namespace prefix
            for (const toolName of uniqueToolNames) {
              expect(manager.hasTool(toolName)).toBe(true);
              expect(manager.hasTool(`${namespace}_${toolName}`)).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not add namespace when plugin has no namespace defined', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginNameArb,
          fc.array(toolNameArb, { minLength: 1, maxLength: 3 }),
          async (pluginName, toolNames) => {
            const manager = new PluginManager();
            manager.setContext(createMockContext());

            // Dedupe tool names
            const uniqueToolNames = [...new Set(toolNames)];
            if (uniqueToolNames.length === 0) {
              return true;
            }

            const tools = uniqueToolNames.map((name) => createMockTool(name));
            const plugin = createMockPlugin(pluginName, tools); // No namespace

            await manager.load(plugin);

            // Tools should be registered without namespace prefix
            for (const toolName of uniqueToolNames) {
              expect(manager.hasTool(toolName)).toBe(true);
              const tool = manager.getTool(toolName);
              expect(tool).toBeDefined();
              expect(tool!.name).toBe(toolName);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle namespace conflicts with different conflict strategies', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pluginNameArb, pluginNameArb).filter(([a, b]) => a !== b),
          toolNameArb,
          fc.constantFrom('replace', 'skip'),
          async ([plugin1Name, plugin2Name], sharedToolName, strategy) => {
            const manager = new PluginManager({ conflictStrategy: strategy as any });
            manager.setContext(createMockContext());

            // Create two plugins with the same tool name (no namespace)
            const tool1 = createMockTool(sharedToolName);
            tool1.description = 'First version';
            const tool2 = createMockTool(sharedToolName);
            tool2.description = 'Second version';

            const plugin1 = createMockPlugin(plugin1Name, [tool1]);
            const plugin2 = createMockPlugin(plugin2Name, [tool2]);

            await manager.load(plugin1);
            await manager.load(plugin2);

            // Both plugins should be loaded
            expect(manager.hasPlugin(plugin1Name)).toBe(true);
            expect(manager.hasPlugin(plugin2Name)).toBe(true);

            // Tool behavior depends on strategy
            const tool = manager.getTool(sharedToolName);
            expect(tool).toBeDefined();

            if (strategy === 'replace') {
              // Second plugin's tool should replace the first
              expect(tool!.description).toBe('Second version');
            } else if (strategy === 'skip') {
              // First plugin's tool should remain
              expect(tool!.description).toBe('First version');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
