/**
 * Property-Based Tests for Knowledge Store
 * 
 * **Feature: ai-agent, Property 7: Knowledge Embedding Consistency**
 * **Validates: Requirements 3.1, 3.5**
 * 
 * Tests that document embeddings maintain consistent dimensions
 * and that the knowledge store correctly handles document operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { KnowledgeStore } from './store.js';
import { Embedder, cosineSimilarity } from './embedder.js';
import type { DocumentInput } from '../types/knowledge.js';
import type { LLMManager } from '../llm/manager.js';
import type { EmbeddingResult } from '../llm/adapter.js';

// Mock LLM Manager for testing
class MockLLMManager {
  private dimension: number;
  
  constructor(dimension: number = 1536) {
    this.dimension = dimension;
  }
  
  async embed(text: string): Promise<EmbeddingResult> {
    // Generate deterministic embedding based on text hash
    const embedding = this.generateDeterministicEmbedding(text);
    return {
      embedding,
      tokenCount: text.split(/\s+/).length,
    };
  }
  
  supportsEmbeddings(): boolean {
    return true;
  }
  
  private generateDeterministicEmbedding(text: string): number[] {
    // Simple hash-based embedding for testing
    const embedding: number[] = new Array(this.dimension).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = (charCode * (i + 1)) % this.dimension;
      embedding[index] += charCode / 1000;
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }
}

// Arbitraries for generating test data
const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 200 });
const arbCategory = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 20 });

const arbDocumentInput: fc.Arbitrary<DocumentInput> = fc.record({
  category: arbCategory,
  title: fc.option(arbNonEmptyString, { nil: undefined }),
  content: arbNonEmptyString,
  metadata: fc.option(
    fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.jsonValue()),
    { nil: undefined }
  ),
});

describe('Knowledge Store Property Tests', () => {
  let store: KnowledgeStore;
  let embedder: Embedder;
  const EMBEDDING_DIMENSION = 128; // Smaller dimension for faster tests
  
  beforeEach(() => {
    const mockLLM = new MockLLMManager(EMBEDDING_DIMENSION);
    embedder = new Embedder(mockLLM as unknown as LLMManager, {
      expectedDimension: EMBEDDING_DIMENSION,
    });
    store = new KnowledgeStore({
      embedder,
      generateEmbeddings: true,
    });
  });

  /**
   * **Feature: ai-agent, Property 7: Knowledge Embedding Consistency**
   * **Validates: Requirements 3.1, 3.5**
   * 
   * For any document added to the knowledge base, the embedding vector
   * dimension should match the configured embedding model dimension.
   */
  it('Property 7: All document embeddings have consistent dimension', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentInput, { minLength: 1, maxLength: 10 }),
        async (documents) => {
          // Clear store before each test
          store.clear();
          
          // Add all documents
          const ids: string[] = [];
          for (const doc of documents) {
            const id = await store.addDocument(doc);
            ids.push(id);
          }
          
          // Verify all embeddings have the expected dimension
          for (const id of ids) {
            const embedding = store.getEmbedding(id);
            
            // Embedding should exist
            expect(embedding).toBeDefined();
            expect(Array.isArray(embedding)).toBe(true);
            
            // Embedding dimension should match expected
            expect(embedding!.length).toBe(EMBEDDING_DIMENSION);
          }
          
          // Store's reported dimension should be consistent
          const reportedDimension = store.getEmbeddingDimension();
          expect(reportedDimension).toBe(EMBEDDING_DIMENSION);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Document round-trip consistency
   * Adding a document and retrieving it should return the same content.
   */
  it('Property: Document add/get round-trip preserves content', async () => {
    await fc.assert(
      fc.asyncProperty(arbDocumentInput, async (docInput) => {
        store.clear();
        
        const id = await store.addDocument(docInput);
        const retrieved = await store.getDocument(id);
        
        expect(retrieved).not.toBeNull();
        expect(retrieved!.category).toBe(docInput.category);
        expect(retrieved!.content).toBe(docInput.content);
        expect(retrieved!.title).toBe(docInput.title);
        
        // Metadata should match (or both be empty/undefined)
        if (docInput.metadata) {
          expect(retrieved!.metadata).toEqual(docInput.metadata);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Delete removes document
   * After deleting a document, it should not be retrievable.
   */
  it('Property: Delete removes document from store', async () => {
    await fc.assert(
      fc.asyncProperty(arbDocumentInput, async (docInput) => {
        store.clear();
        
        const id = await store.addDocument(docInput);
        
        // Document should exist
        const beforeDelete = await store.getDocument(id);
        expect(beforeDelete).not.toBeNull();
        
        // Delete should succeed
        const deleted = await store.deleteDocument(id);
        expect(deleted).toBe(true);
        
        // Document should no longer exist
        const afterDelete = await store.getDocument(id);
        expect(afterDelete).toBeNull();
        
        // Second delete should return false
        const deletedAgain = await store.deleteDocument(id);
        expect(deletedAgain).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Category listing is complete
   * All categories from added documents should appear in listCategories.
   */
  it('Property: listCategories returns all unique categories', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentInput, { minLength: 1, maxLength: 20 }),
        async (documents) => {
          store.clear();
          
          // Collect expected categories
          const expectedCategories = new Set<string>();
          for (const doc of documents) {
            await store.addDocument(doc);
            expectedCategories.add(doc.category);
          }
          
          // Get categories from store
          const categories = await store.listCategories();
          
          // All expected categories should be present
          for (const expected of expectedCategories) {
            expect(categories).toContain(expected);
          }
          
          // No extra categories should be present
          expect(categories.length).toBe(expectedCategories.size);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Document count is accurate
   * The document count should match the number of added documents.
   */
  it('Property: Document count matches added documents', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentInput, { minLength: 0, maxLength: 20 }),
        async (documents) => {
          store.clear();
          
          for (const doc of documents) {
            await store.addDocument(doc);
          }
          
          expect(store.getDocumentCount()).toBe(documents.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: getDocumentsByCategory returns correct documents
   */
  it('Property: getDocumentsByCategory filters correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentInput, { minLength: 1, maxLength: 20 }),
        arbCategory,
        async (documents, targetCategory) => {
          store.clear();
          
          // Add documents, some with target category
          const docsWithTargetCategory: DocumentInput[] = [];
          for (const doc of documents) {
            await store.addDocument(doc);
            if (doc.category === targetCategory) {
              docsWithTargetCategory.push(doc);
            }
          }
          
          // Get documents by category
          const results = await store.getDocumentsByCategory(targetCategory);
          
          // Count should match
          expect(results.length).toBe(docsWithTargetCategory.length);
          
          // All results should have the target category
          for (const result of results) {
            expect(result.category).toBe(targetCategory);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Cosine Similarity Property Tests', () => {
  /**
   * Property: Cosine similarity is symmetric
   */
  it('Property: cosineSimilarity(a, b) === cosineSimilarity(b, a)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 10, maxLength: 10 }),
        fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 10, maxLength: 10 }),
        (a, b) => {
          const sim1 = cosineSimilarity(a, b);
          const sim2 = cosineSimilarity(b, a);
          
          // Should be equal within floating point tolerance
          expect(Math.abs(sim1 - sim2)).toBeLessThan(1e-10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cosine similarity of identical vectors is 1
   */
  it('Property: cosineSimilarity(a, a) === 1 for non-zero vectors', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 10, maxLength: 10 })
          .filter(arr => arr.some(v => v !== 0)), // Filter out zero vectors
        (a) => {
          const sim = cosineSimilarity(a, a);
          
          // Should be 1 within floating point tolerance
          expect(Math.abs(sim - 1)).toBeLessThan(1e-10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cosine similarity is bounded [-1, 1]
   */
  it('Property: cosineSimilarity result is in [-1, 1]', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 10, maxLength: 10 }),
        fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 10, maxLength: 10 }),
        (a, b) => {
          const sim = cosineSimilarity(a, b);
          
          expect(sim).toBeGreaterThanOrEqual(-1);
          expect(sim).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Dimension mismatch throws error
   */
  it('Property: cosineSimilarity throws on dimension mismatch', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 5, maxLength: 10 }),
        fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 11, maxLength: 20 }),
        (a, b) => {
          expect(() => cosineSimilarity(a, b)).toThrow('Vector dimension mismatch');
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Embedder Cache Property Tests', () => {
  /**
   * Property: Same text produces same embedding (deterministic)
   */
  it('Property: Embedding is deterministic for same text', async () => {
    const mockLLM = new MockLLMManager(128);
    const embedder = new Embedder(mockLLM as unknown as LLMManager, {
      expectedDimension: 128,
      maxCacheSize: 100,
    });
    
    await fc.assert(
      fc.asyncProperty(arbNonEmptyString, async (text) => {
        // Clear cache to ensure fresh embedding
        embedder.clearCache();
        
        const result1 = await embedder.embed(text);
        const result2 = await embedder.embed(text);
        
        // Embeddings should be identical
        expect(result1.embedding).toEqual(result2.embedding);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Cache hit returns same result
   */
  it('Property: Cached embedding matches original', async () => {
    const mockLLM = new MockLLMManager(128);
    const embedder = new Embedder(mockLLM as unknown as LLMManager, {
      expectedDimension: 128,
      maxCacheSize: 100,
    });
    
    await fc.assert(
      fc.asyncProperty(arbNonEmptyString, async (text) => {
        embedder.clearCache();
        
        // First call - cache miss
        const result1 = await embedder.embed(text);
        
        // Second call - should be cache hit
        const result2 = await embedder.embed(text);
        
        // Results should be identical
        expect(result1.embedding.length).toBe(result2.embedding.length);
        for (let i = 0; i < result1.embedding.length; i++) {
          expect(result1.embedding[i]).toBe(result2.embedding[i]);
        }
      }),
      { numRuns: 50 }
    );
  });
});
