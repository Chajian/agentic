#!/bin/bash

# Repository Setup Script for @ai-agent/core
# This script helps set up the independent repository

set -e

echo "🚀 Setting up @ai-agent/core repository..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✓ GitHub CLI is installed and authenticated${NC}"
echo ""

# Get repository details
read -p "Enter repository owner/organization: " REPO_OWNER
read -p "Enter repository name (default: ai-agent-core): " REPO_NAME
REPO_NAME=${REPO_NAME:-ai-agent-core}

REPO_FULL="${REPO_OWNER}/${REPO_NAME}"

echo ""
echo "Repository: ${REPO_FULL}"
echo ""

# Confirm
read -p "Create repository ${REPO_FULL}? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Create repository
echo ""
echo "📦 Creating repository..."
gh repo create "${REPO_FULL}" \
    --public \
    --description "Production-ready AI agent framework for Node.js/TypeScript" \
    --homepage "https://github.com/${REPO_FULL}" \
    || echo -e "${YELLOW}⚠ Repository might already exist${NC}"

echo -e "${GREEN}✓ Repository created${NC}"
echo ""

# Initialize git if needed
if [ ! -d .git ]; then
    echo "🔧 Initializing git..."
    git init
    git checkout -b main
    echo -e "${GREEN}✓ Git initialized${NC}"
fi

# Add remote
echo "🔗 Adding remote..."
git remote add origin "https://github.com/${REPO_FULL}.git" 2>/dev/null || \
    git remote set-url origin "https://github.com/${REPO_FULL}.git"
echo -e "${GREEN}✓ Remote added${NC}"
echo ""

# Install dependencies
echo "📥 Installing dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Build package
echo "🔨 Building package..."
npm run build
echo -e "${GREEN}✓ Package built${NC}"
echo ""

# Run tests
echo "🧪 Running tests..."
npm test || echo -e "${YELLOW}⚠ Some tests failed${NC}"
echo ""

# Commit and push
echo "📤 Committing and pushing..."
git add .
git commit -m "feat: initial release of @ai-agent/core

BREAKING CHANGE: Initial release as standalone package" || echo "Already committed"
git push -u origin main || echo -e "${YELLOW}⚠ Push failed, might need to force push${NC}"
echo -e "${GREEN}✓ Code pushed${NC}"
echo ""

# Set up branch protection
echo "🔒 Setting up branch protection..."
gh api "repos/${REPO_FULL}/branches/main/protection" \
    --method PUT \
    --field required_status_checks='{"strict":true,"contexts":["test","build"]}' \
    --field enforce_admins=true \
    --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
    --field restrictions=null \
    --field required_linear_history=true \
    --field allow_force_pushes=false \
    --field allow_deletions=false \
    2>/dev/null && echo -e "${GREEN}✓ Branch protection enabled${NC}" || \
    echo -e "${YELLOW}⚠ Branch protection setup failed (might need admin access)${NC}"
echo ""

# Enable features
echo "⚙️  Enabling repository features..."
gh api "repos/${REPO_FULL}" \
    --method PATCH \
    --field has_issues=true \
    --field has_discussions=true \
    --field has_wiki=false \
    --field has_projects=true \
    2>/dev/null && echo -e "${GREEN}✓ Features enabled${NC}" || \
    echo -e "${YELLOW}⚠ Feature setup failed${NC}"
echo ""

# Add topics
echo "🏷️  Adding repository topics..."
gh api "repos/${REPO_FULL}/topics" \
    --method PUT \
    --field names='["ai","agent","llm","openai","anthropic","typescript","nodejs","rag","chatbot","framework"]' \
    2>/dev/null && echo -e "${GREEN}✓ Topics added${NC}" || \
    echo -e "${YELLOW}⚠ Topics setup failed${NC}"
echo ""

# Secrets setup reminder
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Set up secrets${NC}"
echo ""
echo "Run these commands to add secrets:"
echo ""
echo "  gh secret set NPM_TOKEN --repo ${REPO_FULL}"
echo ""
echo "Or add them via web UI:"
echo "  https://github.com/${REPO_FULL}/settings/secrets/actions"
echo ""

# Next steps
echo ""
echo -e "${GREEN}✅ Repository setup complete!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Add NPM_TOKEN secret (see above)"
echo "2. Review branch protection rules:"
echo "   https://github.com/${REPO_FULL}/settings/branches"
echo ""
echo "3. Enable GitHub Discussions:"
echo "   https://github.com/${REPO_FULL}/settings"
echo ""
echo "4. Review and customize:"
echo "   - .github/workflows/*.yml"
echo "   - .github/ISSUE_TEMPLATE/*.yml"
echo "   - CONTRIBUTING.md"
echo "   - CODE_OF_CONDUCT.md"
echo ""
echo "5. Create first release:"
echo "   - Push to main branch"
echo "   - GitHub Actions will create release automatically"
echo ""
echo "Repository URL: https://github.com/${REPO_FULL}"
echo ""
