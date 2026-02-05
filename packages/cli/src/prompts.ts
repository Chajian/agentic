import inquirer from 'inquirer';
import type { ProjectConfig, TemplateType, StorageType, LLMProvider } from './types.js';

export async function promptForConfig(
  projectName?: string,
  options?: Partial<ProjectConfig>
): Promise<ProjectConfig> {
  const answers = await inquirer.prompt<Partial<ProjectConfig>>([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is your project name?',
      default: projectName || 'my-ai-agent',
      when: !projectName,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Project name is required';
        }
        if (!/^[a-z0-9-_]+$/i.test(input)) {
          return 'Project name can only contain letters, numbers, hyphens, and underscores';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'template',
      message: 'Which template would you like to use?',
      choices: [
        {
          name: 'Chatbot with Prisma (Production-ready with database)',
          value: 'chatbot-prisma',
        },
        {
          name: 'Chatbot with Memory (Simple in-memory storage)',
          value: 'chatbot-memory',
        },
        {
          name: 'Q&A Bot (Knowledge base with RAG)',
          value: 'qa-bot',
        },
        {
          name: 'Task Automation (Custom tools and workflows)',
          value: 'task-automation',
        },
      ],
      when: !options?.template,
    },
    {
      type: 'list',
      name: 'storage',
      message: 'Which storage backend would you like to use?',
      choices: [
        {
          name: 'Prisma (PostgreSQL/MySQL/SQLite)',
          value: 'prisma',
        },
        {
          name: 'Memory (In-memory, for development)',
          value: 'memory',
        },
        {
          name: 'MongoDB (Coming soon)',
          value: 'mongodb',
          disabled: true,
        },
        {
          name: 'Redis (Coming soon)',
          value: 'redis',
          disabled: true,
        },
      ],
      when: (answers: Partial<ProjectConfig>) => {
        if (options?.storage) return false;
        const template = options?.template || answers.template;
        return template !== 'qa-bot' && template !== 'task-automation';
      },
    },
    {
      type: 'list',
      name: 'llmProvider',
      message: 'Which LLM provider would you like to use?',
      choices: [
        {
          name: 'OpenAI (GPT-4, GPT-3.5)',
          value: 'openai',
        },
        {
          name: 'Anthropic (Claude)',
          value: 'anthropic',
        },
        {
          name: 'Custom (I will configure my own)',
          value: 'custom',
        },
      ],
      when: !options?.llmProvider,
    },
  ]);

  // Set defaults based on template
  const template = (options?.template || answers.template) as TemplateType;
  let storage: StorageType = (options?.storage || answers.storage) as StorageType;
  
  // Default storage based on template
  if (!storage) {
    if (template === 'chatbot-prisma') {
      storage = 'prisma';
    } else if (template === 'chatbot-memory') {
      storage = 'memory';
    } else {
      storage = 'memory'; // Default for qa-bot and task-automation
    }
  }

  return {
    projectName: (projectName || answers.projectName) as string,
    template,
    storage,
    llmProvider: (options?.llmProvider || answers.llmProvider) as LLMProvider,
    skipInstall: options?.skipInstall || false,
    skipGit: options?.skipGit || false,
  };
}
