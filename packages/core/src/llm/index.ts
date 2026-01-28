/**
 * LLM Module Index
 * 
 * Exports all LLM-related types, adapters, and the manager.
 */

// Core adapter interface and types
export {
  type LLMAdapter,
  type LLMAdapterConfig,
  type GenerateOptions,
  type ChatMessage,
  type LLMResponse,
  type ToolCall,
  type EmbeddingResult,
  type LLMErrorCode,
  LLMError,
  promptToMessages,
  messagesToPrompt,
} from './adapter.js';

// LLM Manager
export { LLMManager, createSimpleLLMManager } from './manager.js';

// Adapters
export {
  OpenAIAdapter,
  type OpenAIAdapterConfig,
  ClaudeAdapter,
  type ClaudeAdapterConfig,
  QwenAdapter,
  type QwenAdapterConfig,
  SiliconFlowAdapter,
  type SiliconFlowAdapterConfig,
  SILICONFLOW_MODELS,
  MiMoAdapter,
  type MiMoAdapterConfig,
  type MiMoGenerateOptions,
  type MiMoLLMResponse,
  type ThinkingMode,
  MIMO_MODELS,
} from './adapters/index.js';
