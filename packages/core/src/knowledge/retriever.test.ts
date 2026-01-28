/**
 * Property-Based Tests for Knowledge Retriever
 * 
 * **Feature: ai-agent, Property 2: Knowledge Search Result Ordering**
 * **Validates: Requirements 3.2**
 * 
 * Tests that search results are properly ordered by relevance score
 * in descending order across all search methods.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { KnowledgeStore } from './store.js';
import { Embedder } from './embedder.js';
import { Retriever } from './retriever.js';
import type { DocumentInput } from '../types/knowledge.js';
import type { LLMManager } from '../llm/manager.js';
import type { EmbeddingResult } from '../llm/adapter.js';

// Mock LLM Manager for testing
class MockLLMManager {
  private dimension: number;
  
  constructor(dimension: number = 128) {
    this.dimension = dimension;
  }
  
  async embed(text: string): Promise<EmbeddingResult> {
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
    const embedding: number[] = new Array(this.dimension).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = (charCode * (i + 1)) % this.dimension;
      embedding[index] += charCode / 1000;
    }
    
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
const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 100 });
const arbCategory = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), 
  { minLength: 1, maxLength: 15 }
);

const arbDocumentInput: fc.Arbitrary<DocumentInput> = fc.record({
  category: arbCategory,
  title: fc.option(arbNonEmptyString, { nil: undefined }),
  content: arbNonEmptyString,
  metadata: fc.constant(undefined),
});

// Generate documents with some shared terms for better search testing
const arbDocumentWithTerms = (terms: string[]): fc.Arbitrary<DocumentInput> => {
  return fc.record({
    category: arbCategory,
    title: fc.option(
      fc.oneof(
        arbNonEmptyString,
        fc.constantFrom(...terms).map(t => `Document about ${t}`)
      ),
      { nil: undefined }
    ),
    content: fc.tuple(
      arbNonEmptyString,
      fc.subarray(terms, { minLength: 0 })
    ).map(([base, selectedTerms]) => 
      `${base} ${selectedTerms.join(' ')} additional content`
    ),
    metadata: fc.constant(undefined),
  });
};

describe('Retriever Property Tests', () => {
  let store: KnowledgeStore;
  let embedder: Embedder;
  let retriever: Retriever;
  const EMBEDDING_DIMENSION = 64;
  
  beforeEach(() => {
    const mockLLM = new MockLLMManager(EMBEDDING_DIMENSION);
    embedder = new Embedder(mockLLM as unknown as LLMManager, {
      expectedDimension: EMBEDDING_DIMENSION,
    });
    store = new KnowledgeStore({
      embedder,
      generateEmbeddings: true,
    });
    retriever = new Retriever(store, embedder);
  });

  /**
   * **Feature: ai-agent, Property 2: Knowledge Search Result Ordering**
   * **Validates: Requirements 3.2**
   * 
   * For any search query and result set, results should be ordered 
   * by relevance score in descending order.
   */
  it('Property 2: Search results are ordered by score descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentInput, { minLength: 3, maxLength: 15 }),
        arbNonEmptyString,
        async (documents, query) => {
          store.clear();
          
          // Add documents
          for (const doc of documents) {
            await store.addDocument(doc);
          }
          
          // Test all search methods
          const methods = ['keyword', 'semantic', 'hybrid'] as const;
          
          for (const method of methods) {
            const results = await retriever.search(query, { 
              method, 
              minScore: 0,
              topK: 100,
            });
            
            // Verify ordering: each result's score should be >= next result's score
            for (let i = 0; i < results.length - 1; i++) {
              expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Keyword search results contain query terms
   */
  it('Property: Keyword search results contain at least one query term', async () => {
    const searchTerms = ['alpha', 'beta', 'gamma', 'delta'];
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentWithTerms(searchTerms), { minLength: 5, maxLength: 15 }),
        fc.subarray(searchTerms, { minLength: 1, maxLength: 2 }),
        async (documents, queryTerms) => {
          store.clear();
          
          for (const doc of documents) {
            await store.addDocument(doc);
          }
          
          const query = queryTerms.join(' ');
          const results = await retriever.keywordSearch(query);
          
          // Each result should contain at least one query term
          for (const result of results) {
            const content = `${result.document.title ?? ''} ${result.document.content}`.toLowerCase();
            const hasMatch = queryTerms.some(term => content.includes(term.toLowerCase()));
            expect(hasMatch).toBe(true);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Category filter returns only matching documents
   */
  it('Property: Category filter returns only documents from that category', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentInput, { minLength: 5, maxLength: 20 }),
        arbNonEmptyString,
        async (documents, query) => {
          store.clear();
          
          // Add documents
          for (const doc of documents) {
            await store.addDocument(doc);
          }
          
          // Get unique categories
          const categories = [...new Set(documents.map(d => d.category))];
          
          if (categories.length === 0) return;
          
          // Pick a random category to filter by
          const targetCategory = categories[0];
          
          const results = await retriever.search(query, { 
            category: targetCategory,
            minScore: 0,
          });
          
          // All results should be from the target category
          for (const result of results) {
            expect(result.document.category).toBe(targetCategory);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: TopK limits result count
   */
  it('Property: TopK parameter limits result count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentInput, { minLength: 10, maxLength: 20 }),
        arbNonEmptyString,
        fc.integer({ min: 1, max: 5 }),
        async (documents, query, topK) => {
          store.clear();
          
          for (const doc of documents) {
            await store.addDocument(doc);
          }
          
          const results = await retriever.search(query, { 
            topK,
            minScore: 0,
          });
          
          // Result count should not exceed topK
          expect(results.length).toBeLessThanOrEqual(topK);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: MinScore filters low-scoring results
   */
  it('Property: MinScore filters results below threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentInput, { minLength: 5, maxLength: 15 }),
        arbNonEmptyString,
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
        async (documents, query, minScore) => {
          store.clear();
          
          for (const doc of documents) {
            await store.addDocument(doc);
          }
          
          const results = await retriever.search(query, { minScore });
          
          // All results should have score >= minScore
          for (const result of results) {
            expect(result.score).toBeGreaterThanOrEqual(minScore);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Hybrid search combines keyword and semantic results
   */
  it('Property: Hybrid search includes results from both methods', async () => {
    const searchTerms = ['unique', 'special', 'important'];
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentWithTerms(searchTerms), { minLength: 5, maxLength: 15 }),
        fc.constantFrom(...searchTerms),
        async (documents, queryTerm) => {
          store.clear();
          
          for (const doc of documents) {
            await store.addDocument(doc);
          }
          
          const keywordResults = await retriever.keywordSearch(queryTerm);
          const semanticResults = await retriever.semanticSearch(queryTerm);
          const hybridResults = await retriever.hybridSearch(queryTerm);
          
          // Hybrid should not have more unique documents than keyword + semantic combined
          const keywordIds = new Set(keywordResults.map(r => r.document.id));
          const semanticIds = new Set(semanticResults.map(r => r.document.id));
          const hybridIds = new Set(hybridResults.map(r => r.document.id));
          
          // Every hybrid result should come from either keyword or semantic
          for (const id of hybridIds) {
            expect(keywordIds.has(id) || semanticIds.has(id)).toBe(true);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Confidence levels are consistent with scores
   */
  it('Property: Confidence levels match score thresholds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentInput, { minLength: 5, maxLength: 15 }),
        arbNonEmptyString,
        async (documents, query) => {
          store.clear();
          
          for (const doc of documents) {
            await store.addDocument(doc);
          }
          
          const results = await retriever.search(query, { minScore: 0 });
          
          for (const result of results) {
            if (result.score >= 0.7) {
              expect(result.confidence).toBe('high');
            } else if (result.score >= 0.4) {
              expect(result.confidence).toBe('medium');
            } else {
              expect(result.confidence).toBe('low');
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});

describe('Knowledge Assessment Property Tests', () => {
  let store: KnowledgeStore;
  let embedder: Embedder;
  let retriever: Retriever;
  
  beforeEach(() => {
    const mockLLM = new MockLLMManager(64);
    embedder = new Embedder(mockLLM as unknown as LLMManager, {
      expectedDimension: 64,
    });
    store = new KnowledgeStore({
      embedder,
      generateEmbeddings: true,
    });
    retriever = new Retriever(store, embedder);
  });

  /**
   * Property: Empty results always return insufficient status
   */
  it('Property: Empty results return insufficient status', () => {
    fc.assert(
      fc.property(
        fc.record({
          action: arbNonEmptyString,
          entities: fc.array(arbNonEmptyString, { minLength: 0, maxLength: 3 }),
          requiredTopics: fc.option(
            fc.array(arbNonEmptyString, { minLength: 1, maxLength: 3 }),
            { nil: undefined }
          ),
        }),
        (intent) => {
          const assessment = retriever.assessKnowledge([], intent);
          
          expect(assessment.status).toBe('insufficient');
          expect(assessment.confidence).toBe(0);
          expect(assessment.missingTopic).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Assessment confidence is bounded [0, 1]
   */
  it('Property: Assessment confidence is in valid range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentInput, { minLength: 1, maxLength: 10 }),
        fc.record({
          action: arbNonEmptyString,
          entities: fc.array(arbNonEmptyString, { minLength: 0, maxLength: 3 }),
          requiredTopics: fc.option(
            fc.array(arbNonEmptyString, { minLength: 0, maxLength: 3 }),
            { nil: undefined }
          ),
        }),
        arbNonEmptyString,
        async (documents, intent, query) => {
          store.clear();
          
          for (const doc of documents) {
            await store.addDocument(doc);
          }
          
          const results = await retriever.search(query, { minScore: 0 });
          const assessment = retriever.assessKnowledge(results, intent);
          
          expect(assessment.confidence).toBeGreaterThanOrEqual(0);
          expect(assessment.confidence).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Assessment status is one of the valid values
   */
  it('Property: Assessment status is valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocumentInput, { minLength: 0, maxLength: 10 }),
        fc.record({
          action: arbNonEmptyString,
          entities: fc.array(arbNonEmptyString, { minLength: 0, maxLength: 3 }),
          requiredTopics: fc.option(
            fc.array(arbNonEmptyString, { minLength: 0, maxLength: 3 }),
            { nil: undefined }
          ),
        }),
        arbNonEmptyString,
        async (documents, intent, query) => {
          store.clear();
          
          for (const doc of documents) {
            await store.addDocument(doc);
          }
          
          const results = await retriever.search(query, { minScore: 0 });
          const assessment = retriever.assessKnowledge(results, intent);
          
          expect(['sufficient', 'insufficient', 'ambiguous']).toContain(assessment.status);
        }
      ),
      { numRuns: 30 }
    );
  });
});
