#!/bin/bash

# @xiancore/agent NPM发布前检查脚本
# Usage: bash pre-publish-check.sh

echo "=========================================="
echo "  @xiancore/agent NPM 发布前检查"
echo "=========================================="
echo ""

FAILED=0

# 检查1: npm登录状态
echo "✓ 检查1: npm登录状态..."
if npm whoami > /dev/null 2>&1; then
  USER=$(npm whoami)
  echo "  ✅ 已登录为: $USER"
else
  echo "  ❌ 未登录npm，请先运行: npm login"
  FAILED=1
fi
echo ""

# 检查2: package.json存在且有效
echo "✓ 检查2: package.json..."
if [ -f "package.json" ]; then
  NAME=$(grep '"name"' package.json | head -1 | sed 's/.*"name": "\([^"]*\)".*/\1/')
  VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')
  echo "  ✅ 包名: $NAME"
  echo "  ✅ 版本: $VERSION"
else
  echo "  ❌ package.json 不存在"
  FAILED=1
fi
echo ""

# 检查3: 必需的文件
echo "✓ 检查3: 必需的文件..."
FILES=("README.md" "LICENSE" ".npmignore" "package.json" "dist/index.js" "dist/index.d.ts")
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ 缺失: $file"
    FAILED=1
  fi
done
echo ""

# 检查4: 构建状态
echo "✓ 检查4: 重新构建..."
npm run clean > /dev/null 2>&1
if npm run build > /dev/null 2>&1; then
  echo "  ✅ 构建成功"
else
  echo "  ❌ 构建失败"
  FAILED=1
fi
echo ""

# 检查5: 测试（如果存在）
echo "✓ 检查5: 运行测试..."
if npm run test > /dev/null 2>&1; then
  echo "  ✅ 测试通过"
elif [ -f "vitest.config.ts" ] || [ -f "jest.config.js" ]; then
  echo "  ⚠️  测试失败"
  FAILED=1
else
  echo "  ℹ️  无测试配置"
fi
echo ""

# 检查6: 打包内容
echo "✓ 检查6: 验证打包内容..."
TARBALL=$(npm pack --dry-run 2>/dev/null | grep "Tarball" | wc -l)
if [ "$TARBALL" -gt 0 ]; then
  SIZE=$(npm pack --dry-run 2>/dev/null | grep "total files" | sed 's/.*(\([^)]*\)).*/\1/')
  echo "  ✅ 打包验证通过 $SIZE"
else
  echo "  ❌ 打包验证失败"
  FAILED=1
fi
echo ""

# 检查7: git状态（如果在git仓库中）
echo "✓ 检查7: git状态..."
if [ -d ".git" ]; then
  if [ -z "$(git status --porcelain)" ]; then
    echo "  ✅ 工作目录清洁"
  else
    echo "  ⚠️  工作目录有未提交的更改"
    echo "  建议: git add . && git commit -m 'Prepare for npm publish'"
  fi
else
  echo "  ℹ️  不在git仓库中"
fi
echo ""

# 最终结果
echo "=========================================="
if [ $FAILED -eq 0 ]; then
  echo "  ✅ 所有检查通过！可以发布"
  echo ""
  echo "下一步: npm publish --access public"
else
  echo "  ❌ 检查失败，请修复上述问题"
fi
echo "=========================================="

exit $FAILED
