# GitHub Configuration

This directory contains GitHub-specific configuration files for the @ai-agent/core repository.

## Directory Structure

```
.github/
├── workflows/           # GitHub Actions workflows
│   ├── ci.yml          # Continuous Integration
│   ├── publish.yml     # npm publishing on release
│   └── release.yml     # Automated semantic releases
├── ISSUE_TEMPLATE/     # Issue templates
│   ├── bug_report.yml  # Bug report template
│   ├── feature_request.yml  # Feature request template
│   └── config.yml      # Issue template configuration
├── pull_request_template.md  # PR template
└── README.md           # This file
```

## Workflows

### CI Workflow (`ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
- **Test**: Runs tests on Node.js 18.x and 20.x
  - Linting
  - Type checking
  - Unit tests
  - Coverage upload to Codecov
- **Build**: Builds the package and checks size

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

### Publish Workflow (`publish.yml`)

Publishes the package to npm when a GitHub release is published.

**Jobs:**
- Run tests
- Build package
- Publish to npm with provenance
- Upload tarball to GitHub release

**Triggers:**
- GitHub release published

**Required Secrets:**
- `NPM_TOKEN`: npm authentication token

### Release Workflow (`release.yml`)

Automated semantic versioning and releasing.

**Jobs:**
- Run tests
- Build package
- Analyze commits
- Determine version bump
- Generate changelog
- Create GitHub release
- Publish to npm

**Triggers:**
- Push to `main` branch

**Required Secrets:**
- `GITHUB_TOKEN`: Automatically provided
- `NPM_TOKEN`: npm authentication token

## Issue Templates

### Bug Report (`bug_report.yml`)

Structured form for reporting bugs with fields for:
- Description
- Steps to reproduce
- Expected vs actual behavior
- Code sample
- Version information
- Environment details
- Error logs

### Feature Request (`feature_request.yml`)

Structured form for suggesting features with fields for:
- Problem statement
- Proposed solution
- Alternatives considered
- Use case
- Example API
- Priority
- Contribution willingness

### Configuration (`config.yml`)

Disables blank issues and provides links to:
- Documentation
- Discussions
- Discord community

## Pull Request Template

Provides a structured format for PRs including:
- Description
- Type of change
- Related issues
- Changes made
- Testing details
- Documentation updates
- Breaking changes
- Checklist

## Setup Instructions

### 1. Enable GitHub Actions

Navigate to: `Settings > Actions > General`

**Actions permissions:**
- ✅ Allow all actions and reusable workflows

**Workflow permissions:**
- ✅ Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests

### 2. Configure Secrets

Navigate to: `Settings > Secrets and variables > Actions`

Add the following secrets:
- `NPM_TOKEN`: Your npm authentication token

### 3. Enable Branch Protection

See [REPOSITORY_SETUP.md](../REPOSITORY_SETUP.md) for detailed branch protection rules.

### 4. Enable Discussions

Navigate to: `Settings > General > Features`
- ✅ Discussions

### 5. Configure Codecov (Optional)

1. Sign up at https://codecov.io/
2. Add repository
3. Add `CODECOV_TOKEN` to GitHub secrets

## Customization

### Modifying Workflows

Edit workflow files in `.github/workflows/` to customize:
- Node.js versions to test
- Test commands
- Build steps
- Deployment targets

### Modifying Issue Templates

Edit template files in `.github/ISSUE_TEMPLATE/` to:
- Add/remove fields
- Change labels
- Update descriptions

### Modifying PR Template

Edit `.github/pull_request_template.md` to customize the PR checklist and sections.

## Troubleshooting

### Workflow Fails

**Check:**
1. Secrets are configured correctly
2. Workflow permissions are set
3. Branch protection rules don't block CI
4. Dependencies are up to date

### npm Publish Fails

**Check:**
1. `NPM_TOKEN` is valid and has publish permissions
2. Package name is available on npm
3. Version number is not already published
4. Package.json is correctly configured

### Release Not Created

**Check:**
1. Commit messages follow conventional commits format
2. `.releaserc.json` is correctly configured
3. semantic-release dependencies are installed
4. GitHub token has correct permissions

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Release](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [npm Publishing](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
