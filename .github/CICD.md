# CI/CD Pipeline Documentation

This document describes the automated CI/CD pipelines for the @ai-agent/core package.

## Overview

The project uses GitHub Actions for continuous integration and deployment, with semantic-release for automated versioning and publishing.

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### Test Job
- Runs on Node.js 18.x and 20.x
- Executes linting (with soft failure)
- Runs type checking
- Executes unit tests
- Executes property-based tests
- Generates coverage reports
- Uploads coverage to Codecov (Node 20.x only)
- Archives test results

#### Build Job
- Builds the package
- Verifies build output (dist directory, index.js, index.d.ts)
- Checks package size (warns if > 10MB)
- Uploads build artifacts

#### Validate Job
- Validates package.json structure
- Runs security audit
- Verifies prepublishOnly script

**Required Secrets:**
- None (uses default GITHUB_TOKEN)

### 2. Release Workflow (`release.yml`)

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch (with optional dry-run mode)

**Process:**
1. Runs all tests and type checks
2. Builds the package
3. Verifies build output
4. Runs semantic-release to:
   - Analyze commits using conventional commits
   - Determine next version number
   - Generate changelog
   - Update package.json
   - Create Git tag
   - Publish to npm
   - Create GitHub release
   - Commit changelog and version bump

**Required Secrets:**
- `NPM_TOKEN`: npm authentication token with publish permissions
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

**Permissions:**
- `contents: write` - To push commits and tags
- `issues: write` - To comment on issues
- `pull-requests: write` - To comment on PRs
- `id-token: write` - For npm provenance

### 3. Publish Workflow (`publish.yml`)

**Triggers:**
- GitHub release published
- Manual workflow dispatch (with tag input)

**Process:**
1. Checks out the release tag
2. Runs tests and type checks
3. Builds the package
4. Verifies package contents
5. Publishes to npm with provenance
6. Uploads tarball to GitHub release

**Required Secrets:**
- `NPM_TOKEN`: npm authentication token
- `GITHUB_TOKEN`: For uploading release assets

### 4. Security Audit Workflow (`security.yml`)

**Triggers:**
- Weekly schedule (Mondays at 9:00 AM UTC)
- Manual workflow dispatch
- Pull requests that modify package.json or package-lock.json

**Process:**
1. Runs npm audit (moderate level)
2. Runs npm audit for production dependencies (high level)
3. Checks for outdated dependencies
4. Generates and uploads audit report

**Required Secrets:**
- None

## Semantic Versioning

