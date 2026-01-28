/**
 * YAML Document Loader
 * 
 * Parses YAML configuration files and converts them to searchable text
 * for the knowledge base. Supports MythicMobs and other game configuration formats.
 * 
 * _Requirements: 3.1_
 */

import type { DocumentInput } from '../../types/knowledge.js';

/**
 * Parsed YAML node with path information
 */
export interface YamlNode {
  /** Path to this node (e.g., "mobs.skeleton.health") */
  path: string;
  /** Key name */
  key: string;
  /** Value (can be primitive, array, or object) */
  value: unknown;
  /** Depth in the tree */
  depth: number;
}

/**
 * Result of parsing a YAML document
 */
export interface YamlParseResult {
  /** Parsed data structure */
  data: Record<string, unknown>;
  /** Flattened nodes for searching */
  nodes: YamlNode[];
  /** Root keys in the document */
  rootKeys: string[];
  /** Human-readable text representation */
  textContent: string;
}

/**
 * Options for loading YAML documents
 */
export interface YamlLoaderOptions {
  /** Category for the document */
  category: string;
  /** Document title */
  title?: string;
  /** Additional metadata to include */
  metadata?: Record<string, unknown>;
  /** Maximum depth to traverse (default: 10) */
  maxDepth?: number;
  /** Whether to include array indices in paths (default: true) */
  includeArrayIndices?: boolean;
  /** Custom text formatter */
  textFormatter?: (data: Record<string, unknown>) => string;
}

/**
 * Simple YAML parser for common configuration formats
 * Handles basic YAML structures without external dependencies
 */
export function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split(/\r?\n/);
  
  // Track the hierarchy with indent levels
  interface StackItem {
    obj: Record<string, unknown>;
    indent: number;
    key: string;  // The key in the parent that points to this object
    parentObj: Record<string, unknown>;  // The parent object
  }
  
  // Root item has special handling
  const stack: StackItem[] = [];
  let currentObj = result;
  let lastKey: string | null = null;
  let lastKeyIndent = -1;
  let lastKeyParent: Record<string, unknown> = result;
  
  let multilineValue: string[] = [];
  let isMultiline = false;
  let multilineIndent = 0;
  let multilineKey: string | null = null;
  let multilineParent: Record<string, unknown> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines and comments
    if (line.trim() === '' || line.trim().startsWith('#')) {
      if (isMultiline) {
        multilineValue.push('');
      }
      continue;
    }
    
    // Calculate indentation
    const indent = line.search(/\S/);
    const trimmedLine = line.trim();
    
    // Handle multiline strings
    if (isMultiline) {
      if (indent > multilineIndent) {
        multilineValue.push(line.slice(multilineIndent + 2));
        continue;
      } else {
        // End of multiline - save to the correct parent
        if (multilineKey && multilineParent) {
          multilineParent[multilineKey] = multilineValue.join('\n').trim();
        }
        isMultiline = false;
        multilineValue = [];
        multilineKey = null;
        multilineParent = null;
      }
    }
    
    // Pop stack to correct level based on indentation
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    
    // Update currentObj based on stack
    currentObj = stack.length > 0 ? stack[stack.length - 1].obj : result;
    
    // Handle list items
    if (trimmedLine.startsWith('- ')) {
      const listValue = trimmedLine.slice(2).trim();
      
      // Find the key for this list
      // If we have a stack item at a lower indent, use its key
      // Otherwise use lastKey
      let listKey: string | null = null;
      let listParent: Record<string, unknown> = result;
      
      // Check if there's a stack item that should contain this list
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j].indent < indent) {
          listKey = stack[j].key;
          listParent = stack[j].parentObj;
          break;
        }
      }
      
      // If no stack item found, use lastKey if it's at a lower indent
      if (!listKey && lastKey && lastKeyIndent < indent) {
        listKey = lastKey;
        listParent = lastKeyParent;
      }
      
      if (listKey && listParent[listKey] !== undefined) {
        // Convert empty object to array if needed
        if (typeof listParent[listKey] === 'object' && 
            !Array.isArray(listParent[listKey]) &&
            Object.keys(listParent[listKey] as object).length === 0) {
          listParent[listKey] = [];
        }
        
        if (Array.isArray(listParent[listKey])) {
          // Check if it's a key-value pair in the list item
          const colonIndex = listValue.indexOf(':');
          if (colonIndex > 0 && !listValue.startsWith('"') && !listValue.startsWith("'")) {
            const itemKey = listValue.slice(0, colonIndex).trim();
            const itemValue = listValue.slice(colonIndex + 1).trim();
            const item: Record<string, unknown> = {};
            item[itemKey] = parseValue(itemValue);
            (listParent[listKey] as unknown[]).push(item);
          } else {
            (listParent[listKey] as unknown[]).push(parseValue(listValue));
          }
        }
      }
      continue;
    }
    
    // Handle key-value pairs
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmedLine.slice(0, colonIndex).trim();
      const valueStr = trimmedLine.slice(colonIndex + 1).trim();
      
      if (valueStr === '' || valueStr === '|' || valueStr === '>') {
        // Nested object, array, or multiline string
        if (valueStr === '|' || valueStr === '>') {
          isMultiline = true;
          multilineIndent = indent;
          multilineValue = [];
          multilineKey = key;
          multilineParent = currentObj;
        } else {
          // Could be object or array - create empty object for now
          currentObj[key] = {};
          stack.push({ 
            obj: currentObj[key] as Record<string, unknown>, 
            indent, 
            key,
            parentObj: currentObj
          });
        }
        lastKey = key;
        lastKeyIndent = indent;
        lastKeyParent = currentObj;
      } else {
        // Simple value
        currentObj[key] = parseValue(valueStr);
        lastKey = key;
        lastKeyIndent = indent;
        lastKeyParent = currentObj;
      }
    }
  }
  
  // Handle any remaining multiline content
  if (isMultiline && multilineKey && multilineParent) {
    multilineParent[multilineKey] = multilineValue.join('\n').trim();
  }
  
  return result;
}

