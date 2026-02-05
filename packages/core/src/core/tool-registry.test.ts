/**
 * Property-Based Tests for Tool Registry
 *
 * **Feature: ai-agent, Property 1: Tool Registration Uniqueness**
 * **Validates: Requirements 4.1**
 *
 * Tests that tool registration maintains uniqueness - registering a tool
 * with the same name either replaces the existing tool or throws an error,
 * never resulting in duplicate tools.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ToolRegistry, ToolRegistrationError, ToolNotFoundError } from './tool-registry.js';
import type { Tool, ToolParameter, ToolResult } from '../types/tool.js';

// Helper to create a valid tool name (starts with letter, alphanumeric + underscore/hyphen)
const arbToolName = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,29}$/);

// Helper to create valid parameter types
const arbParameterType = fc.constantFrom('string', 'number', 'boolean', 'object', 'array');

// Helper to create a valid tool parameter
const arbToolParameter: fc.Arbitrary<ToolParameter> = fc.record({
  name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,19}$/),
  type: arbParameterType,
  description: fc.string({ minLength: 1, maxLength: 100 }),
  required: fc.boolean(),
  enum: fc.option(fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }), {
    nil: undefined,
  }),
});

// Helper to create unique parameters (no duplicate names)
const arbUniqueParameters = fc
  .array(arbToolParameter, { minLength: 0, maxLength: 5 })
  .map((params) => {
    const seen = new Set<string>();
    return params.filter((p) => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  });

// Mock execute function
const mockExecute = async (): Promise<ToolResult> => ({
  success: true,
  content: 'Mock result',
});

// Helper to create a valid tool
const arbTool: fc.Arbitrary<Tool> = fc.record({
  name: arbToolName,
  description: fc.string({ minLength: 1, maxLength: 200 }),
  parameters: arbUniqueParameters,
  execute: fc.constant(mockExecute),
  category: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  requiresConfirmation: fc.option(fc.boolean(), { nil: undefined }),
  riskLevel: fc.option(fc.constantFrom('low', 'medium', 'high'), { nil: undefined }),
});

// Helper to create a list of tools with unique names
const arbUniqueTools = fc.array(arbTool, { minLength: 0, maxLength: 10 }).map((tools) => {
  const seen = new Set<string>();
  return tools.filter((t) => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });
});

describe('Tool Registration Uniqueness Property Tests', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  /**
   * **Feature: ai-agent, Property 1: Tool Registration Uniqueness**
   * **Validates: Requirements 4.1**
   *
   * For any tool registry, registering a tool with the same name as an existing
   * tool should either replace the existing tool or throw an error, never result
   * in duplicate tools.
   */
  it('Property 1: No duplicate tools after registration (allowReplace=false)', () => {
    fc.assert(
      fc.property(arbTool, arbTool, (tool1, tool2) => {
        const registry = new ToolRegistry({ allowReplace: false });

        // Register first tool
        registry.register(tool1);
        expect(registry.size).toBe(1);

        // Create a second tool with the same name
        const tool2WithSameName = { ...tool2, name: tool1.name };

        // Attempting to register should throw
        expect(() => registry.register(tool2WithSameName)).toThrow(ToolRegistrationError);

        // Registry should still have exactly one tool
        expect(registry.size).toBe(1);

        // The original tool should still be there
        const retrieved = registry.get(tool1.name);
        expect(retrieved).toBeDefined();
        expect(retrieved?.description).toBe(tool1.description);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: Tool replacement works correctly (allowReplace=true)', () => {
    fc.assert(
      fc.property(arbTool, arbTool, (tool1, tool2) => {
        const registry = new ToolRegistry({ allowReplace: true });

        // Register first tool
        registry.register(tool1);
        expect(registry.size).toBe(1);

        // Create a second tool with the same name but different description
        const tool2WithSameName = {
          ...tool2,
          name: tool1.name,
          description: tool2.description + '_replaced',
        };

        // Register should succeed and replace
        registry.register(tool2WithSameName);

        // Registry should still have exactly one tool
        expect(registry.size).toBe(1);

        // The new tool should be there
        const retrieved = registry.get(tool1.name);
        expect(retrieved).toBeDefined();
        expect(retrieved?.description).toBe(tool2WithSameName.description);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: Multiple unique tools are all registered', () => {
    fc.assert(
      fc.property(arbUniqueTools, (tools) => {
        const registry = new ToolRegistry();

        // Register all tools
        for (const tool of tools) {
          registry.register(tool);
        }

        // Registry should have exactly the number of unique tools
        expect(registry.size).toBe(tools.length);

        // All tools should be retrievable
        for (const tool of tools) {
          const retrieved = registry.get(tool.name);
          expect(retrieved).toBeDefined();
          expect(retrieved?.name).toBe(tool.name);
        }

        // List should return all tools
        const listed = registry.list();
        expect(listed.length).toBe(tools.length);

        // Names should be unique
        const names = registry.listNames();
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(names.length);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: Tool definitions maintain uniqueness', () => {
    fc.assert(
      fc.property(arbUniqueTools, (tools) => {
        const registry = new ToolRegistry();

        for (const tool of tools) {
          registry.register(tool);
        }

        const definitions = registry.getDefinitions();

        // Number of definitions should match number of tools
        expect(definitions.length).toBe(tools.length);

        // All definition names should be unique
        const defNames = definitions.map((d) => d.function.name);
        const uniqueDefNames = new Set(defNames);
        expect(uniqueDefNames.size).toBe(defNames.length);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: Unregister removes tool and allows re-registration', () => {
    fc.assert(
      fc.property(arbTool, arbTool, (tool1, tool2) => {
        const registry = new ToolRegistry({ allowReplace: false });

        // Register first tool
        registry.register(tool1);
        expect(registry.size).toBe(1);

        // Unregister it
        const removed = registry.unregister(tool1.name);
        expect(removed).toBe(true);
        expect(registry.size).toBe(0);

        // Create a new tool with the same name
        const newTool = { ...tool2, name: tool1.name };

        // Should be able to register again
        registry.register(newTool);
        expect(registry.size).toBe(1);

        // New tool should be there
        const retrieved = registry.get(tool1.name);
        expect(retrieved?.description).toBe(newTool.description);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: Clear removes all tools', () => {
    fc.assert(
      fc.property(arbUniqueTools, (tools) => {
        const registry = new ToolRegistry();

        for (const tool of tools) {
          registry.register(tool);
        }

        expect(registry.size).toBe(tools.length);

        registry.clear();

        expect(registry.size).toBe(0);
        expect(registry.list()).toHaveLength(0);
        expect(registry.listNames()).toHaveLength(0);

        // All tools should be gone
        for (const tool of tools) {
          expect(registry.has(tool.name)).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Tool Registry Unit Tests', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should register a valid tool', () => {
    const tool: Tool = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: [{ name: 'input', type: 'string', description: 'Input value', required: true }],
      execute: mockExecute,
    };

    registry.register(tool);
    expect(registry.has('test_tool')).toBe(true);
    expect(registry.get('test_tool')).toBe(tool);
  });

  it('should throw on invalid tool name', () => {
    const tool: Tool = {
      name: '123invalid',
      description: 'Invalid name',
      parameters: [],
      execute: mockExecute,
    };

    expect(() => registry.register(tool)).toThrow(ToolRegistrationError);
  });

  it('should throw on empty description', () => {
    const tool: Tool = {
      name: 'valid_name',
      description: '',
      parameters: [],
      execute: mockExecute,
    };

    expect(() => registry.register(tool)).toThrow(ToolRegistrationError);
  });

  it('should throw on duplicate parameter names', () => {
    const tool: Tool = {
      name: 'valid_name',
      description: 'Valid description',
      parameters: [
        { name: 'param', type: 'string', description: 'First', required: true },
        { name: 'param', type: 'number', description: 'Duplicate', required: false },
      ],
      execute: mockExecute,
    };

    expect(() => registry.register(tool)).toThrow(ToolRegistrationError);
  });

  it('should get tool or throw', () => {
    const tool: Tool = {
      name: 'existing_tool',
      description: 'Exists',
      parameters: [],
      execute: mockExecute,
    };

    registry.register(tool);

    expect(registry.getOrThrow('existing_tool')).toBe(tool);
    expect(() => registry.getOrThrow('nonexistent')).toThrow(ToolNotFoundError);
  });

  it('should list tools by category', () => {
    const tool1: Tool = {
      name: 'tool1',
      description: 'Tool 1',
      parameters: [],
      execute: mockExecute,
      category: 'category_a',
    };

    const tool2: Tool = {
      name: 'tool2',
      description: 'Tool 2',
      parameters: [],
      execute: mockExecute,
      category: 'category_b',
    };

    const tool3: Tool = {
      name: 'tool3',
      description: 'Tool 3',
      parameters: [],
      execute: mockExecute,
      category: 'category_a',
    };

    registry.registerAll([tool1, tool2, tool3]);

    const categoryA = registry.listByCategory('category_a');
    expect(categoryA).toHaveLength(2);
    expect(categoryA.map((t) => t.name)).toContain('tool1');
    expect(categoryA.map((t) => t.name)).toContain('tool3');

    const categoryB = registry.listByCategory('category_b');
    expect(categoryB).toHaveLength(1);
    expect(categoryB[0].name).toBe('tool2');
  });

  it('should get all categories', () => {
    const tool1: Tool = {
      name: 'tool1',
      description: 'Tool 1',
      parameters: [],
      execute: mockExecute,
      category: 'category_a',
    };

    const tool2: Tool = {
      name: 'tool2',
      description: 'Tool 2',
      parameters: [],
      execute: mockExecute,
      category: 'category_b',
    };

    const tool3: Tool = {
      name: 'tool3',
      description: 'Tool 3',
      parameters: [],
      execute: mockExecute,
      // No category
    };

    registry.registerAll([tool1, tool2, tool3]);

    const categories = registry.getCategories();
    expect(categories).toHaveLength(2);
    expect(categories).toContain('category_a');
    expect(categories).toContain('category_b');
  });

  it('should get definitions for specific tools', () => {
    const tool1: Tool = {
      name: 'tool1',
      description: 'Tool 1',
      parameters: [],
      execute: mockExecute,
    };

    const tool2: Tool = {
      name: 'tool2',
      description: 'Tool 2',
      parameters: [],
      execute: mockExecute,
    };

    const tool3: Tool = {
      name: 'tool3',
      description: 'Tool 3',
      parameters: [],
      execute: mockExecute,
    };

    registry.registerAll([tool1, tool2, tool3]);

    const definitions = registry.getDefinitionsFor(['tool1', 'tool3']);
    expect(definitions).toHaveLength(2);
    expect(definitions.map((d) => d.function.name)).toContain('tool1');
    expect(definitions.map((d) => d.function.name)).toContain('tool3');
    expect(definitions.map((d) => d.function.name)).not.toContain('tool2');
  });
});
