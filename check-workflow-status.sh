#!/bin/bash

# GitHub Actions 状态检查脚本

echo "=========================================="
echo "GitHub Actions Workflow 状态检查"
echo "=========================================="
echo ""

REPO="Chajian/agentic"
COMMIT="463398e"

echo "仓库: $REPO"
echo "修复 Commit: $COMMIT"
echo ""

echo "请手动访问以下 URL 检查 workflow 状态："
echo ""

echo "1. 所有 Workflow Runs:"
echo "   https://github.com/$REPO/actions"
echo ""

echo "2. CI Workflow:"
echo "   https://github.com/$REPO/actions/workflows/ci.yml"
echo ""

echo "3. Release Workflow:"
echo "   https://github.com/$REPO/actions/workflows/release.yml"
echo ""

echo "4. 修复 Commit 的 Checks:"
echo "   https://github.com/$REPO/commit/$COMMIT/checks"
echo ""

echo "=========================================="
echo "检查清单"
echo "=========================================="
echo ""

echo "CI Workflow 应该包含以下 jobs:"
echo "  [ ] Lint - 代码风格检查"
echo "  [ ] Build - 构建所有包"
echo "  [ ] Test (Node 18.x) - Node 18 测试"
echo "  [ ] Test (Node 20.x) - Node 20 测试"
echo ""

echo "Release Workflow 应该包含以下步骤:"
echo "  [ ] Install dependencies"
echo "  [ ] Build packages"
echo "  [ ] Run tests"
echo "  [ ] Check if version changed"
echo "  [ ] Publish packages (如果版本变更)"
echo ""

echo "预期结果:"
echo "  ✅ 所有 CI checks 应该通过"
echo "  ✅ Build 应该成功（TypeScript 编译错误已修复）"
echo "  ✅ 所有测试应该通过"
echo ""

echo "如果失败，检查:"
echo "  1. 是否还有其他编译错误"
echo "  2. 测试是否失败"
echo "  3. 依赖安装是否有问题"
echo ""

# 尝试使用 curl 获取状态（如果可用）
echo "=========================================="
echo "尝试获取 Workflow 状态..."
echo "=========================================="
echo ""

if command -v curl &> /dev/null; then
    echo "使用 curl 获取最近的 workflow runs..."
    curl -s "https://api.github.com/repos/$REPO/actions/runs?per_page=5" | \
        grep -E '"name"|"status"|"conclusion"|"created_at"' | \
        head -20 || echo "无法获取（可能需要认证）"
else
    echo "curl 不可用，请手动访问上述 URL"
fi

echo ""
echo "=========================================="
echo "完成"
echo "=========================================="
