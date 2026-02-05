/**
 * Text Chunker Tests
 */

import { describe, it, expect } from 'vitest';
import { TextChunker, createChunker } from './chunker.js';

describe('TextChunker', () => {
  describe('needsChunking', () => {
    it('should return false for short text', () => {
      const chunker = new TextChunker({ maxChunkSize: 1000 });
      expect(chunker.needsChunking('Short text')).toBe(false);
    });

    it('should return true for long text', () => {
      const chunker = new TextChunker({ maxChunkSize: 100 });
      const longText = 'a'.repeat(200);
      expect(chunker.needsChunking(longText)).toBe(true);
    });
  });

  describe('chunk', () => {
    it('should return single chunk for short text', () => {
      const chunker = new TextChunker({ maxChunkSize: 1000 });
      const chunks = chunker.chunk('Short text');

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe('Short text');
      expect(chunks[0].index).toBe(0);
    });

    it('should split long text into multiple chunks', () => {
      const chunker = new TextChunker({
        maxChunkSize: 100,
        chunkOverlap: 20,
        minChunkSize: 10,
      });

      // Create text with clear paragraph breaks
      const paragraphs = [
        'First paragraph with some content here.',
        'Second paragraph with different content.',
        'Third paragraph with more information.',
        'Fourth paragraph to make it longer.',
      ];
      const longText = paragraphs.join('\n\n');

      const chunks = chunker.chunk(longText);

      expect(chunks.length).toBeGreaterThan(1);
      // All chunks should have content
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeGreaterThan(0);
      });
    });

    it('should preserve content when chunking', () => {
      const chunker = new TextChunker({
        maxChunkSize: 50,
        chunkOverlap: 10,
        minChunkSize: 5,
      });

      const text = 'Hello world. This is a test. Another sentence here.';
      const chunks = chunker.chunk(text);

      // Combined chunks should contain all original words
      const combinedContent = chunks.map((c) => c.content).join(' ');
      expect(combinedContent).toContain('Hello');
      expect(combinedContent).toContain('test');
      expect(combinedContent).toContain('sentence');
    });

    it('should handle Chinese text', () => {
      const chunker = new TextChunker({
        maxChunkSize: 50,
        chunkOverlap: 10,
        minChunkSize: 5,
      });

      const text = '这是第一段内容。这是第二段内容。这是第三段内容。这是第四段内容。';
      const chunks = chunker.chunk(text);

      expect(chunks.length).toBeGreaterThan(0);
      // Should split on Chinese punctuation
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeGreaterThan(0);
      });
    });

    it('should maintain chunk indices', () => {
      const chunker = new TextChunker({
        maxChunkSize: 100,
        chunkOverlap: 20,
        minChunkSize: 10,
      });

      const longText = Array(10).fill('This is a sentence.').join(' ');
      const chunks = chunker.chunk(longText);

      // Indices should be sequential
      chunks.forEach((chunk, idx) => {
        expect(chunk.index).toBe(idx);
      });
    });
  });

  describe('createChunker', () => {
    it('should create chunker with default config', () => {
      const chunker = createChunker();
      const config = chunker.getConfig();

      expect(config.maxChunkSize).toBe(500);
      expect(config.chunkOverlap).toBe(50);
    });

    it('should create chunker with custom config', () => {
      const chunker = createChunker({ maxChunkSize: 300 });
      const config = chunker.getConfig();

      expect(config.maxChunkSize).toBe(300);
    });
  });
});
