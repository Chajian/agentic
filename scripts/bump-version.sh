#!/bin/bash

# 版本更新脚本
# 用法: ./scripts/bump-version.sh [patch|minor|major]

set -e

VERSION_TYPE=${1:-patch}

echo "📦 更新版本类型: $VERSION_TYPE"

# 更新所有包的版本
cd packages/core
NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
echo "✅ @agentic/core: $NEW_VERSION"
cd ../..

# 同步版本到其他包
VERSION_NUMBER=${NEW_VERSION#v}

# 更新 storage-memory
cd packages/storage-memory
npm version $VERSION_NUMBER --no-git-tag-version --allow-same-version
echo "✅ @agentic/storage-memory: $VERSION_NUMBER"
cd ../..

# 更新 storage-prisma
cd packages/storage-prisma
npm version $VERSION_NUMBER --no-git-tag-version --allow-same-version
echo "✅ @agentic/storage-prisma: $VERSION_NUMBER"
cd ../..

# 更新 cli
cd packages/cli
npm version $VERSION_NUMBER --no-git-tag-version --allow-same-version
echo "✅ @agentic/cli: $VERSION_NUMBER"
cd ../..

echo ""
echo "🎉 所有包已更新到版本 $VERSION_NUMBER"
echo ""
echo "下一步："
echo "1. 提交更改: git add -A && git commit -m \"chore: bump version to $VERSION_NUMBER\""
echo "2. 推送到 GitHub: git push"
echo "3. GitHub Actions 会自动构建并发布到 NPM"
