/**
 * Knowledge System Type Definitions
 *
 * Defines the interfaces for the knowledge base and retrieval system.
 */

/**
 * Document input for adding to knowledge base
 */
export interface DocumentInput {
  /** Category for organizing documents */
  category: string;
  /** Optional title */
  title?: string;
  /** Document content */
  content: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Stored document with ID and timestamps
 */
export interface Document {
  /** Unique document ID */
  id: string;
  /** Category for organizing documents */
  category: string;
  /** Optional title */
  title?: string;
  /** Document content */
  content: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Search options for knowledge retrieval
 */
export interface SearchOptions {
  /** Filter by category */
  category?: string;
  /** Number of results to return */
  topK?: number;
  /** Search method */
  method?: 'keyword' | 'semantic' | 'hybrid';
  /** Minimum similarity score */
  minScore?: number;
}

/**
 * Search result with relevance score
 */
export interface SearchResult {
  /** The matched document */
  document: Document;
  /** Relevance score (0-1) */
  score: number;
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Knowledge assessment result
 */
export interface KnowledgeAssessment {
  /** Whether knowledge is sufficient */
  status: 'sufficient' | 'insufficient' | 'ambiguous';
  /** Confidence in the assessment */
  confidence: number;
  /** Topic that's missing (if insufficient) */
  missingTopic?: string;
  /** Alternative interpretations (if ambiguous) */
  alternatives?: Array<{
    interpretation: string;
    confidence: number;
  }>;
}

/**
 * Knowledge base interface
 */
export interface KnowledgeBase {
  /** Add a document to the knowledge base */
  addDocument(doc: DocumentInput): Promise<string>;
  /** Get a document by ID */
  getDocument(id: string): Promise<Document | null>;
  /** Delete a document */
  deleteDocument(id: string): Promise<boolean>;
  /** Search the knowledge base */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  /** List all categories */
  listCategories(): Promise<string[]>;
  /** Get documents by category */
  getDocumentsByCategory(category: string): Promise<Document[]>;
}
