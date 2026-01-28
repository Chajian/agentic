/**
 * Knowledge Retriever
 * 
 * Provides advanced retrieval capabilities including keyword search,
 * semantic search, and hybrid search with knowledge sufficiency assessment.
 * 
 * _Requirements: 3.2, 3.3, 3.4, 5.1, 5.2_
 */

import type { 
  Document, 
  SearchOptions, 
  SearchResult,
  KnowledgeAssessment,
} from '../types/knowledge.js';
import type { KnowledgeStore } from './store.js';
import type { Embedder } from './embedder.js';
import { cosineSimilarity } from './embedder.js';

/**
 * Retriever configuration
 */
export interface RetrieverConfig {
  /** Default number of results to return */
  defaultTopK?: number;
  /** Default minimum score threshold */
  defaultMinScore?: number;
  /** Weight for keyword search in hybrid mode (0-1) */
  keywordWeight?: number;
  /** Weight for semantic search in hybrid mode (0-1) */
  semanticWeight?: number;
  /** Minimum confidence threshold for sufficient knowledge */
  sufficientThreshold?: number;
  /** Minimum confidence threshold for ambiguous knowledge */
  ambiguousThreshold?: number;
}

const DEFAULT_CONFIG: Required<RetrieverConfig> = {
  defaultTopK: 10,
  defaultMinScore: 0.3,
  keywordWeight: 0.3,
  semanticWeight: 0.7,
  sufficientThreshold: 0.7,
  ambiguousThreshold: 0.4,
};

/**
 * Intent information for knowledge assessment
 */
export interface Intent {
  /** The main action or query type */
  action: string;
  /** Key entities mentioned */
  entities: string[];
  /** Required knowledge topics */
  requiredTopics?: string[];
}

/**
 * Keyword search result (internal)
 */
interface KeywordMatch {
  document: Document;
  score: number;
  matchedTerms: string[];
}

/**
 * Semantic search result (internal)
 */
interface SemanticMatch {
  document: Document;
  score: number;
  embedding: number[];
}

/**
 * Knowledge Retriever class
 * 
 * Provides keyword, semantic, and hybrid search capabilities
 * with knowledge sufficiency assessment.
 */
export class Retriever {
  private store: KnowledgeStore;
  private embedder?: Embedder;
  private config: Required<RetrieverConfig>;

  constructor(
    store: KnowledgeStore, 
    embedder?: Embedder,
    config?: RetrieverConfig
  ) {
    this.store = store;
    this.embedder = embedder;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Search the knowledge base
   * 
   * @param query - Search query string
   * @param options - Search options
   * @returns Array of search results sorted by relevance
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const method = options?.method ?? 'hybrid';
    const topK = options?.topK ?? this.config.defaultTopK;
    const minScore = options?.minScore ?? this.config.defaultMinScore;
    const category = options?.category;

    let results: SearchResult[];

    switch (method) {
      case 'keyword':
        results = await this.keywordSearch(query, category);
        break;
      case 'semantic':
        results = await this.semanticSearch(query, category);
        break;
      case 'hybrid':
      default:
        results = await this.hybridSearch(query, category);
        break;
    }

    // Filter by minimum score and limit results
    // Results are already sorted by score descending
    return results
      .filter(r => r.score >= minScore)
      .slice(0, topK);
  }

