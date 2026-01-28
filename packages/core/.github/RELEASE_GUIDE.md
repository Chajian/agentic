# Release Guide

Quick reference for releasing new versions of @ai-agent/core.

## Automated Release Process

The release process is **fully automated** using semantic-release. You just need to follow the commit message conventions.

### Step-by-Step

1. **Make your changes**
   ```bash
   # Create a feature branch
   git checkout -b feat/my-new-feature
   
   # Make your changes
   # ... edit files ...
   
   # Commit with conventional commit message
   git commit -m "feat: add new feature"
   ```

2. **Create Pull Request**
   - Push your branch to GitHub
   - Create a PR to `main` branch
   - Wait for CI checks to pass
   - Get approval from maintainers

3. **Merge to Main**
   - Merge the PR (use "Squash and merge" or "Rebase and merge")
   - Ensure the merge commit follows conventional commits format

4. **Automatic Release**
   - Release workflow triggers automatically
   - semantic-release analyzes commits
   - Version is bumped automatically
   - Changelog is generated
   - Package is published to npm
   - GitHub release is created

## Commit Message Format

### Format
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types and Version Bumps

| Type | Version Bump | Example |
|------|--------------|---------|
| `feat` | Minor (0.X.0) | `feat: add streaming support` |
| `fix` | Patch (0.0.X) | `fix: resolve memory leak` |
| `perf` | Patch (0.0.X) | `perf: optimize search algorithm` |
| `docs` | Patch (0.0.X) | `docs: update API documentation` |
| `refactor` | Patch (0.0.X) | `refactor: simplify plugin loading` |
| `test` | No release | `test: add property tests` |
| `chore` | No release | `chore: update dependencies` |
| `ci` | No release | `ci: update workflow` |
| `BREAKING` | Major (X.0.0) | See below |

### Breaking Changes

To trigger a major version bump, use one of these formats:

**Option 1: Exclamation mark**
```bash
git commit -m "feat!: change Agent constructor signature"
```

**Option 2: Footer**
```bash
git commit -m "feat: change Agent constructor signature

BREAKING CHANGE: Agent now requires explicit configuration object instead of individual parameters"
```

### Scopes (Optional)

Add scope to provide more context:

```bash
git commit -m "feat(plugin): add lifecycle hooks"
git commit -m "fix(llm): handle rate limiting errors"
git commit -m "docs(api): update Agent class documentation"
```

Common scopes:
- `core` - Core agent functionality
- `plugin` - Plugin system
- `llm` - LLM provider integration
- `knowledge` - Knowledge store and RAG
- `api` - Public API changes
- `types` - TypeScript types
- `deps` - Dependencies

## Examples

### Adding a New Feature
```bash
git commit -m "feat: add support for custom embedding providers

Allows users to provide their own embedding generation function
for the knowledge store, enabling integration with any embedding API."
```

**Result:** Minor version bump (e.g., 1.2.0 → 1.3.0)

### Fixing a Bug
```bash
git commit -m "fix: prevent memory leak in streaming responses

Properly cleanup event listeners when streaming is cancelled
or completes to avoid memory accumulation."
```

**Result:** Patch version bump (e.g., 1.2.0 → 1.2.1)

### Breaking Change
```bash
git commit -m "feat!: redesign plugin API for better type safety

BREAKING CHANGE: Plugin interface now requires explicit type
parameters for tool definitions. Update your plugins:

Before:
  registerTool({ name: 'myTool', ... })

After:
  registerTool<MyToolParams>({ name: 'myTool', ... })"
```

**Result:** Major version bump (e.g., 1.2.0 → 2.0.0)

### Documentation Update
```bash
git commit -m "docs: add examples for streaming events

Added code examples showing how to handle streaming events
in the Agent usage guide."
```

**Result:** Patch version bump (e.g., 1.2.0 → 1.2.1)

### No Release
```bash
git commit -m "test: add property tests for plugin lifecycle

Added fast-check property tests to verify plugin initialization
and cleanup hooks are called in correct order."
```

