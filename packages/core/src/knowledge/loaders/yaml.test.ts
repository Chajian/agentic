/**
 * YAML Loader Tests
 *
 * Tests for the YAML document loader functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  parseYaml,
  parseYamlDocument,
  loadYamlDocument,
  loadYamlByRootKeys,
  flattenYaml,
  yamlToText,
  YamlLoader,
} from './yaml.js';

describe('parseYaml', () => {
  it('should parse simple key-value pairs', () => {
    const content = `name: Test
version: 1.0
enabled: true`;

    const result = parseYaml(content);

    expect(result.name).toBe('Test');
    expect(result.version).toBe(1.0);
    expect(result.enabled).toBe(true);
  });

  it('should parse nested objects', () => {
    const content = `mob:
  name: Skeleton
  health: 100
  damage: 10`;

    const result = parseYaml(content);

    expect(result.mob).toBeDefined();
    expect((result.mob as Record<string, unknown>).name).toBe('Skeleton');
    expect((result.mob as Record<string, unknown>).health).toBe(100);
  });

  it('should parse arrays', () => {
    const content = `skills:
  - fireball
  - lightning
  - heal`;

    const result = parseYaml(content);

    expect(result.skills).toBeDefined();
    expect(Array.isArray(result.skills)).toBe(true);
    expect(result.skills as string[]).toContain('fireball');
    expect(result.skills as string[]).toHaveLength(3);
  });

  it('should handle quoted strings', () => {
    const content = `message: "Hello, World!"
path: 'C:\\Users\\test'`;

    const result = parseYaml(content);

    expect(result.message).toBe('Hello, World!');
    expect(result.path).toBe('C:\\Users\\test');
  });

  it('should handle boolean values', () => {
    const content = `enabled: true
disabled: false
active: yes
inactive: no`;

    const result = parseYaml(content);

    expect(result.enabled).toBe(true);
    expect(result.disabled).toBe(false);
    expect(result.active).toBe(true);
    expect(result.inactive).toBe(false);
  });

  it('should handle null values', () => {
    const content = `empty: null
tilde: ~
blank:`;

    const result = parseYaml(content);

    expect(result.empty).toBeNull();
    expect(result.tilde).toBeNull();
  });

  it('should skip comments', () => {
    const content = `# This is a comment
name: Test
# Another comment
value: 123`;

    const result = parseYaml(content);

    expect(result.name).toBe('Test');
    expect(result.value).toBe(123);
    expect(Object.keys(result)).toHaveLength(2);
  });
});

describe('flattenYaml', () => {
  it('should flatten nested structure', () => {
    const data = {
      mob: {
        name: 'Skeleton',
        stats: {
          health: 100,
          damage: 10,
        },
      },
    };

    const nodes = flattenYaml(data);

    expect(nodes.some((n) => n.path === 'mob')).toBe(true);
    expect(nodes.some((n) => n.path === 'mob.name')).toBe(true);
    expect(nodes.some((n) => n.path === 'mob.stats.health')).toBe(true);
  });

  it('should handle arrays with indices', () => {
    const data = {
      skills: ['fireball', 'lightning'],
    };

    const nodes = flattenYaml(data, { includeArrayIndices: true });

    expect(nodes.some((n) => n.path === 'skills[0]')).toBe(true);
    expect(nodes.some((n) => n.path === 'skills[1]')).toBe(true);
  });

  it('should respect maxDepth', () => {
    const data = {
      level1: {
        level2: {
          level3: {
            level4: 'deep',
          },
        },
      },
    };

    const nodes = flattenYaml(data, { maxDepth: 2 });

    expect(nodes.some((n) => n.path === 'level1.level2')).toBe(true);
    expect(nodes.some((n) => n.path === 'level1.level2.level3')).toBe(false);
  });
});

describe('yamlToText', () => {
  it('should convert to readable text', () => {
    const data = {
      name: 'Test',
      health: 100,
    };

    const text = yamlToText(data);

    expect(text).toContain('name: Test');
    expect(text).toContain('health: 100');
  });

  it('should handle nested objects', () => {
    const data = {
      mob: {
        name: 'Skeleton',
      },
    };

    const text = yamlToText(data);

    expect(text).toContain('mob:');
    expect(text).toContain('name: Skeleton');
  });

  it('should handle arrays', () => {
    const data = {
      skills: ['fireball', 'lightning'],
    };

    const text = yamlToText(data);

    expect(text).toContain('skills:');
    expect(text).toContain('- fireball');
    expect(text).toContain('- lightning');
  });
});

describe('loadYamlDocument', () => {
  it('should create DocumentInput with correct structure', () => {
    const content = `name: TestMob
health: 100`;

    const doc = loadYamlDocument(content, { category: 'mobs' });

    expect(doc.category).toBe('mobs');
    expect(doc.content).toContain('name: TestMob');
    expect(doc.metadata?.sourceType).toBe('yaml');
    expect(doc.metadata?.rootKeys).toContain('name');
  });

  it('should use custom title', () => {
    const content = `key: value`;

    const doc = loadYamlDocument(content, {
      category: 'config',
      title: 'Custom Config',
    });

    expect(doc.title).toBe('Custom Config');
  });

  it('should include raw data in metadata', () => {
    const content = `name: Test
value: 123`;

    const doc = loadYamlDocument(content, { category: 'test' });

    expect(doc.metadata?.rawData).toBeDefined();
    expect((doc.metadata?.rawData as Record<string, unknown>).name).toBe('Test');
  });
});

describe('loadYamlByRootKeys', () => {
  it('should split by root keys', () => {
    const content = `skeleton:
  health: 100
zombie:
  health: 200`;

    const docs = loadYamlByRootKeys(content, { category: 'mobs' });

    expect(docs).toHaveLength(2);
    expect(docs.some((d) => d.title?.includes('skeleton'))).toBe(true);
    expect(docs.some((d) => d.title?.includes('zombie'))).toBe(true);
  });

  it('should return single document for single root key', () => {
    const content = `mob:
  name: Test`;

    const docs = loadYamlByRootKeys(content, { category: 'mobs' });

    expect(docs).toHaveLength(1);
  });
});

describe('YamlLoader class', () => {
  it('should use default category', () => {
    const loader = new YamlLoader({ defaultCategory: 'config' });
    const doc = loader.load('key: value');

    expect(doc.category).toBe('config');
  });

  it('should include default metadata', () => {
    const loader = new YamlLoader({
      defaultCategory: 'config',
      defaultMetadata: { source: 'test' },
    });
    const doc = loader.load('key: value');

    expect(doc.metadata?.source).toBe('test');
  });

  it('should parse without creating DocumentInput', () => {
    const loader = new YamlLoader();
    const result = loader.parse('name: Test\nvalue: 123');

    expect(result.data.name).toBe('Test');
    expect(result.rootKeys).toContain('name');
  });

  it('should parse raw YAML', () => {
    const loader = new YamlLoader();
    const data = loader.parseRaw('name: Test');

    expect(data.name).toBe('Test');
  });
});

describe('MythicMobs-style YAML', () => {
  it('should parse MythicMobs mob configuration', () => {
    const content = `TestSkeleton:
  Type: SKELETON
  Display: '&cTest Skeleton'
  Health: 100
  Damage: 10
  Options:
    MovementSpeed: 0.3
    PreventOtherDrops: true
  Skills:
    - skill{s=FireballAttack} @target ~onTimer:100`;

    const result = parseYaml(content);

    expect(result.TestSkeleton).toBeDefined();
    const mob = result.TestSkeleton as Record<string, unknown>;
    expect(mob.Type).toBe('SKELETON');
    expect(mob.Health).toBe(100);
    expect(mob.Options).toBeDefined();
  });

  it('should convert MythicMobs config to searchable text', () => {
    const content = `TestMob:
  Type: ZOMBIE
  Health: 200`;

    const doc = loadYamlDocument(content, {
      category: 'mythicmobs',
      title: 'TestMob Configuration',
    });

    expect(doc.content).toContain('Type: ZOMBIE');
    expect(doc.content).toContain('Health: 200');
  });
});
