import type { ProjectConfig } from '../types.js';

export function generatePackageJson(config: ProjectConfig): string {
  const dependencies: Record<string, string> = {
    '@agentic/core': '^1.0.0',
    'dotenv': '^16.0.0',
  };

  const devDependencies: Record<string, string> = {
    '@types/node': '^22.0.0',
    'tsx': '^4.0.0',
    'typescript': '^5.0.0',
  };

  // Add storage dependencies
  if (config.storage === 'prisma') {
    dependencies['@ai-agent/storage-prisma'] = '^1.0.0';
    dependencies['@prisma/client'] = '^5.0.0';
    devDependencies['prisma'] = '^5.0.0';
  } else if (config.storage === 'memory') {
    dependencies['@ai-agent/storage-memory'] = '^1.0.0';
  }

  // Add LLM provider dependencies (already included in @ai-agent/core)
  // OpenAI and Anthropic SDKs are peer dependencies

  const scripts: Record<string, string> = {
    'start': 'tsx src/index.ts',
    'dev': 'tsx watch src/index.ts',
    'build': 'tsc',
    'typecheck': 'tsc --noEmit',
  };

  if (config.storage === 'prisma') {
    scripts['db:migrate'] = 'prisma migrate dev';
    scripts['db:studio'] = 'prisma studio';
    scripts['db:generate'] = 'prisma generate';
  }

  const pkg = {
    name: config.projectName,
    version: '1.0.0',
    description: `AI Agent project created with @ai-agent/cli`,
    type: 'module',
    private: true,
    scripts,
    dependencies,
    devDependencies,
    engines: {
      node: '>=18.0.0',
    },
  };

  return JSON.stringify(pkg, null, 2);
}
