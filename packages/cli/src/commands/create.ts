import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { promptForConfig } from '../prompts.js';
import { generateTemplateFiles } from '../templates/generator.js';
import type { ProjectConfig } from '../types.js';

interface CreateOptions {
  template?: string;
  storage?: string;
  skipInstall?: boolean;
  skipGit?: boolean;
}

export async function createProject(
  projectName?: string,
  options: CreateOptions = {}
): Promise<void> {
  console.log(chalk.bold.cyan('\n🤖 AI Agent Project Generator\n'));

  try {
    // Get configuration from prompts
    const config = await promptForConfig(projectName, options as Partial<ProjectConfig>);

    // Validate project directory
    const projectPath = path.join(process.cwd(), config.projectName);
    
    if (await fs.pathExists(projectPath)) {
      console.error(chalk.red(`\n❌ Directory "${config.projectName}" already exists!\n`));
      process.exit(1);
    }

    // Create project directory
    const spinner = ora('Creating project directory...').start();
    await fs.ensureDir(projectPath);
    spinner.succeed('Project directory created');

    // Generate and write template files
    spinner.start('Generating project files...');
    const files = generateTemplateFiles(config);
    
    for (const file of files) {
      const filePath = path.join(projectPath, file.path);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, file.content, 'utf-8');
    }
    spinner.succeed('Project files generated');

    // Initialize git
    if (!config.skipGit) {
      spinner.start('Initializing git repository...');
      try {
        execSync('git init', { cwd: projectPath, stdio: 'ignore' });
        execSync('git add .', { cwd: projectPath, stdio: 'ignore' });
        execSync('git commit -m "Initial commit from @ai-agent/cli"', { 
          cwd: projectPath, 
          stdio: 'ignore' 
        });
        spinner.succeed('Git repository initialized');
      } catch {
        spinner.warn('Git initialization skipped (git not available)');
      }
    }

    // Install dependencies
    if (!config.skipInstall) {
      spinner.start('Installing dependencies (this may take a while)...');
      try {
        execSync('npm install', { cwd: projectPath, stdio: 'ignore' });
        spinner.succeed('Dependencies installed');
      } catch {
        spinner.fail('Failed to install dependencies');
        console.error(chalk.yellow('\nYou can install them manually by running:'));
        console.error(chalk.cyan(`  cd ${config.projectName}`));
        console.error(chalk.cyan('  npm install\n'));
      }
    }

    // Print success message
    console.log(chalk.bold.green('\n✅ Project created successfully!\n'));
    
    console.log(chalk.bold('Next steps:\n'));
    console.log(chalk.cyan(`  cd ${config.projectName}`));
    
    if (config.skipInstall) {
      console.log(chalk.cyan('  npm install'));
    }
    
    console.log(chalk.cyan('  cp .env.example .env'));
    console.log(chalk.yellow('  # Edit .env and add your API keys'));
    
    if (config.storage === 'prisma') {
      console.log(chalk.cyan('  npm run db:migrate'));
    }
    
    console.log(chalk.cyan('  npm run dev'));
    
    console.log(chalk.bold('\n📚 Documentation:\n'));
    console.log('  https://github.com/ai-agent-framework/core\n');

  } catch (error) {
    console.error(chalk.red('\n❌ Error creating project:\n'));
    console.error(error);
    process.exit(1);
  }
}
