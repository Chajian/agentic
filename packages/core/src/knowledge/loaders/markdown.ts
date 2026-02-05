/**
 * Markdown Document Loader
 *
 * Parses Markdown files and extracts structured content for the knowledge base.
 * Supports extracting titles, sections, and metadata from Markdown documents.
 *
 * _Requirements: 3.1_
 */

import type { DocumentInput } from '../../types/knowledge.js';

/**
 * Parsed section from a Markdown document
 */
export interface MarkdownSection {
  /** Section heading level (1-6) */
  level: number;
  /** Section title */
  title: string;
  /** Section content (without subsections) */
  content: string;
  /** Line number where section starts */
  startLine: number;
}

/**
 * Result of parsing a Markdown document
 */
export interface MarkdownParseResult {
  /** Document title (from first H1 or filename) */
  title: string;
  /** Full document content */
  content: string;
  /** Extracted sections */
  sections: MarkdownSection[];
  /** Frontmatter metadata (if present) */
  frontmatter?: Record<string, unknown>;
}

/**
 * Options for loading Markdown documents
 */
export interface MarkdownLoaderOptions {
  /** Category for the document */
  category: string;
  /** Whether to split into sections (default: false) */
  splitSections?: boolean;
  /** Minimum section level to split on (default: 2) */
  minSplitLevel?: number;
  /** Maximum section level to split on (default: 3) */
  maxSplitLevel?: number;
  /** Custom title (overrides extracted title) */
  title?: string;
  /** Additional metadata to include */
  metadata?: Record<string, unknown>;
}

/**
 * Parse YAML frontmatter from Markdown content
 */
function parseFrontmatter(content: string): {
  frontmatter?: Record<string, unknown>;
  content: string;
} {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { content };
  }

  const frontmatterStr = match[1];
  const remainingContent = content.slice(match[0].length);

  // Simple YAML parsing (key: value pairs)
  const frontmatter: Record<string, unknown> = {};
  const lines = frontmatterStr.split(/\r?\n/);

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value: unknown = line.slice(colonIndex + 1).trim();

      // Try to parse as number or boolean
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(Number(value)) && value !== '') value = Number(value);
      // Remove quotes if present
      else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      frontmatter[key] = value;
    }
  }

  return { frontmatter, content: remainingContent };
}

/**
 * Extract sections from Markdown content
 */
function extractSections(content: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const lines = content.split(/\r?\n/);
  const headingRegex = /^(#{1,6})\s+(.+)$/;

  let currentSection: MarkdownSection | null = null;
  let contentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(headingRegex);

    if (match) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        level: match[1].length,
        title: match[2].trim(),
        content: '',
        startLine: i + 1,
      };
      contentLines = [];
    } else if (currentSection) {
      contentLines.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract the document title from Markdown content
 */
function extractTitle(content: string, sections: MarkdownSection[]): string {
  // Look for first H1 heading
  const h1Section = sections.find((s) => s.level === 1);
  if (h1Section) {
    return h1Section.title;
  }

  // Look for first heading of any level
  if (sections.length > 0) {
    return sections[0].title;
  }

  // Use first line if it looks like a title
  const firstLine = content.split(/\r?\n/)[0]?.trim();
  if (firstLine && firstLine.length < 100 && !firstLine.includes('.')) {
    return firstLine;
  }

  return 'Untitled Document';
}

/**
 * Parse a Markdown document
 */
export function parseMarkdown(content: string): MarkdownParseResult {
  // Extract frontmatter
  const { frontmatter, content: mainContent } = parseFrontmatter(content);

  // Extract sections
  const sections = extractSections(mainContent);

  // Extract title
  const title = extractTitle(mainContent, sections);

  return {
    title,
    content: mainContent.trim(),
    sections,
    frontmatter,
  };
}

/**
 * Load a Markdown document as a single DocumentInput
 */
export function loadMarkdownDocument(
  content: string,
  options: MarkdownLoaderOptions
): DocumentInput {
  const parsed = parseMarkdown(content);

  return {
    category: options.category,
    title: options.title ?? parsed.title,
    content: parsed.content,
    metadata: {
      ...parsed.frontmatter,
      ...options.metadata,
      sourceType: 'markdown',
      sectionCount: parsed.sections.length,
    },
  };
}

/**
 * Load a Markdown document and split into multiple DocumentInputs by section
 */
export function loadMarkdownSections(
  content: string,
  options: MarkdownLoaderOptions
): DocumentInput[] {
  const parsed = parseMarkdown(content);
  const minLevel = options.minSplitLevel ?? 2;
  const maxLevel = options.maxSplitLevel ?? 3;

  // Filter sections by level
  const sectionsToSplit = parsed.sections.filter(
    (s) => s.level >= minLevel && s.level <= maxLevel && s.content.trim().length > 0
  );

  // If no sections match criteria, return whole document
  if (sectionsToSplit.length === 0) {
    return [loadMarkdownDocument(content, options)];
  }

  // Create a document for each section
  return sectionsToSplit.map((section, index) => ({
    category: options.category,
    title: `${options.title ?? parsed.title} - ${section.title}`,
    content: section.content,
    metadata: {
      ...parsed.frontmatter,
      ...options.metadata,
      sourceType: 'markdown',
      sectionTitle: section.title,
      sectionLevel: section.level,
      sectionIndex: index,
      parentTitle: parsed.title,
    },
  }));
}

/**
 * Markdown Loader class for loading documents into the knowledge base
 */
export class MarkdownLoader {
  private defaultCategory: string;
  private defaultMetadata: Record<string, unknown>;

  constructor(options?: { defaultCategory?: string; defaultMetadata?: Record<string, unknown> }) {
    this.defaultCategory = options?.defaultCategory ?? 'general';
    this.defaultMetadata = options?.defaultMetadata ?? {};
  }

  /**
   * Load a Markdown string as a document
   */
  load(content: string, options?: Partial<MarkdownLoaderOptions>): DocumentInput {
    return loadMarkdownDocument(content, {
      category: options?.category ?? this.defaultCategory,
      title: options?.title,
      metadata: { ...this.defaultMetadata, ...options?.metadata },
    });
  }

  /**
   * Load a Markdown string and split into sections
   */
  loadSections(content: string, options?: Partial<MarkdownLoaderOptions>): DocumentInput[] {
    return loadMarkdownSections(content, {
      category: options?.category ?? this.defaultCategory,
      splitSections: true,
      minSplitLevel: options?.minSplitLevel,
      maxSplitLevel: options?.maxSplitLevel,
      title: options?.title,
      metadata: { ...this.defaultMetadata, ...options?.metadata },
    });
  }

  /**
   * Parse Markdown content without creating DocumentInput
   */
  parse(content: string): MarkdownParseResult {
    return parseMarkdown(content);
  }
}
