/**
 * Knowledge Store
 * 
 * In-memory document storage with semantic search for RAG (Retrieval-Augmented Generation).
 * 
 * **Why In-Memory?**
 * - RAG requires fast semantic search during conversation processing
 * - Documents are typically loaded at application startup
 * - Embeddings are expensive to generate (cached in memory for performance)
 * - Conversation history is stored externally (database), but knowledge is cached
 * 
 * **Design Philosophy:**
 * - Knowledge documents are relatively static (updated infrequently)
 * - Fast retrieval is critical for responsive agent interactions
 * - In-memory storage provides sub-millisecond search performance
 * - For large knowledge bases, consider implementing pagination or lazy loading
 * 
 * **For Production:**
 * - Load documents at startup from files or database
 * - Use document versioning to detect changes
 * - Implement periodic refresh if documents change
 * - Consider distributed caching (Redis) for multi-instance deployments
 * 
 * Handles storage and retrieval of knowledge documents.
 * Supports document CRUD operations with embedding generation.
 * Includes automatic text chunking for large documents.
 * 
 * _Requirements: 3.1, 3.5, 3.6_
 */

import { v4 as uuidv4 } from 'uuid';
import type { 
  Document, 
  DocumentInput, 
  KnowledgeBase,
  SearchOptions,
  SearchResult,
} from '../types/knowledge.js';
import type { Embedder } from './embedder.js';
import { cosineSimilarity } from './embedder.js';
import { TextChunker, type ChunkerConfig } from './chunker.js';

/**
 * Stored document with embedding
 */
interface StoredDocument extends Document {
  /** Embedding vector for semantic search */
  embedding?: number[];
  /** Parent document ID (for chunks) */
  parentId?: string;
  /** Chunk index (for chunks) */
  chunkIndex?: number;
  /** Total chunks in parent document */
  totalChunks?: number;
}

/**
 * Knowledge store configuration
 */
export interface KnowledgeStoreConfig {
  /** Embedder instance for generating embeddings */
  embedder?: Embedder;
  /** Whether to generate embeddings on document add */
  generateEmbeddings?: boolean;
  /** Default number of results for search */
  defaultTopK?: number;
  /** Default minimum score for search results */
  defaultMinScore?: number;
  /** Chunker configuration */
  chunkerConfig?: ChunkerConfig;
  /** Whether to enable chunking for large documents */
  enableChunking?: boolean;
}

const DEFAULT_CONFIG: Required<Omit<KnowledgeStoreConfig, 'embedder' | 'chunkerConfig'>> & { 
  embedder?: Embedder;
  chunkerConfig?: ChunkerConfig;
} = {
  embedder: undefined,
  generateEmbeddings: true,
  defaultTopK: 10,
  defaultMinScore: 0.5,
  chunkerConfig: undefined,
  enableChunking: true,
};

/**
 * In-memory Knowledge Store implementation
 * 
 * Provides document storage with optional embedding generation
 * and semantic search capabilities.
 */
export class KnowledgeStore implements KnowledgeBase {
  private documents: Map<string, StoredDocument> = new Map();
  private config: Required<Omit<KnowledgeStoreConfig, 'embedder' | 'chunkerConfig'>> & { 
    embedder?: Embedder;
    chunkerConfig?: ChunkerConfig;
  };
  private chunker: TextChunker;

  constructor(config?: KnowledgeStoreConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.chunker = new TextChunker(config?.chunkerConfig);
  }

  /**
   * Add a document to the knowledge base
   * Generates embedding if embedder is configured
   * Automatically chunks large documents
   * 
   * @returns Document ID (or parent document ID if chunked)
   */
  async addDocument(doc: DocumentInput): Promise<string> {
    // Check if document needs chunking
    if (this.config.enableChunking && this.chunker.needsChunking(doc.content)) {
      return this.addChunkedDocument(doc);
    }
    
    return this.addSingleDocument(doc);
  }