/**
 * Parse a YAML value string to appropriate type
 */
function parseValue(value: string): unknown {
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  // Boolean
  if (value === 'true' || value === 'yes' || value === 'on') return true;
  if (value === 'false' || value === 'no' || value === 'off') return false;
  
  // Null
  if (value === 'null' || value === '~' || value === '') return null;
  
  // Number
  if (!isNaN(Number(value)) && value !== '') {
    return Number(value);
  }
  
  // String
  return value;
}

/**
 * Flatten a YAML object into nodes with paths
 */
export function flattenYaml(
  data: Record<string, unknown>,
  options?: { maxDepth?: number; includeArrayIndices?: boolean }
): YamlNode[] {
  const nodes: YamlNode[] = [];
  const maxDepth = options?.maxDepth ?? 10;
  const includeArrayIndices = options?.includeArrayIndices ?? true;
  
  function traverse(obj: unknown, path: string, depth: number): void {
    // Stop if we've exceeded max depth
    if (depth >= maxDepth) return;
    
    if (obj === null || obj === undefined) {
      return;
    }
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const itemPath = includeArrayIndices ? `${path}[${index}]` : path;
        if (typeof item === 'object' && item !== null) {
          traverse(item, itemPath, depth + 1);
        } else {
          nodes.push({
            path: itemPath,
            key: `[${index}]`,
            value: item,
            depth,
          });
        }
      });
    } else if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const newPath = path ? `${path}.${key}` : key;
        
        nodes.push({
          path: newPath,
          key,
          value,
          depth,
        });
        
        if (typeof value === 'object' && value !== null) {
          traverse(value, newPath, depth + 1);
        }
      }
    }
  }
  
  traverse(data, '', 0);
  return nodes;
}

/**
 * Convert YAML data to human-readable text
 */
