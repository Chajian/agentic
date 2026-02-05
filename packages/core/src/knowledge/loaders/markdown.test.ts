/**
 * Markdown Loader Tests
 *
 * Tests for the Markdown document loader functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  parseMarkdown,
  loadMarkdownDocument,
  loadMarkdownSections,
  MarkdownLoader,
} from './markdown.js';

describe('parseMarkdown', () => {
  it('should extract title from H1 heading', () => {
    const content = `# My Document

This is the content.`;

    const result = parseMarkdown(content);

    expect(result.title).toBe('My Document');
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].level).toBe(1);
  });

  it('should extract multiple sections', () => {
    const content = `# Main Title

Introduction text.

## Section 1

Content for section 1.

## Section 2

Content for section 2.

### Subsection 2.1

Subsection content.`;

    const result = parseMarkdown(content);

    expect(result.title).toBe('Main Title');
    expect(result.sections).toHaveLength(4);
    expect(result.sections[0].title).toBe('Main Title');
    expect(result.sections[1].title).toBe('Section 1');
    expect(result.sections[2].title).toBe('Section 2');
    expect(result.sections[3].title).toBe('Subsection 2.1');
  });

  it('should parse frontmatter', () => {
    const content = `---
title: Custom Title
author: Test Author
version: 1.0
draft: true
---

# Document Title

Content here.`;

    const result = parseMarkdown(content);

    expect(result.frontmatter).toBeDefined();
    expect(result.frontmatter?.title).toBe('Custom Title');
    expect(result.frontmatter?.author).toBe('Test Author');
    expect(result.frontmatter?.version).toBe(1.0);
    expect(result.frontmatter?.draft).toBe(true);
    expect(result.title).toBe('Document Title');
  });

  it('should handle content without headings', () => {
    const content = `This is just plain text content.

With multiple paragraphs.`;

    const result = parseMarkdown(content);

    expect(result.title).toBe('Untitled Document');
    expect(result.sections).toHaveLength(0);
    expect(result.content).toContain('plain text content');
  });

  it('should preserve section content', () => {
    const content = `## Section Title

This is the section content.
It has multiple lines.

And paragraphs.`;

    const result = parseMarkdown(content);

    expect(result.sections[0].content).toContain('section content');
    expect(result.sections[0].content).toContain('multiple lines');
    expect(result.sections[0].content).toContain('paragraphs');
  });
});

describe('loadMarkdownDocument', () => {
  it('should create DocumentInput with correct structure', () => {
    const content = `# Test Document

This is test content.`;

    const doc = loadMarkdownDocument(content, { category: 'test' });

    expect(doc.category).toBe('test');
    expect(doc.title).toBe('Test Document');
    expect(doc.content).toContain('test content');
    expect(doc.metadata?.sourceType).toBe('markdown');
  });

  it('should use custom title when provided', () => {
    const content = `# Original Title

Content.`;

    const doc = loadMarkdownDocument(content, {
      category: 'test',
      title: 'Custom Title',
    });

    expect(doc.title).toBe('Custom Title');
  });

  it('should merge metadata', () => {
    const content = `---
author: Doc Author
---

# Title

Content.`;

    const doc = loadMarkdownDocument(content, {
      category: 'test',
      metadata: { customField: 'value' },
    });

    expect(doc.metadata?.author).toBe('Doc Author');
    expect(doc.metadata?.customField).toBe('value');
    expect(doc.metadata?.sourceType).toBe('markdown');
  });
});

describe('loadMarkdownSections', () => {
  it('should split document by sections', () => {
    const content = `# Main Title

## Section 1

Content 1.

## Section 2

Content 2.`;

    const docs = loadMarkdownSections(content, { category: 'test' });

    expect(docs).toHaveLength(2);
    expect(docs[0].title).toContain('Section 1');
    expect(docs[1].title).toContain('Section 2');
  });

  it('should respect minSplitLevel and maxSplitLevel', () => {
    const content = `# Title

## Level 2

Content.

### Level 3

More content.

#### Level 4

Deep content.`;

    const docs = loadMarkdownSections(content, {
      category: 'test',
      minSplitLevel: 2,
      maxSplitLevel: 2,
    });

    expect(docs).toHaveLength(1);
    expect(docs[0].title).toContain('Level 2');
  });

  it('should return whole document if no matching sections', () => {
    const content = `# Only H1

Content without H2 or H3.`;

    const docs = loadMarkdownSections(content, { category: 'test' });

    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe('Only H1');
  });
});

describe('MarkdownLoader class', () => {
  it('should use default category', () => {
    const loader = new MarkdownLoader({ defaultCategory: 'docs' });
    const doc = loader.load('# Test\n\nContent.');

    expect(doc.category).toBe('docs');
  });

  it('should include default metadata', () => {
    const loader = new MarkdownLoader({
      defaultCategory: 'docs',
      defaultMetadata: { source: 'test' },
    });
    const doc = loader.load('# Test\n\nContent.');

    expect(doc.metadata?.source).toBe('test');
  });

  it('should parse without creating DocumentInput', () => {
    const loader = new MarkdownLoader();
    const result = loader.parse('# Title\n\n## Section\n\nContent.');

    expect(result.title).toBe('Title');
    expect(result.sections).toHaveLength(2);
  });
});
