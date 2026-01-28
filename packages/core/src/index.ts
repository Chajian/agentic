/**
 * AI Agent Framework
 *
 * A modular AI Agent framework with LLM support, RAG knowledge retrieval,
 * and extensible tool system.
 */

// Types
export * from './types/tool.js';
export * from './types/response.js';
export * from './types/config.js';
export * from './types/plugin.js';
export * from './types/streaming.js';
// Export loop types selectively to avoid ToolCallRecord conflict
export type {
  LoopConfig,
  LoopStatus,
  LoopMessage,
  LLMToolCall,
  LoopState,
  LoopResult,
  LoopRunOptions,
} from './types/loop.js';
export { DEFAULT_LOOP_CONFIG } from './types/loop.js';
// Re-export ToolCallRecord from loop.ts with a different name for loop-specific usage
export type { ToolCallRecord as LoopToolCallRecord } from './types/loop.js';
export type {
  Document,
  DocumentInput,
  SearchOptions,
  SearchResult,
  KnowledgeAssessment,
} from './types/knowledge.js';

// LLM Layer
export * from './llm/index.js';

// Knowledge System
export { KnowledgeStore } from './knowledge/store.js';
export { Embedder } from './knowledge/embedder.js';
export { Retriever } from './knowledge/retriever.js';
export { MarkdownLoader } from './knowledge/loaders/markdown.js';
export { YamlLoader } from './knowledge/loaders/yaml.js';
export { TextChunker, createChunker, type ChunkerConfig, type TextChunk } from './knowledge/chunker.js';

// Conversation System (Deprecated - use @ai-agent/storage-memory instead)
/**
 * @deprecated Use @ai-agent/storage-memory package instead.
 * These exports are kept for backward compatibility.
 */
export { SessionManager } from './conversation/session.js';
/**
 * @deprecated Use @ai-agent/storage-memory package instead.
 * These exports are kept for backward compatibility.
 */
export {
  MessageStore,
  type StoredMessage,
} from './conversation/message-store.js';
export {
  ContextBuilder,
  type ContextBuilderConfig,
} from './conversation/context-builder.js';

// Audit System
export { AuditLogger } from './audit/logger.js';
export { AuditLogQuery, type AuditLogQueryOptions } from './audit/query.js';

// Core
export { Agent } from './core/agent.js';
export { ToolRegistry } from './core/tool-registry.js';
export { ToolExecutor } from './core/tool-executor.js';
export { IntentParser, type Intent } from './core/intent-parser.js';
export { PlanGenerator, type ExecutionPlan } from './core/plan-generator.js';
export { ResponseHandler } from './core/response-handler.js';
export { PluginManager, PluginError } from './core/plugin-manager.js';
export { AgenticLoop, LoopError } from './core/agentic-loop.js';
