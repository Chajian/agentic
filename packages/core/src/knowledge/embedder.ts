/**
 * Embedder Class
 * 
 * Handles text embedding generation using LLM adapters.
 * Includes caching for frequently used text embeddings.
 * 
 * _Requirements: 3.5_
 */

import type { LLMManager } from '../llm/manager.js';
import type { EmbeddingResult } from '../llm/adapter.js';

/**
 * Cache entry for embeddings
 */
interface CacheEntry {
  embedding: number[];
  tokenCount?: number;
  timestamp: number;
  accessCount: number;
}

/**
 * Embedder configuration
 */
export interface EmbedderConfig {
  /** Maximum number of entries in the cache */
  maxCacheSize?: number;
  /** Cache TTL in milliseconds (default: 1 hour) */
  cacheTTLMs?: number;
  /** Expected embedding dimension (for validation) */
  expectedDimension?: number;
}

const DEFAULT_CONFIG: Required<EmbedderConfig> = {
  maxCacheSize: 1000,
  cacheTTLMs: 60 * 60 * 1000, // 1 hour
  expectedDimension: 1536, // OpenAI text-embedding-ada-002 dimension
};

/**
 * Embedder class for generating and caching text embeddings
 */
export class Embedder {
  private llmManager: LLMManager;
  private config: Required<EmbedderConfig>;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(llmManager: LLMManager, config?: EmbedderConfig) {
    this.llmManager = llmManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate embedding for text
   * Uses cache if available and not expired
   */
  async embed(text: string): Promise<EmbeddingResult> {
    // Normalize text for cache key
    const cacheKey = this.normalizeText(text);
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        embedding: cached.embedding,
        tokenCount: cached.tokenCount,
      };
    }

    // Generate new embedding
    const result = await this.llmManager.embed(text);
    
    // Validate dimension if configured
    if (this.config.expectedDimension > 0 && 
        result.embedding.length !== this.config.expectedDimension) {
      console.warn(
        `Embedding dimension mismatch: expected ${this.config.expectedDimension}, ` +
        `got ${result.embedding.length}`
      );
    }

    // Store in cache
    this.addToCache(cacheKey, result);

    return result;
  }

  /**
   * Generate embeddings for multiple texts
   * Batches requests for efficiency
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    for (const text of texts) {
      const result = await this.embed(text);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Check if embeddings are supported
   */
  supportsEmbeddings(): boolean {
    return this.llmManager.supportsEmbeddings();
  }

  /**
   * Get the expected embedding dimension
   */
  getExpectedDimension(): number {
    return this.config.expectedDimension;
  }

  /**
   * Set the expected embedding dimension
   */
  setExpectedDimension(dimension: number): void {
    this.config.expectedDimension = dimension;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    let totalAccess = 0;
    let cacheHits = 0;
    
    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount;
      cacheHits += entry.accessCount - 1; // First access is a miss
    }
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hitRate: totalAccess > 0 ? cacheHits / totalAccess : 0,
    };
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Preload embeddings for a list of texts
   */
  async preload(texts: string[]): Promise<void> {
    await this.embedBatch(texts);
  }

  /**
   * Normalize text for cache key generation
   */
  private normalizeText(text: string): string {
    return text.trim().toLowerCase();
  }

  /**
   * Get entry from cache if valid
   */
  private getFromCache(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.config.cacheTTLMs) {
      this.cache.delete(key);
      return null;
    }
    
    // Update access count
    entry.accessCount++;
    
    return entry;
  }

  /**
   * Add entry to cache with LRU eviction
   */
  private addToCache(key: string, result: EmbeddingResult): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      embedding: result.embedding,
      tokenCount: result.tokenCount,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    // Find entry with oldest timestamp and lowest access count
    let oldestKey: string | null = null;
    let oldestScore = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      // Score based on recency and access frequency
      const age = Date.now() - entry.timestamp;
      const score = entry.accessCount / (age + 1);
      
      if (score < oldestScore) {
        oldestScore = score;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (magnitude === 0) {
    return 0;
  }
  
  return dotProduct / magnitude;
}

/**
 * Calculate euclidean distance between two embedding vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}