**Result:** No release (tests don't trigger releases)

## Pre-Release Testing

### Dry Run

Test the release process without actually publishing:

1. Go to GitHub Actions
2. Select "Release" workflow
3. Click "Run workflow"
4. Set `dry_run` to `true`
5. Click "Run workflow"

This will:
- Run all tests
- Build the package
- Analyze commits
- Show what version would be released
- Generate changelog preview
- **NOT** publish to npm or create release

### Local Testing

Test semantic-release locally:

```bash
# Install semantic-release CLI
npm install -g semantic-release-cli

# Dry run
npx semantic-release --dry-run --no-ci

# This shows:
# - Next version number
# - Generated changelog
# - What would be published
```

## Manual Release (Emergency)

If automated release fails, you can manually release:

### 1. Update Version
```bash
# Don't use npm version! It will create a commit
# Instead, manually edit package.json
```

### 2. Generate Changelog
```bash
# Use conventional-changelog
npx conventional-changelog -p angular -i CHANGELOG.md -s
```

### 3. Commit and Tag
```bash
git add package.json CHANGELOG.md
git commit -m "chore(release): 1.2.3 [skip ci]"
git tag v1.2.3
git push origin main --tags
```

### 4. Publish to npm
```bash
npm publish --access public
```

### 5. Create GitHub Release
- Go to GitHub Releases
- Click "Draft a new release"
- Select the tag you created
- Copy changelog content
- Publish release

## Troubleshooting

### "No release published"

**Cause:** No commits since last release trigger a release

**Solution:** 
- Check commit messages follow conventional format
- Ensure commits include releasable types (feat, fix, etc.)
- Use `git log` to verify commit messages

### "npm publish failed"

**Cause:** npm authentication or permissions issue

**Solution:**
- Verify NPM_TOKEN secret is set correctly
- Check token has publish permissions
- Ensure package name is available
- Verify you're not republishing same version

### "Tests failed in CI"

**Cause:** Tests pass locally but fail in CI

**Solution:**
- Check Node.js version matches CI (18.x or 20.x)
- Run `npm ci` instead of `npm install` locally
- Check for environment-specific issues
- Review CI logs for details

## Version Strategy

### Current Version: 1.0.0

- **Patch (1.0.X)**: Bug fixes, documentation, refactoring
- **Minor (1.X.0)**: New features, backward compatible
- **Major (X.0.0)**: Breaking changes

### Pre-1.0.0 (If applicable)

During initial development (0.x.x):
- Breaking changes can be minor bumps
- More flexibility in API changes
- Once stable, release 1.0.0

### Post-1.0.0

After 1.0.0 release:
- Follow strict semantic versioning
- Breaking changes require major bump
- Maintain backward compatibility in minor/patch

## Best Practices

1. **Write Clear Commit Messages**
   - Use present tense ("add" not "added")
   - Be specific and descriptive
   - Include context in body if needed

2. **Group Related Changes**
   - One logical change per commit
   - Use scope to categorize changes
   - Keep commits focused

3. **Document Breaking Changes**
   - Always include BREAKING CHANGE footer
   - Explain what changed and why
   - Provide migration instructions

4. **Test Before Merging**
   - Ensure all CI checks pass
   - Run tests locally
   - Test in example projects

5. **Review Generated Changelog**
   - Check changelog makes sense
   - Verify version bump is correct
   - Ensure breaking changes are highlighted

## Changelog Format

The generated changelog follows this format:

```markdown
# Changelog

## [1.2.0](https://github.com/.../compare/v1.1.0...v1.2.0) (2024-01-27)

### ✨ Features

* add streaming support ([abc123](https://github.com/.../commit/abc123))
* add custom embedding providers ([def456](https://github.com/.../commit/def456))

### 🐛 Bug Fixes

* resolve memory leak in streaming ([ghi789](https://github.com/.../commit/ghi789))

### 📚 Documentation

* update API documentation ([jkl012](https://github.com/.../commit/jkl012))
```

## Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [semantic-release](https://github.com/semantic-release/semantic-release)
- [Changelog Format](https://keepachangelog.com/)

## Questions?

- Check [CICD.md](./CICD.md) for detailed CI/CD documentation
- Review [semantic-release docs](https://semantic-release.gitbook.io/)
- Open an issue with `release` label
