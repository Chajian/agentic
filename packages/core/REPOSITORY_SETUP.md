# Repository Setup Guide

This document provides instructions for setting up the independent @ai-agent/core repository with proper branch protection, CI/CD, and community guidelines.

## Table of Contents

1. [Creating the Repository](#creating-the-repository)
2. [Branch Protection Rules](#branch-protection-rules)
3. [GitHub Actions Secrets](#github-actions-secrets)
4. [Repository Settings](#repository-settings)
5. [Community Health Files](#community-health-files)
6. [Initial Release](#initial-release)

## Creating the Repository

### 1. Create New Repository on GitHub

```bash
# Option 1: Using GitHub CLI
gh repo create ai-agent-core --public --description "Production-ready AI agent framework for Node.js/TypeScript"

# Option 2: Via GitHub Web UI
# Go to https://github.com/new
# Repository name: ai-agent-core
# Description: Production-ready AI agent framework for Node.js/TypeScript
# Visibility: Public
# Initialize with: None (we'll push existing code)
```

### 2. Push Existing Code

```bash
# Navigate to the agent package directory
cd xiancore-dashboard/packages/agent

# Initialize git if not already done
git init

# Add remote
git remote add origin https://github.com/your-org/ai-agent-core.git

# Create main branch
git checkout -b main

# Add all files
git add .

# Initial commit
git commit -m "feat: initial release of @ai-agent/core"

# Push to GitHub
git push -u origin main
```

## Branch Protection Rules

### Main Branch Protection

Configure the following rules for the `main` branch:

#### Via GitHub CLI

```bash
gh api repos/your-org/ai-agent-core/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test","build"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

#### Via GitHub Web UI

Navigate to: `Settings > Branches > Add rule`

**Branch name pattern:** `main`

**Protect matching branches:**
- ✅ Require a pull request before merging
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (optional)
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Required status checks:
    - `test` (from CI workflow)
    - `build` (from CI workflow)
- ✅ Require conversation resolution before merging
- ✅ Require signed commits (recommended)
- ✅ Require linear history
- ✅ Include administrators
- ✅ Restrict who can push to matching branches (optional)
- ✅ Allow force pushes: Never
- ✅ Allow deletions: Never

### Develop Branch Protection (Optional)

If using a develop branch for pre-release work:

**Branch name pattern:** `develop`

**Protect matching branches:**
- ✅ Require a pull request before merging
  - ✅ Require approvals: 1
- ✅ Require status checks to pass before merging
  - Required status checks: `test`, `build`
- ✅ Require linear history
- ✅ Allow force pushes: Never

## GitHub Actions Secrets

Configure the following secrets in repository settings:

### Required Secrets

Navigate to: `Settings > Secrets and variables > Actions > New repository secret`

1. **NPM_TOKEN**
   - Description: npm authentication token for publishing
   - How to get:
     ```bash
     npm login
     npm token create --read-only=false
     ```
   - Add the token to GitHub secrets

2. **GITHUB_TOKEN** (automatically provided)
   - No action needed, GitHub provides this automatically

### Optional Secrets

3. **CODECOV_TOKEN** (if using Codecov)
   - Get from: https://codecov.io/
   - Add to repository secrets

4. **DISCORD_WEBHOOK** (for release notifications)
   - Get from Discord server settings
   - Add to repository secrets

## Repository Settings

### General Settings

Navigate to: `Settings > General`

**Features:**
- ✅ Issues
- ✅ Discussions (recommended)
- ✅ Projects (optional)
- ✅ Wiki (optional)
- ✅ Sponsorships (optional)

**Pull Requests:**
- ✅ Allow squash merging
- ✅ Default to pull request title for squash merge commits
- ✅ Allow merge commits (optional)
- ❌ Allow rebase merging (to maintain linear history)
- ✅ Always suggest updating pull request branches
- ✅ Automatically delete head branches

**Archives:**
- ❌ Include Git LFS objects in archives

### Collaborators and Teams

Navigate to: `Settings > Collaborators and teams`

Add team members with appropriate permissions:
- **Maintainers:** Admin access
- **Core Contributors:** Write access
- **Community Contributors:** Via pull requests

### GitHub Pages (for documentation)

Navigate to: `Settings > Pages`

**Source:**
- Branch: `gh-pages` (will be created by docs deployment)
- Folder: `/ (root)`

**Custom domain:** (optional)
- docs.your-domain.com

### Webhooks (optional)

Navigate to: `Settings > Webhooks`

Add webhooks for:
- Discord notifications
- Slack notifications
- Custom CI/CD systems

## Community Health Files

The following files are already included in the repository:

### ✅ CODE_OF_CONDUCT.md
Defines community standards and behavior expectations.

### ✅ CONTRIBUTING.md
Provides guidelines for contributing to the project.

### ✅ Issue Templates
Located in `.github/ISSUE_TEMPLATE/`:
- `bug_report.yml` - Bug report template
- `feature_request.yml` - Feature request template
- `config.yml` - Issue template configuration

### ✅ Pull Request Template
Located at `.github/pull_request_template.md`

### ✅ GitHub Actions Workflows
Located in `.github/workflows/`:
- `ci.yml` - Continuous integration
- `publish.yml` - npm publishing
- `release.yml` - Automated releases

### Additional Recommended Files

Create these files in the repository root:

#### SECURITY.md

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Please report security vulnerabilities to security@your-org.com

Do not open public issues for security vulnerabilities.

We will respond within 48 hours and provide updates every 5 days.
```

#### SUPPORT.md

```markdown
# Support

## Getting Help

- 📖 [Documentation](https://github.com/your-org/ai-agent-core/wiki)
- 💬 [Discussions](https://github.com/your-org/ai-agent-core/discussions)
- 💭 [Discord Community](https://discord.gg/your-invite)
- 🐛 [Issue Tracker](https://github.com/your-org/ai-agent-core/issues)

## Commercial Support

For commercial support, please contact: support@your-org.com
```

## Initial Release

### 1. Verify Package Configuration

Check `package.json`:

```json
{
  "name": "@ai-agent/core",
  "version": "0.0.0-development",
  "description": "Production-ready AI agent framework for Node.js/TypeScript",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/ai-agent-core.git"
  },
  "bugs": {
    "url": "https://github.com/your-org/ai-agent-core/issues"
  },
  "homepage": "https://github.com/your-org/ai-agent-core#readme"
}
```

### 2. Install Semantic Release Dependencies

```bash
npm install --save-dev \
  semantic-release \
  @semantic-release/changelog \
  @semantic-release/git \
  @semantic-release/github \
  @semantic-release/npm \
  conventional-changelog-conventionalcommits
```

### 3. Create Initial Release

```bash
# Ensure all tests pass
npm test

# Build the package
npm run build

# Create a release commit
git add .
git commit -m "feat: initial release

BREAKING CHANGE: Initial release of @ai-agent/core as standalone package"

# Push to trigger release
git push origin main
```

The GitHub Actions workflow will:
1. Run tests
2. Build the package
3. Analyze commits
4. Determine version (1.0.0 for initial release with BREAKING CHANGE)
5. Generate changelog
6. Publish to npm
7. Create GitHub release

### 4. Verify Release

Check:
- ✅ GitHub release created
- ✅ Package published to npm: https://www.npmjs.com/package/@ai-agent/core
- ✅ CHANGELOG.md updated
- ✅ Version bumped in package.json

## Post-Setup Tasks

### 1. Enable GitHub Discussions

Navigate to: `Settings > General > Features`
- ✅ Enable Discussions
- Create categories: Announcements, Q&A, Ideas, Show and Tell

### 2. Add Repository Topics

Navigate to: Repository home page > About > Settings (gear icon)

Add topics:
- `ai`
- `agent`
- `llm`
- `openai`
- `anthropic`
- `typescript`
- `nodejs`
- `rag`
- `chatbot`

### 3. Create Documentation Site

```bash
# Install VitePress
npm install -D vitepress

# Initialize docs
npx vitepress init

# Deploy to GitHub Pages
npm run docs:build
git checkout -b gh-pages
cp -r docs/.vitepress/dist/* .
git add .
git commit -m "docs: deploy documentation"
git push origin gh-pages
```

### 4. Set Up Monitoring

- Enable Dependabot for security updates
- Set up CodeQL for code scanning
- Configure branch protection insights
- Enable repository insights

### 5. Community Engagement

- Pin important issues
- Create project boards for roadmap
- Set up GitHub Sponsors (optional)
- Announce on social media
- Submit to package directories

## Maintenance

### Regular Tasks

- Review and merge Dependabot PRs
- Triage new issues weekly
- Review pull requests promptly
- Update documentation
- Monitor CI/CD pipelines
- Check security advisories

### Release Process

Releases are automated via semantic-release:

1. Merge PRs to `main`
2. CI runs automatically
3. Version determined by commit messages
4. Package published to npm
5. GitHub release created
6. Changelog updated

### Version Bumping

Commit message format determines version bump:

- `feat:` → Minor version (0.1.0 → 0.2.0)
- `fix:` → Patch version (0.1.0 → 0.1.1)
- `BREAKING CHANGE:` → Major version (0.1.0 → 1.0.0)

## Troubleshooting

### CI Fails on First Run

- Verify all secrets are configured
- Check workflow permissions in Settings > Actions
- Ensure branch protection rules don't block CI

### npm Publish Fails

- Verify NPM_TOKEN is valid
- Check package name is available
- Ensure you have publish permissions

### Release Not Created

- Check commit message format
- Verify semantic-release configuration
- Review GitHub Actions logs

## Resources

- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Semantic Release](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [npm Publishing](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
