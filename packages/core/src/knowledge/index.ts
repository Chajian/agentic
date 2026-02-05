/**
 * Knowledge System Module
 *
 * Exports knowledge storage, embedding, and retrieval components.
 */

export { KnowledgeStore, type KnowledgeStoreConfig } from './store.js';
export { Embedder, type EmbedderConfig, cosineSimilarity, euclideanDistance } from './embedder.js';
export { Retriever, type RetrieverConfig, type Intent } from './retriever.js';

// Document Loaders
export {
  MarkdownLoader,
  parseMarkdown,
  loadMarkdownDocument,
  loadMarkdownSections,
  type MarkdownSection,
  type MarkdownParseResult,
  type MarkdownLoaderOptions,
  YamlLoader,
  parseYaml,
  parseYamlDocument,
  loadYamlDocument,
  loadYamlByRootKeys,
  flattenYaml,
  yamlToText,
  type YamlNode,
  type YamlParseResult,
  type YamlLoaderOptions,
} from './loaders/index.js';
