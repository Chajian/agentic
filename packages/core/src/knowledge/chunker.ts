/**
 * Text Chunker
 *
 * Handles intelligent text chunking for embedding generation.
 * Splits large documents into smaller chunks while preserving context.
 *
 * _Requirements: 3.5_
 */

/**
 * Chunk configuration options
 */
export interface ChunkerConfig {
  /** Maximum characters per chunk (default: 2000) */
  maxChunkSize?: number;
  /** Overlap between chunks in characters (default: 200) */
  chunkOverlap?: number;
  /** Minimum chunk size to avoid tiny fragments (default: 100) */
  minChunkSize?: number;
  /** Separators to use for splitting, in order of priority */
  separators?: string[];
}

const DEFAULT_CONFIG: Required<ChunkerConfig> = {
  maxChunkSize: 500, // Reduced to ~250 tokens to fit BGE embedding model limits
  chunkOverlap: 50, // Reduced proportionally
  minChunkSize: 30, // Reduced proportionally
  separators: [
    '\n\n\n', // Triple newline (major sections)
    '\n\n', // Double newline (paragraphs)
    '\n', // Single newline
    '。', // Chinese period
    '.', // English period
    '！', // Chinese exclamation
    '!', // English exclamation
    '？', // Chinese question mark
    '?', // English question mark
    '；', // Chinese semicolon
    ';', // English semicolon
    '，', // Chinese comma
    ',', // English comma
    ' ', // Space
    '', // Character by character (last resort)
  ],
};

/**
 * A chunk of text with metadata
 */
export interface TextChunk {
  /** The chunk content */
  content: string;
  /** Index of this chunk in the original document */
  index: number;
  /** Start position in original text */
  startPos: number;
  /** End position in original text */
  endPos: number;
}

/**
 * Text Chunker class for splitting documents
 */
export class TextChunker {
  private config: Required<ChunkerConfig>;

  constructor(config?: ChunkerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if text needs chunking
   */
  needsChunking(text: string): boolean {
    return text.length > this.config.maxChunkSize;
  }

  /**
   * Split text into chunks
   */
  chunk(text: string): TextChunk[] {
    // If text is small enough, return as single chunk
    if (!this.needsChunking(text)) {
      return [
        {
          content: text,
          index: 0,
          startPos: 0,
          endPos: text.length,
        },
      ];
    }

    return this.recursiveSplit(text, this.config.separators);
  }

  /**
   * Recursively split text using separators
   */
  private recursiveSplit(text: string, separators: string[]): TextChunk[] {
    const chunks: TextChunk[] = [];

    if (text.length <= this.config.maxChunkSize) {
      chunks.push({
        content: text,
        index: 0,
        startPos: 0,
        endPos: text.length,
      });
      return chunks;
    }

    // Find the best separator to use
    const separator = this.findBestSeparator(text, separators);

    if (separator === '') {
      // Last resort: split by character count
      return this.splitBySize(text);
    }

    // Split by separator
    const splits = text.split(separator);
    let currentChunk = '';
    let currentStartPos = 0;
    let position = 0;

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const splitWithSep = i < splits.length - 1 ? split + separator : split;

      // Check if adding this split would exceed max size
      if (currentChunk.length + splitWithSep.length > this.config.maxChunkSize) {
        // Save current chunk if it's not empty
        if (currentChunk.length >= this.config.minChunkSize) {
          chunks.push({
            content: currentChunk.trim(),
            index: chunks.length,
            startPos: currentStartPos,
            endPos: position,
          });

          // Start new chunk with overlap
          const overlapText = this.getOverlapText(currentChunk);
          currentChunk = overlapText + splitWithSep;
          currentStartPos = position - overlapText.length;
        } else {
          // Current chunk too small, try to merge
          currentChunk += splitWithSep;
        }
      } else {
        currentChunk += splitWithSep;
      }

      position += splitWithSep.length;
    }

    // Add remaining chunk
    if (currentChunk.trim().length >= this.config.minChunkSize) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunks.length,
        startPos: currentStartPos,
        endPos: text.length,
      });
    } else if (chunks.length > 0 && currentChunk.trim().length > 0) {
      // Merge small remaining chunk with previous
      const lastChunk = chunks[chunks.length - 1];
      lastChunk.content = lastChunk.content + ' ' + currentChunk.trim();
      lastChunk.endPos = text.length;
    }

    // Re-index chunks
    chunks.forEach((chunk, idx) => {
      chunk.index = idx;
    });

    return chunks;
  }

  /**
   * Find the best separator that creates reasonable splits
   */
  private findBestSeparator(text: string, separators: string[]): string {
    for (const sep of separators) {
      if (sep === '') continue;

      if (text.includes(sep)) {
        const splits = text.split(sep);
        // Check if this separator creates reasonable chunks
        const avgSize = text.length / splits.length;
        if (avgSize <= this.config.maxChunkSize * 1.5) {
          return sep;
        }
      }
    }

    // Return empty string to trigger character-based splitting
    return '';
  }

  /**
   * Split text by size when no good separator found
   */
  private splitBySize(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    let position = 0;

    while (position < text.length) {
      let endPos = Math.min(position + this.config.maxChunkSize, text.length);

      // Try to find a good break point (space or punctuation)
      if (endPos < text.length) {
        const searchStart = Math.max(position, endPos - 100);
        let breakPoint = -1;

        // Look for space or punctuation near the end
        for (let i = endPos; i >= searchStart; i--) {
          const char = text[i];
          if (' \n\t。.！!？?；;，,'.includes(char)) {
            breakPoint = i + 1;
            break;
          }
        }

        if (breakPoint > position) {
          endPos = breakPoint;
        }
      }

      const chunkContent = text.slice(position, endPos).trim();

      if (chunkContent.length >= this.config.minChunkSize) {
        chunks.push({
          content: chunkContent,
          index: chunks.length,
          startPos: position,
          endPos: endPos,
        });
      }

      // Move position with overlap
      position = endPos - this.config.chunkOverlap;
      if (position <= chunks[chunks.length - 1]?.startPos) {
        position = endPos; // Prevent infinite loop
      }
    }

    return chunks;
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(text: string): string {
    if (text.length <= this.config.chunkOverlap) {
      return text;
    }

    const overlapStart = text.length - this.config.chunkOverlap;

    // Try to start at a word boundary
    let adjustedStart = overlapStart;
    for (let i = overlapStart; i < Math.min(overlapStart + 50, text.length); i++) {
      if (' \n\t'.includes(text[i])) {
        adjustedStart = i + 1;
        break;
      }
    }

    return text.slice(adjustedStart);
  }

  /**
   * Get configuration
   */
  getConfig(): Required<ChunkerConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ChunkerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Create a default chunker instance
 */
export function createChunker(config?: ChunkerConfig): TextChunker {
  return new TextChunker(config);
}
