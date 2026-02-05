#!/usr/bin/env node

import { Command } from 'commander';
import { createProject } from './commands/create.js';

const program = new Command();

program
  .name('create-ai-agent')
  .description('CLI tool for scaffolding AI Agent projects')
  .version('1.0.0');

program
  .argument('[project-name]', 'Name of the project to create')
  .option(
    '-t, --template <template>',
    'Template to use (chatbot-prisma, chatbot-memory, qa-bot, task-automation)'
  )
  .option('-s, --storage <storage>', 'Storage backend (prisma, memory, mongodb, redis)')
  .option('--skip-install', 'Skip npm install')
  .option('--skip-git', 'Skip git initialization')
  .action(createProject);

program.parse();
