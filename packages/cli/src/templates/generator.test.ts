import { describe, it, expect } from 'vitest';
import { generateTemplateFiles } from './generator.js';
import type { ProjectConfig } from '../types.js';

describe('Template Generator', () => {
  it('should generate all required files for chatbot-prisma template', () => {
    const config: ProjectConfig = {
      projectName: 'test-project',
      template: 'chatbot-prisma',
      storage: 'prisma',
      llmProvider: 'openai',
      skipInstall: false,
      skipGit: false,
    };

    const files = generateTemplateFiles(config);

    // Check that all required files are generated
    const filePaths = files.map((f) => f.path);
    expect(filePaths).toContain('package.json');
    expect(filePaths).toContain('tsconfig.json');
    expect(filePaths).toContain('.env.example');
    expect(filePaths).toContain('README.md');
    expect(filePaths).toContain('.gitignore');
    expect(filePaths).toContain('src/index.ts');
    expect(filePaths).toContain('prisma/schema.prisma');
  });

  it('should generate all required files for qa-bot template', () => {
    const config: ProjectConfig = {
      projectName: 'test-qa-bot',
      template: 'qa-bot',
      storage: 'memory',
      llmProvider: 'anthropic',
      skipInstall: false,
      skipGit: false,
    };

    const files = generateTemplateFiles(config);

    const filePaths = files.map((f) => f.path);
    expect(filePaths).toContain('package.json');
    expect(filePaths).toContain('knowledge/example.md');
  });

  it('should generate all required files for task-automation template', () => {
    const config: ProjectConfig = {
      projectName: 'test-automation',
      template: 'task-automation',
      storage: 'memory',
      llmProvider: 'openai',
      skipInstall: false,
      skipGit: false,
    };

    const files = generateTemplateFiles(config);

    const filePaths = files.map((f) => f.path);
    expect(filePaths).toContain('package.json');
    expect(filePaths).toContain('src/tools/calculator.ts');
  });

  it('should generate valid JSON for package.json', () => {
    const config: ProjectConfig = {
      projectName: 'test-project',
      template: 'chatbot-memory',
      storage: 'memory',
      llmProvider: 'openai',
      skipInstall: false,
      skipGit: false,
    };

    const files = generateTemplateFiles(config);
    const packageJson = files.find((f) => f.path === 'package.json');

    expect(packageJson).toBeDefined();
    expect(() => JSON.parse(packageJson!.content)).not.toThrow();
  });

  it('should include correct dependencies based on storage type', () => {
    const prismaConfig: ProjectConfig = {
      projectName: 'test-prisma',
      template: 'chatbot-prisma',
      storage: 'prisma',
      llmProvider: 'openai',
      skipInstall: false,
      skipGit: false,
    };

    const files = generateTemplateFiles(prismaConfig);
    const packageJson = files.find((f) => f.path === 'package.json');
    const pkg = JSON.parse(packageJson!.content);

    expect(pkg.dependencies).toHaveProperty('@ai-agent/storage-prisma');
    expect(pkg.dependencies).toHaveProperty('@prisma/client');
    expect(pkg.devDependencies).toHaveProperty('prisma');
  });

  it('should include correct dependencies for memory storage', () => {
    const memoryConfig: ProjectConfig = {
      projectName: 'test-memory',
      template: 'chatbot-memory',
      storage: 'memory',
      llmProvider: 'openai',
      skipInstall: false,
      skipGit: false,
    };

    const files = generateTemplateFiles(memoryConfig);
    const packageJson = files.find((f) => f.path === 'package.json');
    const pkg = JSON.parse(packageJson!.content);

    expect(pkg.dependencies).toHaveProperty('@ai-agent/storage-memory');
    expect(pkg.dependencies).not.toHaveProperty('@prisma/client');
  });
});