  /**
   * Add a single document (no chunking)
   */
  private async addSingleDocument(doc: DocumentInput, chunkInfo?: {
    parentId: string;
    chunkIndex: number;
    totalChunks: number;
  }): Promise<string> {
    const id = uuidv4();
    const now = new Date();
    
    let embedding: number[] | undefined;
    
    // Generate embedding if configured
    if (this.config.generateEmbeddings && this.config.embedder) {
      try {
        const result = await this.config.embedder.embed(doc.content);
        embedding = result.embedding;
      } catch (error) {
        console.warn('Failed to generate embedding:', error);
        // Continue without embedding
      }
    }
    
    const storedDoc: StoredDocument = {
      id,
      category: doc.category,
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata ?? {},
      embedding,
      createdAt: now,
      updatedAt: now,
      ...(chunkInfo && {
        parentId: chunkInfo.parentId,
        chunkIndex: chunkInfo.chunkIndex,
        totalChunks: chunkInfo.totalChunks,
      }),
    };
    
    this.documents.set(id, storedDoc);
    
    return id;
  }

  /**
   * Add a large document by chunking it
   */
  private async addChunkedDocument(doc: DocumentInput): Promise<string> {
    const parentId = uuidv4();
    const chunks = this.chunker.chunk(doc.content);
    const totalChunks = chunks.length;
    
    console.log(`Chunking document "${doc.title}" into ${totalChunks} chunks`);
    
    // Add each chunk as a separate document
    for (const chunk of chunks) {
      const chunkTitle = doc.title 
        ? `${doc.title} [${chunk.index + 1}/${totalChunks}]`
        : `Chunk ${chunk.index + 1}/${totalChunks}`;
      
      await this.addSingleDocument(
        {
          category: doc.category,
          title: chunkTitle,
          content: chunk.content,
          metadata: {
            ...doc.metadata,
            _isChunk: true,
            _chunkIndex: chunk.index,
            _totalChunks: totalChunks,
            _startPos: chunk.startPos,
            _endPos: chunk.endPos,
          },
        },
        {
          parentId,
          chunkIndex: chunk.index,
          totalChunks,
        }
      );
    }
    
    return parentId;
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    const doc = this.documents.get(id);
    
    if (!doc) {
      return null;
    }
    
    // Return without embedding (internal detail)
    return this.toDocument(doc);
  }

  /**
   * Delete a document by ID
   */
  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  /**
   * Update a document
   */
  async updateDocument(id: string, updates: Partial<DocumentInput>): Promise<boolean> {
    const doc = this.documents.get(id);
    
    if (!doc) {
      return false;
    }
    
    // Update fields
    if (updates.category !== undefined) {
      doc.category = updates.category;
    }
    if (updates.title !== undefined) {
      doc.title = updates.title;
    }
    if (updates.metadata !== undefined) {
      doc.metadata = updates.metadata;
    }
    
    // If content changed, regenerate embedding
    if (updates.content !== undefined) {
      doc.content = updates.content;
      
      if (this.config.generateEmbeddings && this.config.embedder) {
        try {
          const result = await this.config.embedder.embed(updates.content);
          doc.embedding = result.embedding;
        } catch (error) {
          console.warn('Failed to regenerate embedding:', error);
        }
      }
    }
    
    doc.updatedAt = new Date();
    
    return true;
  }

  /**
   * Search the knowledge base
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const method = options?.method ?? 'hybrid';
    const topK = options?.topK ?? this.config.defaultTopK;
    const minScore = options?.minScore ?? this.config.defaultMinScore;
    const category = options?.category;
    
    let results: SearchResult[];
    
    switch (method) {
      case 'keyword':
        results = this.keywordSearch(query, category);
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
    return results
      .filter(r => r.score >= minScore)
      .slice(0, topK);
  }

  /**
   * List all categories
   */
  async listCategories(): Promise<string[]> {
    const categories = new Set<string>();
    
    for (const doc of this.documents.values()) {
      categories.add(doc.category);
    }
    
    return Array.from(categories).sort();
  }

  /**
   * Get documents by category
   */
  async getDocumentsByCategory(category: string): Promise<Document[]> {
    const results: Document[] = [];
    
    for (const doc of this.documents.values()) {
      if (doc.category === category) {
        results.push(this.toDocument(doc));
      }
    }
    
    return results;
  }