The project follows [Semantic Versioning 2.0.0](https://semver.org/):

- **Major version** (X.0.0): Breaking changes
- **Minor version** (0.X.0): New features (backward compatible)
- **Patch version** (0.0.X): Bug fixes (backward compatible)

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types that trigger releases:**
- `feat`: New feature → Minor version bump
- `fix`: Bug fix → Patch version bump
- `perf`: Performance improvement → Patch version bump
- `revert`: Revert previous commit → Patch version bump
- `docs`: Documentation → Patch version bump
- `refactor`: Code refactoring → Patch version bump

**Types that don't trigger releases:**
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks

**Breaking changes:**
- Add `BREAKING CHANGE:` in commit footer → Major version bump
- Or use `!` after type: `feat!: breaking change`

### Examples

```bash
# Minor version bump (new feature)
git commit -m "feat: add streaming support for LLM responses"

# Patch version bump (bug fix)
git commit -m "fix: resolve memory leak in knowledge store"

# Major version bump (breaking change)
git commit -m "feat!: change Agent constructor signature

BREAKING CHANGE: Agent now requires explicit configuration object"

# No release
git commit -m "test: add property tests for plugin system"
```

## Changelog Generation

The changelog is automatically generated from commit messages and includes:

- ✨ Features
- 🐛 Bug Fixes
- ⚡ Performance Improvements
- ⏪ Reverts
- 📚 Documentation
- ♻️ Code Refactoring

The changelog is:
- Generated in `CHANGELOG.md`
- Committed back to the repository
- Included in GitHub releases
- Uploaded as a release asset

## Dependency Management

### Dependabot

Dependabot is configured to:
- Check for npm dependency updates weekly (Mondays)
- Check for GitHub Actions updates weekly
- Group patch updates together
- Group minor updates together
- Group development dependencies
- Ignore major version updates (manual review required)

### Security Audits

Security audits run:
- Weekly on schedule
- On every PR that modifies dependencies
- Can be triggered manually

## Required Repository Secrets

To enable full CI/CD functionality, configure these secrets in your GitHub repository:

1. **NPM_TOKEN**
   - Go to npmjs.com → Account Settings → Access Tokens
   - Create a new "Automation" token
   - Add to GitHub: Settings → Secrets → Actions → New repository secret
   - Name: `NPM_TOKEN`

2. **GITHUB_TOKEN**
   - Automatically provided by GitHub Actions
   - No configuration needed

## Branch Protection Rules

Recommended branch protection for `main`:

- ✅ Require pull request reviews (1 approver)
- ✅ Require status checks to pass:
  - `test` (Node 18.x)
  - `test` (Node 20.x)
  - `build`
  - `validate`
- ✅ Require branches to be up to date
- ✅ Require conversation resolution
- ✅ Do not allow bypassing the above settings

## Manual Release Process

If you need to manually trigger a release:

1. **Dry Run (Test)**
   ```bash
   # Via GitHub UI
   Actions → Release → Run workflow → Set dry_run to 'true'
   ```

2. **Actual Release**
   ```bash
   # Ensure you're on main branch
   git checkout main
   git pull origin main
   
   # Push commits with conventional commit messages
   git push origin main
   
   # Release workflow will trigger automatically
   ```

3. **Manual Publish**
   ```bash
   # Via GitHub UI
   Actions → Publish to npm → Run workflow → Enter tag name
   ```

## Troubleshooting

### Release Not Triggering

**Problem:** Pushed to main but no release created

**Solutions:**
- Check commit messages follow conventional commits format
- Ensure commits include releasable types (feat, fix, etc.)
- Check GitHub Actions logs for errors
- Verify NPM_TOKEN is valid

### npm Publish Fails

**Problem:** Release created but npm publish fails

**Solutions:**
- Verify NPM_TOKEN has publish permissions
- Check package name is available on npm
- Ensure package.json version doesn't already exist
- Check npm registry status

### Tests Failing in CI

**Problem:** Tests pass locally but fail in CI

**Solutions:**
- Check Node.js version matches CI (18.x or 20.x)
- Verify all dependencies are in package.json
- Check for environment-specific issues
- Review CI logs for specific error messages

### Coverage Upload Fails

**Problem:** Codecov upload fails

**Solutions:**
- Verify coverage files are generated
- Check Codecov token (if required)
- Review Codecov service status
- Check file paths in workflow

## Best Practices

1. **Commit Messages**
   - Always use conventional commit format
   - Write clear, descriptive messages
   - Include scope when relevant
   - Document breaking changes properly

2. **Pull Requests**
   - Ensure all CI checks pass
   - Keep PRs focused and small
   - Update documentation as needed
   - Add tests for new features

3. **Releases**
   - Let semantic-release handle versioning
   - Don't manually edit version in package.json
   - Review generated changelog before merging
   - Test releases in dry-run mode first

4. **Security**
   - Keep dependencies up to date
   - Review Dependabot PRs promptly
   - Address security audit findings
   - Use npm audit before releases

## Monitoring

Monitor CI/CD health through:

- **GitHub Actions**: Check workflow runs and logs
- **npm**: Monitor package downloads and versions
- **Codecov**: Track test coverage trends
- **Dependabot**: Review dependency update PRs
- **Security Audits**: Check weekly audit reports

## Support

For CI/CD issues:
1. Check this documentation
2. Review GitHub Actions logs
3. Check semantic-release documentation
4. Open an issue with CI/CD label
