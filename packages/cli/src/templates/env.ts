import type { ProjectConfig } from '../types.js';

export function generateEnvFile(config: ProjectConfig): string {
  const lines: string[] = [
    '# LLM Provider Configuration',
  ];

  if (config.llmProvider === 'openai') {
    lines.push('OPENAI_API_KEY=your-openai-api-key-here');
    lines.push('# OPENAI_MODEL=gpt-4');
  } else if (config.llmProvider === 'anthropic') {
    lines.push('ANTHROPIC_API_KEY=your-anthropic-api-key-here');
    lines.push('# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022');
  } else {
    lines.push('# Configure your custom LLM provider here');
    lines.push('LLM_API_KEY=your-api-key-here');
    lines.push('LLM_BASE_URL=https://api.example.com');
  }

  lines.push('');

  if (config.storage === 'prisma') {
    lines.push('# Database Configuration');
    lines.push('# For SQLite (development)');
    lines.push('DATABASE_URL="file:./dev.db"');
    lines.push('');
    lines.push('# For PostgreSQL (production)');
    lines.push('# DATABASE_URL="postgresql://user:password@localhost:5432/mydb"');
    lines.push('');
    lines.push('# For MySQL (production)');
    lines.push('# DATABASE_URL="mysql://user:password@localhost:3306/mydb"');
  }

  return lines.join('\n');
}