  /**
   * Get all documents
   */
  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).map(doc => this.toDocument(doc));
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * Check if a document has an embedding
   */
  hasEmbedding(id: string): boolean {
    const doc = this.documents.get(id);
    return doc?.embedding !== undefined && doc.embedding.length > 0;
  }

  /**
   * Get the embedding for a document
   */
  getEmbedding(id: string): number[] | undefined {
    return this.documents.get(id)?.embedding;
  }

  /**
   * Get the embedding dimension (from first document with embedding)
   */
  getEmbeddingDimension(): number | undefined {
    for (const doc of this.documents.values()) {
      if (doc.embedding && doc.embedding.length > 0) {
        return doc.embedding.length;
      }
    }
    return undefined;
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents.clear();
  }

  /**
   * Keyword-based search using simple text matching
   */
  private keywordSearch(query: string, category?: string): SearchResult[] {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 0);
    const results: SearchResult[] = [];
    
    for (const doc of this.documents.values()) {
      // Filter by category if specified
      if (category && doc.category !== category) {
        continue;
      }
      
      const contentLower = doc.content.toLowerCase();
      const titleLower = (doc.title ?? '').toLowerCase();
      
      // Calculate keyword match score
      let matchCount = 0;
      for (const term of queryTerms) {
        if (contentLower.includes(term) || titleLower.includes(term)) {
          matchCount++;
        }
      }
      
      if (matchCount > 0) {
        const score = matchCount / queryTerms.length;
        results.push({
          document: this.toDocument(doc),
          score,
          confidence: this.scoreToConfidence(score),
        });
      }
    }
    
    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Semantic search using embedding similarity
   */
  private async semanticSearch(query: string, category?: string): Promise<SearchResult[]> {
    if (!this.config.embedder) {
      // Fall back to keyword search if no embedder
      return this.keywordSearch(query, category);
    }
    
    // Generate query embedding
    let queryEmbedding: number[];
    try {
      const result = await this.config.embedder.embed(query);
      queryEmbedding = result.embedding;
    } catch (error) {
      console.warn('Failed to generate query embedding:', error);
      return this.keywordSearch(query, category);
    }
    
    const results: SearchResult[] = [];
    
    for (const doc of this.documents.values()) {
      // Filter by category if specified
      if (category && doc.category !== category) {
        continue;
      }
      
      // Skip documents without embeddings
      if (!doc.embedding || doc.embedding.length === 0) {
        continue;
      }
      
      // Calculate cosine similarity
      try {
        const score = cosineSimilarity(queryEmbedding, doc.embedding);
        
        // Normalize score to 0-1 range (cosine similarity is -1 to 1)
        const normalizedScore = (score + 1) / 2;
        
        results.push({
          document: this.toDocument(doc),
          score: normalizedScore,
          confidence: this.scoreToConfidence(normalizedScore),
        });
      } catch (error) {
        // Skip documents with incompatible embeddings
        console.warn(`Skipping document ${doc.id} due to embedding error:`, error);
      }
    }
    
    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Hybrid search combining keyword and semantic results
   */
  private async hybridSearch(query: string, category?: string): Promise<SearchResult[]> {
    const keywordResults = this.keywordSearch(query, category);
    const semanticResults = await this.semanticSearch(query, category);
    
    // Merge results with weighted scores
    const scoreMap = new Map<string, { keyword: number; semantic: number }>();
    
    for (const result of keywordResults) {
      scoreMap.set(result.document.id, { keyword: result.score, semantic: 0 });
    }
    
    for (const result of semanticResults) {
      const existing = scoreMap.get(result.document.id);
      if (existing) {
        existing.semantic = result.score;
      } else {
        scoreMap.set(result.document.id, { keyword: 0, semantic: result.score });
      }
    }
    
    // Calculate combined scores (weighted average)
    const keywordWeight = 0.3;
    const semanticWeight = 0.7;
    
    const results: SearchResult[] = [];
    
    for (const [id, scores] of scoreMap.entries()) {
      const doc = this.documents.get(id);
      if (!doc) continue;
      
      const combinedScore = 
        scores.keyword * keywordWeight + 
        scores.semantic * semanticWeight;
      
      results.push({
        document: this.toDocument(doc),
        score: combinedScore,
        confidence: this.scoreToConfidence(combinedScore),
      });
    }
    
    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Convert score to confidence level
   */
  private scoreToConfidence(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Convert stored document to public document (without embedding)
   */
  private toDocument(doc: StoredDocument): Document {
    return {
      id: doc.id,
      category: doc.category,
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
