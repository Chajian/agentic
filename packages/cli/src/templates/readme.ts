import type { ProjectConfig } from '../types.js';

export function generateReadme(config: ProjectConfig): string {
  const lines: string[] = [
    `# ${config.projectName}`,
    '',
    `AI Agent project created with @ai-agent/cli`,
    '',
    '## Setup',
    '',
    '1. Install dependencies:',
    '```bash',
    'npm install',
    '```',
    '',
    '2. Copy `.env.example` to `.env` and configure your API keys:',
    '```bash',
    'cp .env.example .env',
    '```',
    '',
  ];

  if (config.storage === 'prisma') {
    lines.push('3. Set up the database:');
    lines.push('```bash');
    lines.push('npm run db:migrate');
    lines.push('```');
    lines.push('');
  }

  lines.push('## Running');
  lines.push('');
  lines.push('Development mode with auto-reload:');
  lines.push('```bash');
  lines.push('npm run dev');
  lines.push('```');
  lines.push('');
  lines.push('Production mode:');
  lines.push('```bash');
  lines.push('npm start');
  lines.push('```');
  lines.push('');
  lines.push('## Project Structure');
  lines.push('');
  lines.push('```');
  lines.push(`${config.projectName}/`);
  lines.push('├── src/');
  lines.push('│   └── index.ts       # Main application entry point');

  if (config.template === 'task-automation') {
    lines.push('│   └── tools/         # Custom tool definitions');
  }

  if (config.storage === 'prisma') {
    lines.push('├── prisma/');
    lines.push('│   └── schema.prisma  # Database schema');
  }

  if (config.template === 'qa-bot') {
    lines.push('├── knowledge/         # Knowledge base documents');
  }

  lines.push('├── .env               # Environment variables (create from .env.example)');
  lines.push('├── package.json');
  lines.push('└── tsconfig.json');
  lines.push('```');
  lines.push('');
  lines.push('## Documentation');
  lines.push('');
  lines.push('- [@agenticc/core Documentation](https://github.com/Chajian/agentic)');
  lines.push('- [API Reference](https://github.com/Chajian/agentic/blob/main/docs/API.md)');
  lines.push('- [Usage Guide](https://github.com/Chajian/agentic/blob/main/docs/USAGE_GUIDE.md)');
  lines.push('');
  lines.push('## License');
  lines.push('');
  lines.push('MIT');

  return lines.join('\n');
}
