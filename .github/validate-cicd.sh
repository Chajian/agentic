#!/bin/bash

# CI/CD Configuration Validation Script
# This script validates that all CI/CD components are properly configured

set -e

echo "🔍 Validating CI/CD Configuration..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Check function
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1"
        ((FAILED++))
    fi
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# 1. Check workflow files exist
echo "📁 Checking workflow files..."
test -f .github/workflows/ci.yml
check "CI workflow exists"

test -f .github/workflows/release.yml
check "Release workflow exists"

test -f .github/workflows/publish.yml
check "Publish workflow exists"

test -f .github/workflows/security.yml
check "Security workflow exists"

test -f .github/dependabot.yml
check "Dependabot configuration exists"

echo ""

# 2. Check semantic-release configuration
echo "📦 Checking semantic-release configuration..."
test -f .releaserc.json
check "semantic-release config exists"

# Check if semantic-release is in package.json
grep -q '"semantic-release"' package.json
check "semantic-release in package.json"

# Check for required plugins
grep -q '@semantic-release/changelog' package.json
check "@semantic-release/changelog installed"

grep -q '@semantic-release/git' package.json
check "@semantic-release/git installed"

grep -q '@semantic-release/commit-analyzer' package.json
check "@semantic-release/commit-analyzer installed"

grep -q '@semantic-release/release-notes-generator' package.json
check "@semantic-release/release-notes-generator installed"

grep -q '@semantic-release/npm' package.json
check "@semantic-release/npm installed"

grep -q '@semantic-release/github' package.json
check "@semantic-release/github installed"

echo ""

# 3. Check package.json configuration
echo "📝 Checking package.json configuration..."

# Check repository field
grep -q '"repository"' package.json
check "Repository field configured"

# Check scripts
grep -q '"semantic-release"' package.json
check "semantic-release script exists"

grep -q '"prepublishOnly"' package.json
check "prepublishOnly script exists"

grep -q '"test"' package.json
check "test script exists"

grep -q '"build"' package.json
check "build script exists"

grep -q '"type-check"' package.json
check "type-check script exists"

# Check publishConfig
grep -q '"publishConfig"' package.json
check "publishConfig exists"

echo ""

# 4. Check documentation
echo "📚 Checking documentation..."
test -f .github/CICD.md
check "CI/CD documentation exists"

test -f .github/RELEASE_GUIDE.md
check "Release guide exists"

test -f .github/CICD_SETUP_SUMMARY.md
check "Setup summary exists"

test -f CONTRIBUTING.md
check "Contributing guide exists"

echo ""

# 5. Check for required files
echo "📄 Checking required files..."
test -f README.md
check "README.md exists"

test -f LICENSE
check "LICENSE exists"

test -f package.json
check "package.json exists"

test -f tsconfig.json
check "tsconfig.json exists"

echo ""

# 6. Validate workflow syntax (basic check)
echo "🔧 Validating workflow syntax..."

# Check for required workflow keys
grep -q "on:" .github/workflows/ci.yml
check "CI workflow has triggers"

grep -q "jobs:" .github/workflows/ci.yml
check "CI workflow has jobs"

grep -q "on:" .github/workflows/release.yml
check "Release workflow has triggers"

grep -q "jobs:" .github/workflows/release.yml
check "Release workflow has jobs"

echo ""

# 7. Check for secrets documentation
echo "🔐 Checking secrets documentation..."
grep -q "NPM_TOKEN" .github/CICD.md
check "NPM_TOKEN documented"

grep -q "GITHUB_TOKEN" .github/CICD.md
check "GITHUB_TOKEN documented"

echo ""

# 8. Warnings for optional items
echo "⚠️  Checking optional configurations..."

# Check if CHANGELOG.md exists (will be created on first release)
if [ ! -f CHANGELOG.md ]; then
    warn "CHANGELOG.md not found (will be created on first release)"
fi

# Check if .npmignore exists
if [ ! -f .npmignore ]; then
    warn ".npmignore not found (using files field in package.json)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ CI/CD configuration is valid!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Configure NPM_TOKEN secret in GitHub repository"
    echo "2. Test the pipeline with a PR"
    echo "3. Review .github/CICD.md for detailed documentation"
    exit 0
else
    echo -e "${RED}✗ CI/CD configuration has issues${NC}"
    echo ""
    echo "Please fix the failed checks above."
    exit 1
fi
