# Contributing to @ai-agent/core

Thank you for your interest in contributing to @ai-agent/core! This document provides guidelines and instructions for contributing.

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
2. **Install dependencies**: `npm install`
3. **Make your changes** following our coding standards
4. **Add tests** for any new functionality
5. **Ensure tests pass**: `npm test`
6. **Update documentation** as needed
7. **Commit your changes** using conventional commits
8. **Push to your fork** and submit a pull request

## Development Setup

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

### Installation

```bash
# Clone your fork
git clone https://github.com/your-username/ai-agent-core.git
cd ai-agent-core

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Project Structure

```
src/
├── core/           # Core agent logic
├── llm/            # LLM provider adapters
├── knowledge/      # Knowledge store and RAG
├── types/          # TypeScript type definitions
└── index.ts        # Main exports

examples/           # Example projects
docs/              # Documentation
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
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
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
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- path/to/test.ts

# Run with coverage
npm test -- --coverage
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

- Check the [documentation](docs/)
- Search [existing issues](https://github.com/your-org/ai-agent-core/issues)
- Ask in [discussions](https://github.com/your-org/ai-agent-core/discussions)
- Join our [Discord community](https://discord.gg/your-invite)

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for their contributions
- README.md contributors section
- GitHub contributors page

Thank you for contributing! 🎉
