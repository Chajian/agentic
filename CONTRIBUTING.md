# Contributing to AI Agent Framework

Thank you for your interest in contributing to AI Agent Framework! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps to reproduce the problem
- Provide specific examples and code samples
- Describe the behavior you observed and what you expected
- Include your environment details (Node.js version, OS, etc.)

### Suggesting Features

Feature suggestions are welcome! Please:

- Use a clear and descriptive title
- Provide a detailed description of the proposed feature
- Explain why this feature would be useful
- Include code examples of how the feature would be used

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `pnpm install`
3. **Make your changes** following our coding standards
4. **Add tests** for any new functionality
5. **Ensure tests pass**: `pnpm test`
6. **Run linting**: `pnpm run lint`
7. **Format code**: `pnpm run format`
8. **Update documentation** as needed
9. **Commit your changes** using conventional commits
10. **Push to your fork** and submit a pull request

## Development Setup

### Prerequisites

- Node.js 18.x or higher
- pnpm 9.x or higher

### Installation

```bash
# Clone your fork
git clone https://github.com/your-username/ai-agent-framework.git
cd ai-agent-framework

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test
```

### Project Structure

```
packages/
├── core/              # Core agent framework
├── storage-memory/    # In-memory storage adapter
├── storage-prisma/    # Prisma storage adapter
└── cli/               # CLI scaffolding tool

.github/               # GitHub workflows and templates
docs/                  # Documentation
```

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Provide type definitions for all public APIs
- Use meaningful variable and function names

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check linting
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Format code
pnpm run format
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix bug in component
docs: update documentation
test: add tests for feature
refactor: refactor code
chore: update dependencies
```

Examples:
- `feat(plugin): add lifecycle hooks for plugins`
- `fix(llm): handle timeout errors correctly`
- `docs(api): update Agent class documentation`

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

### Writing Tests

- Write unit tests for all new functionality
- Write property-based tests for critical components
- Use descriptive test names
- Follow the existing test patterns

Example:

```typescript
import { describe, it, expect } from 'vitest';
import { Agent } from '../agent';

describe('Agent', () => {
  it('should process messages correctly', async () => {
    const agent = new Agent({...});
    const response = await agent.chat('Hello');
    expect(response.content).toBeDefined();
  });
});
```

### Property-Based Testing

We use `fast-check` for property-based testing:

```typescript
import { fc, test } from '@fast-check/vitest';

test.prop([fc.string(), fc.array(fc.object({...}))])(
  'property description',
  async (message, history) => {
    // Test implementation
  }
);
```

## Documentation

### Code Documentation

- Add JSDoc comments to all public APIs
- Include parameter descriptions and return types
- Provide usage examples in comments

Example:

```typescript
/**
 * Process a user message and generate a response
 * 
 * @param message - The user's message
 * @param options - Optional configuration
 * @returns Agent response with content and metadata
 * 
 * @example
 * ```typescript
 * const response = await agent.chat('Hello', {
 *   history: previousMessages
 * });
 * ```
 */
async chat(message: string, options?: ChatOptions): Promise<AgentResponse>
```

### Documentation Files

- Update README.md for user-facing changes
- Update API.md for API changes
- Update MIGRATION.md for breaking changes
- Add examples for new features

## Release Process

Releases are automated using semantic-release:

1. Merge PR to `main` branch
2. CI runs tests and builds
3. semantic-release analyzes commits
4. Version is bumped automatically
5. Changelog is generated
6. Package is published to npm
7. GitHub release is created

## Branch Protection Rules

The `main` branch is protected with the following rules:

- Require pull request reviews before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Require linear history
- Include administrators in restrictions

## Getting Help

- Check the [documentation](https://chajian.github.io/ai-agent-framework/)
- Search [existing issues](https://github.com/Chajian/ai-agent-framework/issues)
- Ask in [discussions](https://github.com/Chajian/ai-agent-framework/discussions)

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for their contributions
- README.md contributors section
- GitHub contributors page

Thank you for contributing! 🎉
