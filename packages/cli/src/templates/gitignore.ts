import type { ProjectConfig } from '../types.js';

export function generateGitignore(config: ProjectConfig): string {
  const lines = [
    '# Dependencies',
    'node_modules/',
    '',
    '# Build output',
    'dist/',
    '*.tsbuildinfo',
    '',
    '# Environment variables',
    '.env',
    '.env.local',
    '',
    '# IDE',
    '.vscode/',
    '.idea/',
    '*.swp',
    '*.swo',
    '',
    '# OS',
    '.DS_Store',
    'Thumbs.db',
    '',
    '# Logs',
    '*.log',
    'logs/',
  ];

  if (config.storage === 'prisma') {
    lines.push('');
    lines.push('# Database');
    lines.push('*.db');
    lines.push('*.db-journal');
  }

  return lines.join('\n');
}
