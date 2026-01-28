# Quick Start: Setting Up Independent Repository

This guide provides the fastest way to set up the @ai-agent/core independent repository.

## Prerequisites

- [GitHub CLI](https://cli.github.com/) installed and authenticated
- [Node.js](https://nodejs.org/) 18.x or higher
- [npm](https://www.npmjs.com/) 9.x or higher
- npm account with publish permissions

## Option 1: Automated Setup (Recommended)

### Linux/macOS

```bash
cd xiancore-dashboard/packages/agent
chmod +x scripts/setup-repository.sh
./scripts/setup-repository.sh
```

### Windows

```cmd
cd xiancore-dashboard\packages\agent
scripts\setup-repository.bat
```

The script will:
1. ✅ Create GitHub repository
2. ✅ Initialize git and add remote
3. ✅ Install dependencies
4. ✅ Build and test package
5. ✅ Push initial commit
6. ✅ Configure branch protection
7. ✅ Enable repository features
8. ✅ Add repository topics

## Option 2: Manual Setup

### Step 1: Create Repository

```bash
# Using GitHub CLI
gh repo create your-org/ai-agent-core \
  --public \
  --description "Production-ready AI agent framework for Node.js/TypeScript"

# Or via web: https://github.com/new
```

### Step 2: Initialize and Push

```bash
cd xiancore-dashboard/packages/agent

# Initialize git
git init
git checkout -b main

# Add remote
git remote add origin https://github.com/your-org/ai-agent-core.git

# Install and build
npm install
npm run build
npm test

# Commit and push
git add .
git commit -m "feat: initial release of @ai-agent/core

BREAKING CHANGE: Initial release as standalone package"
git push -u origin main
```

### Step 3: Configure Secrets

```bash
# Add npm token
gh secret set NPM_TOKEN --repo your-org/ai-agent-core

# Or via web UI:
# https://github.com/your-org/ai-agent-core/settings/secrets/actions
```

### Step 4: Set Branch Protection

Navigate to: `https://github.com/your-org/ai-agent-core/settings/branches`

Add rule for `main` branch:
- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks: `test`, `build`
- ✅ Require linear history
- ✅ Include administrators

### Step 5: Enable Features

Navigate to: `https://github.com/your-org/ai-agent-core/settings`

Enable:
- ✅ Issues
- ✅ Discussions
- ✅ Projects (optional)

## Post-Setup

### 1. Verify CI/CD

Create a test PR to verify CI runs:

```bash
git checkout -b test-ci
echo "# Test" >> README.md
git commit -am "test: verify CI"
git push origin test-ci
gh pr create --title "Test CI" --body "Testing CI workflow"
```

### 2. Create First Release

The first push to `main` will trigger an automatic release:

```bash
# Already done if you followed setup steps
# Check releases: https://github.com/your-org/ai-agent-core/releases
```

### 3. Verify npm Package

```bash
# Check if package is published
npm view @ai-agent/core

# Or visit: https://www.npmjs.com/package/@ai-agent/core
```

### 4. Set Up Documentation (Optional)

```bash
# Install VitePress
npm install -D vitepress

# Initialize docs
npx vitepress init

# Deploy to GitHub Pages
npm run docs:build
```

## Troubleshooting

### "gh: command not found"

Install GitHub CLI:
- **macOS**: `brew install gh`
- **Linux**: See https://github.com/cli/cli/blob/trunk/docs/install_linux.md
- **Windows**: Download from https://cli.github.com/

### "Not authenticated with GitHub CLI"

```bash
gh auth login
```

### "npm publish failed"

1. Verify NPM_TOKEN is set:
   ```bash
   gh secret list --repo your-org/ai-agent-core
   ```

2. Check npm token is valid:
   ```bash
   npm whoami
   ```

3. Verify package name is available:
   ```bash
   npm view @ai-agent/core
   # Should return 404 if available
   ```

### "Branch protection failed"

You need admin access to the repository. Either:
1. Request admin access from repository owner
2. Configure manually via web UI

### "CI workflow not running"

1. Check workflow permissions:
   - Settings > Actions > General
   - Enable "Read and write permissions"

2. Verify workflows are enabled:
   - Actions tab > Enable workflows

## Next Steps

1. **Customize Configuration**
   - Update `.github/workflows/*.yml` for your needs
   - Modify issue templates
   - Update CONTRIBUTING.md

2. **Set Up Monitoring**
   - Enable Dependabot
   - Configure CodeQL scanning
   - Set up Codecov (optional)

3. **Community Engagement**
   - Create discussion categories
   - Pin important issues
   - Set up project boards

4. **Documentation**
   - Create documentation site
   - Write tutorials and guides
   - Add more examples

## Resources

- **Full Setup Guide**: [REPOSITORY_SETUP.md](REPOSITORY_SETUP.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **GitHub Actions**: [.github/README.md](.github/README.md)
- **Security**: [SECURITY.md](SECURITY.md)
- **Support**: [SUPPORT.md](SUPPORT.md)

## Quick Commands Reference

```bash
# Create repository
gh repo create your-org/ai-agent-core --public

# Add secret
gh secret set NPM_TOKEN --repo your-org/ai-agent-core

# Create PR
gh pr create --title "Title" --body "Description"

# View releases
gh release list --repo your-org/ai-agent-core

# View workflows
gh workflow list --repo your-org/ai-agent-core

# View workflow runs
gh run list --repo your-org/ai-agent-core

# View repository
gh repo view your-org/ai-agent-core --web
```

## Support

Need help? Check:
- [SUPPORT.md](SUPPORT.md) for support options
- [GitHub Discussions](https://github.com/your-org/ai-agent-core/discussions)
- [Discord Community](https://discord.gg/your-invite)

---

**Ready to go!** 🚀

Your repository is now set up with professional CI/CD, automated releases, and comprehensive community guidelines.
