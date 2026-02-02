#!/bin/bash

# 手动模拟 CI 和 Release Workflow

set -e  # 遇到错误立即退出

echo "=========================================="
echo "手动模拟 GitHub Actions Workflows"
echo "=========================================="
echo ""

# 设置环境变量
export CI=true
export NODE_ENV=test

echo "环境信息:"
echo "  Node: $(node --version)"
echo "  pnpm: $(pnpm --version 2>&1 || echo 'not available')"
echo "  CI: $CI"
echo ""

# ============================================
# CI Workflow 模拟
# ============================================

echo "=========================================="
echo "CI Workflow - Lint Job"
echo "=========================================="
echo ""

echo "Step 1: Install dependencies"
pnpm install --frozen-lockfile || { echo "❌ Install failed"; exit 1; }
echo "✅ Dependencies installed"
echo ""

echo "Step 2: Run linter"
pnpm run lint || { echo "❌ Lint failed"; exit 1; }
echo "✅ Lint passed"
echo ""

echo "Step 3: Check formatting"
pnpm run format:check || { echo "❌ Format check failed"; exit 1; }
echo "✅ Format check passed"
echo ""

# ============================================
echo "=========================================="
echo "CI Workflow - Test Job"
echo "=========================================="
echo ""

echo "Step 1: Run type check"
pnpm run typecheck || { echo "❌ Type check failed"; exit 1; }
echo "✅ Type check passed"
echo ""

echo "Step 2: Run tests"
pnpm run test || { echo "❌ Tests failed"; exit 1; }
echo "✅ Tests passed"
echo ""

# ============================================
echo "=========================================="
echo "CI Workflow - Build Job"
echo "=========================================="
echo ""

echo "Step 1: Build all packages"
pnpm run build || { echo "❌ Build failed"; exit 1; }
echo "✅ Build passed"
echo ""

# ============================================
echo "=========================================="
echo "Release Workflow 模拟"
echo "=========================================="
echo ""

echo "Step 1: Install dependencies (already done)"
echo "✅ Dependencies installed"
echo ""

echo "Step 2: Build packages (already done)"
echo "✅ Build completed"
echo ""

echo "Step 3: Run tests (already done)"
echo "✅ Tests passed"
echo ""

echo "Step 4: Check if version changed"
CURRENT_VERSION=$(node -p "require('./packages/core/package.json').version")
echo "Current version: $CURRENT_VERSION"

if npm view @agentic/core@$CURRENT_VERSION version 2>/dev/null; then
    echo "⏭️  Version $CURRENT_VERSION already published, skipping publish"
    SHOULD_PUBLISH=false
else
    echo "✅ Version $CURRENT_VERSION is new, would publish (skipping actual publish)"
    SHOULD_PUBLISH=true
fi
echo ""

# ============================================
echo "=========================================="
echo "✅ 所有 Workflow 步骤模拟完成！"
echo "=========================================="
echo ""

echo "结果总结:"
echo "  ✅ CI Workflow - Lint: PASSED"
echo "  ✅ CI Workflow - Test: PASSED"
echo "  ✅ CI Workflow - Build: PASSED"
echo "  ✅ Release Workflow - Build: PASSED"
echo "  ✅ Release Workflow - Test: PASSED"
echo "  ℹ️  Release Workflow - Publish: SKIPPED (version already published)"
echo ""

echo "预期 GitHub Actions 结果:"
echo "  ✅ 所有 CI checks 应该通过"
echo "  ✅ Release workflow 应该成功"
echo ""