  /**
   * Keyword-based search using text matching
   * 
   * Implements simple keyword matching with term frequency scoring.
   * Supports category filtering.
   * 
   * _Requirements: 3.4_
   * 
   * @param query - Search query
   * @param category - Optional category filter
   * @returns Search results sorted by score descending
   */
  async keywordSearch(query: string, category?: string): Promise<SearchResult[]> {
    const documents = await this.store.getAllDocuments();
    const matches = this.performKeywordMatch(query, documents, category);
    
    // Convert to SearchResult and sort by score descending
    return matches
      .map(match => ({
        document: match.document,
        score: match.score,
        confidence: this.scoreToConfidence(match.score),
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Perform keyword matching on documents
   */
  private performKeywordMatch(
    query: string, 
    documents: Document[], 
    category?: string
  ): KeywordMatch[] {
    const queryLower = query.toLowerCase();
    const queryTerms = this.tokenize(queryLower);
    
    if (queryTerms.length === 0) {
      return [];
    }

    const matches: KeywordMatch[] = [];

    for (const doc of documents) {
      // Filter by category if specified
      if (category && doc.category !== category) {
        continue;
      }

      const contentLower = doc.content.toLowerCase();
      const titleLower = (doc.title ?? '').toLowerCase();
      const combinedText = `${titleLower} ${contentLower}`;

      // Calculate term frequency score
      const matchedTerms: string[] = [];
      let totalScore = 0;

      for (const term of queryTerms) {
        // Check for exact term match
        if (combinedText.includes(term)) {
          matchedTerms.push(term);
          
          // Count occurrences for TF scoring
          const regex = new RegExp(this.escapeRegex(term), 'gi');
          const occurrences = (combinedText.match(regex) || []).length;
          
          // TF score with diminishing returns
          totalScore += Math.log(1 + occurrences);
          
          // Boost for title matches
          if (titleLower.includes(term)) {
            totalScore += 0.5;
          }
        }
      }

      if (matchedTerms.length > 0) {
        // Normalize score by query length and document length
        const coverageScore = matchedTerms.length / queryTerms.length;
        const lengthNorm = 1 / Math.sqrt(combinedText.length / 1000 + 1);
        const finalScore = Math.min(1, (totalScore * coverageScore * lengthNorm) / queryTerms.length);

        matches.push({
          document: doc,
          score: finalScore,
          matchedTerms,
        });
      }
    }

    return matches;
  }

  /**
   * Semantic search using embedding similarity
   * 
   * Uses vector similarity to find semantically related documents.
   * Falls back to keyword search if embedder is not available.
   * 
   * _Requirements: 3.3_
   * 
   * @param query - Search query
   * @param category - Optional category filter
   * @returns Search results sorted by score descending
   */
  async semanticSearch(query: string, category?: string): Promise<SearchResult[]> {
    // Fall back to keyword search if no embedder
    if (!this.embedder) {
      return this.keywordSearch(query, category);
    }

    // Generate query embedding
    let queryEmbedding: number[];
    try {
      const result = await this.embedder.embed(query);
      queryEmbedding = result.embedding;
    } catch (error) {
      console.warn('Failed to generate query embedding, falling back to keyword search:', error);
      return this.keywordSearch(query, category);
    }

    const documents = await this.store.getAllDocuments();
    const matches = await this.performSemanticMatch(queryEmbedding, documents, category);

    // Convert to SearchResult and sort by score descending
    return matches
      .map(match => ({
        document: match.document,
        score: match.score,
        confidence: this.scoreToConfidence(match.score),
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Perform semantic matching on documents
   */
  private async performSemanticMatch(
    queryEmbedding: number[],
    documents: Document[],
    category?: string
  ): Promise<SemanticMatch[]> {
    const matches: SemanticMatch[] = [];

    for (const doc of documents) {
      // Filter by category if specified
      if (category && doc.category !== category) {
        continue;
      }

      // Get document embedding from store
      const docEmbedding = this.store.getEmbedding(doc.id);
      
      if (!docEmbedding || docEmbedding.length === 0) {
        continue;
      }

      // Calculate cosine similarity
      try {
        const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
        
        // Normalize to 0-1 range (cosine similarity is -1 to 1)
        const normalizedScore = (similarity + 1) / 2;

        matches.push({
          document: doc,
          score: normalizedScore,
          embedding: docEmbedding,
        });
      } catch (error) {
        // Skip documents with incompatible embeddings
        console.warn(`Skipping document ${doc.id} due to embedding error:`, error);
      }
    }

    return matches;
  }

  /**
   * Hybrid search combining keyword and semantic results
   * 
   * Merges results from both methods with configurable weights.
   * Deduplicates and re-ranks results.
   * 
   * _Requirements: 3.2_
   * 
   * @param query - Search query
   * @param category - Optional category filter
   * @returns Search results sorted by combined score descending
   */
  async hybridSearch(query: string, category?: string): Promise<SearchResult[]> {
    // Get results from both methods
    const keywordResults = await this.keywordSearch(query, category);
    const semanticResults = await this.semanticSearch(query, category);

    // Merge results with weighted scores
    const scoreMap = new Map<string, { keyword: number; semantic: number; document: Document }>();

    for (const result of keywordResults) {
      scoreMap.set(result.document.id, {
        keyword: result.score,
        semantic: 0,
        document: result.document,
      });
    }

    for (const result of semanticResults) {
      const existing = scoreMap.get(result.document.id);
      if (existing) {
        existing.semantic = result.score;
      } else {
        scoreMap.set(result.document.id, {
          keyword: 0,
          semantic: result.score,
          document: result.document,
        });
      }
    }

    // Calculate combined scores
    const results: SearchResult[] = [];

    for (const [, scores] of scoreMap.entries()) {
      const combinedScore = 
        scores.keyword * this.config.keywordWeight + 
        scores.semantic * this.config.semanticWeight;

      results.push({
        document: scores.document,
        score: combinedScore,
        confidence: this.scoreToConfidence(combinedScore),
      });
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Assess knowledge sufficiency for a given intent
   * 
   * Evaluates whether the retrieved knowledge is sufficient
   * to answer the user's query.
   * 
   * _Requirements: 5.1, 5.2_
   * 
   * @param results - Search results to assess
   * @param intent - User intent information
   * @returns Knowledge assessment with status and confidence
   */
  assessKnowledge(results: SearchResult[], intent: Intent): KnowledgeAssessment {
    // No results - insufficient knowledge
    if (results.length === 0) {
      return {
        status: 'insufficient',
        confidence: 0,
        missingTopic: intent.requiredTopics?.[0] ?? intent.action,
      };
    }

    // Calculate overall confidence from top results
    const topResults = results.slice(0, 5);
    const avgScore = topResults.reduce((sum, r) => sum + r.score, 0) / topResults.length;
    const maxScore = Math.max(...topResults.map(r => r.score));

    // Check if required topics are covered
    const coveredTopics = this.findCoveredTopics(results, intent);
    const requiredTopics = intent.requiredTopics ?? [intent.action];
    const missingTopics = requiredTopics.filter(t => !coveredTopics.has(t.toLowerCase()));

    // Determine status based on scores and coverage
    if (maxScore >= this.config.sufficientThreshold && missingTopics.length === 0) {
      return {
        status: 'sufficient',
        confidence: avgScore,
      };
    }

    if (maxScore >= this.config.ambiguousThreshold) {
      // Check for ambiguity - multiple high-scoring but different results
      const highScoreResults = results.filter(r => r.score >= this.config.ambiguousThreshold);
      
      if (highScoreResults.length > 1) {
        const categories = new Set(highScoreResults.map(r => r.document.category));
        
        if (categories.size > 1) {
          // Multiple categories with high scores - ambiguous
          return {
            status: 'ambiguous',
            confidence: avgScore,
            alternatives: Array.from(categories).map(cat => ({
              interpretation: cat,
              confidence: highScoreResults
                .filter(r => r.document.category === cat)
                .reduce((sum, r) => sum + r.score, 0) / highScoreResults.length,
            })),
          };
        }
      }

      // Partial coverage
      if (missingTopics.length > 0) {
        return {
          status: 'insufficient',
          confidence: avgScore,
          missingTopic: missingTopics[0],
        };
      }

      return {
        status: 'sufficient',
        confidence: avgScore,
      };
    }

    // Low scores - insufficient
    return {
      status: 'insufficient',
      confidence: avgScore,
      missingTopic: missingTopics[0] ?? intent.action,
    };
  }

  /**
   * Find topics covered by search results
   */
  private findCoveredTopics(results: SearchResult[], intent: Intent): Set<string> {
    const covered = new Set<string>();
    
    for (const result of results) {
      const content = `${result.document.title ?? ''} ${result.document.content}`.toLowerCase();
      
      // Check action
      if (content.includes(intent.action.toLowerCase())) {
        covered.add(intent.action.toLowerCase());
      }
      
      // Check entities
      for (const entity of intent.entities) {
        if (content.includes(entity.toLowerCase())) {
          covered.add(entity.toLowerCase());
        }
      }
      
      // Check required topics
      for (const topic of intent.requiredTopics ?? []) {
        if (content.includes(topic.toLowerCase())) {
          covered.add(topic.toLowerCase());
        }
      }
      
      // Add category as covered topic
      covered.add(result.document.category.toLowerCase());
    }
    
    return covered;
  }

  /**
   * Tokenize text into search terms
   */
  private tokenize(text: string): string[] {
    return text
      .split(/\s+/)
      .map(t => t.replace(/[^\w\u4e00-\u9fff]/g, '')) // Keep alphanumeric and Chinese chars
      .filter(t => t.length > 0);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Convert score to confidence level
   */
  private scoreToConfidence(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Get retriever configuration
   */
  getConfig(): Required<RetrieverConfig> {
    return { ...this.config };
  }

  /**
   * Update retriever configuration
   */
  updateConfig(config: Partial<RetrieverConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