export function yamlToText(data: Record<string, unknown>, indent: number = 0): string {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      lines.push(`${prefix}${key}: (empty)`);
    } else if (Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${prefix}  - Item ${index + 1}:`);
          lines.push(yamlToText(item as Record<string, unknown>, indent + 2));
        } else {
          lines.push(`${prefix}  - ${item}`);
        }
      });
    } else if (typeof value === 'object') {
      lines.push(`${prefix}${key}:`);
      lines.push(yamlToText(value as Record<string, unknown>, indent + 1));
    } else {
      lines.push(`${prefix}${key}: ${value}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Parse a YAML document and extract structured information
 */
export function parseYamlDocument(content: string, options?: { maxDepth?: number }): YamlParseResult {
  const data = parseYaml(content);
  const nodes = flattenYaml(data, { maxDepth: options?.maxDepth });
  const rootKeys = Object.keys(data);
  const textContent = yamlToText(data);
  
  return {
    data,
    nodes,
    rootKeys,
    textContent,
  };
}

/**
 * Load a YAML document as a single DocumentInput
 */
export function loadYamlDocument(
  content: string,
  options: YamlLoaderOptions
): DocumentInput {
  const parsed = parseYamlDocument(content, { maxDepth: options.maxDepth });
  
  // Use custom formatter or default text representation
  const textContent = options.textFormatter
    ? options.textFormatter(parsed.data)
    : parsed.textContent;
  
  return {
    category: options.category,
    title: options.title ?? `YAML Configuration (${parsed.rootKeys.join(', ')})`,
    content: textContent,
    metadata: {
      ...options.metadata,
      sourceType: 'yaml',
      rootKeys: parsed.rootKeys,
      nodeCount: parsed.nodes.length,
      rawData: parsed.data,
    },
  };
}

/**
 * Load a YAML document and split by root keys
 */
export function loadYamlByRootKeys(
  content: string,
  options: YamlLoaderOptions
): DocumentInput[] {
  const parsed = parseYamlDocument(content, { maxDepth: options.maxDepth });
  
  // If only one root key, return as single document
  if (parsed.rootKeys.length <= 1) {
    return [loadYamlDocument(content, options)];
  }
  
  // Create a document for each root key
  return parsed.rootKeys.map(key => {
    const keyData = { [key]: parsed.data[key] };
    const textContent = options.textFormatter
      ? options.textFormatter(keyData)
      : yamlToText(keyData);
    
    return {
      category: options.category,
      title: options.title ? `${options.title} - ${key}` : key,
      content: textContent,
      metadata: {
        ...options.metadata,
        sourceType: 'yaml',
        rootKey: key,
        rawData: keyData,
      },
    };
  });
}

/**
 * YAML Loader class for loading documents into the knowledge base
 */
export class YamlLoader {
  private defaultCategory: string;
  private defaultMetadata: Record<string, unknown>;
  private maxDepth: number;

  constructor(options?: {
    defaultCategory?: string;
    defaultMetadata?: Record<string, unknown>;
    maxDepth?: number;
  }) {
    this.defaultCategory = options?.defaultCategory ?? 'config';
    this.defaultMetadata = options?.defaultMetadata ?? {};
    this.maxDepth = options?.maxDepth ?? 10;
  }

  /**
   * Load a YAML string as a document
   */
  load(content: string, options?: Partial<YamlLoaderOptions>): DocumentInput {
    return loadYamlDocument(content, {
      category: options?.category ?? this.defaultCategory,
      title: options?.title,
      metadata: { ...this.defaultMetadata, ...options?.metadata },
      maxDepth: options?.maxDepth ?? this.maxDepth,
      textFormatter: options?.textFormatter,
    });
  }

  /**
   * Load a YAML string and split by root keys
   */
  loadByRootKeys(content: string, options?: Partial<YamlLoaderOptions>): DocumentInput[] {
    return loadYamlByRootKeys(content, {
      category: options?.category ?? this.defaultCategory,
      title: options?.title,
      metadata: { ...this.defaultMetadata, ...options?.metadata },
      maxDepth: options?.maxDepth ?? this.maxDepth,
      textFormatter: options?.textFormatter,
    });
  }

  /**
   * Parse YAML content without creating DocumentInput
   */
  parse(content: string): YamlParseResult {
    return parseYamlDocument(content, { maxDepth: this.maxDepth });
  }

  /**
   * Parse raw YAML to object
   */
  parseRaw(content: string): Record<string, unknown> {
    return parseYaml(content);
  }
}
