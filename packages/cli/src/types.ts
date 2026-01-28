export type TemplateType = 'chatbot-prisma' | 'chatbot-memory' | 'qa-bot' | 'task-automation';
export type StorageType = 'prisma' | 'memory' | 'mongodb' | 'redis';
export type LLMProvider = 'openai' | 'anthropic' | 'custom';

export interface ProjectConfig {
  projectName: string;
  template: TemplateType;
  storage: StorageType;
  llmProvider: LLMProvider;
  skipInstall: boolean;
  skipGit: boolean;
}

export interface TemplateFile {
  path: string;
  content: string;
}
